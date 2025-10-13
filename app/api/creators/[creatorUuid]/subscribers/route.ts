import { NextRequest, NextResponse } from "next/server";
import { makeAuthenticatedRequest, isAuthenticated, getAuthUrl } from "@/lib/oauth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorUuid: string }> }
) {
  try {
    // Check if user is authenticated
    if (!isAuthenticated(request)) {
      return NextResponse.json(
        { 
          error: "Authentication required",
          authUrl: getAuthUrl()
        },
        { status: 401 }
      );
    }

    const { creatorUuid } = await params;

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const maxPages = parseInt(searchParams.get("maxPages") || "3"); // Limit to prevent rate limiting

    // Fetch subscribers data with limited pagination to avoid rate limits
    let allSubscribers: any[] = []
    let page = 1
    let hasMore = true
    let pageCount = 0

    while (hasMore && pageCount < maxPages) {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("size", "50"); // Use max size per request

      // Try agency subscribers endpoint first (recommended for OAuth)
      let fanvueUrl = `https://api.fanvue.com/agencies/creators/${creatorUuid}/subscribers?${queryParams}`;
      console.log(`Fetching agency subscribers from: ${fanvueUrl}`);

      let response = await makeAuthenticatedRequest(fanvueUrl, {
        method: "GET",
      }, request);

      console.log(`Agency subscribers request status: ${response.status}`);

      // If agency endpoint fails, try the general creators endpoint
      if (!response.ok && (response.status === 404 || response.status === 403)) {
        console.log("Agency subscribers endpoint failed, trying general creators endpoint...");
        fanvueUrl = `https://api.fanvue.com/creators/${creatorUuid}/subscribers?${queryParams}`;
        console.log(`Fetching subscribers from: ${fanvueUrl}`);
        
        response = await makeAuthenticatedRequest(fanvueUrl, {
          method: "GET",
        }, request);
        console.log(`General subscribers request status: ${response.status}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fanvue API error:", response.status, errorText);
        return NextResponse.json(
          { error: `Fanvue API error: ${response.status}` },
          { status: response.status }
        );
      }

      const subscribersData = await response.json();
      
      console.log(`=== SUBSCRIBERS PAGE ${page} RESPONSE ===`);
      console.log(`Response status: ${response.status}`);
      console.log(`Subscribers data structure:`, JSON.stringify(subscribersData, null, 2));
      
      if (subscribersData.data && Array.isArray(subscribersData.data)) {
        console.log(`✅ Found ${subscribersData.data.length} subscribers on page ${page}`);
        allSubscribers = [...allSubscribers, ...subscribersData.data];
      } else {
        console.log(`❌ No subscribers data found on page ${page}`);
        console.log(`Subscribers data structure:`, Object.keys(subscribersData));
        if (subscribersData.error) {
          console.log(`API Error:`, subscribersData.error);
        }
      }
      
      // Check if there's more data
      hasMore = subscribersData.pagination?.hasMore || false;
      page++;
      pageCount++;

      // Add small delay between requests to be rate-limit friendly
      if (hasMore && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Return data with metadata about pagination
    return NextResponse.json({
      data: allSubscribers,
      pagination: {
        page: 1,
        size: allSubscribers.length,
        hasMore: hasMore,
        pagesFetched: pageCount
      }
    });
  } catch (error: any) {
    console.error("Creator subscribers API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator subscribers data" },
      { status: 500 }
    );
  }
} 