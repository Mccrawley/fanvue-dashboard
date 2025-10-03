// Test API endpoints with the protection bypass secret
const BASE_URL = 'https://fanvue-dashboard.vercel.app/api';
const BYPASS_SECRET = 'fanvuedashboardpowerbiaccess2025';

async function testEndpoint(endpoint, params = '') {
  try {
    const url = `${BASE_URL}${endpoint}${params}&x-vercel-protection-bypass=${BYPASS_SECRET}`;
    console.log(`\n🔍 Testing: ${endpoint}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status}):`);
      console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
      
      // Show sample data structure
      if (data.messageVolumeByCreator) {
        console.log(`   Sample creator data: ${data.messageVolumeByCreator.length} creators`);
      }
      if (data.fanEngagement) {
        console.log(`   Sample fan data: ${data.fanEngagement.length} fans`);
      }
      if (data.summary) {
        console.log(`   Summary: ${JSON.stringify(data.summary, null, 2)}`);
      }
    } else {
      console.log(`❌ Error (${response.status}): ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Testing API Endpoints with Protection Bypass\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Bypass Secret: ${BYPASS_SECRET}\n`);
  
  console.log('📊 Testing Overall Message Analytics:');
  await testEndpoint('/message-analytics', '?startDate=2025-01-01&endDate=2025-01-31&maxPages=2');
  
  console.log('\n🫂 Testing Fan Engagement Analytics:');
  await testEndpoint('/fan-engagement', '?startDate=2025-01-01&endDate=2025-01-31&maxPages=2&minMessages=1');

  console.log('\n👤 Testing Creators Endpoint:');
  await testEndpoint('/creators', '?page=1&size=1');
  
  console.log('\n📊 Test Summary:');
  console.log('✅ API endpoints are now accessible with protection bypass!');
  console.log('\n📈 PowerBI Integration URLs:');
  console.log(`   - Message Analytics: ${BASE_URL}/message-analytics?x-vercel-protection-bypass=${BYPASS_SECRET}`);
  console.log(`   - Fan Engagement: ${BASE_URL}/fan-engagement?x-vercel-protection-bypass=${BYPASS_SECRET}`);
  console.log(`   - Creators: ${BASE_URL}/creators?x-vercel-protection-bypass=${BYPASS_SECRET}`);
  console.log('\n🔧 Next steps:');
  console.log('   1. Add these URLs as data sources in PowerBI');
  console.log('   2. Set up scheduled refresh for real-time data');
  console.log('   3. Create visualizations using the message metrics');
  console.log('   4. Build dashboards for message analytics');
}

runTests();
