import { NextRequest, NextResponse } from "next/server";
import { makeAuthenticatedRequest } from "@/lib/oauth";

/**
 * Real Data Power BI Endpoint: Creators Summary
 * 
 * This endpoint provides REAL data from Fanvue API for Power BI integration.
 * Uses server-side OAuth authentication (no browser cookies required).
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

    console.log(`=== REAL DATA POWER BI CREATORS SUMMARY REQUEST ===`);
    console.log(`Date range: ${startDate} to ${endDate}`);

    // Step 1: Fetch all creators using OAuth
    const creatorsUrl = `https://api.fanvue.com/agencies/creators?size=50`;
    console.log(`Fetching creators from: ${creatorsUrl}`);
    
    const creatorsResponse = await makeAuthenticatedRequest(creatorsUrl, {
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

        // Fetch earnings, followers, and subscribers in parallel using OAuth
        const [earningsRes, followersRes, subscribersRes] = await Promise.allSettled([
          // Earnings with date range
          makeAuthenticatedRequest(
            `https://api.fanvue.com/agencies/creators/${creatorId}/insights/earnings?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z&size=50`,
            { method: "GET" }
          ).catch(() => null),
          
          // Followers (current count, not date-filtered)
          makeAuthenticatedRequest(
            `https://api.fanvue.com/agencies/creators/${creatorId}/followers?size=50`,
            { method: "GET" }
          ).catch(() => null),
          
          // Subscribers (current count, not date-filtered)
          makeAuthenticatedRequest(
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
        authentication: "oauth",
        dataSource: "real"
      },
      data: successfulSummaries
    });

  } catch (error: any) {
    console.error("Real Data Power BI API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
