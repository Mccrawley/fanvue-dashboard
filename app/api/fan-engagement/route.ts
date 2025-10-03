import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get("startDate") || "2025-01-01";
    let endDate = searchParams.get("endDate") || new Date().toISOString().split('T')[0];
    const maxPages = parseInt(searchParams.get("maxPages") || "3");
    const minMessages = parseInt(searchParams.get("minMessages") || "1");

    // Return mock data for PowerBI testing
    const mockFanEngagementData = {
      fanEngagement: [
        {
          fanUuid: "fan-uuid-a",
          fanName: "Fan A",
          totalMessages: 45,
          messagesSent: 20,
          messagesReceived: 25,
          creatorsEngaged: ["creator-uuid-1", "creator-uuid-3"],
          engagementScore: 75,
          firstMessageDate: "2025-01-01",
          lastMessageDate: "2025-01-31"
        },
        {
          fanUuid: "fan-uuid-b",
          fanName: "Fan B",
          totalMessages: 30,
          messagesSent: 15,
          messagesReceived: 15,
          creatorsEngaged: ["creator-uuid-1"],
          engagementScore: 50,
          firstMessageDate: "2025-01-05",
          lastMessageDate: "2025-01-28"
        },
        {
          fanUuid: "fan-uuid-c",
          fanName: "Fan C",
          totalMessages: 60,
          messagesSent: 25,
          messagesReceived: 35,
          creatorsEngaged: ["creator-uuid-2", "creator-uuid-3"],
          engagementScore: 90,
          firstMessageDate: "2025-01-02",
          lastMessageDate: "2025-01-30"
        }
      ],
      summary: {
        totalActiveFans: 150,
        totalMessages: 2140,
        averageMessagesPerFan: 14.27,
        engagementDistribution: {
          high: 25,
          medium: 75,
          low: 50
        }
      }
    };

    return NextResponse.json(mockFanEngagementData);
  } catch (error: any) {
    console.error("Fan Engagement API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch fan engagement data" },
      { status: 500 }
    );
  }
}