# 📊 Power BI Integration Guide

## Overview

This guide explains how to connect your Fanvue Dashboard API to Power BI for advanced data visualization and reporting.

---

## 🎯 Available Power BI Endpoints

### 1. **Creators Summary** (Aggregated Data)
**Best for:** High-level dashboards, KPI tracking, creator comparisons

**OAuth Version (requires authentication):**
```
GET /api/powerbi/creators-summary?startDate=2025-01-01&endDate=2025-12-31
```

**Public Version (API key authentication):**
```
GET /api/powerbi/public/creators-summary?apiKey=YOUR_KEY&startDate=2025-01-01&endDate=2025-12-31
```

**Query Parameters:**
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: today)

**Response Schema:**
```json
{
  "metadata": {
    "generatedAt": "2025-10-16T12:00:00Z",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "totalCreators": 23,
    "apiVersion": "1.0"
  },
  "data": [
    {
      "creatorId": "uuid",
      "creatorName": "Creator Name",
      "creatorHandle": "handle",
      "totalRevenue": 4478.42,
      "totalTransactions": 150,
      "totalFollowers": 1234,
      "totalSubscribers": 567,
      "avgTransactionValue": 29.86,
      "lastUpdated": "2025-10-16T12:00:00Z"
    }
  ]
}
```

---

### 2. **Earnings Detail** (Transaction-Level Data)
**Best for:** Time-series analysis, trend analysis, detailed reporting

**OAuth Version (requires authentication):**
```
GET /api/powerbi/earnings-detail?startDate=2025-01-01&endDate=2025-12-31
```

**Public Version (API key authentication):**
```
GET /api/powerbi/public/earnings-detail?apiKey=YOUR_KEY&startDate=2025-01-01&endDate=2025-12-31
```

**Query Parameters:**
- `startDate` (optional): ISO date string (default: 30 days ago)
- `endDate` (optional): ISO date string (default: today)
- `creatorId` (optional): Filter by specific creator UUID

**Response Schema:**
```json
{
  "metadata": {
    "generatedAt": "2025-10-16T12:00:00Z",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "totalTransactions": 3450,
    "totalCreators": 23,
    "apiVersion": "1.0"
  },
  "data": [
    {
      "transactionId": "uuid-2025-10-16",
      "creatorId": "uuid",
      "creatorName": "Creator Name",
      "creatorHandle": "handle",
      "date": "2025-10-16T14:30:00Z",
      "grossAmount": 29.99,
      "netAmount": 25.49,
      "source": "subscription",
      "year": 2025,
      "month": 10,
      "day": 16,
      "dayOfWeek": 4,
      "weekOfYear": 42,
      "quarter": 4
    }
  ]
}
```

---

## 🔧 Power BI Setup Instructions

### Step 1: Get Data from Web

1. Open Power BI Desktop
2. Click **Get Data** → **Web**
3. Enter your API endpoint URL:
   ```
   https://your-dashboard.vercel.app/api/powerbi/creators-summary
   ```

### Step 2: Authentication

**Recommended: Use Public Endpoints with API Key**

1. **Set up your API key:**
   - Add `POWERBI_API_KEY=your-secure-key-here` to your environment variables
   - Use a strong, unique key (e.g., `pb_1234567890abcdef`)
   - Keep this key secure and don't share it publicly

2. **Test the endpoint:**
   ```
   https://your-dashboard.vercel.app/api/powerbi/public/creators-summary?apiKey=YOUR_KEY
   ```

3. **Use in Power BI:**
   - Enter the full URL with your API key
   - No additional authentication needed

**Alternative: OAuth Endpoints**
- Use `/api/powerbi/creators-summary` (requires browser authentication)
- More complex setup but more secure
- Good for development/testing

### Step 3: Transform Data

1. Power BI will recognize the JSON structure
2. Click **Transform Data** to open Power Query Editor
3. Expand the `data` column to see all creator records
4. Set data types:
   - `totalRevenue`: Decimal Number
   - `totalTransactions`: Whole Number
   - `totalFollowers`: Whole Number
   - `totalSubscribers`: Whole Number
   - `avgTransactionValue`: Decimal Number
   - `lastUpdated`: Date/Time

### Step 4: Create Relationships (for multiple endpoints)

