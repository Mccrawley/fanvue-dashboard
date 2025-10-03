// Test just the message analytics endpoint
const BASE_URL = 'https://fanvue-dashboard.vercel.app/api';
const BYPASS_SECRET = 'fanvuedashboardpowerbiaccess2025';

async function testMessageAnalytics() {
  try {
    const url = `${BASE_URL}/message-analytics?x-vercel-protection-bypass=${BYPASS_SECRET}`;
    console.log(`🔍 Testing: ${url}`);
    
    const response = await fetch(url);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Response length: ${text.length} characters`);
    
    if (response.status === 200 && text.includes('totalMessagesSent')) {
      console.log('✅ SUCCESS: Message analytics endpoint works!');
      console.log('Sample data:', text.substring(0, 300) + '...');
    } else {
      console.log('❌ FAILED: Message analytics endpoint not working');
      console.log('First 200 chars:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testMessageAnalytics();
