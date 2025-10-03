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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorUuid: string }> }
) {
  try {
    const apiKey = process.env.FANVUE_API_KEY;
    const apiVersion = process.env.FANVUE_API_VERSION || "2025-06-26";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const { creatorUuid } = await params;

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const maxPages = parseInt(searchParams.get("maxPages") || "5");

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

    // Get creator's chats
    const chatsResponse = await fetchWithRetry(`https://api.fanvue.com/creators/${creatorUuid}/chats?page=1&size=50`, {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": apiKey,
        "X-Fanvue-API-Version": apiVersion,
        "Content-Type": "application/json",
      },
    });

    if (!chatsResponse.ok) {
      const errorText = await chatsResponse.text();
      console.error("Fanvue API error:", chatsResponse.status, errorText);
      return NextResponse.json(
        { error: `Fanvue API error: ${chatsResponse.status}` },
        { status: chatsResponse.status }
      );
    }

    const chatsData = await chatsResponse.json();
    const chats = chatsData.data || [];

    const messageVolume = {
      creatorUuid,
      dateRange: {
        startDate,
        endDate
      },
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      totalMessages: 0,
      fanEngagement: [] as any[],
      dailyBreakdown: [] as any[],
      summary: {
        totalChats: chats.length,
        activeFans: 0,
        averageMessagesPerFan: 0,
        responseRate: 0
      }
    };

    const fanMessageCounts: { [fanUuid: string]: { 
      sent: number; 
      received: number; 
      fanName: string;
      lastMessageDate: string;
      firstMessageDate: string;
    } } = {};

    const dailyCounts: { [date: string]: { sent: number; received: number } } = {};

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

        // Count messages by sender and date
        for (const message of filteredMessages) {
          const fanUuid = message.sender.uuid === creatorUuid ? message.recipient.uuid : message.sender.uuid;
          const fanName = message.sender.uuid === creatorUuid ? message.recipient.displayName || message.recipient.handle : message.sender.displayName || message.sender.handle;
          const messageDate = message.sentAt.split('T')[0];
          
          if (!fanMessageCounts[fanUuid]) {
            fanMessageCounts[fanUuid] = { 
              sent: 0, 
              received: 0, 
              fanName,
              lastMessageDate: messageDate,
              firstMessageDate: messageDate
            };
          }

          // Update date range for this fan
          if (new Date(messageDate) > new Date(fanMessageCounts[fanUuid].lastMessageDate)) {
            fanMessageCounts[fanUuid].lastMessageDate = messageDate;
          }
          if (new Date(messageDate) < new Date(fanMessageCounts[fanUuid].firstMessageDate)) {
            fanMessageCounts[fanUuid].firstMessageDate = messageDate;
          }

          // Initialize daily counts
          if (!dailyCounts[messageDate]) {
            dailyCounts[messageDate] = { sent: 0, received: 0 };
          }

          if (message.sender.uuid === creatorUuid) {
            messageVolume.totalMessagesSent++;
            fanMessageCounts[fanUuid].received++;
            dailyCounts[messageDate].sent++;
          } else {
            messageVolume.totalMessagesReceived++;
            fanMessageCounts[fanUuid].sent++;
            dailyCounts[messageDate].received++;
          }
        }

      } catch (error) {
        console.warn(`Error processing chat ${chat.uuid}:`, error);
        continue;
      }
    }

    // Calculate totals
    messageVolume.totalMessages = messageVolume.totalMessagesSent + messageVolume.totalMessagesReceived;

    // Build fan engagement data
    for (const [fanUuid, counts] of Object.entries(fanMessageCounts)) {
      messageVolume.fanEngagement.push({
        fanUuid,
        fanName: counts.fanName,
        messagesSent: counts.sent,
        messagesReceived: counts.received,
        totalMessages: counts.sent + counts.received,
        firstMessageDate: counts.firstMessageDate,
        lastMessageDate: counts.lastMessageDate,
        engagementScore: counts.sent + counts.received // Simple engagement score
      });
    }

    // Build daily breakdown
    for (const [date, counts] of Object.entries(dailyCounts)) {
      messageVolume.dailyBreakdown.push({
        date,
        messagesSent: counts.sent,
        messagesReceived: counts.received,
        totalMessages: counts.sent + counts.received
      });
    }

    // Sort daily breakdown by date
    messageVolume.dailyBreakdown.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Sort fan engagement by total messages (most engaged first)
    messageVolume.fanEngagement.sort((a, b) => b.totalMessages - a.totalMessages);

    // Calculate summary metrics
    messageVolume.summary.activeFans = Object.keys(fanMessageCounts).length;
    messageVolume.summary.averageMessagesPerFan = messageVolume.summary.activeFans > 0 
      ? messageVolume.totalMessages / messageVolume.summary.activeFans 
      : 0;
    messageVolume.summary.responseRate = messageVolume.totalMessagesReceived > 0 
      ? (messageVolume.totalMessagesSent / messageVolume.totalMessagesReceived) * 100 
      : 0;

    return NextResponse.json(messageVolume);

  } catch (error) {
    console.error("Creator message volume API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch creator message volume data" },
      { status: 500 }
    );
  }
}
