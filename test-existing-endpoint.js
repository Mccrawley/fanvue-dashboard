// Test existing endpoints to see if they work
const BASE_URL = 'https://fanvue-dashboard-4mcswhoun-stjohn-moralis-projects.vercel.app/api';

async function testExistingEndpoint(endpoint) {
  try {
    console.log(`\n🔍 Testing: ${BASE_URL}${endpoint}`);
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 200 && text.includes('{')) {
      console.log('✅ SUCCESS: Endpoint works!');
    } else {
      console.log('❌ FAILED: Endpoint not working');
      console.log('First 200 chars:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing existing endpoints...');
  
  await testExistingEndpoint('/creators?page=1&size=1');
  await testExistingEndpoint('/profile');
  await testExistingEndpoint('/message-analytics');
}

runTests();
