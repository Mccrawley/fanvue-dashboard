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
    const page = searchParams.get("page") || "1";
    const size = searchParams.get("size") || "15";

    // Build query parameters for Fanvue API
    const queryParams = new URLSearchParams();
    queryParams.append("page", page);
    queryParams.append("size", size);

    const fanvueUrl = `https://api.fanvue.com/creators?${queryParams}`;

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