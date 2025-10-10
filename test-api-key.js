#!/usr/bin/env node

/**
 * API Key Test Dashboard
 * Quick test to verify if your API key is working
 */

const API_KEY = "fvak_f3ad14a25925cec102a6acb17c49a2c02d2b8b63d49d5d9ca395c7ca636e2fa3_239558";
const API_VERSION = "2025-06-26";
const BASE_URL = "https://api.fanvue.com/";

async function testEndpoint(name, url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": API_KEY,
        "X-Fanvue-API-Version": API_VERSION,
        "Content-Type": "application/json",
      },
    });

    const status = response.status;
    const statusText = response.ok ? '✅ WORKING' : '❌ FAILED';
    
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    return {
      name,
      url,
      status,
      statusText,
      ok: response.ok,
      recordCount: data?.data?.length || 0,
      error: data?.error || null
    };
  } catch (error) {
    return {
      name,
      url,
      status: 'ERROR',
      statusText: '❌ NETWORK ERROR',
      ok: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🔑 FANVUE API KEY TEST DASHBOARD');
  console.log('='.repeat(70));
  console.log(`API Key: ${API_KEY.substring(0, 30)}...`);
  console.log(`API Version: ${API_VERSION}`);
  console.log('='.repeat(70));
  
  const tests = [
    { name: '1. User Profile', url: `${BASE_URL}users/me` },
    { name: '2. All Creators', url: `${BASE_URL}creators?page=1&size=5` },
    { name: '3. Earnings', url: `${BASE_URL}insights/earnings?size=5` },
    { name: '4. Followers', url: `${BASE_URL}followers?page=1&size=5` },
    { name: '5. Subscribers', url: `${BASE_URL}subscribers?page=1&size=5` },
  ];
  
  console.log('\n🧪 TESTING ENDPOINTS...\n');
  
  const results = [];
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url);
    results.push(result);
    
    console.log(`${result.statusText} ${result.name}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   URL: ${result.url}`);
    if (result.recordCount > 0) {
      console.log(`   Records: ${result.recordCount}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Test creator-specific endpoints if creators work
  const creatorsResult = results.find(r => r.name.includes('Creators'));
  if (creatorsResult && creatorsResult.ok) {
    console.log('📋 TESTING CREATOR-SPECIFIC ENDPOINTS...\n');
    
    // Get first creator UUID
    const creatorsResponse = await fetch(`${BASE_URL}creators?page=1&size=1`, {
      headers: {
        "X-Fanvue-API-Key": API_KEY,
        "X-Fanvue-API-Version": API_VERSION,
      }
    });
    
    const creatorsData = await creatorsResponse.json();
    if (creatorsData.data && creatorsData.data.length > 0) {
      const creatorUuid = creatorsData.data[0].uuid;
      const creatorName = creatorsData.data[0].displayName;
      
      console.log(`Using Creator: ${creatorName} (${creatorUuid})\n`);
      
      const creatorTests = [
        { name: '6. Creator Earnings', url: `${BASE_URL}creators/${creatorUuid}/insights/earnings?size=5` },
        { name: '7. Creator Chats', url: `${BASE_URL}creators/${creatorUuid}/chats?page=1&size=5` },
        { name: '8. Creator Subscribers', url: `${BASE_URL}creators/${creatorUuid}/subscribers?page=1&size=5` },
      ];
      
      for (const test of creatorTests) {
        const result = await testEndpoint(test.name, test.url);
        results.push(result);
        
        console.log(`${result.statusText} ${result.name}`);
        console.log(`   Status: ${result.status}`);
        if (result.recordCount > 0) {
          console.log(`   Records: ${result.recordCount}`);
        }
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        console.log('');
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Test messaging if chats work
      const chatsResult = results.find(r => r.name.includes('Chats'));
      if (chatsResult && chatsResult.ok && chatsResult.recordCount > 0) {
        console.log('💬 TESTING MESSAGING ENDPOINTS...\n');
        
        // Get first chat UUID
        const chatsResponse = await fetch(`${BASE_URL}creators/${creatorUuid}/chats?page=1&size=1`, {
          headers: {
            "X-Fanvue-API-Key": API_KEY,
            "X-Fanvue-API-Version": API_VERSION,
          }
        });
        
        const chatsData = await chatsResponse.json();
        if (chatsData.data && chatsData.data.length > 0) {
          const chatUuid = chatsData.data[0].user?.uuid;
          
          if (chatUuid) {
            const messageTest = await testEndpoint(
              '9. Chat Messages', 
              `${BASE_URL}creators/${creatorUuid}/chats/${chatUuid}/messages?page=1&size=5`
            );
            results.push(messageTest);
            
            console.log(`${messageTest.statusText} ${messageTest.name}`);
            console.log(`   Status: ${messageTest.status}`);
            if (messageTest.recordCount > 0) {
              console.log(`   Records: ${messageTest.recordCount}`);
            }
            if (messageTest.error) {
              console.log(`   Error: ${messageTest.error}`);
            }
            console.log('');
          }
        }
      }
    }
  }
  
  // Summary
  console.log('='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  
  const working = results.filter(r => r.ok).length;
  const total = results.length;
  const percentage = ((working / total) * 100).toFixed(1);
  
  console.log(`\n✅ Working: ${working}/${total} (${percentage}%)`);
  console.log(`❌ Failed: ${total - working}/${total}`);
  
  if (working === 0) {
    console.log('\n🚨 API KEY STATUS: INVALID OR REVOKED');
    console.log('   All endpoints are failing with authentication errors.');
    console.log('   You need to get a new API key from Fanvue.');
  } else if (working === total) {
    console.log('\n✅ API KEY STATUS: FULLY FUNCTIONAL');
    console.log('   All endpoints are working perfectly!');
  } else {
    console.log('\n⚠️  API KEY STATUS: PARTIALLY WORKING');
    console.log('   Some endpoints work, others fail.');
    console.log('   Check individual endpoint errors above.');
  }
  
  console.log('\n' + '='.repeat(70));
}

runTests();
