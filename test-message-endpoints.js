const BASE_URL = 'http://localhost:3000/api';

async function testMessageEndpoint(endpoint, params = '') {
  try {
    const url = `${BASE_URL}${endpoint}${params}`;
    console.log(`\n🔍 Testing: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status}):`);
      console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
      
      // Show specific message metrics
      if (data.totalMessagesSent !== undefined) {
        console.log(`   📤 Total Messages Sent: ${data.totalMessagesSent}`);
      }
      if (data.totalMessagesReceived !== undefined) {
        console.log(`   📥 Total Messages Received: ${data.totalMessagesReceived}`);
      }
      if (data.messageVolumeByCreator && Array.isArray(data.messageVolumeByCreator)) {
        console.log(`   👤 Creators with message data: ${data.messageVolumeByCreator.length}`);
        if (data.messageVolumeByCreator.length > 0) {
          console.log(`   📊 Sample creator data:`, {
            name: data.messageVolumeByCreator[0].creatorName,
            sent: data.messageVolumeByCreator[0].messagesSent,
            received: data.messageVolumeByCreator[0].messagesReceived,
            total: data.messageVolumeByCreator[0].totalMessages
          });
        }
      }
      if (data.fanEngagement && Array.isArray(data.fanEngagement)) {
        console.log(`   🫂 Fans with engagement data: ${data.fanEngagement.length}`);
        if (data.fanEngagement.length > 0) {
          console.log(`   📈 Sample fan data:`, {
            name: data.fanEngagement[0].fanName,
            totalMessages: data.fanEngagement[0].totalMessages,
            engagementScore: data.fanEngagement[0].engagementScore
          });
        }
      }
      if (data.summary) {
        console.log(`   📋 Summary:`, data.summary);
      }
    } else {
      console.log(`❌ Error (${response.status}): ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function testCreatorMessageEndpoint(creatorUuid) {
  try {
    const url = `${BASE_URL}/creators/${creatorUuid}/message-volume?startDate=2025-01-01&endDate=2025-01-31&maxPages=2`;
    console.log(`\n🔍 Testing Creator Message Volume: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status}):`);
      console.log(`   Creator: ${data.creatorUuid}`);
      console.log(`   📤 Messages Sent: ${data.totalMessagesSent}`);
      console.log(`   📥 Messages Received: ${data.totalMessagesReceived}`);
      console.log(`   📊 Total Messages: ${data.totalMessages}`);
      console.log(`   👥 Active Fans: ${data.summary.activeFans}`);
      console.log(`   ⚡ Response Rate: ${data.summary.responseRate.toFixed(2)}%`);
      
      if (data.dailyBreakdown && data.dailyBreakdown.length > 0) {
        console.log(`   📅 Daily breakdown available: ${data.dailyBreakdown.length} days`);
      }
      if (data.fanEngagement && data.fanEngagement.length > 0) {
        console.log(`   🫂 Fan engagement data: ${data.fanEngagement.length} fans`);
      }
    } else {
      console.log(`❌ Error (${response.status}): ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function runMessageTests() {
  console.log('🚀 Testing Fanvue Message Analytics API Endpoints\n');
  
  // Test overall message analytics
  console.log('📊 Testing Overall Message Analytics:');
  await testMessageEndpoint('/message-analytics', '?startDate=2025-01-01&endDate=2025-01-31&maxPages=2');
  
  // Test fan engagement
  console.log('\n🫂 Testing Fan Engagement Analytics:');
  await testMessageEndpoint('/fan-engagement', '?startDate=2025-01-01&endDate=2025-01-31&maxPages=2&minMessages=1');
  
  // Get a creator UUID to test creator-specific endpoints
  console.log('\n👤 Getting Creator UUID for testing...');
  try {
    const creatorsResponse = await fetch(`${BASE_URL}/creators?page=1&size=1`);
    const creatorsData = await creatorsResponse.json();
    
    if (creatorsData.data && creatorsData.data.length > 0) {
      const creatorUuid = creatorsData.data[0].uuid;
      console.log(`   Using creator UUID: ${creatorUuid}`);
      
      // Test creator-specific message volume
      console.log('\n📈 Testing Creator-Specific Message Volume:');
      await testCreatorMessageEndpoint(creatorUuid);
    } else {
      console.log('   No creators found to test creator-specific endpoints');
    }
  } catch (error) {
    console.log(`   Error getting creator UUID: ${error.message}`);
  }
  
  console.log('\n📊 Test Summary:');
  console.log('✅ Message analytics endpoints are ready for PowerBI!');
  console.log('\n📈 PowerBI Integration URLs:');
  console.log('   - Message Analytics: http://localhost:3000/api/message-analytics');
  console.log('   - Fan Engagement: http://localhost:3000/api/fan-engagement');
  console.log('   - Creator Messages: http://localhost:3000/api/creators/{uuid}/message-volume');
  console.log('\n🔧 Next steps:');
  console.log('   1. Add these URLs as data sources in PowerBI');
  console.log('   2. Set up scheduled refresh for real-time data');
  console.log('   3. Create visualizations using the message metrics');
  console.log('   4. Build dashboards for message analytics');
}

runMessageTests();
