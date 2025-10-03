import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get("startDate") || "2025-01-01";
    let endDate = searchParams.get("endDate") || new Date().toISOString().split('T')[0];
    const maxPages = parseInt(searchParams.get("maxPages") || "3");

    // Return mock data for PowerBI testing
    const mockMessageData = {
      totalMessagesSent: 1250,
      totalMessagesReceived: 890,
      messageVolumeByCreator: [
        {
          creatorUuid: "creator-uuid-1",
          creatorName: "Creator Alpha",
          messagesSent: 150,
          messagesReceived: 120,
          totalMessages: 270,
          fanCount: 25
        },
        {
          creatorUuid: "creator-uuid-2", 
          creatorName: "Creator Beta",
          messagesSent: 200,
          messagesReceived: 180,
          totalMessages: 380,
          fanCount: 30
        },
        {
          creatorUuid: "creator-uuid-3",
          creatorName: "Creator Gamma", 
          messagesSent: 300,
          messagesReceived: 250,
          totalMessages: 550,
          fanCount: 45
        }
      ],
      messageVolumeByFan: [
        {
          fanUuid: "fan-uuid-a",
          fanName: "Fan A",
          messagesSent: 5,
          messagesReceived: 8,
          totalMessages: 13
        },
        {
          fanUuid: "fan-uuid-b",
          fanName: "Fan B", 
          messagesSent: 10,
          messagesReceived: 12,
          totalMessages: 22
        },
        {
          fanUuid: "fan-uuid-c",
          fanName: "Fan C",
          messagesSent: 15,
          messagesReceived: 18,
          totalMessages: 33
        }
      ],
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        totalCreators: 3,
        totalMessages: 2140,
        averageMessagesPerCreator: 713.33
      }
    };

    return NextResponse.json(mockMessageData);
  } catch (error: any) {
    console.error("Message Analytics API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch message analytics data" },
      { status: 500 }
    );
  }
}