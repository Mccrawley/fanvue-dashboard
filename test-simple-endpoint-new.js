// Test the simple endpoint with the correct URL
const BASE_URL = 'https://fanvue-dashboard-4mcswhoun-stjohn-moralis-projects.vercel.app/api';

async function testSimpleEndpoint() {
  try {
    console.log('🔍 Testing simple endpoint...');
    console.log(`URL: ${BASE_URL}/test-simple`);
    
    const response = await fetch(`${BASE_URL}/test-simple`);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 200 && text.includes('Test endpoint working')) {
      console.log('✅ SUCCESS: Simple endpoint works!');
      console.log('Response:', text);
    } else {
      console.log('❌ FAILED: Simple endpoint not working');
      console.log('First 200 chars:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testSimpleEndpoint();
