# Vercel Deployment Guide for Message Analytics

## 🚀 **Deploying Your Message Analytics API to Vercel**

Since you're already using Vercel, here's how to deploy your new message analytics endpoints and configure PowerBI to use the live URLs.

## 📋 **Step 1: Deploy to Vercel**

### **1.1: Commit Your Changes**
```bash
git add .
git commit -m "Add message analytics API endpoints"
git push origin main
```

### **1.2: Vercel Auto-Deploy**
- Vercel will automatically detect your changes
- It will build and deploy your new API endpoints
- Your message analytics will be live at: `https://YOUR-APP.vercel.app/api/`

## 🔧 **Step 2: Configure Environment Variables**

Make sure these are set in your Vercel dashboard:

### **Required Environment Variables:**
```
FANVUE_API_KEY=your_fanvue_api_key_here
FANVUE_API_VERSION=2025-06-26
```

### **How to Set Them:**
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the variables above
5. Redeploy your application

## 📊 **Step 3: Update PowerBI Configuration**

### **3.1: Get Your Vercel URL**
Your API will be available at: `https://YOUR-APP-NAME.vercel.app/api/`

### **3.2: Update PowerBI Data Sources**

Replace `YOUR-VERCEL-APP` in the URLs below with your actual Vercel app name:

#### **Primary Data Sources:**
```
https://YOUR-VERCEL-APP.vercel.app/api/message-analytics?startDate=2025-01-01&endDate=2025-12-31&maxPages=5
```

```
https://YOUR-VERCEL-APP.vercel.app/api/fan-engagement?startDate=2025-01-01&endDate=2025-12-31&maxPages=3&minMessages=1
```

#### **Creator-Specific Sources:**
```
https://YOUR-VERCEL-APP.vercel.app/api/creators/{CREATOR_UUID}/message-volume?startDate=2025-01-01&endDate=2025-12-31&maxPages=5
```

## 🧪 **Step 4: Test Your Live Endpoints**

### **4.1: Test Message Analytics**
```bash
curl "https://YOUR-VERCEL-APP.vercel.app/api/message-analytics?startDate=2025-01-01&endDate=2025-01-31&maxPages=2"
```

### **4.2: Test Fan Engagement**
```bash
curl "https://YOUR-VERCEL-APP.vercel.app/api/fan-engagement?startDate=2025-01-01&endDate=2025-01-31&maxPages=2&minMessages=1"
```

### **4.3: Test Creator Message Volume**
```bash
curl "https://YOUR-VERCEL-APP.vercel.app/api/creators/{CREATOR_UUID}/message-volume?startDate=2025-01-01&endDate=2025-01-31&maxPages=2"
```

## 📈 **Step 5: PowerBI Setup with Live URLs**

### **5.1: Add Data Sources in PowerBI**
1. Open PowerBI Desktop
2. Click "Get Data" → "Web"
3. Add your Vercel URLs (replace `YOUR-VERCEL-APP` with your actual app name)

### **5.2: Configure Authentication**
- **Authentication**: None (for public APIs)
- **Privacy Level**: Public (since it's your own API)

### **5.3: Set Up Scheduled Refresh**
1. Publish your report to PowerBI Service
2. Go to Dataset settings
3. Configure refresh schedule (recommend daily)
4. Set up data source credentials

## 🔍 **Step 6: Verify Deployment**

### **6.1: Check API Health**
Visit: `https://YOUR-VERCEL-APP.vercel.app/api/test`

You should see your API status and available scopes.

### **6.2: Test Message Endpoints**
Visit: `https://YOUR-VERCEL-APP.vercel.app/api/message-analytics?startDate=2025-01-01&endDate=2025-01-31&maxPages=1`

You should see message analytics data.

## 🎯 **Step 7: PowerBI Dashboard URLs**

Once deployed, use these URLs in PowerBI:

### **Message Analytics Dashboard:**
```
https://YOUR-VERCEL-APP.vercel.app/api/message-analytics?startDate=2025-01-01&endDate=2025-12-31&maxPages=5
```

### **Fan Engagement Dashboard:**
```
https://YOUR-VERCEL-APP.vercel.app/api/fan-engagement?startDate=2025-01-01&endDate=2025-12-31&maxPages=3&minMessages=1
```

### **Creator Performance Dashboard:**
```
https://YOUR-VERCEL-APP.vercel.app/api/creators/{CREATOR_UUID}/message-volume?startDate=2025-01-01&endDate=2025-12-31&maxPages=5
```

## 🚨 **Important Notes**

### **API Rate Limits:**
- Vercel has generous limits for API routes
- Your Fanvue API may have its own rate limits
- The endpoints include built-in retry logic

### **Data Freshness:**
- Message data may have 5-10 minute processing delay
- Set PowerBI refresh to every 4-6 hours for optimal performance
- Real-time data requires more frequent API calls

### **Security:**
- Your API endpoints are public (no authentication required)
- Only your Fanvue API key is protected in environment variables
- Consider adding API key authentication if needed

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **Environment Variables Not Set:**
   - Check Vercel dashboard → Settings → Environment Variables
   - Redeploy after adding variables

2. **API Not Responding:**
   - Check Vercel function logs
   - Verify Fanvue API key permissions

3. **PowerBI Connection Issues:**
   - Ensure URLs are correct
   - Check if Vercel app is deployed successfully
   - Verify no CORS issues

4. **No Message Data:**
   - Check if Fanvue API has message permissions
   - Verify date ranges are correct
   - Check API response for error messages

## 📊 **Expected Results**

After deployment, you should have:

✅ **Live API endpoints** accessible 24/7  
✅ **Message analytics data** flowing to PowerBI  
✅ **Scheduled refresh** working automatically  
✅ **Real-time dashboards** with message metrics  

## 🎉 **Next Steps**

1. **Deploy to Vercel** (git push)
2. **Update PowerBI URLs** with your Vercel app name
3. **Test endpoints** to ensure they're working
4. **Set up scheduled refresh** in PowerBI
5. **Create message analytics dashboards**

Your message analytics will now be live and accessible from anywhere!
