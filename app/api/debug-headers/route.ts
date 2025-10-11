import { NextRequest, NextResponse } from "next/server";
import { getTokensFromRequest } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  try {
    const tokens = getTokensFromRequest(request);
    
    if (!tokens) {
      return NextResponse.json({
        error: "No tokens available",
        message: "Please complete OAuth login first"
      });
    }

    // Test the exact headers we're sending to Fanvue
    const testHeaders = {
      'Authorization': `${tokens.tokenType} ${tokens.accessToken}`,
      'X-Fanvue-API-Version': process.env.FANVUE_API_VERSION || '2025-06-26',
      'Content-Type': 'application/json',
    };

    // Test with a simple Fanvue endpoint
    const testUrl = 'https://api.fanvue.com/creators?page=1&size=1';
    
    console.log("Testing Fanvue API with headers:", {
      url: testUrl,
      headers: {
        ...testHeaders,
        Authorization: `${tokens.tokenType} ${tokens.accessToken.substring(0, 20)}...`
      }
    });

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: testHeaders
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return NextResponse.json({
      message: "Fanvue API test with detailed headers",
      timestamp: new Date().toISOString(),
      environment: {
        fanvueApiVersion: process.env.FANVUE_API_VERSION || '2025-06-26',
        hasApiVersion: !!process.env.FANVUE_API_VERSION
      },
      request: {
        url: testUrl,
        method: 'GET',
        headers: {
          ...testHeaders,
          Authorization: `${tokens.tokenType} ${tokens.accessToken.substring(0, 20)}...`
        }
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
