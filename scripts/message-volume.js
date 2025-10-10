#!/usr/bin/env node

/**
 * Fanvue Message Volume Analyzer
 * 
 * Fetches and displays month-over-month message volume data for a creator
 * using the Fanvue API. This script provides detailed analytics on messaging
 * patterns, fan engagement, and growth trends.
 */

const API_KEY = "fvak_f3ad14a25925cec102a6acb17c49a2c02d2b8b63d49d5d9ca395c7ca636e2fa3_239558";
const API_VERSION = process.env.FANVUE_API_VERSION || "2025-06-26";
const API_BASE_URL = process.env.FANVUE_API_BASE_URL || "https://api.fanvue.com/";

// Get creator handle from command line arguments
const creatorHandle = process.argv[2];

if (!creatorHandle) {
  console.log('❌ Usage: node scripts/message-volume.js [creator-handle]');
  console.log('📝 Example: node scripts/message-volume.js molly-carter');
  process.exit(1);
}

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status === 404) {
        return response;
      }
      if (i === maxRetries - 1) {
        return response;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

async function getCreatorByHandle(handle) {
  try {
    console.log(`🔍 Looking up creator: @${handle}`);
    
    const response = await fetchWithRetry(`${API_BASE_URL}creators?page=1&size=50`, {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": API_KEY,
        "X-Fanvue-API-Version": API_VERSION,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch creators: ${response.status}`);
    }

    const data = await response.json();
    const creators = data.data || [];
    
    const creator = creators.find(c => c.handle === handle);
    if (!creator) {
      throw new Error(`Creator @${handle} not found`);
    }
    
    console.log(`✅ Found creator: ${creator.displayName} (${creator.uuid})`);
    return creator;
  } catch (error) {
    console.error(`❌ Error finding creator: ${error.message}`);
    throw error;
  }
}

async function analyzeMessageVolume(creatorUuid, creatorName) {
  try {
    console.log(`\n📊 Analyzing message volume for: ${creatorName}`);
    console.log('='.repeat(60));
    
    // Get creator's chats
    const chatsResponse = await fetchWithRetry(`${API_BASE_URL}creators/${creatorUuid}/chats?page=1&size=50`, {
      method: "GET",
      headers: {
        "X-Fanvue-API-Key": API_KEY,
        "X-Fanvue-API-Version": API_VERSION,
        "Content-Type": "application/json",
      },
    });

    if (!chatsResponse.ok) {
      throw new Error(`Failed to fetch chats: ${chatsResponse.status}`);
    }

    const chatsData = await chatsResponse.json();
    const chats = chatsData.data || [];
    
    console.log(`📱 Found ${chats.length} chat conversations`);
    
    if (chats.length === 0) {
      console.log('⚠️  No chat conversations found for this creator');
      return;
    }

    const messageStats = {
      totalMessages: 0,
      messagesSent: 0,
      messagesReceived: 0,
      monthlyData: {},
      fanEngagement: {},
      dailyData: {}
    };

    // Process each chat
    for (let i = 0; i < Math.min(chats.length, 10); i++) { // Limit to first 10 chats to avoid rate limits
      const chat = chats[i];
      const chatUuid = chat.uuid || chat.user?.uuid;
      if (!chatUuid) {
        console.warn(`⚠️  Chat ${i + 1} has no UUID, skipping`);
        continue;
      }
      console.log(`📨 Processing chat ${i + 1}/${Math.min(chats.length, 10)}: ${chatUuid}`);
      
      try {
        // Get messages for this chat (CORRECTED ENDPOINT)
        const messagesResponse = await fetchWithRetry(`${API_BASE_URL}creators/${creatorUuid}/chats/${chatUuid}/messages?page=1&size=100`, {
          method: "GET",
          headers: {
            "X-Fanvue-API-Key": API_KEY,
            "X-Fanvue-API-Version": API_VERSION,
            "Content-Type": "application/json",
          },
        });

        if (!messagesResponse.ok) {
          console.warn(`⚠️  Failed to get messages for chat ${chatUuid}: ${messagesResponse.status}`);
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages = messagesData.data || [];
        
        console.log(`   📄 Found ${messages.length} messages`);

        // Process each message
        for (const message of messages) {
          const messageDate = new Date(message.sentAt);
          const monthKey = `${messageDate.getFullYear()}-${String(messageDate.getMonth() + 1).padStart(2, '0')}`;
          const dayKey = message.sentAt.split('T')[0];
          
          // Initialize monthly data
          if (!messageStats.monthlyData[monthKey]) {
            messageStats.monthlyData[monthKey] = {
              sent: 0,
              received: 0,
              total: 0
            };
          }
          
          // Initialize daily data
          if (!messageStats.dailyData[dayKey]) {
            messageStats.dailyData[dayKey] = {
              sent: 0,
              received: 0,
              total: 0
            };
          }
          
          // Count messages
          messageStats.totalMessages++;
          
          if (message.sender.uuid === creatorUuid) {
            messageStats.messagesSent++;
            messageStats.monthlyData[monthKey].sent++;
            messageStats.dailyData[dayKey].sent++;
          } else {
            messageStats.messagesReceived++;
            messageStats.monthlyData[monthKey].received++;
            messageStats.dailyData[dayKey].received++;
            
            // Track fan engagement
            const fanUuid = message.sender.uuid;
            if (!messageStats.fanEngagement[fanUuid]) {
              messageStats.fanEngagement[fanUuid] = {
                fanName: message.sender.displayName || message.sender.handle,
                messagesSent: 0,
                messagesReceived: 0,
                totalMessages: 0
              };
            }
            messageStats.fanEngagement[fanUuid].messagesReceived++;
            messageStats.fanEngagement[fanUuid].totalMessages++;
          }
          
          messageStats.monthlyData[monthKey].total++;
          messageStats.dailyData[dayKey].total++;
        }
        
        // Small delay to be rate-limit friendly
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`⚠️  Error processing chat ${chatUuid}: ${error.message}`);
        continue;
      }
    }

    // Display results
    displayResults(creatorName, messageStats);
    
  } catch (error) {
    console.error(`❌ Error analyzing message volume: ${error.message}`);
    throw error;
  }
}

function displayResults(creatorName, stats) {
  console.log('\n' + '='.repeat(60));
  console.log(`📊 MESSAGE VOLUME ANALYSIS: ${creatorName}`);
  console.log('='.repeat(60));
  
  // Overall statistics
  console.log('\n📈 OVERALL STATISTICS:');
  console.log(`   Total Messages: ${stats.totalMessages}`);
  console.log(`   Messages Sent: ${stats.messagesSent}`);
  console.log(`   Messages Received: ${stats.messagesReceived}`);
  console.log(`   Response Rate: ${stats.messagesReceived > 0 ? ((stats.messagesSent / stats.messagesReceived) * 100).toFixed(1) : 0}%`);
  
  // Monthly breakdown
  console.log('\n📅 MONTHLY BREAKDOWN:');
  const sortedMonths = Object.keys(stats.monthlyData).sort();
  
  for (const month of sortedMonths) {
    const data = stats.monthlyData[month];
    console.log(`   ${month}: ${data.total} total (${data.sent} sent, ${data.received} received)`);
  }
  
  // Top engaged fans
  console.log('\n👥 TOP ENGAGED FANS:');
  const topFans = Object.entries(stats.fanEngagement)
    .sort(([,a], [,b]) => b.totalMessages - a.totalMessages)
    .slice(0, 5);
    
  for (const [fanUuid, fanData] of topFans) {
    console.log(`   ${fanData.fanName}: ${fanData.totalMessages} messages`);
  }
  
  // Recent daily activity (last 7 days)
  console.log('\n📆 RECENT DAILY ACTIVITY (Last 7 days):');
  const sortedDays = Object.keys(stats.dailyData).sort().slice(-7);
  
  for (const day of sortedDays) {
    const data = stats.dailyData[day];
    console.log(`   ${day}: ${data.total} messages (${data.sent} sent, ${data.received} received)`);
  }
  
  console.log('\n✅ Analysis complete!');
}

async function main() {
  try {
    console.log('🚀 Fanvue Message Volume Analyzer');
    console.log('='.repeat(60));
    console.log(`🎯 Analyzing: @${creatorHandle}`);
    console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);
    console.log(`🌐 API Base URL: ${API_BASE_URL}`);
    
    // Get creator information
    const creator = await getCreatorByHandle(creatorHandle);
    
    // Analyze message volume
    await analyzeMessageVolume(creator.uuid, creator.displayName);
    
  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the analyzer
main();
