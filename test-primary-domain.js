// Test with the primary domain instead of the deployment-specific URL
const PRIMARY_DOMAIN = 'https://fanvue-dashboard.vercel.app/api';
const DEPLOYMENT_URL = 'https://fanvue-dashboard-4mcswhoun-stjohn-moralis-projects.vercel.app/api';

async function testDomain(url, name) {
  try {
    console.log(`\n🔍 Testing ${name}:`);
    console.log(`URL: ${url}/test-simple`);
    
    const response = await fetch(`${url}/test-simple`);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 200 && text.includes('Test endpoint working')) {
      console.log('✅ SUCCESS: Endpoint works!');
      console.log('Response:', text);
    } else {
      console.log('❌ FAILED: Endpoint not working');
      console.log('First 200 chars:', text.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Testing different domains...');
  
  await testDomain(PRIMARY_DOMAIN, 'Primary Domain');
  await testDomain(DEPLOYMENT_URL, 'Deployment URL');
}

runTests();
