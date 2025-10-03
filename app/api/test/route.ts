import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.FANVUE_API_KEY;
    const apiVersion = process.env.FANVUE_API_VERSION || "2025-06-26";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Test basic user info endpoint (requires read:self scope)
    const userResponse = await fetch("https://api.fanvue.com/users/me", {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": apiKey,
        "X-Fanvue-API-Version": apiVersion,
        "Content-Type": "application/json",
      },
    });

    const results = {
      apiKeyValid: true,
      scopes: {
        "read:self": userResponse.ok,
      } as Record<string, boolean>,
      errors: {} as Record<string, string>
    };

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      results.errors["read:self"] = `${userResponse.status}: ${errorText}`;
    }

    // Test earnings endpoint (requires read:insights scope)
    const earningsResponse = await fetch("https://api.fanvue.com/insights/earnings?size=1", {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": apiKey,
        "X-Fanvue-API-Version": apiVersion,
        "Content-Type": "application/json",
      },
    });

    results.scopes["read:insights"] = earningsResponse.ok;
    
    if (!earningsResponse.ok) {
      const errorText = await earningsResponse.text();
      results.errors["read:insights"] = `${earningsResponse.status}: ${errorText}`;
    }

    // Test followers endpoint (requires read:fan scope)
    const followersResponse = await fetch("https://api.fanvue.com/followers?size=1", {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": apiKey,
        "X-Fanvue-API-Version": apiVersion,
        "Content-Type": "application/json",
      },
    });

    results.scopes["read:fan"] = followersResponse.ok;
    
    if (!followersResponse.ok) {
      const errorText = await followersResponse.text();
      results.errors["read:fan"] = `${followersResponse.status}: ${errorText}`;
    }

    // Test creators endpoint (requires read:creator scope for agency access)
    const creatorsResponse = await fetch("https://api.fanvue.com/creators?size=1", {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": apiKey,
        "X-Fanvue-API-Version": apiVersion,
        "Content-Type": "application/json",
      },
    });

    results.scopes["read:creator"] = creatorsResponse.ok;
    
    if (!creatorsResponse.ok) {
      const errorText = await creatorsResponse.text();
      results.errors["read:creator"] = `${creatorsResponse.status}: ${errorText}`;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      { error: "Failed to test API scopes" },
      { status: 500 }
    );
  }
} 