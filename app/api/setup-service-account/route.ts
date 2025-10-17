import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Setup Service Account Endpoint
 * 
 * This endpoint gets the current OAuth tokens from your browser session
 * and provides them for setting up the service account environment variables.
 * 
 * Usage:
 * 1. Login to the dashboard first (to establish OAuth session)
 * 2. Call this endpoint to get your tokens
 * 3. Set the tokens as environment variables in Vercel
 */

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Get OAuth tokens from cookies
    const accessToken = cookieStore.get('fanvue_access_token')?.value;
    const refreshToken = cookieStore.get('fanvue_refresh_token')?.value;
    const tokenType = cookieStore.get('fanvue_token_type')?.value;

    if (!accessToken || !refreshToken) {
      return NextResponse.json({
        error: "No OAuth tokens found",
        message: "Please login to the dashboard first to establish OAuth session",
        instructions: [
          "1. Go to https://fanvue-dashboard.vercel.app",
          "2. Click 'Login' and complete OAuth flow",
          "3. Then call this endpoint again"
        ]
      }, { status: 401 });
    }

    // Get environment variables
    const clientId = process.env.FANVUE_CLIENT_ID;
    const clientSecret = process.env.FANVUE_OAUTH_CLIENT_SECRET;

    return NextResponse.json({
      message: "Service Account Setup Information",
      timestamp: new Date().toISOString(),
      tokens: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenType: tokenType
      },
      environmentVariables: {
        FANVUE_CLIENT_ID: clientId || "NOT_SET",
        FANVUE_OAUTH_CLIENT_SECRET: clientSecret ? "SET" : "NOT_SET",
        SERVICE_ACCESS_TOKEN: accessToken,
        SERVICE_REFRESH_TOKEN: refreshToken
      },
      instructions: [
        "1. Copy the SERVICE_ACCESS_TOKEN value above",
        "2. Copy the SERVICE_REFRESH_TOKEN value above", 
        "3. Set these as environment variables in Vercel:",
        "   - SERVICE_ACCESS_TOKEN = [accessToken value]",
        "   - SERVICE_REFRESH_TOKEN = [refreshToken value]",
        "4. Redeploy your Vercel application",
        "5. Test the service account endpoints"
      ],
      testEndpoints: [
        "https://fanvue-dashboard.vercel.app/api/powerbi/service/creators-summary",
        "https://fanvue-dashboard.vercel.app/api/powerbi/service/earnings-detail"
      ]
    });

  } catch (error: any) {
    console.error("Service Account Setup Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
