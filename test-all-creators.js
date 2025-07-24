const BASE_URL = 'http://localhost:3000/api';

async function testCreatorData(creator) {
  console.log(`\n👤 Testing ${creator.displayName} (${creator.handle}):`);
  console.log(`   UUID: ${creator.uuid}`);
  
  try {
    // Test earnings
    const earningsResponse = await fetch(`${BASE_URL}/creators/${creator.uuid}/earnings?startDate=2025-01-01&endDate=2025-12-31&maxPages=1`);
    const earningsData = await earningsResponse.json();
    
    if (earningsResponse.ok) {
      console.log(`   💰 Earnings: ${earningsData.data?.length || 0} records`);
    } else {
      console.log(`   💰 Earnings: Error (${earningsResponse.status})`);
    }
    
    // Test subscribers
    const subscribersResponse = await fetch(`${BASE_URL}/creators/${creator.uuid}/subscribers?page=1&size=10`);
    const subscribersData = await subscribersResponse.json();
    
    if (subscribersResponse.ok) {
      console.log(`   👥 Subscribers: ${subscribersData.data?.length || 0} (page 1)`);
      if (subscribersData.pagination?.total) {
        console.log(`   👥 Total Subscribers: ${subscribersData.pagination.total}`);
      }
    } else {
      console.log(`   👥 Subscribers: Error (${subscribersResponse.status})`);
    }
    
    // Test followers
    const followersResponse = await fetch(`${BASE_URL}/creators/${creator.uuid}/followers?page=1&size=10`);
    const followersData = await followersResponse.json();
    
    if (followersResponse.ok) {
      console.log(`   🫂 Followers: ${followersData.data?.length || 0} (page 1)`);
      if (followersData.pagination?.total) {
        console.log(`   🫂 Total Followers: ${followersData.pagination.total}`);
      }
    } else {
      console.log(`   🫂 Followers: Error (${followersResponse.status})`);
    }
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Testing All 15 Creators - Comprehensive Data Check\n');
  
  try {
    // Get all 15 creators
    const response = await fetch(`${BASE_URL}/creators?page=1&size=15`);
    const data = await response.json();
    
    if (response.ok && data.data) {
      console.log(`✅ Found ${data.data.length} creators total\n`);
      
      // Test each creator
      for (const creator of data.data) {
        await testCreatorData(creator);
      }
      
      // Summary
      console.log('\n📊 SUMMARY:');
      console.log(`Total Creators: ${data.data.length}`);
      console.log('\n🎯 PowerBI Integration Ready!');
      console.log('Use these endpoints for each creator:');
      console.log('- /api/creators/[uuid]/earnings - For revenue tracking');
      console.log('- /api/creators/[uuid]/subscribers - For subscriber analytics');
      console.log('- /api/creators/[uuid]/followers - For follower analytics');
      
    } else {
      console.log('❌ Error fetching creators:', data.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

runComprehensiveTest(); 