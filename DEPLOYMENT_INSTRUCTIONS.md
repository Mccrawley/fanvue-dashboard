# Deployment Instructions - Fanvue Dashboard

**Complete guide to deploy your Fanvue dashboard to production**

---

## 📋 **Pre-Deployment Checklist**

Before deploying, ensure you have:

- [ ] Valid Fanvue API key
- [ ] Vercel account set up
- [ ] GitHub repository (optional but recommended)
- [ ] Environment variables documented
- [ ] Code tested locally
- [ ] All dependencies installed

---

## 🚀 **Deployment Steps**

### **Step 1: Prepare Environment Variables**

Your dashboard needs these environment variables:

```bash
FANVUE_API_KEY=your_actual_api_key_here
FANVUE_API_VERSION=2025-06-26
```

**Important**: Never commit your API key to GitHub!

### **Step 2: Deploy to Vercel**

#### **Option A: Deploy via Vercel CLI (Recommended)**

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project root**:
   ```bash
   cd fanvue-dashboard
   vercel
   ```

4. **Follow prompts**:
   - Set up and deploy: Yes
   - Which scope: Your account
   - Link to existing project: No (first time)
   - Project name: fanvue-dashboard
   - Directory: `./`
   - Override settings: No

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

#### **Option B: Deploy via Vercel Dashboard**

