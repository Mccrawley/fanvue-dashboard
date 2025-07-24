import { NextRequest, NextResponse } from "next/server";

// Rate limiting utility
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (attempt === maxRetries) {
        throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt + 1) * 1000;
      console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    return response;
  }
  
  throw new Error("Unexpected error in fetchWithRetry");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorUuid: string }> }
) {
  try {
    const apiKey = process.env.FANVUE_API_KEY;
    const apiVersion = process.env.FANVUE_API_VERSION || "2025-06-26";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
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

      const fanvueUrl = `https://api.fanvue.com/creators/${creatorUuid}/insights/earnings?${queryParams}`;

      const response = await fetchWithRetry(fanvueUrl, {
        method: "GET",
        headers: {
          "X-Fanvue-API-Key": apiKey,
          "X-Fanvue-API-Version": apiVersion,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fanvue API error:", response.status, errorText);
        return NextResponse.json(
          { error: `Fanvue API error: ${response.status}` },
          { status: response.status }
        );
      }

      const earningsData = await response.json();
      allEarnings = [...allEarnings, ...earningsData.data];
      
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