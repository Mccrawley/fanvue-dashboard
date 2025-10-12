'use client'

import { useState, useEffect, useCallback } from 'react'

interface Creator {
  uuid: string
  displayName: string
  handle: string
  role: string
  // Legacy fields for backward compatibility
  name?: string
  username?: string
  avatarUrl?: string
  isVerified?: boolean
}

interface CreatorStats {
  creator: Creator
  revenue: number
  transactions: number
  followers: number
  subscribers: number
  isLoading?: boolean
  hasError?: boolean
  errorMessage?: string
}

interface AgencyStats {
  totalRevenue: number
  totalTransactions: number
  totalFollowers: number
  totalSubscribers: number
  totalCreators: number
}

export default function AgencyDashboard() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [creatorStats, setCreatorStats] = useState<CreatorStats[]>([])
  const [agencyStats, setAgencyStats] = useState<AgencyStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    totalFollowers: 0,
    totalSubscribers: 0,
    totalCreators: 0
  })
  const [loading, setLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, status: '' })
  const [error, setError] = useState<string | null>(null)
  const [selectedCreator, setSelectedCreator] = useState<CreatorStats | null>(null)
  const [rateLimitWarning, setRateLimitWarning] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  })
  const [presetRange, setPresetRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d')

  // Batch processing to avoid rate limits
  const BATCH_SIZE = 3; // Process 3 creators at a time
  const BATCH_DELAY = 2000; // 2 second delay between batches

  // Date range handlers
  const handlePresetRangeChange = (preset: '7d' | '30d' | '90d' | 'custom') => {
    setPresetRange(preset)
    const today = new Date()
    const startDate = new Date()
    
    switch (preset) {
      case '7d':
        startDate.setDate(today.getDate() - 7)
        break
      case '30d':
        startDate.setDate(today.getDate() - 30)
        break
      case '90d':
        startDate.setDate(today.getDate() - 90)
        break
      case 'custom':
        // Keep current dates for custom
        return
    }
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    })
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
    setPresetRange('custom')
  }

  const fetchCreators = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setLoadingProgress({ current: 0, total: 0, status: 'Fetching creators...' })

      const response = await fetch('/api/creators?page=1&size=15', {
        credentials: 'include' // Ensure cookies are sent
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          // Authentication required - redirect to OAuth
          const errorData = await response.json().catch(() => ({}))
          if (errorData.authUrl) {
            window.location.href = errorData.authUrl
            return
          }
          throw new Error('Authentication required. Please login with Fanvue.')
        }
        
        if (response.status === 429) {
          setRateLimitWarning(true)
          throw new Error('Rate limit exceeded. Please wait a moment and try refreshing.')
        }
        
        // Handle specific error cases
        if (response.status === 500) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.error?.includes('API key not configured')) {
            throw new Error('API key not configured. Please check your Vercel environment variables.')
          }
          throw new Error(`Server error: ${errorData.error || response.statusText}`)
        }
        
        throw new Error(`Failed to fetch creators: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Debug: Log the full API response
      console.log('=== FULL API RESPONSE ===')
      console.log('Response status:', response.status)
      console.log('Response data:', data)
      console.log('Data type:', typeof data)
      console.log('Data.data type:', typeof data.data)
      console.log('Data.data is array:', Array.isArray(data.data))
      
      // Check if we got valid data
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid API response structure:', data)
        throw new Error('Invalid data received from API. Please check your API configuration.')
      }
      
      const creatorsData = data.data || []
      setCreators(creatorsData)
      setAgencyStats(prev => ({ ...prev, totalCreators: creatorsData.length }))

      // Initialize creator stats with loading state
      console.log('Creators data received:', creatorsData)
      
      if (!creatorsData || creatorsData.length === 0) {
        console.warn('No creators data received')
        setCreatorStats([])
        setLoading(false)
        return
      }
      
      // Handle different possible data structures from API
      let creators: Creator[] = []
      if (Array.isArray(creatorsData)) {
        creators = creatorsData
      } else if (creatorsData && Array.isArray(creatorsData.data)) {
        creators = creatorsData.data
      } else {
        console.error('Unexpected creators data structure:', creatorsData)
        setCreatorStats([])
        setLoading(false)
        return
      }


      const initialStats = creators.map((creator: Creator) => ({
        creator,
        revenue: 0,
        transactions: 0,
        followers: 0,
        subscribers: 0,
        isLoading: true,
        hasError: false,
        errorMessage: ''
      }))
      setCreatorStats(initialStats)

      // Fetch stats in batches to avoid rate limiting
      await fetchCreatorStatsBatched(creators)
      
    } catch (err: any) {
      console.error('=== DASHBOARD ERROR ===')
      console.error('Error type:', typeof err)
      console.error('Error message:', err.message)
      console.error('Full error:', err)
      console.error('Stack trace:', err.stack)
      setError(err.message)
      setLoading(false)
    }
  }, []) // Empty dependency array for useCallback

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])

  const fetchCreatorStatsBatched = async (creators: Creator[]) => {
    console.log('Starting batch processing for creators:', creators.length)
    
    if (!creators || creators.length === 0) {
      console.warn('No creators to process')
      setLoading(false)
      return
    }
    
    const totalCreators = creators.length
    let processedCreators = 0

    setLoadingProgress({ 
      current: 0, 
      total: totalCreators, 
      status: 'Loading creator data...' 
    })

    // Process creators in batches
    for (let i = 0; i < creators.length; i += BATCH_SIZE) {
      const batch = creators.slice(i, i + BATCH_SIZE)
      
      // Process current batch in parallel
      const batchPromises = batch.map(creator => fetchCreatorStats(creator))
      
      try {
        const batchResults = await Promise.allSettled(batchPromises)
        
        // Update stats for completed batch
        batchResults.forEach((result, index) => {
          if (!batch || !batch[index]) {
            console.warn('Invalid batch or creator at index:', index)
            return
          }
          
          const creator = batch[index]
          processedCreators++
          
          setLoadingProgress({ 
            current: processedCreators, 
            total: totalCreators, 
            status: `Loading creator data... (${processedCreators}/${totalCreators})` 
          })

          if (result.status === 'fulfilled') {
            setCreatorStats(prev => {
              if (!prev || !Array.isArray(prev)) {
                console.warn('Invalid creator stats state')
                return prev
              }
              
              return prev.map(stat => 
                stat.creator.uuid === creator.uuid 
                  ? { ...stat, ...result.value, isLoading: false, hasError: false }
                  : stat
              )
            })
                      } else {
              const errorMsg = result.reason?.message || 'Failed to load data'
              setCreatorStats(prev => {
                if (!prev || !Array.isArray(prev)) {
                  console.warn('Invalid creator stats state')
                  return prev
                }
                
                return prev.map(stat => 
                  stat.creator.uuid === creator.uuid 
                    ? { ...stat, isLoading: false, hasError: true, errorMessage: errorMsg }
                    : stat
                )
              })
            }
        })

        // Add delay between batches (except for the last batch)
        if (i + BATCH_SIZE < creators.length) {
          setLoadingProgress(prev => ({ 
            ...prev, 
            status: `Waiting to avoid rate limits... (${processedCreators}/${totalCreators})` 
          }))
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
        }
        
      } catch (error) {
        console.error('Batch processing error:', error)
      }
    }

    // Calculate totals
    calculateAgencyTotals()
    setLoading(false)
    setLoadingProgress({ current: totalCreators, total: totalCreators, status: 'Complete!' })
  }

  const fetchCreatorStats = async (creator: Creator) => {
    // Use the selected date range
    const startDateStr = dateRange.startDate
    const endDateStr = dateRange.endDate

    let totalRevenue = 0
    let totalTransactions = 0
    let totalFollowers = 0
    let totalSubscribers = 0

    try {
      // Fetch with rate limiting parameters
      console.log(`=== FETCHING STATS FOR ${creator.displayName || creator.handle} ===`)
      const [earningsResponse, followersResponse, subscribersResponse] = await Promise.all([
        fetch(`/api/creators/${creator.uuid}/earnings?startDate=${startDateStr}T00:00:00Z&endDate=${endDateStr}T23:59:59Z&maxPages=3`).catch(() => null),
        fetch(`/api/creators/${creator.uuid}/followers?maxPages=2`).catch(() => null),
        fetch(`/api/creators/${creator.uuid}/subscribers?maxPages=2`).catch(() => null)
      ])
      
      console.log(`Earnings response status: ${earningsResponse?.status || 'failed'}`)
      console.log(`Followers response status: ${followersResponse?.status || 'failed'}`)
      console.log(`Subscribers response status: ${subscribersResponse?.status || 'failed'}`)

      // Process earnings data
      if (earningsResponse?.ok) {
        const earningsData = await earningsResponse.json()
        console.log(`Earnings data for ${creator.displayName || creator.handle}:`, earningsData)
        if (earningsData.data) {
          console.log(`Raw earnings data:`, earningsData.data)
          console.log(`Number of earnings entries:`, earningsData.data.length)
          
          // Calculate revenue from net amounts (convert from cents to dollars)
          totalRevenue = earningsData.data.reduce((sum: number, item: any) => {
            const netAmount = item.net / 100 // Convert cents to dollars
            console.log(`Earnings item:`, item, `Net amount: $${netAmount}`)
            return sum + netAmount
          }, 0)
          
          totalTransactions = earningsData.data.length
          console.log(`Total revenue calculated: $${totalRevenue.toFixed(2)}`)
          console.log(`Total transactions: ${totalTransactions}`)
        } else {
          console.log(`No earnings data found for ${creator.displayName || creator.handle}`)
        }
      } else {
        console.log(`Earnings API failed for ${creator.displayName || creator.handle}:`, earningsResponse?.status)
      }

      // Process followers data
      if (followersResponse?.ok) {
        const followersData = await followersResponse.json()
        console.log(`Followers data for ${creator.displayName || creator.handle}:`, followersData)
        totalFollowers = followersData.data?.length || 0
        console.log(`Total followers: ${totalFollowers}`)
      } else {
        console.log(`Followers API failed for ${creator.displayName || creator.handle}:`, followersResponse?.status)
      }

      // Process subscribers data
      if (subscribersResponse?.ok) {
        const subscribersData = await subscribersResponse.json()
        console.log(`Subscribers data for ${creator.displayName || creator.handle}:`, subscribersData)
        totalSubscribers = subscribersData.data?.length || 0
        console.log(`Total subscribers: ${totalSubscribers}`)
      } else {
        console.log(`Subscribers API failed for ${creator.displayName || creator.handle}:`, subscribersResponse?.status)
      }

      return {
        revenue: totalRevenue,
        transactions: totalTransactions,
        followers: totalFollowers,
        subscribers: totalSubscribers
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch creator data')
    }
  }

  const calculateAgencyTotals = () => {
    setCreatorStats(prev => {
      if (!prev || !Array.isArray(prev)) {
        console.warn('Invalid creator stats for totals calculation')
        return prev
      }
      
      const totals = prev.reduce((acc, stat) => {
        if (!stat.hasError) {
          acc.totalRevenue += stat.revenue
          acc.totalTransactions += stat.transactions
          acc.totalFollowers += stat.followers
          acc.totalSubscribers += stat.subscribers
        }
        return acc
      }, {
        totalRevenue: 0,
        totalTransactions: 0,
        totalFollowers: 0,
        totalSubscribers: 0,
        totalCreators: prev.length
      })

      setAgencyStats(totals)
      return prev
    })
  }

  if (loading && creators.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agency dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    const isApiKeyError = error.includes('API key not configured')
    const isDeploymentError = error.includes('Failed to fetch') || error.includes('Server error')
    
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                  
                  {isApiKeyError && (
                    <div className="mt-3 p-3 bg-red-100 rounded-md">
                      <p className="font-medium">How to fix this:</p>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Go to your Vercel dashboard</li>
                        <li>Select this project</li>
                        <li>Go to Settings → Environment Variables</li>
                        <li>Add: <code className="bg-red-200 px-1 rounded">FANVUE_API_KEY=your_api_key_here</code></li>
                        <li>Add: <code className="bg-red-200 px-1 rounded">FANVUE_API_VERSION=2025-06-26</code></li>
                        <li>Redeploy your application</li>
                      </ol>
                    </div>
                  )}
                  
                  {isDeploymentError && (
                    <div className="mt-3 p-3 bg-red-100 rounded-md">
                      <p className="font-medium">Troubleshooting:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Check that your API key is valid and has the correct permissions</li>
                        <li>Verify your internet connection</li>
                        <li>Try refreshing the page</li>
                        <li>Contact support if the issue persists</li>
                      </ul>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agency Dashboard</h1>
          <p className="mt-2 text-gray-600">Multi-creator insights and analytics</p>
        </div>

        {/* Date Range Controls */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Date Range Filter</h2>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Preset buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePresetRangeChange('7d')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  presetRange === '7d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 7 days
              </button>
              <button
                onClick={() => handlePresetRangeChange('30d')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  presetRange === '30d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 30 days
              </button>
              <button
                onClick={() => handlePresetRangeChange('90d')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  presetRange === '90d'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Last 90 days
              </button>
            </div>

            {/* Custom date inputs */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">From:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">To:</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => fetchCreators()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Apply Filter
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Showing data from {dateRange.startDate} to {dateRange.endDate}
          </div>
        </div>

        {/* Rate Limit Warning */}
        {rateLimitWarning && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Rate Limit Warning</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>API rate limits may cause delays. Data is being loaded in batches to prevent errors.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Progress */}
        {loading && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">{loadingProgress.status}</p>
                {loadingProgress.total > 0 && (
                  <div className="mt-2">
                    <div className="bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {loadingProgress.current} of {loadingProgress.total} creators processed
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Agency Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">${agencyStats.totalRevenue.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Transactions</dt>
                    <dd className="text-lg font-medium text-gray-900">{agencyStats.totalTransactions.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Followers</dt>
                    <dd className="text-lg font-medium text-gray-900">{agencyStats.totalFollowers.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Subscribers</dt>
                    <dd className="text-lg font-medium text-gray-900">{agencyStats.totalSubscribers.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Creator Performance Grid */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Creator Performance ({agencyStats.totalCreators} creators)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creatorStats.map((stat) => (
                <div key={stat.creator.uuid} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedCreator(stat)}>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex-shrink-0">
                      {stat.creator.avatarUrl ? (
                        <img className="h-10 w-10 rounded-full" src={stat.creator.avatarUrl} alt={stat.creator.displayName || stat.creator.handle} />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">{stat.creator.displayName?.[0] || stat.creator.handle?.[0] || '?'}</span>
                          </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate flex items-center">
                        {stat.creator.displayName || stat.creator.handle || 'Unknown Creator'}
                        {stat.creator.isVerified && (
                          <svg className="ml-1 h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">@{stat.creator.username}</p>
                    </div>
                  </div>

                  {stat.isLoading ? (
                    <div className="space-y-2">
                      <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="space-y-2 mt-2">
                          <div className="h-3 bg-gray-200 rounded"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                        </div>
                      </div>
                    </div>
                  ) : stat.hasError ? (
                    <div className="text-sm text-red-600">
                      <p className="font-medium">Error loading data</p>
                      <p className="text-xs">{stat.errorMessage}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Revenue:</span>
                        <span className="font-medium text-green-600">${stat.revenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Transactions:</span>
                        <span className="font-medium">{stat.transactions}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Followers:</span>
                        <span className="font-medium">{stat.followers.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subscribers:</span>
                        <span className="font-medium">{stat.subscribers.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Creator Detail Modal */}
        {selectedCreator && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedCreator.creator.name} Details
                  </h3>
                  <button
                    onClick={() => setSelectedCreator(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {selectedCreator.creator.avatarUrl ? (
                      <img className="h-16 w-16 rounded-full" src={selectedCreator.creator.avatarUrl} alt={selectedCreator.creator.displayName || selectedCreator.creator.handle} />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xl font-medium text-gray-700">{selectedCreator.creator.displayName?.[0] || selectedCreator.creator.handle?.[0] || '?'}</span>
                        </div>
                      )}
                    <div>
                      <h4 className="text-xl font-medium text-gray-900 flex items-center">
                        {selectedCreator.creator.displayName || selectedCreator.creator.handle || 'Unknown Creator'}
                        {selectedCreator.creator.isVerified && (
                          <svg className="ml-2 h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </h4>
                      <p className="text-gray-500">@{selectedCreator.creator.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">${selectedCreator.revenue.toFixed(2)}</div>
                      <div className="text-sm text-green-700">Revenue (30 days)</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{selectedCreator.transactions}</div>
                      <div className="text-sm text-blue-700">Transactions</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{selectedCreator.followers.toLocaleString()}</div>
                      <div className="text-sm text-purple-700">Followers</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{selectedCreator.subscribers.toLocaleString()}</div>
                      <div className="text-sm text-orange-700">Subscribers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 