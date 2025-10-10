const API_KEY = process.env.FANVUE_API_KEY || "fvak_f3ad14a25925cec102a6acb17c49a2c02d2b8b63d49d5d9ca395c7ca636e2fa3_239558";
const API_VERSION = process.env.FANVUE_API_VERSION || "2025-06-26";
const API_BASE_URL = "https://api.fanvue.com/";

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function testEndpoint(name, url, description) {
  try {
    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": API_KEY,
        "X-Fanvue-API-Version": API_VERSION,
        "Content-Type": "application/json",
      },
    });

    const status = response.status;
    const statusText = response.statusText;
    
    let result = {
      name,
      description,
      status,
      statusText,
      success: response.ok,
      url
    };

    if (response.ok) {
      const data = await response.json();
      result.dataPreview = JSON.stringify(data).substring(0, 200) + "...";
      result.hasData = true;
    } else {
      const errorText = await response.text();
      result.error = errorText.substring(0, 200);
    }

    return result;
  } catch (error) {
    return {
      name,
      description,
      status: "ERROR",
      success: false,
      error: error.message,
      url
    };
  }
}

async function runTests() {
  console.log("🔍 FANVUE API ENDPOINT TESTING");
  console.log("=" .repeat(80));
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log(`API Version: ${API_VERSION}`);
  console.log("=" .repeat(80));
  console.log();

  const endpoints = [
    // Core User Endpoints
    {
      name: "Current User",
      url: `${API_BASE_URL}me`,
      description: "Get current user profile"
    },
    
    // Creators Endpoints
    {
      name: "All Creators",
      url: `${API_BASE_URL}creators?page=1&size=25`,
      description: "List all creators/models"
    },
    
    // Insights Endpoints
    {
      name: "Earnings",
      url: `${API_BASE_URL}insights/earnings?page=1&size=10`,
      description: "Get earnings data"
    },
    {
      name: "Top Fans",
      url: `${API_BASE_URL}insights/top-fans?page=1&size=10`,
      description: "Get top spending fans"
    },
    {
      name: "Subscriber Count",
      url: `${API_BASE_URL}insights/subscriber-count?interval=day`,
      description: "Get subscriber count over time"
    },
    
    // Chats & Messages Endpoints
    {
      name: "All Chats",
      url: `${API_BASE_URL}chats?page=1&size=10`,
      description: "List all chat conversations"
    },
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.name, endpoint.url, endpoint.description);
    results.push(result);
    
    // Visual feedback
    const icon = result.success ? "✅" : "❌";
    const statusColor = result.success ? "" : "⚠️ ";
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.description}`);
    console.log(`   ${statusColor}Status: ${result.status} ${result.statusText || ""}`);
    if (result.success && result.dataPreview) {
      console.log(`   Data: ${result.dataPreview}`);
    } else if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  }

  // Test creator-specific endpoints if we have creators
  console.log("\n🔍 TESTING CREATOR-SPECIFIC ENDPOINTS");
  console.log("=" .repeat(80));
  
  const creatorsTest = await testEndpoint(
    "Get Creators", 
    `${API_BASE_URL}creators?page=1&size=1`,
    "Get first creator for testing"
  );

  if (creatorsTest.success) {
    try {
      const creatorsResponse = await fetch(`${API_BASE_URL}creators?page=1&size=1`, {
        headers: {
          "X-Fanvue-API-Key": API_KEY,
          "X-Fanvue-API-Version": API_VERSION,
        },
      });
      const creatorsData = await creatorsResponse.json();
      
      if (creatorsData.data && creatorsData.data.length > 0) {
        const creatorUuid = creatorsData.data[0].uuid;
        const creatorName = creatorsData.data[0].displayName || creatorsData.data[0].handle;
        
        console.log(`\n📌 Testing with creator: ${creatorName} (${creatorUuid})\n`);

        const creatorEndpoints = [
          {
            name: "Creator Profile",
            url: `${API_BASE_URL}creators/${creatorUuid}`,
            description: "Get specific creator profile"
          },
          {
            name: "Creator Earnings",
            url: `${API_BASE_URL}creators/${creatorUuid}/insights/earnings?page=1&size=10`,
            description: "Get creator-specific earnings"
          },
          {
            name: "Creator Followers",
            url: `${API_BASE_URL}creators/${creatorUuid}/insights/followers?page=1&size=10`,
            description: "Get creator followers"
          },
          {
            name: "Creator Subscribers",
            url: `${API_BASE_URL}creators/${creatorUuid}/insights/subscribers?page=1&size=10`,
            description: "Get creator subscribers"
          },
          {
            name: "Creator Chats",
            url: `${API_BASE_URL}creators/${creatorUuid}/chats?page=1&size=10`,
            description: "Get creator chat conversations"
          },
        ];

        for (const endpoint of creatorEndpoints) {
          const result = await testEndpoint(endpoint.name, endpoint.url, endpoint.description);
          results.push(result);
          
          const icon = result.success ? "✅" : "❌";
          const statusColor = result.success ? "" : "⚠️ ";
          console.log(`${icon} ${result.name}`);
          console.log(`   ${result.description}`);
          console.log(`   ${statusColor}Status: ${result.status} ${result.statusText || ""}`);
          if (result.success && result.dataPreview) {
            console.log(`   Data: ${result.dataPreview}`);
          } else if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
          console.log();
        }

        // Test messages endpoint
        const chatsResponse = await fetch(`${API_BASE_URL}creators/${creatorUuid}/chats?page=1&size=1`, {
          headers: {
            "X-Fanvue-API-Key": API_KEY,
            "X-Fanvue-API-Version": API_VERSION,
          },
        });

        if (chatsResponse.ok) {
          const chatsData = await chatsResponse.json();
          if (chatsData.data && chatsData.data.length > 0) {
            const chatUuid = chatsData.data[0].uuid;
            const messagesResult = await testEndpoint(
              "Chat Messages",
              `${API_BASE_URL}chats/${chatUuid}/messages?page=1&size=5`,
              "Get messages from a specific chat"
            );
            results.push(messagesResult);
            
            const icon = messagesResult.success ? "✅" : "❌";
            console.log(`${icon} ${messagesResult.name}`);
            console.log(`   ${messagesResult.description}`);
            console.log(`   Status: ${messagesResult.status}`);
            if (messagesResult.success && messagesResult.dataPreview) {
              console.log(`   Data: ${messagesResult.dataPreview}`);
            } else if (messagesResult.error) {
              console.log(`   Error: ${messagesResult.error}`);
            }
            console.log();
          }
        }
      }
    } catch (error) {
      console.log(`❌ Error testing creator endpoints: ${error.message}`);
    }
  }

  // Summary
  console.log("\n📊 ENDPOINT TESTING SUMMARY");
  console.log("=" .repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  console.log(`Total Endpoints Tested: ${total}`);
  console.log(`✅ Successful: ${successful} (${Math.round(successful/total*100)}%)`);
  console.log(`❌ Failed: ${failed} (${Math.round(failed/total*100)}%)`);
  console.log();

  if (failed > 0) {
    console.log("🚨 FAILED ENDPOINTS:");
    results.filter(r => !r.success).forEach(r => {
      console.log(`   ❌ ${r.name}: ${r.status} - ${r.error?.substring(0, 100)}`);
    });
    console.log();
  }

  if (successful > 0) {
    console.log("✅ WORKING ENDPOINTS:");
    results.filter(r => r.success).forEach(r => {
      console.log(`   ✅ ${r.name}: ${r.status}`);
    });
    console.log();
  }

  // Recommendations
  console.log("\n💡 RECOMMENDATIONS:");
  console.log("=" .repeat(80));
  
  if (failed === total) {
    console.log("🔴 CRITICAL: All endpoints failed!");
    console.log("   → API key is likely revoked or invalid");
    console.log("   → Generate new API key at: https://www.fanvue.com/api-keys");
    console.log("   → Ensure all required scopes are selected");
  } else if (failed > 0) {
    console.log("🟡 PARTIAL: Some endpoints failed");
    console.log("   → Check API key scopes");
    console.log("   → Some permissions may be missing");
  } else {
    console.log("🟢 SUCCESS: All endpoints working!");
    console.log("   → API key is valid and has all required scopes");
    console.log("   → Dashboard is ready to use");
  }
  
  console.log("\n" + "=" .repeat(80));
}

runTests().catch(console.error);

