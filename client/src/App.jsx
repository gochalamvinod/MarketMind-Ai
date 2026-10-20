import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoadingSpinner from './components/common/LoadingSpinner'

// Core Pages (Clean 6-Page Architecture)
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Purchases from './pages/Purchases'
import MarketPrices from './pages/MarketPrices'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'

/**
 * ProtectedLayout wrapper
 * Ensures user is authenticated, then mounts the persistent application shell (<Layout />).
 */
const ProtectedLayout = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullPage message="Verifying session..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

/**
 * PublicRoute wrapper
 * Redirects to dashboard if already authenticated
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner fullPage message="Verifying session..." />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return children
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Authenticated Application Shell */}
      <Route element={<ProtectedLayout />}>
        {/* Core Pages */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/market-prices" element={<MarketPrices />} />
        <Route path="/alerts" element={<Notifications />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />

        {/* Clean Redirects for Secondary Routes */}
        <Route path="/ai-copilot" element={<Navigate to="/" replace />} />
        <Route path="/reports" element={<Navigate to="/" replace />} />
        <Route path="/suppliers" element={<Navigate to="/products" replace />} />
        <Route path="/sales" element={<Navigate to="/purchases" replace />} />
        <Route path="/products/:id" element={<Navigate to="/products" replace />} />
        <Route path="/ai-insights" element={<Navigate to="/" replace />} />
        <Route path="/chatbot" element={<Navigate to="/" replace />} />
        <Route path="/admin/*" element={<Navigate to="/" replace />} />
      </Route>

      {/* Catch-all redirect to / */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
