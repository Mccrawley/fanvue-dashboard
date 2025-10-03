import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple test endpoint that doesn't require external API calls
    const testData = {
      message: "Test endpoint working!",
      timestamp: new Date().toISOString(),
      environment: {
        hasApiKey: !!process.env.FANVUE_API_KEY,
        hasApiVersion: !!process.env.FANVUE_API_VERSION,
        nodeEnv: process.env.NODE_ENV
      }
    };

    return NextResponse.json(testData);
  } catch (error: any) {
    console.error("Test endpoint error:", error);
    return NextResponse.json(
      { error: error.message || "Test endpoint failed" },
      { status: 500 }
    );
  }
}
