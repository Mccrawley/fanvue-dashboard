import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasPowerbiApiKey: !!process.env.POWERBI_API_KEY,
      powerbiApiKeyLength: process.env.POWERBI_API_KEY?.length || 0,
      powerbiApiKeyPreview: process.env.POWERBI_API_KEY?.substring(0, 10) + '...' || 'undefined',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('POWERBI') || key.includes('API')),
    },
    request: {
      url: request.url,
      searchParams: Object.fromEntries(request.nextUrl.searchParams),
    }
  };

  return NextResponse.json(debugInfo, { status: 200 });
}
