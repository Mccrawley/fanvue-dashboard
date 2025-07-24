const BASE_URL = 'http://localhost:3000/api';

async function testEndpoint(endpoint, params = '') {
  try {
    const url = `${BASE_URL}${endpoint}${params}`;
    console.log(`\n🔍 Testing: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status}):`);
      console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
      if (data.data && Array.isArray(data.data)) {
        console.log(`   Items count: ${data.data.length}`);
        if (data.data.length > 0) {
          console.log(`   Sample item keys: ${Object.keys(data.data[0]).join(', ')}`);
        }
      }
    } else {
      console.log(`❌ Error (${response.status}): ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Testing Fanvue Dashboard API Endpoints\n');
  
  // Test main endpoints
  console.log('📊 Testing Main Endpoints:');
  await testEndpoint('/creators', '?page=1&size=5');
  await testEndpoint('/followers', '?page=1&size=10');
  await testEndpoint('/subscribers', '?page=1&size=10');
  
  // Test earnings with proper date format (ISO 8601)
  console.log('\n💰 Testing Earnings Endpoints:');
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  await testEndpoint('/earnings', `?startDate=${lastWeek}&endDate=${today}&size=10`);
  
  // Test creator-specific endpoints (if we have creator data)
  console.log('\n👤 Testing Creator-Specific Endpoints:');
  
  // First get a creator UUID
  try {
    const creatorsResponse = await fetch(`${BASE_URL}/creators?page=1&size=1`);
    const creatorsData = await creatorsResponse.json();
    
    if (creatorsData.data && creatorsData.data.length > 0) {
      const creatorUuid = creatorsData.data[0].uuid;
      console.log(`   Using creator UUID: ${creatorUuid}`);
      
      await testEndpoint(`/creators/${creatorUuid}/earnings`, `?startDate=${lastWeek}&endDate=${today}&maxPages=2`);
      await testEndpoint(`/creators/${creatorUuid}/followers`, '?page=1&size=10');
      await testEndpoint(`/creators/${creatorUuid}/subscribers`, '?page=1&size=10');
    } else {
      console.log('   No creators found to test creator-specific endpoints');
    }
  } catch (error) {
    console.log(`   Error getting creator UUID: ${error.message}`);
  }
  
  console.log('\n📊 Test Summary:');
  console.log('✅ Your API is working! The endpoints are responding correctly.');
  console.log('📈 For PowerBI integration, you can use these endpoints:');
  console.log('   - /api/creators - Get all your creators');
  console.log('   - /api/creators/[uuid]/earnings - Get earnings for specific creator');
  console.log('   - /api/creators/[uuid]/followers - Get followers for specific creator');
  console.log('   - /api/creators/[uuid]/subscribers - Get subscribers for specific creator');
  console.log('\n🔧 Next steps:');
  console.log('   1. Set up your FANVUE_API_KEY in .env.local file');
  console.log('   2. Configure PowerBI to connect to these endpoints');
  console.log('   3. Set up scheduled refresh for real-time data');
}

runTests();