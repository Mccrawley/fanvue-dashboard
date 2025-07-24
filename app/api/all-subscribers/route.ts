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

    // Fetch subscribers for each creator
    const allSubscribers: any[] = [];

    for (const creator of creators) {
      try {
        let creatorSubscribers: any[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= maxPages) {
          const subscribersUrl = `https://api.fanvue.com/creators/${creator.uuid}/subscribers?page=${page}&size=50`;

          const subscribersResponse = await fetchWithRetry(subscribersUrl, {
            method: "GET",
            headers: {
              "X-Fanvue-API-Key": apiKey,
              "X-Fanvue-API-Version": apiVersion,
              "Content-Type": "application/json",
            },
          });

          if (subscribersResponse.ok) {
            const subscribersData = await subscribersResponse.json();
            
            // Add creator info to each subscriber record
            const subscribersWithCreator = (subscribersData.data || []).map((subscriber: any) => ({
              ...subscriber,
              creatorUuid: creator.uuid,
              creatorName: creator.displayName,
              creatorHandle: creator.handle
            }));

            creatorSubscribers = [...creatorSubscribers, ...subscribersWithCreator];
            
            hasMore = subscribersData.pagination?.hasMore || false;
            page++;

            // Add small delay between requests
            if (hasMore && page <= maxPages) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } else {
            console.error(`Failed to fetch subscribers for ${creator.displayName}:`, subscribersResponse.status);
            break;
          }
        }

        allSubscribers.push(...creatorSubscribers);
        
        // Add delay between creators to be rate-limit friendly
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error fetching subscribers for ${creator.displayName}:`, error);
      }
    }

    return NextResponse.json({
      data: allSubscribers,
      totalCount: allSubscribers.length,
      creatorsProcessed: creators.length
    });

  } catch (error: any) {
    console.error("All subscribers API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch all subscribers data" },
      { status: 500 }
    );
  }
} 