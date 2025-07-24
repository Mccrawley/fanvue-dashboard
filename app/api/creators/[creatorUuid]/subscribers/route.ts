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