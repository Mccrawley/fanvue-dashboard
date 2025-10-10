# PowerBI Connection Guide - Fanvue Dashboard

**Complete guide for connecting PowerBI to your Fanvue API endpoints**

---

## 📊 **Overview**

This guide will help you connect PowerBI to all 21 working Fanvue API endpoints to create comprehensive analytics dashboards for your 23 creator portfolio.

---

## 🔑 **Prerequisites**

### **Required Information:**
- **API Key**: `FANVUE_API_KEY` (from Vercel environment variables)
- **API Version**: `2025-06-26`
- **Base URL**: `https://api.fanvue.com/`
- **Dashboard URL**: `https://your-dashboard.vercel.app/` (once deployed)

### **PowerBI Requirements:**
- PowerBI Desktop or PowerBI Pro
- Internet connection for API calls
- Basic knowledge of PowerBI data modeling

---

## 🎯 **Available API Endpoints**

### **✅ Working Endpoints (21 total):**

#### **1. Core Creator Data**
| Endpoint | Description | Records |
|----------|-------------|---------|
| `/creators` | All creators | 23 creators |
| `/creators?page=1&size=10` | Creators with pagination | Configurable |
| `/users/me` | User profile | 1 record |

#### **2. Earnings & Insights**
| Endpoint | Description | Records |
|----------|-------------|---------|
| `/insights/earnings` | Global earnings | Variable |
| `/insights/earnings?size=5` | Earnings with limit | Configurable |
| `/creators/{uuid}/insights/earnings` | Creator earnings | 20+ per creator |
| `/creators/{uuid}/insights/earnings?size=10` | Creator earnings limited | Configurable |

#### **3. Fans & Engagement**
| Endpoint | Description | Records |
|----------|-------------|---------|
| `/followers` | All followers | Variable |
| `/followers?page=1&size=10` | Followers with pagination | Configurable |
| `/subscribers` | All subscribers | Variable |
| `/subscribers?page=1&size=10` | Subscribers with pagination | Configurable |
| `/creators/{uuid}/followers` | Creator followers | Variable |
| `/creators/{uuid}/followers?page=1&size=10` | Creator followers limited | Configurable |
| `/creators/{uuid}/subscribers` | Creator subscribers | 15+ per creator |
| `/creators/{uuid}/subscribers?page=1&size=10` | Creator subscribers limited | Configurable |

#### **4. Messaging & Chats**
| Endpoint | Description | Records |
|----------|-------------|---------|
| `/chats` | All chats | Variable |
| `/chats?page=1&size=10` | Chats with pagination | Configurable |
| `/creators/{uuid}/chats` | Creator chats | 50+ per creator |
| `/creators/{uuid}/chats?page=1&size=10` | Creator chats limited | Configurable |
| `/creators/{uuid}/chats/{chatUuid}/messages` | Chat messages | 15-20 per chat |
| `/creators/{uuid}/chats/{chatUuid}/messages?page=1&size=10` | Messages limited | Configurable |

---

## 🔧 **PowerBI Setup Instructions**

### **Step 1: Create Base Data Source**

1. **Open PowerBI Desktop**
2. **Click "Get Data" → "Web"**
3. **Enter URL**: `https://your-dashboard.vercel.app/api/creators`
4. **Click "Advanced"**
5. **Add HTTP Headers**:
   ```
   X-Fanvue-API-Key: [Your API Key]
   X-Fanvue-API-Version: 2025-06-26
   Content-Type: application/json
   ```

### **Step 2: Create Creators Master Table**

```powerquery
let
    Source = Json.Document(Web.Contents("https://your-dashboard.vercel.app/api/creators", [
        Headers=[
            #"X-Fanvue-API-Key"="YOUR_API_KEY_HERE",
            #"X-Fanvue-API-Version"="2025-06-26"
        ]
    ])),
    data = Source[data],
    ToTable = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    ExpandColumn = Table.ExpandRecordColumn(ToTable, "Column1", 
        {"uuid", "displayName", "handle", "email", "role"}, 
        {"UUID", "DisplayName", "Handle", "Email", "Role"})
in
    ExpandColumn
```

