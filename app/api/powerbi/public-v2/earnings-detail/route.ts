import { NextRequest, NextResponse } from "next/server";

/**
 * Public Power BI Endpoint: Earnings Detail (No Authentication)
 * 
 * This endpoint provides transaction-level earnings data for Power BI integration
 * without requiring any authentication - uses mock data for demonstration.
 * 
 * Query Parameters:
 * - startDate (optional): ISO date string (e.g., 2025-01-01)
 * - endDate (optional): ISO date string (e.g., 2025-12-31)
 * - creatorId (optional): Filter by specific creator UUID
 * 
 * Response Format:
 * {
 *   metadata: { generatedAt, startDate, endDate, totalTransactions },
 *   data: [
 *     {
 *       transactionId, creatorId, creatorName, creatorHandle,
 *       date, grossAmount, netAmount, source,
 *       year, month, day, dayOfWeek
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
    const creatorIdFilter = searchParams.get("creatorId");

    console.log(`=== PUBLIC POWER BI EARNINGS DETAIL REQUEST ===`);
    console.log(`Date range: ${startDate} to ${endDate}`);
    if (creatorIdFilter) console.log(`Creator filter: ${creatorIdFilter}`);

    // Generate realistic mock transaction data
    const allTransactions = [];
    const creators = [
      { id: "e507b598-4347-4ea5-b27d-4367ea351ab9", name: "Ellie May", handle: "ellalxox" },
      { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", name: "Carys", handle: "carys_official" },
      { id: "b2c3d4e5-f6g7-8901-bcde-f23456789012", name: "Léo", handle: "leo_creator" },
      { id: "c3d4e5f6-g7h8-9012-cdef-345678901234", name: "Molly", handle: "molly_vip" },
      { id: "d4e5f6g7-h8i9-0123-def0-456789012345", name: "Sophia", handle: "sophia_premium" }
    ];

    // Generate transactions for each creator (or filtered creator)
    const targetCreators = creatorIdFilter 
      ? creators.filter(c => c.id === creatorIdFilter)
      : creators;

    for (const creator of targetCreators) {
      // Generate 5-15 transactions per creator
      const transactionCount = Math.floor(Math.random() * 11) + 5;
      
      for (let i = 0; i < transactionCount; i++) {
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 30));
        
        const grossAmount = Math.random() * 100 + 10; // $10-$110
        const netAmount = grossAmount * 0.85; // 15% platform fee
        
        const sources = ['subscription', 'tip', 'message', 'content', 'premium'];
        const source = sources[Math.floor(Math.random() * sources.length)];
        
        allTransactions.push({
          transactionId: `${creator.id}-${transactionDate.getTime()}-${i}`,
          creatorId: creator.id,
          creatorName: creator.name,
          creatorHandle: creator.handle,
          date: transactionDate.toISOString(),
          grossAmount: parseFloat(grossAmount.toFixed(2)),
          netAmount: parseFloat(netAmount.toFixed(2)),
          source: source,
          year: transactionDate.getFullYear(),
          month: transactionDate.getMonth() + 1,
          day: transactionDate.getDate(),
          dayOfWeek: transactionDate.getDay(),
          weekOfYear: getWeekNumber(transactionDate),
          quarter: Math.floor(transactionDate.getMonth() / 3) + 1
        });
      }
    }

    console.log(`✅ Generated ${allTransactions.length} transactions for ${targetCreators.length} creators`);

    // Return Power BI-friendly response
    return NextResponse.json({
      metadata: {
        generatedAt: new Date().toISOString(),
        startDate,
        endDate,
        totalTransactions: allTransactions.length,
        totalCreators: targetCreators.length,
        apiVersion: "1.0",
        authentication: "none",
        dataSource: "mock"
      },
      data: allTransactions
    });

  } catch (error: any) {
    console.error("Public Power BI API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
