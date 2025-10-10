import { NextRequest } from "next/server";

export interface FanvueTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
}

export function getTokensFromRequest(request: NextRequest): FanvueTokens | null {
  const accessToken = request.cookies.get('fanvue_access_token')?.value;
  const refreshToken = request.cookies.get('fanvue_refresh_token')?.value;
  const tokenType = request.cookies.get('fanvue_token_type')?.value || 'Bearer';

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    tokenType,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<FanvueTokens | null> {
  try {
    const clientId = process.env.FANVUE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.FANVUE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("OAuth configuration missing");
    }

    // Use Basic Authentication (client_secret_basic) instead of POST body
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch('https://auth.fanvue.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token refresh failed:", errorText);
      return null;
    }

    const tokenData = await response.json();

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
    };

  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

export async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  request?: NextRequest
): Promise<Response> {
  let tokens = request ? getTokensFromRequest(request) : null;

  // If no tokens from request, try to get from environment (for server-side calls)
  if (!tokens) {
    const accessToken = process.env.FANVUE_ACCESS_TOKEN;
    if (accessToken) {
      tokens = {
        accessToken,
        tokenType: 'Bearer',
      };
    }
  }

  if (!tokens) {
    throw new Error("No valid authentication tokens available");
  }

  // Add OAuth Bearer token to headers
  const headers = {
    ...options.headers,
    'Authorization': `${tokens.tokenType} ${tokens.accessToken}`,
    'X-Fanvue-API-Version': process.env.FANVUE_API_VERSION || '2025-06-26',
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401 && tokens.refreshToken) {
    console.log("Access token expired, attempting refresh...");
    const newTokens = await refreshAccessToken(tokens.refreshToken);
    
    if (newTokens) {
      // Retry with new token
      const newHeaders = {
        ...options.headers,
        'Authorization': `${newTokens.tokenType} ${newTokens.accessToken}`,
        'X-Fanvue-API-Version': process.env.FANVUE_API_VERSION || '2025-06-26',
        'Content-Type': 'application/json',
      };

      return fetch(url, {
        ...options,
        headers: newHeaders,
      });
    }
  }

  return response;
}

export function isAuthenticated(request: NextRequest): boolean {
  const tokens = getTokensFromRequest(request);
  return tokens !== null;
}

export function getAuthUrl(): string {
  return '/api/auth/authorize';
}
