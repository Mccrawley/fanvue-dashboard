'use client'

import { useEffect, useState } from 'react'

interface UserProfile {
  uuid: string
  email: string
  handle: string
  displayName?: string
  bio?: string
  avatar?: string
}

interface Fan {
  uuid: string
  handle: string
  displayName?: string
  createdAt: string
}

interface FansResponse {
  data: Fan[]
  pagination: {
    page: number
    size: number
    hasMore: boolean
  }
}

interface ApiError {
  error: string
}

interface DashboardData {
  profile: UserProfile | null
  followers: Fan[]
  subscribers: Fan[]
  followersCount: number
  subscribersCount: number
}

export default function FanAnalyticsDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    profile: null,
    followers: [],
    subscribers: [],
    followersCount: 0,
    subscribersCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [profileResponse, followersResponse, subscribersResponse] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/followers?size=50'),
        fetch('/api/subscribers?size=50')
      ])

      // Check for errors
      if (!profileResponse.ok) {
        const errorData: ApiError = await profileResponse.json()
        throw new Error(`Profile: ${errorData.error}`)
      }

      if (!followersResponse.ok) {
        const errorData: ApiError = await followersResponse.json()
        throw new Error(`Followers: ${errorData.error}`)
      }

      if (!subscribersResponse.ok) {
        const errorData: ApiError = await subscribersResponse.json()
        throw new Error(`Subscribers: ${errorData.error}`)
      }

      // Parse responses
      const profile: UserProfile = await profileResponse.json()
      const followersData: FansResponse = await followersResponse.json()
      const subscribersData: FansResponse = await subscribersResponse.json()

      setDashboardData({
        profile,
        followers: followersData.data,
        subscribers: subscribersData.data,
        followersCount: followersData.data.length,
        subscribersCount: subscribersData.data.length
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const getRecentFans = (fans: Fan[], days = 7) => {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return fans.filter(fan => {
      const fanDate = new Date(fan.createdAt)
      return fanDate > cutoffDate
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Your Fan Analytics...</h2>
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
              onClick={fetchDashboardData}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const recentFollowers = getRecentFans(dashboardData.followers)
  const recentSubscribers = getRecentFans(dashboardData.subscribers)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-6">
            {dashboardData.profile?.avatar && (
              <img
                src={dashboardData.profile.avatar}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {dashboardData.profile?.displayName || `@${dashboardData.profile?.handle}`}
              </h1>
              <p className="text-gray-600">Fan Analytics Dashboard</p>
              {dashboardData.profile?.bio && (
                <p className="text-sm text-gray-500 mt-1">{dashboardData.profile.bio}</p>
              )}
            </div>
          </div>
          
          <button
            onClick={fetchDashboardData}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Followers</h3>
            <p className="text-3xl font-bold text-blue-600">{dashboardData.followersCount.toLocaleString()}</p>
            <p className="text-sm text-gray-500">showing latest</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Subscribers</h3>
            <p className="text-3xl font-bold text-green-600">{dashboardData.subscribersCount.toLocaleString()}</p>
            <p className="text-sm text-gray-500">showing latest</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">New Followers (7d)</h3>
            <p className="text-3xl font-bold text-purple-600">{recentFollowers.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">New Subscribers (7d)</h3>
            <p className="text-3xl font-bold text-orange-600">{recentSubscribers.length}</p>
          </div>
        </div>

        {/* Fan Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Followers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Followers</h3>
            {recentFollowers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No new followers in the last 7 days</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentFollowers.slice(0, 10).map((follower) => (
                  <div key={follower.uuid} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-800">
                        {follower.displayName || `@${follower.handle}`}
                      </p>
                      <p className="text-sm text-gray-500">@{follower.handle}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(follower.createdAt)}
                    </span>
                  </div>
                ))}
                {recentFollowers.length > 10 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    +{recentFollowers.length - 10} more followers
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Recent Subscribers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Subscribers</h3>
            {recentSubscribers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No new subscribers in the last 7 days</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentSubscribers.slice(0, 10).map((subscriber) => (
                  <div key={subscriber.uuid} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-800">
                        {subscriber.displayName || `@${subscriber.handle}`}
                      </p>
                      <p className="text-sm text-gray-500">@{subscriber.handle}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(subscriber.createdAt)}
                    </span>
                  </div>
                ))}
                {recentSubscribers.length > 10 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    +{recentSubscribers.length - 10} more subscribers
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* All Followers & Subscribers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* All Followers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Latest Followers ({dashboardData.followersCount})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dashboardData.followers.map((follower) => (
                <div key={follower.uuid} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {follower.displayName || `@${follower.handle}`}
                    </p>
                    <p className="text-xs text-gray-500">@{follower.handle}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(follower.createdAt)}
                  </span>
                </div>
              ))}

            </div>
          </div>

          {/* All Subscribers */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Latest Subscribers ({dashboardData.subscribersCount})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dashboardData.subscribers.map((subscriber) => (
                <div key={subscriber.uuid} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {subscriber.displayName || `@${subscriber.handle}`}
                    </p>
                    <p className="text-xs text-gray-500">@{subscriber.handle}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(subscriber.createdAt)}
                  </span>
                </div>
              ))}
              {dashboardData.subscribersCount > dashboardData.subscribers.length && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  Showing first {dashboardData.subscribers.length} of {dashboardData.subscribersCount} subscribers
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 