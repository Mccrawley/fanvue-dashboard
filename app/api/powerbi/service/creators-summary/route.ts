import { NextRequest, NextResponse } from "next/server";

/**
 * Service Account Power BI Endpoint: Creators Summary
 * 
 * This endpoint provides REAL data from Fanvue API for Power BI integration.
 * Uses server-side OAuth tokens that are refreshed automatically.
 * No browser authentication required - works directly with Power BI.
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
    
    // Try to refresh the token using client_secret_basic
    const refreshResponse = await fetch("https://api.fanvue.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${process.env.FANVUE_OAUTH_CLIENT_ID}:${process.env.FANVUE_OAUTH_CLIENT_SECRET}`).toString('base64')}`,
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

    console.log(`=== SERVICE ACCOUNT POWER BI CREATORS SUMMARY REQUEST ===`);
    console.log(`Date range: ${startDate} to ${endDate}`);

    // Step 1: Fetch all creators using service account OAuth
    const creatorsUrl = `https://api.fanvue.com/creators?size=50`;
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
    const creators = creatorsData.data || [];
    
    console.log(`✅ Found ${creators.length} creators`);

    // Step 2: Fetch detailed stats for each creator
    const creatorSummaries = await Promise.allSettled(
      creators.map(async (creator: any) => {
        const creatorId = creator.uuid;
        const creatorName = creator.displayName || 'Unknown';
        const creatorHandle = creator.handle || 'unknown';

        console.log(`Fetching REAL stats for ${creatorName} (${creatorId})...`);

        // Fetch earnings, followers, and subscribers in parallel using service account OAuth
        const [earningsRes, followersRes, subscribersRes] = await Promise.allSettled([
          // Earnings with date range
          makeServiceAuthenticatedRequest(
            `https://api.fanvue.com/agencies/creators/${creatorId}/insights/earnings?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z&size=50`,
            { method: "GET" }
          ).catch(() => null),
          
          // Followers (current count, not date-filtered)
          makeServiceAuthenticatedRequest(
            `https://api.fanvue.com/agencies/creators/${creatorId}/followers?size=50`,
            { method: "GET" }
          ).catch(() => null),
          
          // Subscribers (current count, not date-filtered)
          makeServiceAuthenticatedRequest(
            `https://api.fanvue.com/agencies/creators/${creatorId}/subscribers?size=50`,
            { method: "GET" }
          ).catch(() => null)
        ]);

        // Process earnings
        let totalRevenue = 0;
        let totalTransactions = 0;
        let earningsDataArray: any[] = [];

        if (earningsRes.status === 'fulfilled' && earningsRes.value?.ok) {
          const earningsData = await earningsRes.value.json();
          earningsDataArray = earningsData.data || [];
          
          totalRevenue = earningsDataArray.reduce((sum, item) => {
            return sum + (item.net || 0) / 100; // Convert cents to dollars
          }, 0);
          
          totalTransactions = earningsDataArray.length;
          
          console.log(`  REAL Earnings: $${totalRevenue.toFixed(2)} from ${totalTransactions} transactions`);
        } else {
          console.log(`  Earnings: Failed to fetch`);
        }

        // Process followers
        let totalFollowers = 0;
        if (followersRes.status === 'fulfilled' && followersRes.value?.ok) {
          const followersData = await followersRes.value.json();
          totalFollowers = followersData.data?.length || 0;
          console.log(`  REAL Followers: ${totalFollowers}`);
        } else {
          console.log(`  Followers: Failed to fetch`);
        }

        // Process subscribers
        let totalSubscribers = 0;
        if (subscribersRes.status === 'fulfilled' && subscribersRes.value?.ok) {
          const subscribersData = await subscribersRes.value.json();
          totalSubscribers = subscribersData.data?.length || 0;
          console.log(`  REAL Subscribers: ${totalSubscribers}`);
        } else {
          console.log(`  Subscribers: Failed to fetch`);
        }

        // Calculate average transaction value
        const avgTransactionValue = totalTransactions > 0 
          ? totalRevenue / totalTransactions 
          : 0;

        return {
          creatorId,
          creatorName,
          creatorHandle,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalTransactions,
          totalFollowers,
          totalSubscribers,
          avgTransactionValue: parseFloat(avgTransactionValue.toFixed(2)),
          lastUpdated: new Date().toISOString()
        };
      })
    );

    // Filter out failed requests and extract successful data
    const successfulSummaries = creatorSummaries
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    console.log(`✅ Successfully processed ${successfulSummaries.length} creators with REAL data`);

    // Return Power BI-friendly response
    return NextResponse.json({
      metadata: {
        generatedAt: new Date().toISOString(),
        startDate,
        endDate,
        totalCreators: successfulSummaries.length,
        apiVersion: "1.0",
        authentication: "service-account",
        dataSource: "real"
      },
      data: successfulSummaries
    });

  } catch (error: any) {
    console.error("Service Account Power BI API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