### **Step 3: Create Earnings Table (All Creators)**

```powerquery
let
    Creators = CreatorsTable,
    AddEarningsData = Table.AddColumn(Creators, "Earnings", each 
        Json.Document(Web.Contents("https://your-dashboard.vercel.app/api/creators/" & [UUID] & "/insights/earnings", [
            Headers=[
                #"X-Fanvue-API-Key"="YOUR_API_KEY_HERE",
                #"X-Fanvue-API-Version"="2025-06-26"
            ]
        ]))[data]
    ),
    ExpandEarnings = Table.ExpandListColumn(AddEarningsData, "Earnings"),
    ExpandRecord = Table.ExpandRecordColumn(ExpandEarnings, "Earnings",
        {"date", "gross", "net", "source"},
        {"Date", "Gross", "Net", "Source"})
in
    ExpandRecord
```

### **Step 4: Create Subscribers Table**

```powerquery
let
    Creators = CreatorsTable,
    AddSubscribers = Table.AddColumn(Creators, "Subscribers", each 
        Json.Document(Web.Contents("https://your-dashboard.vercel.app/api/creators/" & [UUID] & "/subscribers", [
            Headers=[
                #"X-Fanvue-API-Key"="YOUR_API_KEY_HERE",
                #"X-Fanvue-API-Version"="2025-06-26"
            ]
        ]))[data]
    ),
    ExpandSubscribers = Table.ExpandListColumn(AddSubscribers, "Subscribers"),
    ExpandRecord = Table.ExpandRecordColumn(ExpandSubscribers, "Subscribers",
        {"uuid", "handle", "displayName"},
        {"FanUUID", "FanHandle", "FanDisplayName"})
in
    ExpandRecord
```

### **Step 5: Create Messaging Metrics Table**

```powerquery
let
    Creators = CreatorsTable,
    AddChats = Table.AddColumn(Creators, "Chats", each 
        Json.Document(Web.Contents("https://your-dashboard.vercel.app/api/creators/" & [UUID] & "/chats", [
            Headers=[
                #"X-Fanvue-API-Key"="YOUR_API_KEY_HERE",
                #"X-Fanvue-API-Version"="2025-06-26"
            ]
        ]))[data]
    ),
    ExpandChats = Table.ExpandListColumn(AddChats, "Chats"),
    ExpandChatRecord = Table.ExpandRecordColumn(ExpandChats, "Chats",
        {"createdAt", "lastMessageAt", "isRead", "user"},
        {"ChatCreatedAt", "LastMessageAt", "IsRead", "User"}),
    ExpandUser = Table.ExpandRecordColumn(ExpandChatRecord, "User",
        {"uuid", "handle"},
        {"FanUUID", "FanHandle"})
in
    ExpandUser
```

---

## 📐 **Data Model Relationships**

### **Create These Relationships in PowerBI:**

```
Creators (Master Table)
    ├── UUID (Primary Key)
    │
    ├── → Earnings[CreatorUUID] (One-to-Many)
    ├── → Followers[CreatorUUID] (One-to-Many)
    ├── → Subscribers[CreatorUUID] (One-to-Many)
    └── → MessagingMetrics[CreatorUUID] (One-to-Many)
```

### **Relationship Setup:**
1. **Go to Model View** in PowerBI
2. **Drag from** `Creators[UUID]` **to** `Earnings[CreatorUUID]`
3. **Set Cardinality**: One-to-Many
4. **Set Cross-filter direction**: Single
5. **Repeat for** all other tables

---

## 🎨 **Recommended Visualizations**

### **1. Executive Dashboard**
- **Total Revenue Card** - Sum of all earnings
- **Active Creators Card** - Count of creators
- **Total Subscribers Card** - Count of unique subscribers
- **Messages This Month Card** - Count of messages

