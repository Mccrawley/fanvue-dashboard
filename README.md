# Fanvue Revenue Dashboard
<!-- Force redeploy with latest fixes - Service account endpoints fixed -->

A Next.js dashboard for tracking daily revenue split and earnings data from the Fanvue API.

## Features

- **Daily Revenue Visualization**: View revenue breakdown by day with visual bars
- **Revenue Source Tracking**: See earnings split by different sources (subscriptions, tips, etc.)
- **Date Range Filtering**: Select custom date ranges to analyze specific periods
- **Real-time Data**: Fetches live data from Fanvue API
- **Responsive Design**: Works on desktop and mobile devices
- **Summary Statistics**: View total revenue, transaction count, and average daily revenue

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Key

Add your Fanvue API key to the `.env.local` file:

```bash
FANVUE_API_KEY=your_actual_api_key_here
FANVUE_API_VERSION=2025-06-26
```

**Important**: Replace `your_actual_api_key_here` with your real API key from your Fanvue representative.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the dashboard.

## How to Use

1. **Set Date Range**: Use the date pickers at the top to select your desired time period
2. **View Summary**: Check the summary cards for total revenue, transaction count, and average daily revenue
3. **Analyze Sources**: Review the revenue sources legend to understand different income streams
4. **Daily Breakdown**: Scroll through the daily revenue breakdown to see detailed per-day performance
5. **Refresh Data**: Click "Refresh Data" to fetch the latest information

## Dashboard Components

### Summary Cards
- **Total Revenue**: Sum of all earnings in the selected period
- **Total Transactions**: Number of individual earning transactions
- **Average Daily Revenue**: Revenue divided by number of days

### Revenue Sources
- Color-coded legend showing different earning sources
- Each source is represented by a different color in the daily breakdown

### Daily Revenue Breakdown
- Visual bars showing daily revenue amounts
- Stacked bars show the proportion from each revenue source
- Hover over bars to see exact amounts by source

## API Requirements

This dashboard requires the `read:insights` scope for your Fanvue API key to access earnings data.

## Troubleshooting

### "API key not configured" Error
- Ensure your `.env.local` file exists in the project root
- Verify the API key is correctly set without extra spaces
- Restart the development server after changing environment variables

### "Failed to fetch earnings data" Error
- Check that your API key has the correct scopes (`read:insights`)
- Verify your internet connection
- Check the browser console for detailed error messages

### No Data Displayed
- Ensure you have earnings data in the selected date range
- Try expanding the date range to include periods with known revenue
- Check with your Fanvue representative if you should have access to earnings data

## Development

### Project Structure
```
fanvue-dashboard/
├── app/
│   ├── api/earnings/
│   │   └── route.ts          # API route for Fanvue earnings
│   ├── components/
│   │   └── RevenueDashboard.tsx # Main dashboard component
│   ├── page.tsx              # Home page
│   └── layout.tsx            # App layout
├── .env.local                # Environment variables (add your API key here)
└── package.json
```

### Adding New Features
- API routes go in `app/api/`
- React components go in `app/components/`
- The main dashboard logic is in `RevenueDashboard.tsx`

## Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. Add your `FANVUE_API_KEY` to the deployment platform's environment variables
2. Ensure `FANVUE_API_VERSION=2025-06-26` is also set
3. Deploy the application

Never commit your actual API key to version control!
