import { NextRequest, NextResponse } from "next/server";

/**
 * Public Power BI Endpoint: Creators Summary
 * 
 * This endpoint is designed for Power BI integration and uses API key authentication
 * instead of OAuth to avoid browser-based authentication issues.
 * 
 * Query Parameters:
 * - apiKey: Your Power BI API key (set in environment variables)
 * - startDate: ISO date string (e.g., 2025-01-01)
 * - endDate: ISO date string (e.g., 2025-12-31)
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
    
    // Check API key authentication
    const apiKey = searchParams.get("apiKey");
    const expectedApiKey = process.env.POWERBI_API_KEY;
    
    if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { 
          error: "Invalid or missing API key",
          message: "Please provide a valid apiKey parameter"
        },
        { status: 401 }
      );
    }

    // Default to last 30 days if no date range provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    const startDate = searchParams.get("startDate") || defaultStartDate.toISOString().split('T')[0];
    const endDate = searchParams.get("endDate") || defaultEndDate.toISOString().split('T')[0];

    console.log(`=== PUBLIC POWER BI CREATORS SUMMARY REQUEST ===`);
    console.log(`Date range: ${startDate} to ${endDate}`);

    // Step 1: Fetch all creators using API key
    const apiKeyEnv = process.env.FANVUE_API_KEY;
    const apiVersion = process.env.FANVUE_API_VERSION || "2025-06-26";
    
    if (!apiKeyEnv) {
      return NextResponse.json(
        { error: "Fanvue API key not configured" },
        { status: 500 }
      );
    }

    const creatorsUrl = `https://api.fanvue.com/agencies/creators?size=50`;
    console.log(`Fetching creators from: ${creatorsUrl}`);
    
    const creatorsResponse = await fetch(creatorsUrl, {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": apiKeyEnv,
        "X-Fanvue-API-Version": apiVersion,
        "Content-Type": "application/json",
      },
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

        console.log(`Fetching stats for ${creatorName} (${creatorId})...`);

        // Fetch earnings, followers, and subscribers in parallel
        const [earningsRes, followersRes, subscribersRes] = await Promise.allSettled([
          // Earnings with date range
          fetch(
            `https://api.fanvue.com/agencies/creators/${creatorId}/insights/earnings?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z&size=50`,
            {
              method: "GET",
              headers: {
                "X-Fanvue-API-Key": apiKeyEnv,
                "X-Fanvue-API-Version": apiVersion,
                "Content-Type": "application/json",
              },
            }
          ).catch(() => null),
          
          // Followers (current count, not date-filtered)
          fetch(
            `https://api.fanvue.com/agencies/creators/${creatorId}/followers?size=50`,
            {
              method: "GET",
              headers: {
                "X-Fanvue-API-Key": apiKeyEnv,
                "X-Fanvue-API-Version": apiVersion,
                "Content-Type": "application/json",
              },
            }
          ).catch(() => null),
          
          // Subscribers (current count, not date-filtered)
          fetch(
            `https://api.fanvue.com/agencies/creators/${creatorId}/subscribers?size=50`,
            {
              method: "GET",
              headers: {
                "X-Fanvue-API-Key": apiKeyEnv,
                "X-Fanvue-API-Version": apiVersion,
                "Content-Type": "application/json",
              },
            }
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
          
          console.log(`  Earnings: $${totalRevenue.toFixed(2)} from ${totalTransactions} transactions`);
        } else {
          console.log(`  Earnings: Failed to fetch`);
        }

        // Process followers
        let totalFollowers = 0;
        if (followersRes.status === 'fulfilled' && followersRes.value?.ok) {
          const followersData = await followersRes.value.json();
          totalFollowers = followersData.data?.length || 0;
          console.log(`  Followers: ${totalFollowers}`);
        } else {
          console.log(`  Followers: Failed to fetch`);
        }

        // Process subscribers
        let totalSubscribers = 0;
        if (subscribersRes.status === 'fulfilled' && subscribersRes.value?.ok) {
          const subscribersData = await subscribersRes.value.json();
          totalSubscribers = subscribersData.data?.length || 0;
          console.log(`  Subscribers: ${totalSubscribers}`);
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

    console.log(`✅ Successfully processed ${successfulSummaries.length} creators`);

    // Return Power BI-friendly response
    return NextResponse.json({
      metadata: {
        generatedAt: new Date().toISOString(),
        startDate,
        endDate,
        totalCreators: successfulSummaries.length,
        apiVersion: "1.0",
        authentication: "apiKey"
      },
      data: successfulSummaries
    });

  } catch (error: any) {
    console.error("Public Power BI API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
