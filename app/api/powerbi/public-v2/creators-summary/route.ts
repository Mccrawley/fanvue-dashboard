import { NextRequest, NextResponse } from "next/server";

/**
 * Public Power BI Endpoint: Creators Summary (No Authentication)
 * 
 * This endpoint provides aggregated creator data for Power BI integration
 * without requiring any authentication - uses mock data for demonstration.
 * 
 * Query Parameters:
 * - startDate (optional): ISO date string (e.g., 2025-01-01)
 * - endDate (optional): ISO date string (e.g., 2025-12-31)
 * 
 * Response Format:
 * {
 *   metadata: { generatedAt, startDate, endDate, totalCreators },
 *   data: [
 *     {
 *       creatorId, creatorName, creatorHandle,
 *       totalRevenue, totalTransactions,
 *       totalFollowers, totalSubscribers,
 *       avgTransactionValue, lastUpdated
 *     }
 *   ]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Default to last 30 days if no date range provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const startDate = searchParams.get("startDate") || defaultStartDate.toISOString().split('T')[0];
    const endDate = searchParams.get("endDate") || defaultEndDate.toISOString().split('T')[0];

    console.log(`=== PUBLIC POWER BI CREATORS SUMMARY REQUEST ===`);
    console.log(`Date range: ${startDate} to ${endDate}`);

    // Generate realistic mock data for Power BI demonstration
    const creators = [
      {
        creatorId: "e507b598-4347-4ea5-b27d-4367ea351ab9",
        creatorName: "Ellie May",
        creatorHandle: "ellalxox",
        totalRevenue: 3904.44,
        totalTransactions: 150,
        totalFollowers: 1234,
        totalSubscribers: 567,
        avgTransactionValue: 26.03,
        lastUpdated: new Date().toISOString()
      },
      {
        creatorId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        creatorName: "Carys",
        creatorHandle: "carys_official",
        totalRevenue: 1213.87,
        totalTransactions: 89,
        totalFollowers: 892,
        totalSubscribers: 234,
        avgTransactionValue: 13.64,
        lastUpdated: new Date().toISOString()
      },
      {
        creatorId: "b2c3d4e5-f6g7-8901-bcde-f23456789012",
        creatorName: "Léo",
        creatorHandle: "leo_creator",
        totalRevenue: 819.01,
        totalTransactions: 45,
        totalFollowers: 2341,
        totalSubscribers: 123,
        avgTransactionValue: 18.20,
        lastUpdated: new Date().toISOString()
      },
      {
        creatorId: "c3d4e5f6-g7h8-9012-cdef-345678901234",
        creatorName: "Molly",
        creatorHandle: "molly_vip",
        totalRevenue: 2567.33,
        totalTransactions: 78,
        totalFollowers: 1567,
        totalSubscribers: 445,
        avgTransactionValue: 32.91,
        lastUpdated: new Date().toISOString()
      },
      {
        creatorId: "d4e5f6g7-h8i9-0123-def0-456789012345",
        creatorName: "Sophia",
        creatorHandle: "sophia_premium",
        totalRevenue: 1892.15,
        totalTransactions: 112,
        totalFollowers: 987,
        totalSubscribers: 298,
        avgTransactionValue: 16.89,
        lastUpdated: new Date().toISOString()
      }
    ];

    console.log(`✅ Generated ${creators.length} creators with realistic data`);

    // Return Power BI-friendly response
    return NextResponse.json({
      metadata: {
        generatedAt: new Date().toISOString(),
        startDate,
        endDate,
        totalCreators: creators.length,
        apiVersion: "1.0",
        authentication: "none",
        dataSource: "mock"
      },
      data: creators
    });

  } catch (error: any) {
    console.error("Public Power BI API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
