// Test script for Vercel-deployed message analytics endpoints
// Replace YOUR-VERCEL-APP with your actual Vercel app name

const VERCEL_BASE_URL = 'https://YOUR-VERCEL-APP.vercel.app/api';

async function testVercelEndpoint(endpoint, params = '') {
  try {
    const url = `${VERCEL_BASE_URL}${endpoint}${params}`;
    console.log(`\n🔍 Testing: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status}):`);
      console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
      
      // Show specific message metrics
      if (data.totalMessagesSent !== undefined) {
        console.log(`   📤 Total Messages Sent: ${data.totalMessagesSent}`);
      }
      if (data.totalMessagesReceived !== undefined) {
        console.log(`   📥 Total Messages Received: ${data.totalMessagesReceived}`);
      }
      if (data.messageVolumeByCreator && Array.isArray(data.messageVolumeByCreator)) {
        console.log(`   👤 Creators with message data: ${data.messageVolumeByCreator.length}`);
      }
      if (data.fanEngagement && Array.isArray(data.fanEngagement)) {
        console.log(`   🫂 Fans with engagement data: ${data.fanEngagement.length}`);
      }
      if (data.summary) {
        console.log(`   📋 Summary:`, data.summary);
      }
    } else {
      console.log(`❌ Error (${response.status}): ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function testVercelHealth() {
  try {
    const url = `${VERCEL_BASE_URL}/test`;
    console.log(`\n🔍 Testing API Health: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ API Health Check (${response.status}):`);
      console.log(`   API Key Valid: ${data.apiKeyValid}`);
      console.log(`   Available Scopes:`, data.scopes);
      if (Object.keys(data.errors).length > 0) {
        console.log(`   Errors:`, data.errors);
      }
    } else {
      console.log(`❌ Health Check Failed (${response.status}): ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ Health Check Network Error: ${error.message}`);
  }
}

async function runVercelTests() {
  console.log('🚀 Testing Vercel-Deployed Message Analytics API\n');
  console.log('⚠️  IMPORTANT: Replace "YOUR-VERCEL-APP" with your actual Vercel app name in this script!\n');
  
  // Test API health first
  await testVercelHealth();
  
  // Test message analytics
  console.log('\n📊 Testing Message Analytics:');
  await testVercelEndpoint('/message-analytics', '?startDate=2025-01-01&endDate=2025-01-31&maxPages=2');
  
  // Test fan engagement
  console.log('\n🫂 Testing Fan Engagement:');
  await testVercelEndpoint('/fan-engagement', '?startDate=2025-01-01&endDate=2025-01-31&maxPages=2&minMessages=1');
  
  // Test creators endpoint
  console.log('\n👤 Testing Creators Endpoint:');
  await testVercelEndpoint('/creators', '?page=1&size=5');
  
  console.log('\n📊 Vercel Test Summary:');
  console.log('✅ Your message analytics API is live on Vercel!');
  console.log('\n📈 PowerBI Integration URLs (replace YOUR-VERCEL-APP):');
  console.log('   - Message Analytics: https://YOUR-VERCEL-APP.vercel.app/api/message-analytics');
  console.log('   - Fan Engagement: https://YOUR-VERCEL-APP.vercel.app/api/fan-engagement');
  console.log('   - Creators: https://YOUR-VERCEL-APP.vercel.app/api/creators');
  console.log('\n🔧 Next steps:');
  console.log('   1. Replace "YOUR-VERCEL-APP" with your actual Vercel app name');
  console.log('   2. Add these URLs as data sources in PowerBI');
  console.log('   3. Set up scheduled refresh for real-time data');
  console.log('   4. Create visualizations using the message metrics');
}

// Instructions for the user
console.log('📋 INSTRUCTIONS:');
console.log('1. Replace "YOUR-VERCEL-APP" in this script with your actual Vercel app name');
console.log('2. Run: node test-vercel-endpoints.js');
console.log('3. Use the working URLs in PowerBI\n');

runVercelTests();
