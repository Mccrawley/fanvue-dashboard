import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.FANVUE_API_KEY;
    const apiVersion = process.env.FANVUE_API_VERSION || "2025-06-26";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.fanvue.com/users/me", {
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

    const profileData = await response.json();
    return NextResponse.json(profileData);
  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile data" },
      { status: 500 }
    );
  }
} 