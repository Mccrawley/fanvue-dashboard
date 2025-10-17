import { NextRequest, NextResponse } from "next/server";

/**
 * Debug Service Account Endpoint
 * 
 * This endpoint tests the service account authentication and shows
 * what's happening with the OAuth tokens and API calls.
 */

export async function GET(request: NextRequest) {
  try {
    // Get service account tokens from environment
    const serviceAccessToken = process.env.SERVICE_ACCESS_TOKEN;
    const serviceRefreshToken = process.env.SERVICE_REFRESH_TOKEN;
    const clientId = process.env.FANVUE_CLIENT_ID;
    const clientSecret = process.env.FANVUE_OAUTH_CLIENT_SECRET;

    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: {
        hasServiceAccessToken: !!serviceAccessToken,
        hasServiceRefreshToken: !!serviceRefreshToken,
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        clientIdPreview: clientId?.substring(0, 10) + '...' || 'NOT_SET',
        accessTokenPreview: serviceAccessToken?.substring(0, 20) + '...' || 'NOT_SET',
        refreshTokenPreview: serviceRefreshToken?.substring(0, 20) + '...' || 'NOT_SET'
      },
      tests: {}
    };

    // Test 1: Try to fetch creators with service account token
    if (serviceAccessToken) {
      try {
        console.log("Testing service account authentication...");
        
        const creatorsUrl = "https://api.fanvue.com/agencies/creators?size=5";
        const response = await fetch(creatorsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${serviceAccessToken}`,
            "X-Fanvue-API-Version": "2025-06-26",
            "Content-Type": "application/json",
          },
        });

        debugInfo.tests.creatorsApi = {
          url: creatorsUrl,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        };

        if (response.ok) {
          const data = await response.json();
          debugInfo.tests.creatorsApi.data = {
            hasData: !!data.data,
            dataLength: data.data?.length || 0,
            firstCreator: data.data?.[0] || null
          };
        } else {
          const errorText = await response.text();
          debugInfo.tests.creatorsApi.error = errorText;
        }

      } catch (error: any) {
        debugInfo.tests.creatorsApi = {
          error: error.message,
          success: false
        };
      }
    }

    // Test 2: Try to refresh token if needed
    if (serviceRefreshToken && clientId && clientSecret) {
      try {
        console.log("Testing token refresh...");
        
        const refreshResponse = await fetch("https://api.fanvue.com/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: serviceRefreshToken,
          }),
        });

        debugInfo.tests.tokenRefresh = {
          status: refreshResponse.status,
          statusText: refreshResponse.statusText,
          success: refreshResponse.ok
        };

        if (refreshResponse.ok) {
          const tokenData = await refreshResponse.json();
          debugInfo.tests.tokenRefresh.newTokens = {
            hasAccessToken: !!tokenData.access_token,
            hasRefreshToken: !!tokenData.refresh_token,
            tokenType: tokenData.token_type
          };
        } else {
          const errorText = await refreshResponse.text();
          debugInfo.tests.tokenRefresh.error = errorText;
        }

      } catch (error: any) {
        debugInfo.tests.tokenRefresh = {
          error: error.message,
          success: false
        };
      }
    }

    return NextResponse.json(debugInfo);

  } catch (error: any) {
    console.error("Service Account Debug Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