1. **Go to** [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Click "Add New"** → "Project"
3. **Import your repository** or upload files
4. **Configure project**:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. **Click "Deploy"**

### **Step 3: Configure Environment Variables**

1. **In Vercel Dashboard**:
   - Go to your project
   - Click **Settings** tab
   - Click **Environment Variables** in sidebar

2. **Add these variables**:
   ```
   Name: FANVUE_API_KEY
   Value: fvak_f3ad14a25925cec102a6acb17c49a2c02d2b8b63d49d5d9ca395c7ca636e2fa3_239558
   Environment: Production, Preview, Development
   ```
   
   ```
   Name: FANVUE_API_VERSION
   Value: 2025-06-26
   Environment: Production, Preview, Development
   ```

3. **Click "Save"** for each variable

### **Step 4: Disable Deployment Protection** ⚠️ **CRITICAL**

**This is the most important step - your dashboard won't be accessible without this!**

1. **In Vercel Dashboard**:
   - Go to your project
   - Click **Settings** tab
   - Click **Deployment Protection** in sidebar

2. **Disable Protection**:
   - Find "Password Protection" or "Authentication Required"
   - Toggle it **OFF** or set to "Disabled"
   - Save changes

3. **Verify**:
   - Open your deployment URL in an incognito window
   - You should see the dashboard directly (no login page)

**Alternative**: If you want to keep some protection, use **Vercel Authentication** with your team members instead of password protection.

### **Step 5: Redeploy After Configuration**

After adding environment variables and disabling protection:

1. **Trigger a new deployment**:
   - Go to **Deployments** tab
   - Click **...** on latest deployment
   - Click **Redeploy**
   
   OR
   
   ```bash
   vercel --prod
   ```

2. **Wait for deployment** (usually 1-2 minutes)

---

## 🧪 **Post-Deployment Testing**

### **Test All Endpoints**:

1. **Test Homepage**:
   ```
   https://your-dashboard.vercel.app/
   ```
   Should load without authentication

2. **Test API Endpoints**:
   ```
   https://your-dashboard.vercel.app/api/creators
   https://your-dashboard.vercel.app/api/earnings
   https://your-dashboard.vercel.app/api/followers
   https://your-dashboard.vercel.app/api/subscribers
   ```

3. **Test Messaging Endpoints**:
   ```
   https://your-dashboard.vercel.app/api/creators/[uuid]/chats
   https://your-dashboard.vercel.app/api/creators/[uuid]/chats/[chatUuid]/messages
   ```

4. **Test Message Volume Analyzer**:
   ```
   https://your-dashboard.vercel.app/api/creators/[uuid]/message-volume
   ```

### **Verify Data Flow**:

- [ ] Creators data loads (should show 23 creators)
- [ ] Earnings data displays (2024 data)
- [ ] Follower/Subscriber counts appear
- [ ] Chat conversations accessible
- [ ] Messages retrieve successfully
- [ ] No 401/403 authentication errors
- [ ] No CORS errors

---

## 🔧 **Troubleshooting**

### **Issue: "API key not configured" Error**

**Symptoms**: Dashboard shows error message about missing API key

**Solution**:
1. Check environment variables in Vercel settings
2. Ensure variable name is exactly `FANVUE_API_KEY`
3. Verify no extra spaces in the value
4. Redeploy after adding variables

### **Issue: Authentication Page Appears**

**Symptoms**: Prompted to log in when accessing dashboard

**Solution**:
1. Go to **Settings** → **Deployment Protection**
2. Disable "Password Protection"
3. Disable "Vercel Authentication" (or configure team access)
4. Save and redeploy

### **Issue: 401 Unauthorized Errors**

**Symptoms**: API calls fail with 401 status

**Solutions**:
1. **API Key Expired**: Get new key from Fanvue
2. **API Key Invalid**: Double-check the key value
3. **API Key Revoked**: Contact Fanvue support
4. **Wrong Environment**: Check Production vs Preview variables

### **Issue: 404 Not Found on API Routes**

**Symptoms**: API endpoints return 404

**Solutions**:
1. Verify routes are in `/app/api/` directory
2. Check `route.ts` file naming
3. Ensure Next.js build succeeded
4. Review build logs for errors

### **Issue: CORS Errors**

**Symptoms**: "Access-Control-Allow-Origin" errors

**Solutions**:
1. CORS headers are already configured in route files
2. If still occurring, check browser console for details
3. May need to add domain to allowed origins

### **Issue: Slow Performance**

**Symptoms**: Dashboard takes long to load

**Solutions**:
1. Implement pagination on large datasets
2. Add caching to API routes
3. Optimize database queries
4. Use Vercel Edge Functions for better performance

---

## 📊 **Monitoring & Maintenance**

### **Monitor Deployment Health**:

1. **Vercel Analytics**:
   - Go to your project
   - Click **Analytics** tab
   - Monitor page views, performance, errors

2. **Check Logs**:
   - Click **Deployments** tab
   - Click on a deployment
   - Click **View Function Logs**
   - Monitor API errors and performance

3. **Set Up Alerts**:
   - Configure notifications for deployment failures
   - Set up error tracking (Sentry integration)
   - Monitor API rate limits

### **Regular Maintenance Tasks**:

- [ ] **Weekly**: Check for API errors in logs
- [ ] **Monthly**: Review API key expiration
- [ ] **Quarterly**: Update dependencies (`npm update`)
- [ ] **As Needed**: Update to latest Next.js version

---

## 🔄 **Updating the Dashboard**

### **To Deploy Updates**:

1. **Make changes locally**:
   ```bash
   # Edit your files
   npm run build  # Test build locally
   npm run dev    # Test functionality
   ```

2. **Commit changes** (if using Git):
   ```bash
   git add .
   git commit -m "Update dashboard features"
   git push origin main
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```
   
   OR (if using Git integration):
   - Vercel will auto-deploy on push to main branch

4. **Verify deployment**:
   - Check deployment status in Vercel dashboard
   - Test updated features
   - Monitor logs for errors

---

## 🔐 **Security Best Practices**

### **Protect Your API Key**:

- ✅ Store in environment variables only
- ✅ Never commit to Git
- ✅ Rotate keys periodically
- ✅ Use separate keys for dev/prod
- ❌ Don't expose in client-side code
- ❌ Don't share publicly

### **Secure Your Deployment**:

- Enable HTTPS (automatic on Vercel)
- Use environment-specific variables
- Implement rate limiting on API routes
- Monitor for unusual activity
- Keep dependencies updated

---

## 📱 **Custom Domain Setup** (Optional)

### **To use your own domain**:

1. **In Vercel Dashboard**:
   - Go to your project
   - Click **Settings** → **Domains**
   - Click **Add Domain**

2. **Enter your domain**:
   - Example: `dashboard.yourdomain.com`
   - Click **Add**

3. **Configure DNS**:
   - Add CNAME record in your DNS provider
   - Point to: `cname.vercel-dns.com`
   - Wait for DNS propagation (5-30 minutes)

4. **Verify**:
   - Vercel will show "Valid Configuration"
   - Your dashboard is now accessible at custom domain

---

## 🎯 **Production Checklist**

Before going live:

- [ ] Environment variables configured
- [ ] Deployment protection disabled
- [ ] API key valid and working
- [ ] All endpoints tested
- [ ] Dashboard loads without errors
- [ ] Data displays correctly
- [ ] Messaging metrics functional
- [ ] PowerBI can connect to APIs
- [ ] Error monitoring set up
- [ ] Team members can access
- [ ] Documentation updated
- [ ] Backup/disaster recovery plan

---

## 📞 **Support & Resources**

### **Vercel Documentation**:
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

### **Common Commands**:
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]

# Pull environment variables
vercel env pull

# Remove deployment
vercel remove [deployment-name]
```

---

## ✅ **Deployment Complete!**

Your Fanvue dashboard is now live and accessible at:
```
https://your-dashboard.vercel.app/
```

**Next Steps**:
1. Share dashboard URL with your team
2. Set up PowerBI connections
3. Create custom reports and visualizations
4. Monitor performance and optimize as needed

**Congratulations! Your dashboard is production-ready!** 🎉
