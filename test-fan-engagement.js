// Test the fan engagement endpoint
const BASE_URL = 'https://fanvue-dashboard.vercel.app/api';
const BYPASS_SECRET = 'fanvuedashboardpowerbiaccess2025';

async function testFanEngagement() {
  try {
    const url = `${BASE_URL}/fan-engagement?x-vercel-protection-bypass=${BYPASS_SECRET}`;
    console.log(`🔍 Testing: ${url}`);
    
    const response = await fetch(url);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Response length: ${text.length} characters`);
    
    if (response.status === 200 && text.includes('fanEngagement')) {
      console.log('✅ SUCCESS: Fan engagement endpoint works!');
      console.log('Sample data:', text.substring(0, 300) + '...');
    } else {
      console.log('❌ FAILED: Fan engagement endpoint not working');
      console.log('First 200 chars:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testFanEngagement();
