# Power BI Setup Guide - Real Data Endpoints

## ✅ Mock Data Status: COMPLETELY REMOVED

All mock data has been eliminated from the codebase. Only **real data** endpoints remain.

---

## 🎯 Available Power BI Endpoints

### 1. **Service Account Endpoints (RECOMMENDED for Power BI)**
These endpoints use server-side OAuth tokens and work without browser authentication:

- **Creators Summary**: `https://fanvue-dashboard.vercel.app/api/powerbi/service/creators-summary`
- **Earnings Detail**: `https://fanvue-dashboard.vercel.app/api/powerbi/service/earnings-detail`

**Status**: ✅ Real data only  
**Authentication**: Service Account OAuth (environment variables)  
**Requires Setup**: Yes (see setup instructions below)

---

### 2. **Real Data Endpoints (Browser OAuth Required)**
These endpoints require an active browser OAuth session:

- **Creators Summary**: `https://fanvue-dashboard.vercel.app/api/powerbi/real/creators-summary`
- **Earnings Detail**: `https://fanvue-dashboard.vercel.app/api/powerbi/real/earnings-detail`

**Status**: ✅ Real data only  
**Authentication**: Browser OAuth session  
**Requires Setup**: No, but requires login to dashboard first

---

### 3. **Legacy Public Endpoints (Browser OAuth Required)**
These are older endpoints that still work with OAuth:

- **Creators Summary**: `https://fanvue-dashboard.vercel.app/api/powerbi/public/creators-summary`
- **Earnings Detail**: `https://fanvue-dashboard.vercel.app/api/powerbi/public/earnings-detail`

**Status**: ✅ Real data only  
**Authentication**: Browser OAuth session  
**Note**: Use service account endpoints instead for better Power BI integration

---

## 🔧 Service Account Setup (For Power BI Integration)

### Step 1: Get OAuth Tokens

1. **Login to dashboard**: Navigate to `https://fanvue-dashboard.vercel.app`
2. **Complete OAuth login**: Authenticate with Fanvue
3. **Get tokens**: Visit `https://fanvue-dashboard.vercel.app/api/setup-service-account`
4. **Copy the response**: You'll receive:
   ```json
   {
     "accessToken": "eyJhbGci...",
     "refreshToken": "ory_rt_...",
     "tokenType": "Bearer",
     "expiresIn": 3600,
     "instructions": "..."
   }
   ```

### Step 2: Set Environment Variables in Vercel

1. Go to your **Vercel Dashboard**
2. Select your project: `fanvue-dashboard`
3. Navigate to **Settings** → **Environment Variables**
4. Add the following variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `SERVICE_ACCESS_TOKEN` | [accessToken from Step 1] | OAuth access token |
| `SERVICE_REFRESH_TOKEN` | [refreshToken from Step 1] | OAuth refresh token |
| `FANVUE_OAUTH_CLIENT_ID` | [your client ID] | OAuth client ID |
| `FANVUE_OAUTH_CLIENT_SECRET` | [your client secret] | OAuth client secret |

**Important**: Set these for **Production, Preview, and Development** environments.

### Step 3: Redeploy

After setting environment variables:
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **...** → **Redeploy**
4. Select **Redeploy with existing build cache**

### Step 4: Verify Service Account

Test the service account endpoints:
- **Debug Endpoint**: `https://fanvue-dashboard.vercel.app/api/debug-service-account`
- **Creators Summary**: `https://fanvue-dashboard.vercel.app/api/powerbi/service/creators-summary`

---

## 📊 Power BI Integration Steps

### 1. Add Data Source in Power BI Desktop

1. Open **Power BI Desktop**
2. Click **Get Data** → **Web**
3. Choose **Advanced**
4. Enter the service account endpoint URL:
   ```
   https://fanvue-dashboard.vercel.app/api/powerbi/service/creators-summary
   ```
5. Click **OK**

### 2. Configure Query Parameters (Optional)

To filter by date range, add query parameters:
```
https://fanvue-dashboard.vercel.app/api/powerbi/service/creators-summary?startDate=2025-01-01&endDate=2025-12-31
```

**Available Parameters**:
- `startDate`: ISO date (e.g., `2025-01-01`)
- `endDate`: ISO date (e.g., `2025-12-31`)
- `creatorId`: Filter by specific creator UUID (earnings-detail only)

### 3. Transform Data

