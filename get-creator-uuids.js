/**
 * Get All Creator UUIDs
 * 
 * This script fetches all creator UUIDs from the Fanvue API
 * using the service account authentication.
 */

const SERVICE_ACCESS_TOKEN = process.env.SERVICE_ACCESS_TOKEN;

async function getAllCreatorUUIDs() {
  if (!SERVICE_ACCESS_TOKEN) {
    console.log("❌ SERVICE_ACCESS_TOKEN not found in environment variables");
    console.log("Please set SERVICE_ACCESS_TOKEN in your environment");
    return;
  }

  try {
    console.log("=== Fetching All Creator UUIDs ===");
    
    const response = await fetch("https://api.fanvue.com/creators?size=50", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SERVICE_ACCESS_TOKEN}`,
        "X-Fanvue-API-Version": "2025-06-26",
        "Content-Type": "application/json",
      },
    });

    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      const creators = data.data || [];
      
      console.log(`\n✅ Found ${creators.length} creators:`);
      console.log("=" * 50);
      
      creators.forEach((creator, index) => {
        console.log(`${index + 1}. ${creator.displayName || creator.handle || 'Unknown'}`);
        console.log(`   UUID: ${creator.uuid}`);
        console.log(`   Handle: @${creator.handle || 'unknown'}`);
        console.log(`   Role: ${creator.role || 'Unknown'}`);
        console.log("");
      });
      
      console.log("=" * 50);
      console.log(`Total: ${creators.length} creators`);
      
      // Also output just the UUIDs for easy copying
      console.log("\n📋 Creator UUIDs (for easy copying):");
      console.log("=" * 50);
      creators.forEach((creator, index) => {
        console.log(`${index + 1}. ${creator.uuid}`);
      });
      
    } else {
      const errorText = await response.text();
      console.log("❌ Failed to fetch creators");
      console.log("Error response:", errorText);
    }
  } catch (error) {
    console.error("❌ Error fetching creators:", error.message);
  }
}

// Run the script
getAllCreatorUUIDs().catch(console.error);