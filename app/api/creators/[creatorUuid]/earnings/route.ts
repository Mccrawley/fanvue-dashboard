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
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const maxPages = parseInt(searchParams.get("maxPages") || "5"); // Limit to prevent rate limiting

    // Convert date to ISO datetime format if only date is provided
    if (startDate && !startDate.includes('T')) {
      startDate = `${startDate}T00:00:00.000Z`;
    }
    if (endDate && !endDate.includes('T')) {
      endDate = `${endDate}T23:59:59.999Z`;
    }

    // Fetch earnings data with limited pagination to avoid rate limits
    let allEarnings: any[] = []
    let cursor: string | null = null
    let hasMore = true
    let pageCount = 0

    while (hasMore && pageCount < maxPages) {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);
      if (cursor) queryParams.append("cursor", cursor);
      queryParams.append("size", "50"); // Use max size per request

      // Try agency earnings endpoint first (recommended for OAuth)
      let fanvueUrl = `https://api.fanvue.com/agencies/creators/${creatorUuid}/insights/earnings?${queryParams}`;
      console.log(`Fetching agency earnings from: ${fanvueUrl}`);

      let response = await makeAuthenticatedRequest(fanvueUrl, {
        method: "GET",
      }, request);

      console.log(`Agency earnings request status: ${response.status}`);

      // If agency endpoint fails, try the general creators endpoint
      if (!response.ok && (response.status === 404 || response.status === 403)) {
        console.log("Agency earnings endpoint failed, trying general creators endpoint...");
        fanvueUrl = `https://api.fanvue.com/creators/${creatorUuid}/insights/earnings?${queryParams}`;
        console.log(`Fetching earnings from: ${fanvueUrl}`);
        
        response = await makeAuthenticatedRequest(fanvueUrl, {
          method: "GET",
        }, request);
        console.log(`General earnings request status: ${response.status}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fanvue API error:", response.status, errorText);
        return NextResponse.json(
          { error: `Fanvue API error: ${response.status}` },
          { status: response.status }
        );
      }

      const earningsData = await response.json();
      
      console.log(`=== EARNINGS PAGE ${pageCount + 1} RESPONSE ===`);
      console.log(`Response status: ${response.status}`);
      console.log(`Earnings data structure:`, JSON.stringify(earningsData, null, 2));
      
      if (earningsData.data && Array.isArray(earningsData.data)) {
        console.log(`✅ Found ${earningsData.data.length} earnings entries on page ${pageCount + 1}`);
        allEarnings = [...allEarnings, ...earningsData.data];
      } else {
        console.log(`❌ No earnings data found on page ${pageCount + 1}`);
        console.log(`Earnings data structure:`, Object.keys(earningsData));
        if (earningsData.error) {
          console.log(`API Error:`, earningsData.error);
        }
      }
      
      // Check if there's more data
      cursor = earningsData.nextCursor;
      hasMore = !!cursor;
      pageCount++;

      // Add small delay between requests to be rate-limit friendly
      if (hasMore && pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Return data with metadata about pagination
    return NextResponse.json({
      data: allEarnings,
      totalCount: allEarnings.length,
      hasMore: hasMore,
      pagesFetched: pageCount
    });
  } catch (error: any) {
    console.error("Creator earnings API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creator earnings data" },
      { status: 500 }
    );
  }
} 