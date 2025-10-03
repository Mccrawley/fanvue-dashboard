# PowerBI Message Analytics Setup Guide

This guide will help you set up PowerBI to pull and visualize the new message analytics data from your Fanvue API.

## 📊 Available Message Metrics

### Core Message Data Points
- **Total Messages Sent**: Count of messages sent by creators to fans
- **Total Messages Received**: Count of messages received by creators from fans  
- **Message Volume by Creator**: Individual creator messaging activity
- **Message Volume by Fan**: Individual fan engagement levels

## 🔗 API Endpoints for PowerBI

### 1. Overall Message Analytics
```
GET http://localhost:3000/api/message-analytics
```
**Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD) 
- `maxPages`: Maximum pages to fetch (default: 5)

**Returns:**
- `totalMessagesSent`: Total messages sent across all creators
- `totalMessagesReceived`: Total messages received across all creators
- `messageVolumeByCreator`: Array of creator message data
- `messageVolumeByFan`: Array of fan engagement data
- `summary`: Overall statistics

### 2. Creator-Specific Message Volume
```
GET http://localhost:3000/api/creators/{creatorUuid}/message-volume
```
**Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `maxPages`: Maximum pages to fetch (default: 5)

**Returns:**
- Creator-specific message metrics
- Daily breakdown of messages
- Fan engagement data for that creator
- Response rates and engagement scores

### 3. Fan Engagement Analytics
```
GET http://localhost:3000/api/fan-engagement
```
**Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `maxPages`: Maximum pages to fetch (default: 3)
- `minMessages`: Minimum messages to include fan (default: 1)

**Returns:**
- Fan engagement scores
- Message activity by fan
- Creator diversity (how many creators each fan engages with)
- Response time analytics

## 🚀 PowerBI Setup Steps

### Step 1: Add Data Sources

1. Open PowerBI Desktop
2. Click "Get Data" → "Web"
3. Add these URLs as data sources:

#### Primary Data Sources:
```
http://localhost:3000/api/message-analytics?startDate=2025-01-01&endDate=2025-12-31&maxPages=5
```

#### Creator-Specific Sources (repeat for each creator):
```
http://localhost:3000/api/creators/{CREATOR_UUID}/message-volume?startDate=2025-01-01&endDate=2025-12-31&maxPages=5
```

#### Fan Engagement Source:
```
http://localhost:3000/api/fan-engagement?startDate=2025-01-01&endDate=2025-12-31&maxPages=3&minMessages=1
```

### Step 2: Data Transformation

#### For Message Analytics Data:
1. Expand the `messageVolumeByCreator` column
2. Create calculated columns:
   - **Response Rate**: `messagesReceived / messagesSent * 100`
   - **Messages per Fan**: `totalMessages / fanCount`
   - **Engagement Level**: `IF(totalMessages > 100, "High", IF(totalMessages > 50, "Medium", "Low"))`

#### For Fan Engagement Data:
1. Expand the `fanEngagement` column
2. Create calculated columns:
   - **Engagement Tier**: `IF(engagementScore >= 50, "High", IF(engagementScore >= 20, "Medium", "Low"))`
   - **Creator Count**: Count of creators engaged
   - **Activity Days**: Days between first and last message

### Step 3: Create Key Visualizations

#### Dashboard 1: Message Overview
- **Card Visuals:**
  - Total Messages Sent
  - Total Messages Received
  - Average Messages per Creator
  - Response Rate

- **Charts:**
  - Message Volume by Creator (Bar Chart)
  - Daily Message Trends (Line Chart)
  - Message Sent vs Received (Scatter Plot)

#### Dashboard 2: Creator Performance
- **Tables:**
  - Creator Message Rankings
  - Response Rate by Creator
  - Fan Engagement by Creator

- **Charts:**
  - Creator Message Volume Comparison
  - Response Time Trends
  - Fan Count vs Message Volume

#### Dashboard 3: Fan Engagement
- **Tables:**
  - Top Engaged Fans
  - Fan Engagement Scores
  - Creator Diversity by Fan

- **Charts:**
  - Engagement Score Distribution
  - Fan Activity Over Time
  - Message Type Breakdown

### Step 4: Advanced Analytics

#### Calculated Measures:
```DAX
Total Message Volume = SUM(messageVolumeByCreator[totalMessages])

Average Response Rate = 
AVERAGEX(
    messageVolumeByCreator,
    DIVIDE(messageVolumeByCreator[messagesReceived], messageVolumeByCreator[messagesSent], 0)
)

High Engagement Fans = 
CALCULATE(
    COUNTROWS(fanEngagement),
    fanEngagement[engagementScore] >= 50
)

Creator Efficiency = 
DIVIDE(
    [Total Message Volume],
    COUNTROWS(messageVolumeByCreator),
    0
)
```

#### Time Intelligence:
- Create date tables for trend analysis
- Add month-over-month comparisons
- Create rolling averages for message volume

### Step 5: Scheduled Refresh

1. Publish your report to PowerBI Service
2. Set up scheduled refresh:
   - Go to Dataset settings
   - Configure refresh schedule (recommend daily)
   - Set up data source credentials

## 📈 Key Metrics to Track

### Business KPIs:
- **Message Response Rate**: % of fan messages that get responses
- **Creator Engagement Score**: Overall creator messaging activity
- **Fan Retention Rate**: Based on message activity patterns
- **Revenue per Message**: Link message activity to revenue

### Operational Metrics:
- **Peak Messaging Hours**: When most messages are sent/received
- **Message Volume Trends**: Daily/weekly/monthly patterns
- **Creator Performance**: Message activity comparison
- **Fan Segmentation**: High/medium/low engagement fans

## 🔧 Troubleshooting

### Common Issues:
1. **API Rate Limits**: Reduce `maxPages` parameter if getting errors
2. **Data Refresh**: Ensure your local server is running
3. **Date Ranges**: Use proper date format (YYYY-MM-DD)
4. **Creator UUIDs**: Get actual UUIDs from `/api/creators` endpoint

### Testing Endpoints:
Use these URLs to test your endpoints:
```
http://localhost:3000/api/message-analytics?startDate=2025-01-01&endDate=2025-01-31&maxPages=2
```

## 📊 Sample Visualizations

### 1. Message Volume Dashboard
- Total messages sent/received cards
- Creator message volume bar chart
- Daily message trends line chart
- Response rate by creator table

### 2. Fan Engagement Dashboard  
- Top engaged fans table
- Engagement score distribution histogram
- Fan activity over time line chart
- Creator diversity scatter plot

### 3. Creator Performance Dashboard
- Creator rankings table
- Response time trends
- Message efficiency metrics
- Fan engagement by creator

## 🎯 Next Steps

1. **Test the API endpoints** to ensure they're working
2. **Set up PowerBI data sources** with the provided URLs
3. **Create basic visualizations** using the sample data
4. **Add calculated measures** for advanced analytics
5. **Set up scheduled refresh** for real-time data
6. **Create interactive dashboards** for different stakeholders

## 📞 Support

If you encounter issues:
1. Check the API endpoints are responding: `http://localhost:3000/api/test`
2. Verify your FANVUE_API_KEY is configured
3. Check PowerBI data source credentials
4. Review the browser console for error messages

---

**Note**: Make sure your Fanvue API has the necessary permissions for message data access. Some message endpoints may require additional API scopes.
