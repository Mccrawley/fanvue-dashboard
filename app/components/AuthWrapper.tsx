'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthStatus {
  isAuthenticated: boolean
  isLoading: boolean
  authUrl?: string
}

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoading: true
  })
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Check URL parameters for OAuth success
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('success') === 'true') {
        // OAuth completed successfully, check if we can access data
        setAuthStatus({
          isAuthenticated: true,
          isLoading: false
        })
        return
      }

      // Test if we can access a protected endpoint
      const response = await fetch('/api/creators?page=1&size=1')
      
      if (response.status === 401) {
        // Not authenticated - get auth URL
        const errorData = await response.json()
        setAuthStatus({
          isAuthenticated: false,
          isLoading: false,
          authUrl: errorData.authUrl || '/api/auth/authorize'
        })
      } else if (response.ok) {
        // Authenticated successfully
        setAuthStatus({
          isAuthenticated: true,
          isLoading: false
        })
      } else {
        // Other error - try OAuth
        setAuthStatus({
          isAuthenticated: false,
          isLoading: false,
          authUrl: '/api/auth/authorize'
        })
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthStatus({
        isAuthenticated: false,
        isLoading: false,
        authUrl: '/api/auth/authorize'
      })
    }
  }

  const handleLogin = () => {
    if (authStatus.authUrl) {
      window.location.href = authStatus.authUrl
    }
  }

  if (authStatus.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!authStatus.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-6">
              Please login with your Fanvue account to access the dashboard.
            </p>
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Login with Fanvue
          </button>
          
          <p className="text-sm text-gray-500 mt-4">
            You'll be redirected to Fanvue to complete the login process.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
