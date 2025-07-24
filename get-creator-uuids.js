const BASE_URL = 'http://localhost:3000/api';

async function getAllCreators() {
  try {
    console.log('🔍 Fetching all creators...');
    
    const response = await fetch(`${BASE_URL}/creators?page=1&size=15`);
    const data = await response.json();
    
    if (response.ok && data.data) {
      console.log(`✅ Found ${data.data.length} creators:\n`);
      
      data.data.forEach((creator, index) => {
        console.log(`${index + 1}. ${creator.displayName} (${creator.handle})`);
        console.log(`   UUID: ${creator.uuid}`);
        console.log(`   Email: ${creator.email}`);
        console.log(`   Role: ${creator.role}`);
        console.log('');
      });
      
      console.log('📊 PowerBI Data Source URLs:');
      console.log('Replace {creatorUuid} with the UUIDs above:\n');
      
      data.data.forEach(creator => {
        console.log(`# ${creator.displayName}:`);
        console.log(`Creators: ${BASE_URL}/creators?page=1&size=15`);
        console.log(`Earnings: ${BASE_URL}/creators/${creator.uuid}/earnings?startDate=2025-01-01&endDate=2025-12-31&maxPages=10`);
        console.log(`Followers: ${BASE_URL}/creators/${creator.uuid}/followers?page=1&size=50`);
        console.log(`Subscribers: ${BASE_URL}/creators/${creator.uuid}/subscribers?page=1&size=50`);
        console.log('');
      });
      
    } else {
      console.log('❌ Error fetching creators:', data.error);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

getAllCreators(); 