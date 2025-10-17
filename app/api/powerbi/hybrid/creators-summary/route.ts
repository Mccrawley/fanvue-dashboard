import { NextRequest, NextResponse } from "next/server";
import { makeAuthenticatedRequest } from "@/lib/oauth";

/**
 * Hybrid Power BI Endpoint: Creators Summary
 * 
 * This endpoint supports both OAuth (for browser) and API key (for Power BI) authentication.
 * 
 * Query Parameters:
 * - apiKey (optional): Power BI API key for external access
 * - startDate (optional): ISO date string (e.g., 2025-01-01)
 * - endDate (optional): ISO date string (e.g., 2025-12-31)
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

    console.log(`=== HYBRID POWER BI CREATORS SUMMARY REQUEST ===`);
    console.log(`Authentication: ${useApiKey ? 'API Key' : 'OAuth'}`);
    console.log(`Date range: ${startDate} to ${endDate}`);

    // Step 1: Fetch all creators
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
          useApiKey ? 
            fetch(
              `https://api.fanvue.com/agencies/creators/${creatorId}/insights/earnings?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z&size=50`,
              {
                method: "GET",
                headers: {
                  "X-Fanvue-API-Key": process.env.FANVUE_API_KEY!,
                  "X-Fanvue-API-Version": process.env.FANVUE_API_VERSION || "2025-06-26",
                  "Content-Type": "application/json",
                },
              }
            ).catch(() => null) :
            makeAuthenticatedRequest(
              `https://api.fanvue.com/agencies/creators/${creatorId}/insights/earnings?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z&size=50`,
              { method: "GET" }
            ).catch(() => null),
          
          // Followers (current count, not date-filtered)
          useApiKey ?
            fetch(
              `https://api.fanvue.com/agencies/creators/${creatorId}/followers?size=50`,
              {
                method: "GET",
                headers: {
                  "X-Fanvue-API-Key": process.env.FANVUE_API_KEY!,
                  "X-Fanvue-API-Version": process.env.FANVUE_API_VERSION || "2025-06-26",
                  "Content-Type": "application/json",
                },
              }
            ).catch(() => null) :
            makeAuthenticatedRequest(
              `https://api.fanvue.com/agencies/creators/${creatorId}/followers?size=50`,
              { method: "GET" }
            ).catch(() => null),
          
          // Subscribers (current count, not date-filtered)
          useApiKey ?
            fetch(
              `https://api.fanvue.com/agencies/creators/${creatorId}/subscribers?size=50`,
              {
                method: "GET",
                headers: {
                  "X-Fanvue-API-Key": process.env.FANVUE_API_KEY!,
                  "X-Fanvue-API-Version": process.env.FANVUE_API_VERSION || "2025-06-26",
                  "Content-Type": "application/json",
                },
              }
            ).catch(() => null) :
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
        authentication: useApiKey ? "apiKey" : "oauth"
      },
      data: successfulSummaries
    });

  } catch (error: any) {
    console.error("Hybrid Power BI API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
