import { NextRequest, NextResponse } from "next/server";

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status === 404) {
        return response;
      }
      if (i === maxRetries - 1) {
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FANVUE_API_KEY;
    const apiVersion = process.env.FANVUE_API_VERSION || "2025-06-26";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const maxPages = parseInt(searchParams.get("maxPages") || "3");

    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }
    
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }

    // Get creators first
    const creatorsResponse = await fetchWithRetry("https://api.fanvue.com/creators?page=1&size=50", {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": apiKey,
        "X-Fanvue-API-Version": apiVersion,
        "Content-Type": "application/json",
      },
    });

    if (!creatorsResponse.ok) {
      const errorText = await creatorsResponse.text();
      console.error("Fanvue API error:", creatorsResponse.status, errorText);
      return NextResponse.json(
        { error: `Fanvue API error: ${creatorsResponse.status}` },
        { status: creatorsResponse.status }
      );
    }

    const creators = (await creatorsResponse.json()).data || [];
    
    const messageAnalytics = {
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      messageVolumeByCreator: [] as any[],
      messageVolumeByFan: [] as any[],
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        totalCreators: creators.length,
        totalMessages: 0,
        averageMessagesPerCreator: 0
      }
    };

    // Process first 5 creators to avoid timeout
    const creatorsToProcess = creators.slice(0, 5);
    
    for (const creator of creatorsToProcess) {
      let creatorMessagesSent = 0;
      let creatorMessagesReceived = 0;
      const fanEngagementMap = new Map();
      const messageTimestamps = [] as any[];

      // Get chats for this creator
      for (let page = 1; page <= maxPages; page++) {
        const chatsResponse = await fetchWithRetry(`https://api.fanvue.com/creators/${creator.uuid}/chats?page=${page}&size=50&startDate=${startDate}&endDate=${endDate}`, {
          method: "GET",
          headers: {
            "X-Fanvue-API-Key": apiKey,
            "X-Fanvue-API-Version": apiVersion,
            "Content-Type": "application/json",
          },
        });

        if (!chatsResponse.ok) {
          console.warn(`Failed to get chats for creator ${creator.uuid} on page ${page}: ${chatsResponse.status}`);
          break;
        }

        const chatsData = await chatsResponse.json();
        const chats = chatsData.data || [];

        if (chats.length === 0) break;

        for (const chat of chats) {
          // Get messages for this chat
          const messagesResponse = await fetchWithRetry(`https://api.fanvue.com/creators/${creator.uuid}/chats/${chat.uuid}/messages?page=1&size=100&startDate=${startDate}&endDate=${endDate}`, {
            method: "GET",
            headers: {
              "X-Fanvue-API-Key": apiKey,
              "X-Fanvue-API-Version": apiVersion,
              "Content-Type": "application/json",
            },
          });

          if (!messagesResponse.ok) {
            console.warn(`Failed to get messages for chat ${chat.uuid}: ${messagesResponse.status}`);
            continue;
          }

          const messagesData = await messagesResponse.json();
          const messages = messagesData.data || [];

          for (const message of messages) {
            const messageTimestamp = new Date(message.createdAt);
            
            // Track message by sender type
            if (message.senderType === 'creator') {
              creatorMessagesSent++;
            } else if (message.senderType === 'fan') {
              creatorMessagesReceived++;
            }

            // Store timestamp data
            messageTimestamps.push({
              timestamp: messageTimestamp.toISOString(),
              date: messageTimestamp.toISOString().split('T')[0],
              time: messageTimestamp.toISOString().split('T')[1].split('.')[0],
              senderType: message.senderType,
              messageId: message.uuid,
              chatId: chat.uuid
            });

            // Aggregate by fan
            const fanUuid = message.senderType === 'fan' ? message.senderUuid : message.receiverUuid;
            const fanName = message.senderType === 'fan' ? message.senderName : message.receiverName;

            if (fanUuid) {
              if (!fanEngagementMap.has(fanUuid)) {
                fanEngagementMap.set(fanUuid, {
                  fanUuid,
                  fanName,
                  messagesSent: 0,
                  messagesReceived: 0,
                  totalMessages: 0,
                  messageTimestamps: []
                });
              }
              const fanStats = fanEngagementMap.get(fanUuid);
              if (message.senderType === 'fan') {
                fanStats.messagesSent++;
              } else {
                fanStats.messagesReceived++;
              }
              fanStats.totalMessages++;
              fanStats.messageTimestamps.push({
                timestamp: messageTimestamp.toISOString(),
                date: messageTimestamp.toISOString().split('T')[0],
                time: messageTimestamp.toISOString().split('T')[1].split('.')[0],
                senderType: message.senderType
              });
            }
          }
        }
      }

      const totalCreatorMessages = creatorMessagesSent + creatorMessagesReceived;
      messageAnalytics.totalMessagesSent += creatorMessagesSent;
      messageAnalytics.totalMessagesReceived += creatorMessagesReceived;
      
      messageAnalytics.messageVolumeByCreator.push({
        creatorUuid: creator.uuid,
        creatorName: creator.displayName,
        messagesSent: creatorMessagesSent,
        messagesReceived: creatorMessagesReceived,
        totalMessages: totalCreatorMessages,
        fanCount: fanEngagementMap.size,
        messageTimestamps: messageTimestamps.slice(0, 50) // Limit to first 50 timestamps
      });
      
      messageAnalytics.summary.totalMessages += totalCreatorMessages;
    }

    // Convert fan engagement map to array
    messageAnalytics.messageVolumeByFan = Array.from(fanEngagementMap.values())
      .map(fan => ({
        ...fan,
        messageTimestamps: fan.messageTimestamps.slice(0, 20) // Limit timestamps
      }));

    messageAnalytics.summary.averageMessagesPerCreator = messageAnalytics.summary.totalCreators > 0
      ? messageAnalytics.summary.totalMessages / messageAnalytics.summary.totalCreators
      : 0;

    return NextResponse.json(messageAnalytics);
  } catch (error: any) {
    console.error("Message Analytics API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch message analytics data" },
      { status: 500 }
    );
  }
}