import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'https://fanvue-dashboard.vercel.app'}/?error=missing_parameters`
      );
    }

    // Verify state parameter
    const storedState = request.cookies.get('oauth_state')?.value;
    if (!storedState || state !== storedState) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'https://fanvue-dashboard.vercel.app'}/?error=invalid_state`
      );
    }

    // Get stored code_verifier
    const codeVerifier = request.cookies.get('oauth_code_verifier')?.value;
    if (!codeVerifier) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'https://fanvue-dashboard.vercel.app'}/?error=missing_verifier`
      );
    }

    // Exchange authorization code for tokens
    const clientId = process.env.FANVUE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.FANVUE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.FANVUE_OAUTH_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'https://fanvue-dashboard.vercel.app'}/?error=oauth_config_missing`
      );
    }

    // Use Basic Authentication (client_secret_basic) instead of POST body
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://auth.fanvue.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        requestParams: {
          grant_type: 'authorization_code',
          client_id: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
          redirect_uri: redirectUri,
          code: code ? 'PRESENT' : 'MISSING',
          code_verifier: codeVerifier ? 'PRESENT' : 'MISSING'
        }
      });
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || 'https://fanvue-dashboard.vercel.app'}/?error=token_exchange_failed&details=${encodeURIComponent(errorText)}`
      );
    }

    const tokenData = await tokenResponse.json();
    
    // Store tokens in secure HTTP-only cookies
    const response = NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'https://fanvue-dashboard.vercel.app'}/?success=true`
    );

    // Store access token
    response.cookies.set('fanvue_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 3600 // 1 hour default
    });

    // Store refresh token
    if (tokenData.refresh_token) {
      response.cookies.set('fanvue_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }

    // Store token type
    response.cookies.set('fanvue_token_type', tokenData.token_type || 'Bearer', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    // Clear PKCE cookies
    response.cookies.delete('oauth_code_verifier');
    response.cookies.delete('oauth_state');

    return response;

  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/?error=callback_failed`
    );
  }
}
