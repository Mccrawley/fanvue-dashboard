'use client'

import { useEffect, useState } from 'react'

interface EarningsItem {
  uuid: string
  amount: number
  currency: string
  source: string
  createdAt: string
  invoiceDate: string
}

interface EarningsResponse {
  data: EarningsItem[]
  meta: {
    hasNextPage: boolean
    nextCursor?: string
    totalCount: number
  }
}

interface DailyRevenue {
  date: string
  total: number
  bySource: Record<string, number>
}

interface ApiError {
  error: string
}

export default function RevenueDashboard() {
  const [earningsData, setEarningsData] = useState<EarningsItem[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // Default to last 30 days
    return date.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const fetchEarningsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all pages of data
      let allData: EarningsItem[] = []
      let cursor: string | undefined = undefined
      let hasNextPage = true

      while (hasNextPage) {
        const queryParams = new URLSearchParams({
          startDate: `${startDate}T00:00:00Z`,
          endDate: `${endDate}T23:59:59Z`,
          size: "50"
        })
        
        if (cursor) {
          queryParams.append('cursor', cursor)
        }

        const response = await fetch(`/api/earnings?${queryParams}`)

        if (!response.ok) {
          const errorData: ApiError = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const responseData: EarningsResponse = await response.json()
        allData = [...allData, ...responseData.data]
        
        hasNextPage = responseData.meta.hasNextPage
        cursor = responseData.meta.nextCursor
      }

      setEarningsData(allData)
      processEarningsData(allData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch earnings data')
    } finally {
      setLoading(false)
    }
  }

  const processEarningsData = (data: EarningsItem[]) => {
    // Group earnings by date and source
    const dailyMap = new Map<string, { total: number; bySource: Record<string, number> }>()

    data.forEach(item => {
      const date = item.invoiceDate.split('T')[0]
      const amount = item.amount / 100 // Convert cents to dollars
      
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { total: 0, bySource: {} })
      }

      const dailyData = dailyMap.get(date)!
      dailyData.total += amount
      dailyData.bySource[item.source] = (dailyData.bySource[item.source] || 0) + amount
    })

    // Convert to array and sort by date
    const dailyRevenueArray = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        total: data.total,
        bySource: data.bySource
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    setDailyRevenue(dailyRevenueArray)
  }

  useEffect(() => {
    fetchEarningsData()
  }, [startDate, endDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getTotalRevenue = () => {
    return dailyRevenue.reduce((sum, day) => sum + day.total, 0)
  }

  const getUniqueSourcesWithColors = () => {
    const sources = new Set<string>()
    earningsData.forEach(item => sources.add(item.source))
    
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500',
      'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-gray-500'
    ]
    
    return Array.from(sources).map((source, index) => ({
      source,
      color: colors[index % colors.length]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Revenue Data...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchEarningsData}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sourcesWithColors = getUniqueSourcesWithColors()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Revenue Dashboard</h1>
          
          {/* Date Range Selector */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={fetchEarningsData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors mt-6"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(getTotalRevenue())}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Transactions</h3>
            <p className="text-3xl font-bold text-blue-600">{earningsData.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Avg Daily Revenue</h3>
            <p className="text-3xl font-bold text-purple-600">
              {formatCurrency(dailyRevenue.length > 0 ? getTotalRevenue() / dailyRevenue.length : 0)}
            </p>
          </div>
        </div>

        {/* Revenue Sources Legend */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Revenue Sources</h3>
          <div className="flex flex-wrap gap-4">
            {sourcesWithColors.map(({ source, color }) => (
              <div key={source} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${color}`}></div>
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {source.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-6">Daily Revenue Breakdown</h3>
          
          {dailyRevenue.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No revenue data found for the selected date range.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dailyRevenue.map((day) => {
                const maxAmount = Math.max(...dailyRevenue.map(d => d.total))
                
                return (
                  <div key={day.date} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(day.total)}
                      </span>
                    </div>
                    
                    {/* Revenue bar with source breakdown */}
                    <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                      {Object.entries(day.bySource).map(([source, amount], index) => {
                        const sourceColor = sourcesWithColors.find(s => s.source === source)?.color || 'bg-gray-400'
                        const percentage = (amount / day.total) * 100
                        
                        return (
                          <div
                            key={source}
                            className={`absolute h-full ${sourceColor} opacity-80`}
                            style={{
                              left: `${Object.entries(day.bySource)
                                .slice(0, index)
                                .reduce((sum, [, amt]) => sum + (amt / day.total) * 100, 0)}%`,
                              width: `${percentage}%`
                            }}
                            title={`${source}: ${formatCurrency(amount)}`}
                          />
                        )
                      })}
                    </div>
                    
                    {/* Source breakdown details */}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {Object.entries(day.bySource).map(([source, amount]) => (
                        <span key={source} className="text-gray-600">
                          {source}: {formatCurrency(amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 