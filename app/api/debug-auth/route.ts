import { NextRequest, NextResponse } from "next/server";
import { getTokensFromRequest, makeAuthenticatedRequest } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  try {
    // Get tokens from cookies
    const tokens = getTokensFromRequest(request);
    
    const debugInfo = {
      message: "OAuth authentication debug",
      timestamp: new Date().toISOString(),
      tokens: tokens ? {
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        tokenType: tokens.tokenType,
        accessTokenPreview: tokens.accessToken ? `${tokens.accessToken.substring(0, 20)}...` : 'MISSING'
      } : null,
      cookies: {
        fanvue_access_token: !!request.cookies.get('fanvue_access_token')?.value,
        fanvue_refresh_token: !!request.cookies.get('fanvue_refresh_token')?.value,
        fanvue_token_type: request.cookies.get('fanvue_token_type')?.value || 'MISSING'
      }
    };

    // Test making a request to Fanvue API
    if (tokens) {
      try {
        console.log("Testing Fanvue API call with tokens:", {
          hasAccessToken: !!tokens.accessToken,
          tokenType: tokens.tokenType,
          accessTokenPreview: tokens.accessToken ? `${tokens.accessToken.substring(0, 20)}...` : 'MISSING'
        });

        const testResponse = await makeAuthenticatedRequest(
          'https://api.fanvue.com/creators?page=1&size=1',
          { method: 'GET' },
          request
        );

        debugInfo.fanvueApiTest = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          success: testResponse.ok
        };

        if (testResponse.ok) {
          const data = await testResponse.json();
          debugInfo.fanvueApiTest.dataPreview = {
            hasData: !!data.data,
            dataLength: data.data ? data.data.length : 0,
            totalCount: data.total_count || 'unknown'
          };
        } else {
          const errorText = await testResponse.text();
          debugInfo.fanvueApiTest.error = errorText;
        }

      } catch (error: any) {
        debugInfo.fanvueApiTest = {
          error: error.message,
          type: 'exception'
        };
      }
    } else {
      debugInfo.fanvueApiTest = {
        error: 'No tokens available for testing',
        type: 'no_tokens'
      };
    }

    return NextResponse.json(debugInfo);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
