import { NextRequest, NextResponse } from "next/server";
import { makeAuthenticatedRequest, isAuthenticated, getAuthUrl } from "@/lib/oauth";

// Rate limiting utility
async function _fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
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

    // Fetch ALL creators with pagination
    let allCreators: any[] = [];
    let hasMore = true;
    let page = 1;
    const pageSize = 50; // Use larger page size to reduce API calls
    let totalPages = 0;
    const maxPages = 10; // Safety limit to prevent infinite loops

    while (hasMore && totalPages < maxPages) {
      // Build query parameters for Fanvue API
      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("size", pageSize.toString());

      const fanvueUrl = `https://api.fanvue.com/creators?${queryParams}`;
      
      console.log(`Fetching creators from: ${fanvueUrl}`);

      const response = await makeAuthenticatedRequest(fanvueUrl, {
        method: "GET",
      }, request);

      console.log(`Fanvue API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fanvue API error:", response.status, errorText);
        return NextResponse.json(
          { error: `Fanvue API error: ${response.status}` },
          { status: response.status }
        );
      }

      const pageData = await response.json();
      
      console.log(`Page ${page} data:`, JSON.stringify(pageData, null, 2));
      
      // Add creators from this page
      if (pageData.data && Array.isArray(pageData.data)) {
        console.log(`Found ${pageData.data.length} creators on page ${page}`);
        allCreators = [...allCreators, ...pageData.data];
      } else {
        console.log(`No creators data found on page ${page}. PageData structure:`, Object.keys(pageData));
      }

      // Check if there's more data
      hasMore = pageData.pagination?.hasMore || false;
      console.log(`Has more pages: ${hasMore}`);
      page++;
      totalPages++;

      // Add small delay between requests to be rate-limit friendly
      if (hasMore && totalPages < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Fetched ${allCreators.length} creators across ${totalPages} pages`);

    // Return all creators with pagination metadata
    return NextResponse.json({
      data: allCreators,
      pagination: {
        total: allCreators.length,
        pagesFetched: totalPages,
        hasMore: hasMore
      }
    });
  } catch (error: any) {
    console.error("Creators API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creators data" },
      { status: 500 }
    );
  }
} 