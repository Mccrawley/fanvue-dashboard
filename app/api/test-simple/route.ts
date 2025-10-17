import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Test endpoint working",
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasFanvueApiKey: !!process.env.FANVUE_API_KEY,
      hasPowerbiApiKey: !!process.env.POWERBI_API_KEY,
    }
  });
}