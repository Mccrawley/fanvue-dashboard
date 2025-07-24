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

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.FANVUE_API_KEY;
    const apiVersion = process.env.FANVUE_API_VERSION || "2025-06-26";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const maxPages = parseInt(searchParams.get("maxPages") || "5");

    // Get all creators (up to 50)
    const creatorsResponse = await fetchWithRetry("https://api.fanvue.com/creators?page=1&size=50", {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": apiKey,
        "X-Fanvue-API-Version": apiVersion,
        "Content-Type": "application/json",
      },
    });

    if (!creatorsResponse.ok) {
      const errorText = await creatorsResponse.text();
      console.error("Fanvue API error:", creatorsResponse.status, errorText);
      return NextResponse.json(
        { error: `Fanvue API error: ${creatorsResponse.status}` },
        { status: creatorsResponse.status }
      );
    }

    const creators = (await creatorsResponse.json()).data || [];
    const allFollowers: any[] = [];

    // Fetch followers for each creator
    for (const creator of creators) {
      try {
        let page = 1;
        let hasMorePages = true;

        while (hasMorePages && page <= maxPages) {
          // Build query parameters for creator followers
          const queryParams = new URLSearchParams();
          queryParams.append("page", page.toString());
          queryParams.append("size", "50");

          const followersUrl = `https://api.fanvue.com/creators/${creator.uuid}/followers?${queryParams}`;

          const followersResponse = await fetchWithRetry(followersUrl, {
            method: "GET",
            headers: {
              "X-Fanvue-API-Key": apiKey,
              "X-Fanvue-API-Version": apiVersion,
              "Content-Type": "application/json",
            },
          });

          if (followersResponse.ok) {
            const followersData = await followersResponse.json();
            const followers = followersData.data || [];

            // Add creator info to each follower record
            const followersWithCreator = followers.map((follower: any) => ({
              ...follower,
              creatorUuid: creator.uuid,
              creatorName: creator.name,
              creatorHandle: creator.handle
            }));

            allFollowers.push(...followersWithCreator);

            // Check if there are more pages
            hasMorePages = followersData.pagination?.hasNextPage && followers.length > 0;
            page++;
          } else {
            console.error(`Error fetching followers for creator ${creator.uuid}:`, followersResponse.status);
            break;
          }
        }
      } catch (error) {
        console.error(`Error processing creator ${creator.uuid}:`, error);
        continue;
      }
    }

    return NextResponse.json({
      data: allFollowers,
      totalRecords: allFollowers.length,
      creatorsProcessed: creators.length
    });

  } catch (error: any) {
    console.error("All followers API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch all followers data" },
      { status: 500 }
    );
  }
} 