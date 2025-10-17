import { NextRequest, NextResponse } from "next/server";
import { makeAuthenticatedRequest } from "@/lib/oauth";

/**
 * Hybrid Power BI Endpoint: Earnings Detail
 * 
 * This endpoint supports both OAuth (for browser) and API key (for Power BI) authentication.
 * 
 * Query Parameters:
 * - apiKey (optional): Power BI API key for external access
 * - startDate (optional): ISO date string (e.g., 2025-01-01)
 * - endDate (optional): ISO date string (e.g., 2025-12-31)
 * - creatorId (optional): Filter by specific creator UUID
 * 
 * Authentication Methods:
 * 1. OAuth: If user is logged in via browser (cookies)
 * 2. API Key: If apiKey parameter matches POWERBI_API_KEY
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check for API key authentication (for Power BI)
    const apiKey = searchParams.get("apiKey");
    const expectedApiKey = process.env.POWERBI_API_KEY;
    
    let useApiKey = false;
    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      useApiKey = true;
      console.log("Using API key authentication for Power BI");
    } else {
      console.log("Using OAuth authentication");
    }

    // Default to last 30 days if no date range provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const startDate = searchParams.get("startDate") || defaultStartDate.toISOString().split('T')[0];
    const endDate = searchParams.get("endDate") || defaultEndDate.toISOString().split('T')[0];
    const creatorIdFilter = searchParams.get("creatorId");

    console.log(`=== HYBRID POWER BI EARNINGS DETAIL REQUEST ===`);
    console.log(`Authentication: ${useApiKey ? 'API Key' : 'OAuth'}`);
    console.log(`Date range: ${startDate} to ${endDate}`);
    if (creatorIdFilter) console.log(`Creator filter: ${creatorIdFilter}`);

    // Step 1: Fetch all creators (or single creator if filtered)
    let creators: any[] = [];
    
    if (creatorIdFilter) {
      // Fetch single creator data
      creators = [{ uuid: creatorIdFilter, displayName: 'Filtered Creator', handle: 'filtered' }];
    } else {
      // Fetch all creators
      const creatorsUrl = `https://api.fanvue.com/agencies/creators?size=50`;
      console.log(`Fetching creators from: ${creatorsUrl}`);
      
      let creatorsResponse;
      if (useApiKey) {
        // Use API key authentication for Power BI
        const apiKeyEnv = process.env.FANVUE_API_KEY;
        const apiVersion = process.env.FANVUE_API_VERSION || "2025-06-26";
        
        if (!apiKeyEnv) {
          return NextResponse.json(
            { error: "Fanvue API key not configured" },
            { status: 500 }
          );
        }

        creatorsResponse = await fetch(creatorsUrl, {
          method: "GET",
          headers: {
            "X-Fanvue-API-Key": apiKeyEnv,
            "X-Fanvue-API-Version": apiVersion,
            "Content-Type": "application/json",
          },
        });
      } else {
        // Use OAuth authentication for browser
        creatorsResponse = await makeAuthenticatedRequest(creatorsUrl, {
          method: "GET",
        });
      }

      if (!creatorsResponse.ok) {
        const errorText = await creatorsResponse.text();
        console.error("Failed to fetch creators:", creatorsResponse.status, errorText);
        return NextResponse.json(
          { error: `Failed to fetch creators: ${creatorsResponse.status}` },
          { status: creatorsResponse.status }
        );
      }

      const creatorsData = await creatorsResponse.json();
      creators = creatorsData.data || [];
      
      console.log(`✅ Found ${creators.length} creators`);
    }

    // Step 2: Fetch earnings for each creator
    const allTransactions: any[] = [];

    for (const creator of creators) {
      const creatorId = creator.uuid;
      const creatorName = creator.displayName || 'Unknown';
      const creatorHandle = creator.handle || 'unknown';

      console.log(`Fetching earnings for ${creatorName} (${creatorId})...`);

      try {
        // Fetch earnings with pagination
        let hasMore = true;
        let cursor: string | null = null;
        let pageCount = 0;
        const maxPages = 3; // Limit to prevent timeouts

        while (hasMore && pageCount < maxPages) {
          const queryParams = new URLSearchParams();
          queryParams.append("startDate", `${startDate}T00:00:00Z`);
          queryParams.append("endDate", `${endDate}T23:59:59Z`);
          queryParams.append("size", "50");
          if (cursor) queryParams.append("cursor", cursor);

          const earningsUrl = `https://api.fanvue.com/agencies/creators/${creatorId}/insights/earnings?${queryParams}`;
          
          let earningsResponse;
          if (useApiKey) {
            // Use API key authentication for Power BI
            earningsResponse = await fetch(earningsUrl, {
              method: "GET",
              headers: {
                "X-Fanvue-API-Key": process.env.FANVUE_API_KEY!,
                "X-Fanvue-API-Version": process.env.FANVUE_API_VERSION || "2025-06-26",
                "Content-Type": "application/json",
              },
            });
          } else {
            // Use OAuth authentication for browser
            earningsResponse = await makeAuthenticatedRequest(earningsUrl, {
              method: "GET",
            });
          }

          if (!earningsResponse.ok) {
            console.log(`  Failed to fetch earnings: ${earningsResponse.status}`);
            break;
          }

          const earningsData = await earningsResponse.json();
          const transactions = earningsData.data || [];

          console.log(`  Page ${pageCount + 1}: ${transactions.length} transactions`);

          // Transform each transaction for Power BI
          transactions.forEach((txn: any) => {
            const txnDate = new Date(txn.date);
            
            allTransactions.push({
              // Transaction details
              transactionId: `${creatorId}-${txn.date}`, // Composite key
              creatorId,
              creatorName,
              creatorHandle,
              
              // Financial data
              date: txn.date,
              grossAmount: (txn.gross || 0) / 100, // Convert cents to dollars
              netAmount: (txn.net || 0) / 100, // Convert cents to dollars
              source: txn.source || 'unknown',
              
              // Date components for Power BI time intelligence
              year: txnDate.getFullYear(),
              month: txnDate.getMonth() + 1,
              day: txnDate.getDate(),
              dayOfWeek: txnDate.getDay(),
              weekOfYear: getWeekNumber(txnDate),
              quarter: Math.floor(txnDate.getMonth() / 3) + 1
            });
          });

          // Check for more pages
          cursor = earningsData.nextCursor;
          hasMore = !!cursor;
          pageCount++;
        }

      } catch (error) {
        console.error(`  Error fetching earnings for ${creatorName}:`, error);
      }
    }

    console.log(`✅ Total transactions collected: ${allTransactions.length}`);

    // Return Power BI-friendly response
    return NextResponse.json({
      metadata: {
        generatedAt: new Date().toISOString(),
        startDate,
        endDate,
        totalTransactions: allTransactions.length,
        totalCreators: creators.length,
        apiVersion: "1.0",
        authentication: useApiKey ? "apiKey" : "oauth"
      },
      data: allTransactions
    });

  } catch (error: any) {
    console.error("Hybrid Power BI API Error:", error);
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
