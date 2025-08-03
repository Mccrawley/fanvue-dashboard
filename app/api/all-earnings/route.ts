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

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
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
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const maxPages = parseInt(searchParams.get("maxPages") || "5");

    // Default to 2025 if no start date provided
    if (!startDate) {
      startDate = "2025-01-01";
    }
    
    // Default to current date if no end date provided
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }

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
      const errorText = await creatorsResponse.text();
      console.error("Fanvue API error:", creatorsResponse.status, errorText);
      return NextResponse.json(
        { error: `Fanvue API error: ${creatorsResponse.status}` },
        { status: creatorsResponse.status }
      );
    }

    const creators = (await creatorsResponse.json()).data || [];
    const allEarnings: any[] = [];

    // Fetch earnings for each creator
    for (const creator of creators) {
      try {
        let page = 1;
        let hasMorePages = true;

        while (hasMorePages && page <= maxPages) {
          // Build query parameters for creator earnings
          const queryParams = new URLSearchParams();
          if (startDate) queryParams.append("startDate", startDate);
          if (endDate) queryParams.append("endDate", endDate);
          queryParams.append("page", page.toString());
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
            const earnings = earningsData.data || [];

            // Add creator info to each earnings record and filter for 2025 data only
            const earningsWithCreator = earnings
              .filter((earning: any) => {
                // Only include earnings from 2025 onwards
                const earningDate = new Date(earning.date);
                const year = earningDate.getFullYear();
                console.log(`Filtering earning date: ${earning.date}, year: ${year}, included: ${year >= 2025}`);
                return year >= 2025;
              })
              .map((earning: any) => ({
                ...earning,
                creatorUuid: creator.uuid,
                creatorName: creator.name,
                creatorHandle: creator.handle
              }));

            allEarnings.push(...earningsWithCreator);

            // Check if there are more pages
            hasMorePages = earningsData.pagination?.hasNextPage && earnings.length > 0;
            page++;
          } else {
            console.error(`Error fetching earnings for creator ${creator.uuid}:`, earningsResponse.status);
            break;
          }
        }
      } catch (error) {
        console.error(`Error processing creator ${creator.uuid}:`, error);
        continue;
      }
    }

    const jsonResponse = NextResponse.json({
      data: allEarnings,
      totalRecords: allEarnings.length,
      creatorsProcessed: creators.length,
      dateRange: { startDate, endDate }
    });
    
    // Add CORS headers
    jsonResponse.headers.set('Access-Control-Allow-Origin', '*');
    jsonResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    jsonResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return jsonResponse;

  } catch (error: any) {
    console.error("All earnings API error:", error);
    const errorResponse = NextResponse.json(
      { error: error.message || "Failed to fetch all earnings data" },
      { status: 500 }
    );
    
    // Add CORS headers to error response
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return errorResponse;
  }
} 