1. Power BI will detect JSON format
2. Click **Into Table** to convert to table
3. Expand the `data` column
4. Expand the `metadata` column (optional)
5. Set data types:
   - `totalRevenue`: Decimal Number
   - `totalTransactions`: Whole Number
   - `totalFollowers`: Whole Number
   - `totalSubscribers`: Whole Number
   - `avgTransactionValue`: Decimal Number

### 4. Create Relationships (For Multiple Tables)

If using both endpoints:
1. Load **creators-summary** as "Creators"
2. Load **earnings-detail** as "Transactions"
3. Create relationship: `Creators[creatorId]` ↔ `Transactions[creatorId]`

### 5. Build Visualizations

**Example Metrics**:
- Total Revenue: `SUM(Creators[totalRevenue])`
- Total Creators: `COUNTROWS(Creators)`
- Avg Revenue per Creator: `AVERAGE(Creators[totalRevenue])`
- Transaction Count: `SUM(Transactions[grossAmount])`

---

## 🔍 Testing Endpoints

### Test Individual Creator Endpoints

After OAuth login, you can test individual creator data:

1. **List all creators**: `https://fanvue-dashboard.vercel.app/api/list-creators`
2. **Get creator earnings**: 
   ```
   https://fanvue-dashboard.vercel.app/api/creators/{creatorUuid}/earnings?startDate=2025-01-01T00:00:00Z&endDate=2025-12-31T23:59:59Z
   ```
3. **Get creator followers**: 
   ```
   https://fanvue-dashboard.vercel.app/api/creators/{creatorUuid}/followers
   ```
4. **Get creator subscribers**: 
   ```
   https://fanvue-dashboard.vercel.app/api/creators/{creatorUuid}/subscribers
   ```

---

## 🚨 Troubleshooting

### Service Account Returns 500 Error
**Cause**: Environment variables not set  
**Solution**: Follow "Service Account Setup" steps above

### Service Account Returns 401 Unauthorized
**Cause**: Tokens expired or invalid  
**Solution**: Re-run Step 1 to get fresh tokens and update environment variables

### No Data Returned
**Cause**: Date range may be outside of available data  
**Solution**: Try a wider date range or remove date parameters

### Token Refresh Failed
**Cause**: Client ID/Secret mismatch  
**Solution**: Verify `FANVUE_OAUTH_CLIENT_ID` and `FANVUE_OAUTH_CLIENT_SECRET` are correct

---

## 📋 Data Schema Reference

### Creators Summary Response
```json
{
  "metadata": {
    "generatedAt": "2025-10-20T...",
    "startDate": "2025-09-20",
    "endDate": "2025-10-20",
    "totalCreators": 23,
    "apiVersion": "1.0",
    "authentication": "service-account",
    "dataSource": "real"
  },
  "data": [
    {
      "creatorId": "uuid",
      "creatorName": "Creator Name",
      "creatorHandle": "handle",
      "totalRevenue": 1234.56,
      "totalTransactions": 100,
      "totalFollowers": 5000,
      "totalSubscribers": 250,
      "avgTransactionValue": 12.35,
      "lastUpdated": "2025-10-20T..."
    }
  ]
}
```

### Earnings Detail Response
```json
{
  "metadata": {
    "generatedAt": "2025-10-20T...",
    "startDate": "2025-09-20",
    "endDate": "2025-10-20",
    "totalTransactions": 1500,
    "totalCreators": 23,
    "apiVersion": "1.0",
    "authentication": "service-account",
    "dataSource": "real"
  },
  "data": [
    {
      "transactionId": "uuid-timestamp",
      "creatorId": "uuid",
      "creatorName": "Creator Name",
      "creatorHandle": "handle",
      "date": "2025-10-15T12:30:00.000Z",
      "grossAmount": 15.00,
      "netAmount": 12.75,
      "source": "subscription",
      "year": 2025,
      "month": 10,
      "day": 15,
      "dayOfWeek": 3,
      "weekOfYear": 42,
      "quarter": 4
    }
  ]
}
```

---

## ✅ Verification Checklist

- [ ] All mock data removed from codebase
- [ ] Service account environment variables set in Vercel
- [ ] Service account endpoints returning real data
- [ ] Debug endpoint shows successful authentication
- [ ] Power BI can access service account endpoints
- [ ] Data transformations applied in Power BI
- [ ] Visualizations created with real data

---

## 📞 Support

If you encounter issues:
1. Check the debug endpoint: `/api/debug-service-account`
2. Verify environment variables are set correctly
3. Ensure tokens are not expired (refresh if needed)
4. Review Vercel deployment logs for errors

---

**Last Updated**: October 20, 2025  
**Version**: 2.0 - Real Data Only

