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

    // Fetch followers data with limited pagination to avoid rate limits
    let allFollowers: any[] = []
    let page = 1
    let hasMore = true
    let pageCount = 0

    while (hasMore && pageCount < maxPages) {
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("size", "50"); // Use max size per request

      // Try agency followers endpoint first (recommended for OAuth)
      let fanvueUrl = `https://api.fanvue.com/agencies/creators/${creatorUuid}/followers?${queryParams}`;
      console.log(`Fetching agency followers from: ${fanvueUrl}`);

      let response = await makeAuthenticatedRequest(fanvueUrl, {
        method: "GET",
      }, request);

      console.log(`Agency followers request status: ${response.status}`);

      // If agency endpoint fails, try the general creators endpoint
      if (!response.ok && (response.status === 404 || response.status === 403)) {
        console.log("Agency followers endpoint failed, trying general creators endpoint...");
        fanvueUrl = `https://api.fanvue.com/creators/${creatorUuid}/followers?${queryParams}`;
        console.log(`Fetching followers from: ${fanvueUrl}`);
        
        response = await makeAuthenticatedRequest(fanvueUrl, {
          method: "GET",
        }, request);
        console.log(`General followers request status: ${response.status}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fanvue API error:", response.status, errorText);
        return NextResponse.json(
          { error: `Fanvue API error: ${response.status}` },
          { status: response.status }
        );
      }

      const followersData = await response.json();
      
      console.log(`=== FOLLOWERS PAGE ${page} RESPONSE ===`);
      console.log(`Response status: ${response.status}`);
      console.log(`Followers data structure:`, JSON.stringify(followersData, null, 2));
      
      if (followersData.data && Array.isArray(followersData.data)) {
        console.log(`✅ Found ${followersData.data.length} followers on page ${page}`);
        allFollowers = [...allFollowers, ...followersData.data];
      } else {
        console.log(`❌ No followers data found on page ${page}`);
        console.log(`Followers data structure:`, Object.keys(followersData));
        if (followersData.error) {
          console.log(`API Error:`, followersData.error);
        }
      }
      
      // Check if there's more data
      hasMore = followersData.pagination?.hasMore || false;
      page++;
      pageCount++;

      // Add small delay between requests to be rate-limit friendly
      if (hasMore && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Return data with metadata about pagination
    return NextResponse.json({
      data: allFollowers,
      pagination: {
        page: 1,
        size: allFollowers.length,
        hasMore: hasMore,
        pagesFetched: pageCount
      }
    });
  } catch (error: any) {
    console.error("Creator followers API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator followers data" },
      { status: 500 }
    );
  }
} 