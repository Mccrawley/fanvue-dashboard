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

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const size = searchParams.get("size") || "15";

    // Build query parameters for Fanvue API
    const queryParams = new URLSearchParams();
    queryParams.append("page", page);
    queryParams.append("size", size);

    const fanvueUrl = `https://api.fanvue.com/creators?${queryParams}`;

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

    const creatorsData = await response.json();
    return NextResponse.json(creatorsData);
  } catch (error: any) {
    console.error("Creators API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creators data" },
      { status: 500 }
    );
  }
} 