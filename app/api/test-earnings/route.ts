import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("=== TESTING ALL-EARNINGS ROUTE ===");
    
    // Call the all-earnings route internally
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const testUrl = `${baseUrl}/api/all-earnings`;
    console.log(`Calling: ${testUrl}`);
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response data:`, data);
    
    return NextResponse.json({
      success: true,
      status: response.status,
      data: data,
      testUrl: testUrl
    });
    
  } catch (error: any) {
    console.error("Test earnings error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 