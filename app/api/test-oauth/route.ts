import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "OAuth test endpoint is working!",
    timestamp: new Date().toISOString(),
    environment: {
      hasClientId: !!process.env.FANVUE_OAUTH_CLIENT_ID,
      hasClientSecret: !!process.env.FANVUE_OAUTH_CLIENT_SECRET,
      hasRedirectUri: !!process.env.FANVUE_OAUTH_REDIRECT_URI,
    }
  });
}