### **2. Creator Performance Matrix**
- **Table Visual** with:
  - Creator Name
  - Total Revenue
  - Subscriber Count
  - Message Count
  - Response Rate

### **3. Revenue Trends**
- **Line Chart**: Date vs Total Revenue
- **Stacked Bar**: Creator vs Revenue by Source
- **Area Chart**: Monthly revenue trends

### **4. Messaging Analytics**
- **Bar Chart**: Messages Sent vs Received by Creator
- **Scatter Plot**: Messages vs Engagement Score
- **Heatmap**: Time of day vs Message volume

### **5. Fan Engagement**
- **Funnel Chart**: Followers → Subscribers → Active Chatters
- **Table**: Top fans by message count
- **Gauge**: Average response rate

---

## 🔄 **Data Refresh Configuration**

### **Scheduled Refresh Settings:**
- **Frequency**: Every 1-4 hours (depending on PowerBI Pro/Premium)
- **Time Zone**: Your local timezone
- **Failure Notifications**: Enable email alerts

### **Manual Refresh:**
- Click **Refresh** button in PowerBI Desktop
- Or use **Refresh Now** in PowerBI Service

### **Incremental Refresh (Recommended):**
Set up incremental refresh for large datasets:
- Keep last 30 days in memory
- Archive older data
- Refresh only new/changed data

---

## 🎯 **Filtering & Slicing**

### **Add These Slicers to Your Dashboard:**

1. **Creator Dropdown**
   - Field: `Creators[DisplayName]`
   - Style: Dropdown
   - Allow Multiple Selections: Yes

2. **Date Range Slicer**
   - Field: `Earnings[Date]`
   - Style: Between
   - Default: Last 30 days

3. **Revenue Source Filter**
   - Field: `Earnings[Source]`
   - Style: List
   - Allow Multiple: Yes

4. **Active Status Filter**
   - Field: `MessagingMetrics[IsActive]`
   - Style: Button
   - Options: Active/Inactive/All

---

## 💡 **Pro Tips**

### **Performance Optimization:**
1. **Use Query Folding** - Let API do filtering when possible
2. **Limit Data Size** - Use pagination parameters
3. **Cache Frequently Used Data** - Store in separate tables
4. **Remove Unused Columns** - Keep only necessary fields

### **Error Handling:**
```powerquery
= try 
    Json.Document(Web.Contents(...))
otherwise 
    [data = {}]
```

### **Dynamic Parameters:**
Create parameters for:
- API Key (for easy updates)
- Base URL (switch between dev/prod)
- Page Size (control data volume)

---

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **401 Unauthorized Error**
- **Cause**: Invalid or expired API key
- **Solution**: Update API key in data source credentials

#### **429 Rate Limit Error**
- **Cause**: Too many API requests
- **Solution**: Add delays between requests, reduce page size

#### **Data Not Updating**
- **Cause**: Cache or refresh issues
- **Solution**: Clear cache, force manual refresh

#### **Slow Performance**
- **Cause**: Large dataset or too many API calls
- **Solution**: Implement incremental refresh, use pagination

---

## 📞 **Support**

### **Need Help?**
- Check API endpoint status
- Verify API key is valid
- Review PowerBI error messages
- Check rate limits

### **Best Practices:**
- Test with small datasets first
- Build incrementally (one table at a time)
- Document your data model
- Create backup before major changes

---

## ✅ **Success Checklist**

- [ ] API key configured in PowerBI
- [ ] Creators master table created
- [ ] Earnings table created and linked
- [ ] Subscribers table created and linked
- [ ] Messaging metrics table created and linked
- [ ] Relationships established
- [ ] Visualizations created
- [ ] Slicers configured
- [ ] Refresh schedule set
- [ ] Dashboard published to PowerBI Service

**You're ready to analyze your Fanvue creator portfolio!** 🎉
