# Fanvue Message Volume Analyzer

This tool fetches and displays month-over-month message volume data for Fanvue creators using the Fanvue API.

## Setup

1. **Set up your API key**: Create a `.env.local` file in the project root with:
   
```bash
FANVUE_API_KEY=your_actual_api_key_here
FANVUE_API_VERSION=2025-06-26
FANVUE_API_BASE_URL=https://api.fanvue.com/
```

2. **Install dependencies** (if not already done):
   
```bash
npm install
```

## Usage

### Option 1: Using npm scripts (Recommended)
```bash
# Start the Next.js development server in one terminal
npm run dev

# In another terminal, run the analyzer for molly-carter
npm run analyze-molly

# Or analyze any creator by name
npm run message-volume [creator-name]
```

### Option 2: Direct script execution
```bash
# Start the Next.js development server
npm run dev

# Run the script directly
node scripts/message-volume.js molly-carter
```

## What it does

The analyzer will:

1. **Fetch chat data** for the specified creator using the Fanvue API
2. **Retrieve messages** from each chat conversation  
3. **Aggregate message counts** by month (sent + received)
4. **Calculate growth rates** month-over-month
5. **Display statistics** including:
   - Total message volume per month
   - Messages sent vs received breakdown
   - Month-over-month growth percentages
   - Overall statistics and trends

## Sample Output

```
🚀 Fanvue Message Volume Analyzer
============================================================
🎯 Analyzing: @molly-carter
🔑 API Key: fvak_f3ad14a25925cec...
🌐 API Base URL: https://api.fanvue.com/

🔍 Looking up creator: @molly-carter
✅ Found creator: Molly ☀️ (40cc4f29-58d1-44b7-854b-d92ec42c02f7)

📊 Analyzing message volume for: Molly ☀️
============================================================
📱 Found 15 chat conversations
📨 Processing chat 1/10: abc123-def456-ghi789
   📄 Found 45 messages
📨 Processing chat 2/10: xyz789-uvw456-rst123
   📄 Found 32 messages
...

============================================================
📊 MESSAGE VOLUME ANALYSIS: Molly ☀️
============================================================

📈 OVERALL STATISTICS:
   Total Messages: 1,247
   Messages Sent: 623
   Messages Received: 624
   Response Rate: 99.8%

📅 MONTHLY BREAKDOWN:
   2024-01: 156 total (78 sent, 78 received)
   2024-02: 189 total (95 sent, 94 received)
   2024-03: 203 total (102 sent, 101 received)
   2024-04: 178 total (89 sent, 89 received)
   2024-05: 195 total (98 sent, 97 received)
   2024-06: 167 total (84 sent, 83 received)
   2024-07: 159 total (80 sent, 79 received)

👥 TOP ENGAGED FANS:
   John_Doe: 45 messages
   Sarah_Smith: 38 messages
   Mike_Johnson: 32 messages
   Emma_Wilson: 28 messages
   Alex_Brown: 25 messages

📆 RECENT DAILY ACTIVITY (Last 7 days):
   2024-10-01: 12 messages (6 sent, 6 received)
   2024-10-02: 8 messages (4 sent, 4 received)
   2024-10-03: 15 messages (8 sent, 7 received)
   2024-10-04: 11 messages (6 sent, 5 received)
   2024-10-05: 9 messages (5 sent, 4 received)
   2024-10-06: 13 messages (7 sent, 6 received)
   2024-10-07: 7 messages (4 sent, 3 received)

✅ Analysis complete!
```

## API Endpoints

The analyzer uses these Fanvue API endpoints:

- `GET /creators` - Find creator by handle
- `GET /creators/{uuid}/chats` - Get creator's chat conversations
- `GET /chats/{uuid}/messages` - Get messages from specific chat

## Rate Limiting

The script includes built-in rate limiting to avoid hitting API limits:

- **Retry logic** with exponential backoff
- **Delays between requests** (100ms between chat processing)
- **Limited chat processing** (first 10 chats to avoid timeouts)
- **Error handling** for failed requests

## Troubleshooting

### Common Issues

1. **"Creator not found"**
   - Verify the creator handle is correct
   - Check that the creator exists in your account

2. **"API key not configured"**
   - Ensure `.env.local` file exists with correct API key
   - Verify API key has required permissions

3. **"Rate limit exceeded"**
   - The script will automatically retry with delays
   - If persistent, reduce the number of chats processed

4. **"No chat conversations found"**
   - Creator may not have any active chats
   - Check date range if filtering is applied

### Performance Tips

- **Start with popular creators** who have more chat activity
- **Use specific date ranges** to reduce data processing time
- **Run during off-peak hours** to avoid API rate limits

## Integration with Dashboard

This analyzer complements the dashboard's messaging metrics:

- **API Endpoint**: `/api/creators/{uuid}/message-volume`
- **Dashboard Component**: Message analytics charts
- **PowerBI Integration**: Export data for advanced analytics

## Next Steps

1. **Deploy to production** with the updated messaging endpoints
2. **Test with all 23 creators** in your portfolio
3. **Integrate with PowerBI** for advanced reporting
4. **Add real-time updates** for live messaging metrics
