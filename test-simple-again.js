// Test the simple endpoint to see if deployment is working
const BASE_URL = 'https://fanvue-dashboard.vercel.app/api';
const BYPASS_SECRET = 'fanvuedashboardpowerbiaccess2025';

async function testSimple() {
  try {
    const url = `${BASE_URL}/test-simple?x-vercel-protection-bypass=${BYPASS_SECRET}`;
    console.log(`🔍 Testing: ${url}`);
    
    const response = await fetch(url);
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

testSimple();
