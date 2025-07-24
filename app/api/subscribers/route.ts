import { NextRequest, NextResponse } from "next/server";

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
    const size = searchParams.get("size") || "50";

    // Build query parameters for Fanvue API
    const queryParams = new URLSearchParams();
    queryParams.append("page", page);
    queryParams.append("size", size);

    const fanvueUrl = `https://api.fanvue.com/subscribers?${queryParams}`;

    const response = await fetch(fanvueUrl, {
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
    return NextResponse.json(subscribersData);
  } catch (error) {
    console.error("Subscribers API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscribers data" },
      { status: 500 }
    );
  }
} 