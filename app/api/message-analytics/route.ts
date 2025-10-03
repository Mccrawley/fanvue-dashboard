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

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get("startDate") || "2025-01-01";
    let endDate = searchParams.get("endDate") || new Date().toISOString().split('T')[0];
    const maxPages = parseInt(searchParams.get("maxPages") || "3");

    // Convert dates to ISO format
    if (startDate && !startDate.includes('T')) {
      startDate = `${startDate}T00:00:00.000Z`;
    }
    if (endDate && !endDate.includes('T')) {
      endDate = `${endDate}T23:59:59.999Z`;
    }

    // Get creators first (limit to first 10 for faster response)
    const creatorsResponse = await fetchWithRetry("https://api.fanvue.com/creators?page=1&size=10", {
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

    // Process each creator (limit to first 5 for faster response)
    for (const creator of creators.slice(0, 5)) {
      try {
        // Get creator's chats (limit to first 20 chats)
        const chatsResponse = await fetchWithRetry(`https://api.fanvue.com/creators/${creator.uuid}/chats?page=1&size=20`, {
          method: "GET",
          headers: {
            "X-Fanvue-API-Key": apiKey,
            "X-Fanvue-API-Version": apiVersion,
            "Content-Type": "application/json",
          },
        });

        if (!chatsResponse.ok) {
          console.warn(`Failed to get chats for creator ${creator.uuid}: ${chatsResponse.status}`);
          continue;
        }

        const chatsData = await chatsResponse.json();
        const chats = chatsData.data || [];

        let creatorMessagesSent = 0;
        let creatorMessagesReceived = 0;
        const fanMessageCounts: { [key: string]: number } = {};

        // Process each chat (limit to first 10 chats per creator)
        for (const chat of chats.slice(0, 10)) {
          try {
            // Get messages for this chat (limit to first 50 messages)
            const messagesResponse = await fetchWithRetry(`https://api.fanvue.com/chats/${chat.uuid}/messages?page=1&size=50`, {
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

            // Filter messages by date range
            const filteredMessages = messages.filter((message: any) => {
              const messageDate = new Date(message.createdAt);
              const start = new Date(startDate);
              const end = new Date(endDate);
              return messageDate >= start && messageDate <= end;
            });

            // Count messages by sender
            for (const message of filteredMessages) {
              if (message.senderType === 'creator') {
                creatorMessagesSent++;
                messageAnalytics.totalMessagesSent++;
              } else if (message.senderType === 'fan') {
                creatorMessagesReceived++;
                messageAnalytics.totalMessagesReceived++;
                
                // Track fan message counts
                const fanId = message.senderId || 'unknown';
                fanMessageCounts[fanId] = (fanMessageCounts[fanId] || 0) + 1;
              }
            }
          } catch (error) {
            console.warn(`Error processing chat ${chat.uuid}:`, error);
            continue;
          }
        }

        // Add creator data
        messageAnalytics.messageVolumeByCreator.push({
          creatorUuid: creator.uuid,
          creatorName: creator.displayName || creator.handle,
          messagesSent: creatorMessagesSent,
          messagesReceived: creatorMessagesReceived,
          totalMessages: creatorMessagesSent + creatorMessagesReceived,
          fanCount: Object.keys(fanMessageCounts).length
        });

        // Add fan data (limit to top 20 fans per creator)
        const sortedFans = Object.entries(fanMessageCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20);
          
        for (const [fanId, count] of sortedFans) {
          messageAnalytics.messageVolumeByFan.push({
            fanUuid: fanId,
            fanName: `Fan ${fanId.substring(0, 8)}`,
            messagesSent: count,
            messagesReceived: 0,
            totalMessages: count
          });
        }

      } catch (error) {
        console.warn(`Error processing creator ${creator.uuid}:`, error);
        continue;
      }
    }

    // Calculate summary
    messageAnalytics.summary.totalMessages = messageAnalytics.totalMessagesSent + messageAnalytics.totalMessagesReceived;
    messageAnalytics.summary.averageMessagesPerCreator = messageAnalytics.messageVolumeByCreator.length > 0 
      ? messageAnalytics.summary.totalMessages / messageAnalytics.messageVolumeByCreator.length 
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