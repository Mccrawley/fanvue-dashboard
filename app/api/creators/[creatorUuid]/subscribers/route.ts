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

      const fanvueUrl = `https://api.fanvue.com/creators/${creatorUuid}/subscribers?${queryParams}`;

      const response = await makeAuthenticatedRequest(fanvueUrl, {
        method: "GET",
      }, request);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fanvue API error:", response.status, errorText);
        return NextResponse.json(
          { error: `Fanvue API error: ${response.status}` },
          { status: response.status }
        );
      }

      const subscribersData = await response.json();
      allSubscribers = [...allSubscribers, ...subscribersData.data];
      
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