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
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const maxPages = parseInt(searchParams.get("maxPages") || "3");
    const minMessages = parseInt(searchParams.get("minMessages") || "1"); // Minimum messages to include fan

    // Default to last 30 days if no dates provided
    if (!startDate) {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      startDate = date.toISOString().split('T')[0];
    }
    
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }

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
    const fanEngagement: { [fanUuid: string]: {
      fanUuid: string;
      fanName: string;
      totalMessages: number;
      messagesSent: number;
      messagesReceived: number;
      creatorsEngaged: string[];
      firstMessageDate: string;
      lastMessageDate: string;
      averageResponseTime: number;
      engagementScore: number;
      isSubscriber: boolean;
    } } = {};

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
              const messageDate = new Date(message.sentAt);
              const start = new Date(startDate);
              const end = new Date(endDate);
              return messageDate >= start && messageDate <= end;
            });

            // Sort messages by timestamp for response time calculation
            filteredMessages.sort((a: any, b: any) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());

            // Process messages for this chat
            for (let i = 0; i < filteredMessages.length; i++) {
              const message = filteredMessages[i];
              const fanUuid = message.sender.uuid === creator.uuid ? message.recipient.uuid : message.sender.uuid;
              const fanName = message.sender.uuid === creator.uuid ? message.recipient.displayName || message.recipient.handle : message.sender.displayName || message.sender.handle;
              const messageDate = message.sentAt.split('T')[0];
              
              if (!fanEngagement[fanUuid]) {
                fanEngagement[fanUuid] = {
                  fanUuid,
                  fanName,
                  totalMessages: 0,
                  messagesSent: 0,
                  messagesReceived: 0,
                  creatorsEngaged: [],
                  firstMessageDate: messageDate,
                  lastMessageDate: messageDate,
                  averageResponseTime: 0,
                  engagementScore: 0,
                  isSubscriber: false // This would need to be checked against subscriber data
                };
              }

              // Update date range
              if (new Date(messageDate) > new Date(fanEngagement[fanUuid].lastMessageDate)) {
                fanEngagement[fanUuid].lastMessageDate = messageDate;
              }
              if (new Date(messageDate) < new Date(fanEngagement[fanUuid].firstMessageDate)) {
                fanEngagement[fanUuid].firstMessageDate = messageDate;
              }

              // Add creator to engaged list
              if (!fanEngagement[fanUuid].creatorsEngaged.includes(creator.uuid)) {
                fanEngagement[fanUuid].creatorsEngaged.push(creator.uuid);
              }

              // Count messages
              if (message.sender.uuid === creator.uuid) {
                fanEngagement[fanUuid].messagesReceived++;
              } else {
                fanEngagement[fanUuid].messagesSent++;
              }
              fanEngagement[fanUuid].totalMessages++;

              // Calculate response time (simplified - time between consecutive messages)
              if (i > 0) {
                const prevMessage = filteredMessages[i - 1];
                const timeDiff = new Date(message.sentAt).getTime() - new Date(prevMessage.sentAt).getTime();
                if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) { // Only count responses within 24 hours
                  fanEngagement[fanUuid].averageResponseTime = 
                    (fanEngagement[fanUuid].averageResponseTime + timeDiff) / 2;
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

    // Calculate engagement scores and filter by minimum messages
    const fanEngagementArray = Object.values(fanEngagement)
      .filter(fan => fan.totalMessages >= minMessages)
      .map(fan => {
        // Calculate engagement score based on multiple factors
        const messageFrequency = fan.totalMessages / Math.max(1, 
          (new Date(fan.lastMessageDate).getTime() - new Date(fan.firstMessageDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        const creatorDiversity = fan.creatorsEngaged.length;
        const responseRate = fan.messagesReceived > 0 ? fan.messagesSent / fan.messagesReceived : 0;
        
        fan.engagementScore = Math.round(
          (fan.totalMessages * 0.4) + 
          (messageFrequency * 0.3) + 
          (creatorDiversity * 0.2) + 
          (responseRate * 0.1)
        );

        return fan;
      })
      .sort((a, b) => b.engagementScore - a.engagementScore);

    const engagementAnalytics = {
      dateRange: {
        startDate,
        endDate
      },
      fanEngagement: fanEngagementArray,
      summary: {
        totalActiveFans: fanEngagementArray.length,
        totalMessages: fanEngagementArray.reduce((sum, fan) => sum + fan.totalMessages, 0),
        averageMessagesPerFan: fanEngagementArray.length > 0 
          ? fanEngagementArray.reduce((sum, fan) => sum + fan.totalMessages, 0) / fanEngagementArray.length 
          : 0,
        topEngagedFans: fanEngagementArray.slice(0, 10),
        engagementDistribution: {
          high: fanEngagementArray.filter(fan => fan.engagementScore >= 50).length,
          medium: fanEngagementArray.filter(fan => fan.engagementScore >= 20 && fan.engagementScore < 50).length,
          low: fanEngagementArray.filter(fan => fan.engagementScore < 20).length
        }
      }
    };

    return NextResponse.json(engagementAnalytics);

  } catch (error) {
    console.error("Fan engagement API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fan engagement data" },
      { status: 500 }
    );
  }
}
