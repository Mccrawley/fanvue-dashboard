// Simple test to check if the message analytics endpoint is working
const BASE_URL = 'https://fanvue-dashboard-oioz46uvn-stjohn-moralis-projects.vercel.app/api';

async function testSimpleEndpoint() {
  try {
    console.log('🔍 Testing message analytics endpoint...');
    console.log(`URL: ${BASE_URL}/message-analytics`);
    
    const response = await fetch(`${BASE_URL}/message-analytics`);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Response length: ${text.length} characters`);
    
    if (text.includes('totalMessagesSent')) {
      console.log('✅ SUCCESS: Endpoint is returning JSON data!');
      console.log('Sample data:', text.substring(0, 200) + '...');
    } else if (text.includes('Authenticated')) {
      console.log('❌ ISSUE: Still getting authentication page');
    } else {
      console.log('❓ UNKNOWN: Unexpected response');
      console.log('First 200 chars:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testSimpleEndpoint();
