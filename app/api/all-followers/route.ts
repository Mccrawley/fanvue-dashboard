import { NextRequest, NextResponse } from "next/server";

// Rate limiting utility
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      if (attempt === maxRetries) {
        throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
      }
      
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
    const maxPages = parseInt(searchParams.get("maxPages") || "3");

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
      return NextResponse.json(
        { error: "Failed to fetch creators" },
        { status: creatorsResponse.status }
      );
    }

    const creatorsData = await creatorsResponse.json();
    const creators = creatorsData.data || [];

    // Fetch followers for each creator
    const allFollowers: any[] = [];

    for (const creator of creators) {
      try {
        let creatorFollowers: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= maxPages) {
          const followersUrl = `https://api.fanvue.com/creators/${creator.uuid}/followers?page=${page}&size=50`;

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
            
            // Add creator info to each follower record
            const followersWithCreator = (followersData.data || []).map((follower: any) => ({
              ...follower,
              creatorUuid: creator.uuid,
              creatorName: creator.displayName,
              creatorHandle: creator.handle
            }));

            creatorFollowers = [...creatorFollowers, ...followersWithCreator];
            
            hasMore = followersData.pagination?.hasMore || false;
            page++;

            // Add small delay between requests
            if (hasMore && page <= maxPages) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } else {
            console.error(`Failed to fetch followers for ${creator.displayName}:`, followersResponse.status);
            break;
          }
        }

        allFollowers.push(...creatorFollowers);
        
        // Add delay between creators to be rate-limit friendly
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error fetching followers for ${creator.displayName}:`, error);
      }
    }

    return NextResponse.json({
      data: allFollowers,
      totalCount: allFollowers.length,
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