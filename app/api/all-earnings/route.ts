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
    let startDate = searchParams.get("startDate") || "2025-01-01";
    let endDate = searchParams.get("endDate") || "2025-12-31";
    const maxPages = parseInt(searchParams.get("maxPages") || "5");

    // Convert date to ISO datetime format if only date is provided
    if (startDate && !startDate.includes('T')) {
      startDate = `${startDate}T00:00:00.000Z`;
    }
    if (endDate && !endDate.includes('T')) {
      endDate = `${endDate}T23:59:59.999Z`;
    }

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

    // Fetch earnings for each creator
    const allEarnings: any[] = [];

    for (const creator of creators) {
      try {
        let creatorEarnings: any[] = [];
        let cursor: string | null = null;
        let hasMore = true;
        let pageCount = 0;

        while (hasMore && pageCount < maxPages) {
          const queryParams = new URLSearchParams();
          if (startDate) queryParams.append("startDate", startDate);
          if (endDate) queryParams.append("endDate", endDate);
          if (cursor) queryParams.append("cursor", cursor);
          queryParams.append("size", "50");

          const earningsUrl = `https://api.fanvue.com/creators/${creator.uuid}/insights/earnings?${queryParams}`;

          const earningsResponse = await fetchWithRetry(earningsUrl, {
            method: "GET",
            headers: {
              "X-Fanvue-API-Key": apiKey,
              "X-Fanvue-API-Version": apiVersion,
              "Content-Type": "application/json",
            },
          });

          if (earningsResponse.ok) {
            const earningsData = await earningsResponse.json();
            
            // Add creator info to each earnings record
            const earningsWithCreator = (earningsData.data || []).map((earning: any) => ({
              ...earning,
              creatorUuid: creator.uuid,
              creatorName: creator.displayName,
              creatorHandle: creator.handle
            }));

            creatorEarnings = [...creatorEarnings, ...earningsWithCreator];
            
            cursor = earningsData.nextCursor;
            hasMore = !!cursor;
            pageCount++;

            // Add small delay between requests
            if (hasMore && pageCount < maxPages) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } else {
            console.error(`Failed to fetch earnings for ${creator.displayName}:`, earningsResponse.status);
            break;
          }
        }

        allEarnings.push(...creatorEarnings);
        
        // Add delay between creators to be rate-limit friendly
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`Error fetching earnings for ${creator.displayName}:`, error);
      }
    }

    return NextResponse.json({
      data: allEarnings,
      totalCount: allEarnings.length,
      creatorsProcessed: creators.length,
      dateRange: { startDate, endDate }
    });

  } catch (error: any) {
    console.error("All earnings API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch all earnings data" },
      { status: 500 }
    );
  }
} 