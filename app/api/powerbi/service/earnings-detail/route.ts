import { NextRequest, NextResponse } from "next/server";

/**
 * Service Account Power BI Endpoint: Earnings Detail
 * 
 * This endpoint provides REAL transaction-level earnings data for Power BI integration.
 * Uses server-side OAuth tokens that are refreshed automatically.
 * No browser authentication required - works directly with Power BI.
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

// Service account OAuth tokens (these would be set in environment variables)
const SERVICE_ACCOUNT_TOKENS = {
  accessToken: process.env.SERVICE_ACCESS_TOKEN,
  refreshToken: process.env.SERVICE_REFRESH_TOKEN,
  tokenType: "Bearer"
};

async function makeServiceAuthenticatedRequest(url: string, options: RequestInit = {}) {
  const headers = {
    ...options.headers,
    "Authorization": `${SERVICE_ACCOUNT_TOKENS.tokenType} ${SERVICE_ACCOUNT_TOKENS.accessToken}`,
    "X-Fanvue-API-Version": "2025-06-26",
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401 && SERVICE_ACCOUNT_TOKENS.refreshToken) {
    console.log("Access token expired, attempting refresh...");
    
    // Try to refresh the token
    const refreshResponse = await fetch("https://api.fanvue.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${process.env.FANVUE_CLIENT_ID}:${process.env.FANVUE_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: SERVICE_ACCOUNT_TOKENS.refreshToken,
      }),
    });

    if (refreshResponse.ok) {
      const tokenData = await refreshResponse.json();
      console.log("Token refreshed successfully");
      
      // Update the tokens (in a real implementation, you'd store these)
      SERVICE_ACCOUNT_TOKENS.accessToken = tokenData.access_token;
      SERVICE_ACCOUNT_TOKENS.refreshToken = tokenData.refresh_token;
      
      // Retry the original request with new token
      const retryHeaders = {
        ...options.headers,
        "Authorization": `${SERVICE_ACCOUNT_TOKENS.tokenType} ${SERVICE_ACCOUNT_TOKENS.accessToken}`,
        "X-Fanvue-API-Version": "2025-06-26",
        "Content-Type": "application/json",
      };

      return fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    }
  }

  return response;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if service account tokens are configured
    if (!SERVICE_ACCOUNT_TOKENS.accessToken) {
      return NextResponse.json(
        { 
          error: "Service account not configured",
          message: "SERVICE_ACCESS_TOKEN environment variable not set"
        },
        { status: 500 }
      );
    }
    
    // Default to last 30 days if no date range provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const startDate = searchParams.get("startDate") || defaultStartDate.toISOString().split('T')[0];
    const endDate = searchParams.get("endDate") || defaultEndDate.toISOString().split('T')[0];
    const creatorIdFilter = searchParams.get("creatorId");

    console.log(`=== SERVICE ACCOUNT POWER BI EARNINGS DETAIL REQUEST ===`);
    console.log(`Date range: ${startDate} to ${endDate}`);
    if (creatorIdFilter) console.log(`Creator filter: ${creatorIdFilter}`);

    // Step 1: Fetch all creators (or single creator if filtered) using service account OAuth
    let creators: any[] = [];
    
    if (creatorIdFilter) {
      // Fetch single creator data
      creators = [{ uuid: creatorIdFilter, displayName: 'Filtered Creator', handle: 'filtered' }];
    } else {
      // Fetch all creators using service account OAuth
      const creatorsUrl = `https://api.fanvue.com/agencies/creators?size=50`;
      console.log(`Fetching creators from: ${creatorsUrl}`);
      
      const creatorsResponse = await makeServiceAuthenticatedRequest(creatorsUrl, {
        method: "GET",
      });

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

    // Step 2: Fetch REAL earnings for each creator
    const allTransactions: any[] = [];

    for (const creator of creators) {
      const creatorId = creator.uuid;
      const creatorName = creator.displayName || 'Unknown';
      const creatorHandle = creator.handle || 'unknown';

      console.log(`Fetching REAL earnings for ${creatorName} (${creatorId})...`);

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
          
          const earningsResponse = await makeServiceAuthenticatedRequest(earningsUrl, {
            method: "GET",
          });

          if (!earningsResponse.ok) {
            console.log(`  Failed to fetch earnings: ${earningsResponse.status}`);
            break;
          }

          const earningsData = await earningsResponse.json();
          const transactions = earningsData.data || [];

          console.log(`  Page ${pageCount + 1}: ${transactions.length} REAL transactions`);

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

    console.log(`✅ Total REAL transactions collected: ${allTransactions.length}`);

    // Return Power BI-friendly response
    return NextResponse.json({
      metadata: {
        generatedAt: new Date().toISOString(),
        startDate,
        endDate,
        totalTransactions: allTransactions.length,
        totalCreators: creators.length,
        apiVersion: "1.0",
        authentication: "service-account",
        dataSource: "real"
      },
      data: allTransactions
    });

  } catch (error: any) {
    console.error("Service Account Power BI API Error:", error);
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
