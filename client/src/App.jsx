import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import LoadingSpinner from './components/common/LoadingSpinner'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminUsers from './pages/AdminUsers'
import AdminApiKeys from './pages/AdminApiKeys'
import Products from './pages/Products'
import Purchases from './pages/Purchases'
import MarketPrices from './pages/MarketPrices'
import AICopilot from './pages/AICopilot'
import Notifications from './pages/Notifications'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import ProductDetail from './pages/ProductDetail'

/**
 * ProtectedLayout wrapper
 * Ensures user is authenticated, then mounts the persistent application shell (<Layout />).
 * Child routes render smoothly inside <Outlet /> without unmounting Navbar/Sidebar/Chatbot.
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

/**
 * Smart Dashboard — shows AdminDashboard for admin, merchant Dashboard for users
 */
const SmartDashboard = () => {
  const { user } = useAuth()
  return user?.role === 'admin' ? <AdminDashboard /> : <Dashboard />
}

/**
 * AdminOnly guard — redirects non-admin users to /
 */
const AdminOnly = ({ children }) => {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

/**
 * MerchantOnly guard — redirects admin to /
 */
const MerchantOnly = ({ children }) => {
  const { user } = useAuth()
  if (user?.role === 'admin') return <Navigate to="/" replace />
  return children
}

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
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

      {/* Authenticated Application Shell with Persistent Layout & Outlet */}
      <Route element={<ProtectedLayout />}>
        {/* Smart Dashboard — admin sees admin panel, users see merchant dashboard */}
        <Route path="/" element={<SmartDashboard />} />

        {/* Admin-Only Routes */}
        <Route path="/admin/users" element={<AdminOnly><AdminUsers /></AdminOnly>} />
        <Route path="/admin/database" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
        <Route path="/admin/api-keys" element={<AdminOnly><AdminApiKeys /></AdminOnly>} />

        {/* Merchant-Only Routes (admin gets redirected to /) */}
        <Route path="/products" element={<MerchantOnly><Products /></MerchantOnly>} />
        <Route path="/products/:id" element={<MerchantOnly><ProductDetail /></MerchantOnly>} />
        <Route path="/suppliers" element={<Navigate to="/products" replace />} />
        <Route path="/purchases" element={<MerchantOnly><Purchases /></MerchantOnly>} />
        <Route path="/sales" element={<Navigate to="/purchases" replace />} />
        <Route path="/market-prices" element={<MerchantOnly><MarketPrices /></MerchantOnly>} />
        <Route path="/ai-copilot" element={<MerchantOnly><AICopilot /></MerchantOnly>} />
        <Route
          path="/ai-insights"
          element={<Navigate to="/ai-copilot?tab=insights" replace />}
        />
        <Route
          path="/chatbot"
          element={<Navigate to="/ai-copilot?tab=chat" replace />}
        />
        <Route path="/alerts" element={<MerchantOnly><Notifications /></MerchantOnly>} />
        <Route
          path="/notifications"
          element={<Navigate to="/alerts" replace />}
        />
        <Route path="/reports" element={<MerchantOnly><Reports /></MerchantOnly>} />

        {/* Settings — accessible by both admin and merchant (different views) */}
        <Route path="/settings" element={<Settings />} />
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