If using both endpoints:
1. Load both `creators-summary` and `earnings-detail`
2. Create relationship: `creators-summary[creatorId]` → `earnings-detail[creatorId]`
3. Set cardinality to One-to-Many

---

## 📈 Recommended Power BI Visualizations

### Dashboard 1: Executive Overview
- **Card Visual:** Total Revenue (sum of totalRevenue)
- **Card Visual:** Total Creators (count of creatorId)
- **Card Visual:** Avg Transaction Value (average of avgTransactionValue)
- **Bar Chart:** Revenue by Creator (creatorName vs totalRevenue)
- **Donut Chart:** Revenue Distribution by Creator
- **Table:** Top 10 Creators by Revenue

### Dashboard 2: Time-Series Analysis
- **Line Chart:** Daily Revenue Trend (date vs netAmount)
- **Area Chart:** Revenue by Source (date, netAmount, color by source)
- **Column Chart:** Monthly Revenue Comparison (month vs netAmount)
- **Matrix:** Revenue by Creator by Month

### Dashboard 3: Creator Performance
- **Scatter Chart:** Subscribers vs Revenue (totalSubscribers, totalRevenue)
- **Bar Chart:** Top Creators by Followers
- **Table:** Creator Performance Metrics (all fields)
- **KPI Visual:** Month-over-Month Revenue Growth

---

## 🔄 Data Refresh Setup

### Manual Refresh
1. Click **Refresh** in Power BI Desktop to pull latest data

### Scheduled Refresh (Power BI Service)
1. Publish your report to Power BI Service
2. Go to **Datasets** → Your dataset
3. Click **Schedule refresh**
4. Configure refresh frequency (e.g., daily at 6 AM)
5. Set up gateway if needed for OAuth

---

## 🎨 Sample DAX Measures

### Total Revenue
```dax
Total Revenue = SUM('creators-summary'[totalRevenue])
```

### Average Revenue per Creator
```dax
Avg Revenue per Creator = 
AVERAGEX(
    'creators-summary',
    'creators-summary'[totalRevenue]
)
```

### Revenue Growth MoM
```dax
Revenue Growth MoM = 
VAR CurrentMonth = SUM('earnings-detail'[netAmount])
VAR PreviousMonth = 
    CALCULATE(
        SUM('earnings-detail'[netAmount]),
        DATEADD('earnings-detail'[date], -1, MONTH)
    )
RETURN
    DIVIDE(CurrentMonth - PreviousMonth, PreviousMonth)
```

### Top Performing Creator
```dax
Top Creator = 
TOPN(
    1,
    'creators-summary',
    'creators-summary'[totalRevenue],
    DESC
)
```

---

## 🔒 Security Best Practices

### 1. API Key Authentication
- Don't hardcode API keys in Power BI
- Use Power BI parameters for API keys
- Store keys in Azure Key Vault

### 2. Rate Limiting
- The API is rate-limited to prevent abuse
- Use scheduled refresh instead of real-time
- Cache data in Power BI for better performance

### 3. Data Privacy
- Filter sensitive data at the API level
- Use Row-Level Security (RLS) in Power BI
- Don't share reports with embedded credentials

---

## 🐛 Troubleshooting

### Issue: "401 Authentication Required"
**Solution:** 
- Verify you're logged in to the dashboard
- Check OAuth token is valid
- Try using API key authentication instead

### Issue: "Data not refreshing"
**Solution:**
- Check date range parameters
- Verify API endpoint is responding (test in browser)
- Check Power BI refresh logs for errors

### Issue: "Timeout errors"
**Solution:**
- Reduce date range (use shorter periods)
- Use pagination for large datasets
- Increase Power BI timeout settings

---

## 📞 Support

For issues or questions:
1. Check Vercel function logs for API errors
2. Test endpoints directly in browser
3. Review Power BI query diagnostics

---

## 🚀 Next Steps

1. **Test the endpoints** in your browser first
2. **Connect Power BI** and verify data loads
3. **Create your first dashboard** using the templates above
4. **Schedule automatic refresh** for daily updates
5. **Share insights** with your team!

---

## 📚 Additional Resources

- [Power BI Documentation](https://docs.microsoft.com/en-us/power-bi/)
- [Power BI REST API](https://docs.microsoft.com/en-us/rest/api/power-bi/)
- [DAX Guide](https://dax.guide/)
- [Power Query M Reference](https://docs.microsoft.com/en-us/powerquery-m/)

