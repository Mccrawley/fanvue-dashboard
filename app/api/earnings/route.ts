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
    let startDate = searchParams.get("startDate");
    let endDate = searchParams.get("endDate");
    const cursor = searchParams.get("cursor");
    const size = searchParams.get("size") || "50";

    // Convert date to ISO datetime format if only date is provided
    if (startDate && !startDate.includes('T')) {
      startDate = `${startDate}T00:00:00.000Z`;
    }
    if (endDate && !endDate.includes('T')) {
      endDate = `${endDate}T23:59:59.999Z`;
    }

    // Build query parameters for Fanvue API
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append("startDate", startDate);
    if (endDate) queryParams.append("endDate", endDate);
    if (cursor) queryParams.append("cursor", cursor);
    queryParams.append("size", size);

    const fanvueUrl = `https://api.fanvue.com/insights/earnings?${queryParams}`;

    // Make request to Fanvue API
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

    const earningsData = await response.json();
    return NextResponse.json(earningsData);
  } catch (error) {
    console.error("Earnings API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch earnings data" },
      { status: 500 }
    );
  }
} 