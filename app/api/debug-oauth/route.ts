import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.FANVUE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.FANVUE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.FANVUE_OAUTH_REDIRECT_URI;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    // Check if we have the required environment variables
    const configCheck = {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
      hasNextAuthUrl: !!nextAuthUrl,
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
      redirectUri: redirectUri || 'MISSING',
      nextAuthUrl: nextAuthUrl || 'MISSING'
    };

    // Test the token exchange endpoint
    let tokenEndpointTest = null;
    try {
      const testResponse = await fetch('https://auth.fanvue.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId || 'test',
          client_secret: clientSecret || 'test',
          code: 'test_code',
          redirect_uri: redirectUri || 'test',
          code_verifier: 'test_verifier',
        }),
      });

      tokenEndpointTest = {
        status: testResponse.status,
        statusText: testResponse.statusText,
        accessible: testResponse.status !== 404,
        error: testResponse.status >= 400 ? await testResponse.text() : null
      };
    } catch (error) {
      tokenEndpointTest = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      message: "OAuth Debug Information",
      timestamp: new Date().toISOString(),
      config: configCheck,
      tokenEndpoint: tokenEndpointTest,
      recommendations: [
        "Check that FANVUE_OAUTH_CLIENT_ID matches your Fanvue app",
        "Verify FANVUE_OAUTH_CLIENT_SECRET is correct",
        "Ensure FANVUE_OAUTH_REDIRECT_URI matches exactly in Fanvue app",
        "Confirm NEXTAUTH_URL is set to your Vercel domain"
      ]
    });

  } catch (error) {
    return NextResponse.json({
      error: "Debug failed",
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
