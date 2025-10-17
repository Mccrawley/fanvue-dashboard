import { NextRequest, NextResponse } from "next/server";

/**
 * List All Creators Endpoint
 * 
 * This endpoint returns all creator UUIDs and basic info
 * for easy reference and testing.
 */

export async function GET(request: NextRequest) {
  try {
    console.log("=== LIST CREATORS ENDPOINT ===");
    
    // Get OAuth tokens from cookies (if available)
    const accessToken = request.cookies.get('fanvue_access_token')?.value;
    const refreshToken = request.cookies.get('fanvue_refresh_token')?.value;
    const tokenType = request.cookies.get('fanvue_token_type')?.value || 'Bearer';

    if (!accessToken) {
      return NextResponse.json({
        error: "No OAuth tokens available",
        message: "Please login to the dashboard first",
        loginUrl: "https://fanvue-dashboard.vercel.app/api/auth/authorize"
      }, { status: 401 });
    }

    console.log("Fetching creators with OAuth token...");
    
    // Fetch all creators
    const creatorsResponse = await fetch("https://api.fanvue.com/creators?size=50", {
      method: "GET",
      headers: {
        "Authorization": `${tokenType} ${accessToken}`,
        "X-Fanvue-API-Version": "2025-06-26",
        "Content-Type": "application/json",
      },
    });

    if (!creatorsResponse.ok) {
      const errorText = await creatorsResponse.text();
      console.error("Failed to fetch creators:", creatorsResponse.status, errorText);
      return NextResponse.json(
        { error: `Failed to fetch creators: ${creatorsResponse.status}`, details: errorText },
        { status: creatorsResponse.status }
      );
    }

    const creatorsData = await creatorsResponse.json();
    const creators = creatorsData.data || [];
    
    console.log(`✅ Found ${creators.length} creators`);

    // Format the response
    const formattedCreators = creators.map((creator: any, index: number) => ({
      index: index + 1,
      uuid: creator.uuid,
      displayName: creator.displayName || 'Unknown',
      handle: creator.handle || 'unknown',
      role: creator.role || 'Unknown'
    }));

    return NextResponse.json({
      message: "All creators retrieved successfully",
      timestamp: new Date().toISOString(),
      totalCount: creators.length,
      creators: formattedCreators,
      // Also provide just the UUIDs for easy copying
      uuids: creators.map((creator: any) => creator.uuid)
    });

  } catch (error: any) {
    console.error("List creators error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
