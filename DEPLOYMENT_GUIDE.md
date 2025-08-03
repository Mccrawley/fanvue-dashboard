# Vercel Deployment Fix Guide

## Current Issue
Your Fanvue dashboard is showing a client-side exception because the `FANVUE_API_KEY` environment variable is not configured in your Vercel deployment.

## Quick Fix Steps

### 1. Get Your API Key
- Contact your Fanvue representative if you don't have an API key
- Make sure you have the API key ready

### 2. Configure Environment Variables in Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Sign in to your account

2. **Select Your Project**
   - Find your project: `fanvue-dashboard-5j89nt0ui-stjohn-moralis-projects`
   - Click on it to open the project dashboard

3. **Add Environment Variables**
   - Click on **Settings** tab
   - Click on **Environment Variables** in the left sidebar
   - Add the following variables:

   ```
   Name: FANVUE_API_KEY
   Value: your_actual_api_key_here
   Environment: Production (and Preview if needed)
   ```

   ```
   Name: FANVUE_API_VERSION
   Value: 2025-06-26
   Environment: Production (and Preview if needed)
   ```

4. **Save and Redeploy**
   - Click **Save** for each environment variable
   - Go to **Deployments** tab
   - Click **Redeploy** on your latest deployment

### 3. Test the Fix

1. **Wait for deployment to complete** (usually 1-2 minutes)
2. **Visit your dashboard URL** again
3. **If it still doesn't work**, visit: `https://your-app-url.vercel.app/api/test`
   - This will show you if your API key is working correctly
   - It will also show which API scopes you have access to

## Required API Scopes

Your Fanvue API key needs these scopes for the dashboard to work:
- `read:creator` - To access creator data
- `read:insights` - To access earnings data  
- `read:fan` - To access followers/subscribers data

## Troubleshooting

### If you still get errors after adding the API key:

1. **Check API Key Validity**
   - Visit `/api/test` endpoint to verify your key works
   - Make sure the key has the required scopes

2. **Verify Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Make sure both variables are set for **Production** environment
   - Check that there are no extra spaces in the values

3. **Redeploy**
   - Make sure to redeploy after adding environment variables
   - You can trigger a redeploy by making a small code change

### Common Issues:

- **"API key not configured"** → Environment variable not set in Vercel
- **"401 Unauthorized"** → API key is invalid or expired
- **"403 Forbidden"** → API key doesn't have required scopes
- **"429 Rate Limited"** → Too many API calls, wait and retry

## Support

If you continue to have issues:
1. Check the browser console for detailed error messages
2. Visit `/api/test` to see API scope status
3. Contact your Fanvue representative to verify API key permissions 