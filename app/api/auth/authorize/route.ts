import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";

// PKCE Helper Functions
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
  return base64URLEncode(createHash('sha256').update(verifier).digest());
}

export async function GET(_request: NextRequest) {
  try {
    const clientId = process.env.FANVUE_OAUTH_CLIENT_ID;
    const redirectUri = process.env.FANVUE_OAUTH_REDIRECT_URI;
    // Use default scopes from Fanvue app configuration
    const scopes = "openid offline_access offline read:self read:chat read:creator read:fan read:insights read:media";

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "OAuth configuration missing" },
        { status: 500 }
      );
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = base64URLEncode(randomBytes(32));

    // Store code_verifier and state in session/cookie
    const response = NextResponse.redirect(
      `https://auth.fanvue.com/oauth2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${encodeURIComponent(state)}&` +
      `code_challenge=${encodeURIComponent(codeChallenge)}&` +
      `code_challenge_method=S256`
    );

    // Store PKCE parameters in secure HTTP-only cookies
    response.cookies.set('oauth_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });

    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    });

    return response;

  } catch (error) {
    console.error("OAuth authorization error:", error);
    return NextResponse.json(
      { error: "Failed to initiate OAuth flow" },
      { status: 500 }
    );
  }
}
