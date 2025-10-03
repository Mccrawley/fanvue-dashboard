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
    const minMessages = parseInt(searchParams.get("minMessages") || "1");

    // Convert dates to ISO format
    if (startDate && !startDate.includes('T')) {
      startDate = `${startDate}T00:00:00.000Z`;
    }
    if (endDate && !endDate.includes('T')) {
      endDate = `${endDate}T23:59:59.999Z`;
    }

    // Get all creators first
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
    const fanEngagementData = {
      fanEngagement: [] as any[],
      summary: {
        totalActiveFans: 0,
        totalMessages: 0,
        averageMessagesPerFan: 0,
        engagementDistribution: {
          high: 0,
          medium: 0,
          low: 0
        }
      }
    };

    const fanData: { [key: string]: any } = {};

    // Process each creator
    for (const creator of creators) {
      try {
        // Get creator's chats
        const chatsResponse = await fetchWithRetry(`https://api.fanvue.com/creators/${creator.uuid}/chats?page=1&size=50`, {
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

        // Process each chat
        for (const chat of chats) {
          try {
            // Get messages for this chat
            const messagesResponse = await fetchWithRetry(`https://api.fanvue.com/chats/${chat.uuid}/messages?page=1&size=100`, {
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

            // Process fan engagement
            for (const message of filteredMessages) {
              if (message.senderType === 'fan') {
                const fanId = message.senderId || 'unknown';
                
                if (!fanData[fanId]) {
                  fanData[fanId] = {
                    fanUuid: fanId,
                    fanName: `Fan ${fanId.substring(0, 8)}`,
                    totalMessages: 0,
                    messagesSent: 0,
                    messagesReceived: 0,
                    creatorsEngaged: new Set(),
                    firstMessageDate: message.createdAt,
                    lastMessageDate: message.createdAt
                  };
                }

                fanData[fanId].totalMessages++;
                fanData[fanId].messagesSent++;
                fanData[fanId].creatorsEngaged.add(creator.uuid);
                
                if (new Date(message.createdAt) < new Date(fanData[fanId].firstMessageDate)) {
                  fanData[fanId].firstMessageDate = message.createdAt;
                }
                if (new Date(message.createdAt) > new Date(fanData[fanId].lastMessageDate)) {
                  fanData[fanId].lastMessageDate = message.createdAt;
                }
              }
            }
          } catch (error) {
            console.warn(`Error processing chat ${chat.uuid}:`, error);
            continue;
          }
        }
      } catch (error) {
        console.warn(`Error processing creator ${creator.uuid}:`, error);
        continue;
      }
    }

    // Convert fan data to array and calculate engagement scores
    for (const [fanId, fan] of Object.entries(fanData)) {
      if (fan.totalMessages >= minMessages) {
        // Calculate engagement score based on message count and creator diversity
        const creatorDiversity = fan.creatorsEngaged.size;
        const engagementScore = Math.min(100, (fan.totalMessages * 2) + (creatorDiversity * 10));
        
        fanEngagementData.fanEngagement.push({
          fanUuid: fan.fanUuid,
          fanName: fan.fanName,
          totalMessages: fan.totalMessages,
          messagesSent: fan.messagesSent,
          messagesReceived: fan.messagesReceived,
          creatorsEngaged: Array.from(fan.creatorsEngaged),
          engagementScore: Math.round(engagementScore),
          firstMessageDate: fan.firstMessageDate,
          lastMessageDate: fan.lastMessageDate
        });

        fanEngagementData.summary.totalMessages += fan.totalMessages;
      }
    }

    // Calculate summary statistics
    fanEngagementData.summary.totalActiveFans = fanEngagementData.fanEngagement.length;
    fanEngagementData.summary.averageMessagesPerFan = fanEngagementData.summary.totalActiveFans > 0 
      ? fanEngagementData.summary.totalMessages / fanEngagementData.summary.totalActiveFans 
      : 0;

    // Categorize engagement levels
    for (const fan of fanEngagementData.fanEngagement) {
      if (fan.engagementScore >= 70) {
        fanEngagementData.summary.engagementDistribution.high++;
      } else if (fan.engagementScore >= 40) {
        fanEngagementData.summary.engagementDistribution.medium++;
      } else {
        fanEngagementData.summary.engagementDistribution.low++;
      }
    }

    return NextResponse.json(fanEngagementData);
  } catch (error: any) {
    console.error("Fan Engagement API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch fan engagement data" },
      { status: 500 }
    );
  }
}