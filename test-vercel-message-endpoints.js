// Test script for Vercel message analytics endpoints
// Replace 'your-vercel-app' with your actual Vercel app URL

const VERCEL_BASE_URL = 'https://fanvue-dashboard-oioz46uvn-stjohn-moralis-projects.vercel.app/api';

async function testEndpoint(endpoint, params = '') {
  try {
    const url = `${VERCEL_BASE_URL}${endpoint}${params}`;
    console.log(`\n🔍 Testing: ${url}`);
    
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

async function runVercelTests() {
  console.log('🚀 Testing Vercel Message Analytics API Endpoints\n');
  console.log(`📍 Base URL: ${VERCEL_BASE_URL}`);
  console.log('⚠️  Make sure to replace "your-vercel-app" with your actual Vercel URL!\n');
  
  console.log('📊 Testing Overall Message Analytics:');
  await testEndpoint('/message-analytics', '?startDate=2025-01-01&endDate=2025-01-31&maxPages=2');
  
  console.log('\n🫂 Testing Fan Engagement Analytics:');
  await testEndpoint('/fan-engagement', '?startDate=2025-01-01&endDate=2025-01-31&maxPages=2&minMessages=1');

  console.log('\n👤 Getting Creator UUID for testing...');
  let creatorUuid = 'mock-creator-uuid'; // Default mock UUID
  try {
    const creatorsResponse = await fetch(`${VERCEL_BASE_URL}/creators?page=1&size=1`);
    const creatorsData = await creatorsResponse.json();
    
    if (creatorsResponse.ok && creatorsData.data && creatorsData.data.length > 0) {
      creatorUuid = creatorsData.data[0].uuid;
      console.log(`   Using actual creator UUID: ${creatorUuid}`);
    } else {
      console.log(`   Using mock creator UUID: ${creatorUuid} (No actual creators found or error: ${creatorsData.error || 'Unknown'})`);
    }
  } catch (error) {
    console.log(`   Error getting creator UUID: ${error.message}`);
  }

  console.log(`\n💬 Testing Creator-Specific Message Volume for ${creatorUuid}:`);
  await testEndpoint(`/creators/${creatorUuid}/message-volume`, `?startDate=2025-01-01&endDate=2025-01-31&maxPages=2`);
  
  console.log('\n📊 Test Summary:');
  console.log('✅ Message analytics endpoints are ready for PowerBI!');
  console.log('\n📈 PowerBI Integration URLs:');
  console.log(`   - Message Analytics: ${VERCEL_BASE_URL}/message-analytics`);
  console.log(`   - Fan Engagement: ${VERCEL_BASE_URL}/fan-engagement`);
  console.log(`   - Creator Messages: ${VERCEL_BASE_URL}/creators/{{uuid}}/message-volume`);
  console.log('\n🔧 Next steps:');
  console.log('   1. Replace "your-vercel-app" with your actual Vercel URL');
  console.log('   2. Add these URLs as data sources in PowerBI');
  console.log('   3. Set up scheduled refresh for real-time data');
  console.log('   4. Create visualizations using the message metrics');
  console.log('   5. Build dashboards for message analytics');
  console.log('\n📖 See VERCEL_MESSAGE_ANALYTICS_SETUP.md for detailed PowerBI setup guide');
}

// Run the tests
runVercelTests();
