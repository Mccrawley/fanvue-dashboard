import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll();
  
  const cookieData = cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value ? `${cookie.value.substring(0, 10)}...` : 'empty',
    hasValue: !!cookie.value
  }));

  const oauthCookies = {
    fanvue_access_token: !!request.cookies.get('fanvue_access_token')?.value,
    fanvue_refresh_token: !!request.cookies.get('fanvue_refresh_token')?.value,
    fanvue_token_type: !!request.cookies.get('fanvue_token_type')?.value,
  };

  return NextResponse.json({
    message: "Cookie debug information",
    timestamp: new Date().toISOString(),
    totalCookies: cookies.length,
    allCookies: cookieData,
    oauthCookies,
    headers: {
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    }
  });
}
