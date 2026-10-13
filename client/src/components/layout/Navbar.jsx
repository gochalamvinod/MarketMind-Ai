import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BsBarChartLineFill,
  BsList,
  BsPersonCircle,
  BsBoxArrowRight,
  BsShieldCheck,
  BsRobot
} from 'react-icons/bs'
import { useAuth } from '../../context/AuthContext'
import NotificationBell from '../notifications/NotificationBell'
import { getApiStatus } from '../../services/api'

/**
 * Top navigation bar
 * @param {{ onToggleSidebar?: () => void }} props
 */
const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isDemo, setIsDemo] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    // Check if system is in demo or fallback mode
    const checkStatus = async () => {
      try {
        const res = await getApiStatus()
        if (res.data?.isDemo || res.data?.mode === 'demo' || res.data?.simulated) {
          setIsDemo(true)
        }
      } catch (err) {
        // Keep default false on error
      }
    }
    checkStatus()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar navbar-expand-lg app-navbar px-3 px-lg-4 border-bottom sticky-top bg-white">
      <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
        {/* Left: Mobile hamburger & Brand */}
        <div className="d-flex align-items-center gap-2 gap-lg-3">
          <button
            type="button"
            className="btn btn-light d-lg-none p-2 border-0 shadow-none text-dark"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation sidebar"
          >
            <BsList className="fs-4" />
          </button>

          {/* Brand */}
          <Link to="/" className="navbar-brand d-flex align-items-center m-0 text-decoration-none py-0">
            <img src="/logo.svg" alt="MarketMind AI" height="36" className="d-inline-block" />
          </Link>
        </div>

        {/* Right: Notifications & User profile */}
        <div className="d-flex align-items-center gap-2 gap-md-3">
          {user?.role !== 'admin' && (
            <Link
              to="/ai-copilot?tab=chat"
              className="btn btn-outline-success btn-sm rounded-pill d-none d-sm-inline-flex align-items-center gap-1 py-1 px-2 border-opacity-50 text-decoration-none shadow-2xs"
              title="Open MarketMind AI Copilot"
              style={{ fontSize: '0.82rem' }}
            >
              <BsRobot size={14} />
              <span className="fw-semibold">AI Copilot</span>
            </Link>
          )}

          <NotificationBell />

          {/* User profile dropdown */}
          <div className="position-relative">
            <button
              type="button"
              className="btn btn-light d-flex align-items-center gap-2 border-0 py-1 px-2 rounded-pill shadow-sm user-dropdown-btn"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
            >
              <div className="user-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold">
                {user?.role === 'admin' ? 'A' : user?.name ? user.name.charAt(0).toUpperCase() : <BsPersonCircle className="fs-5" />}
              </div>
              <div className="d-none d-sm-block text-start lh-1 me-1">
                <span className="d-block fw-semibold text-dark small" style={{ maxWidth: '140px' }}>
                  {user?.role === 'admin' ? 'Administrator' : user?.name || 'User'}
                </span>
                <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>
                  {user?.role === 'admin' ? 'Master Admin' : user?.businessName || 'Store Owner'}
                </span>
              </div>
            </button>

            {userMenuOpen && (
              <div
                className="dropdown-menu dropdown-menu-end show shadow-lg border-0 mt-2 py-2"
                style={{ minWidth: '220px', position: 'absolute', right: 0, zIndex: 1050 }}
              >
                <div className="px-3 py-2 border-bottom">
                  <p className="mb-0 fw-semibold text-dark small">
                    {user?.role === 'admin' ? 'System Administrator' : user?.name || 'Merchant'}
                  </p>
                  <p className="mb-0 text-muted small text-truncate">{user?.email || 'admin@marketmind.ai'}</p>
                  {user?.role === 'admin' ? (
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle small mt-1">
                      Platform Master Admin
                    </span>
                  ) : user?.businessName ? (
                    <span className="badge bg-secondary-subtle text-secondary small mt-1">
                      {user.businessName}
                    </span>
                  ) : null}
                </div>

                <Link
                  to="/settings"
                  className="dropdown-item d-flex align-items-center gap-2 py-2 small text-secondary"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <BsShieldCheck /> Profile & Settings
                </Link>

                <div className="dropdown-divider"></div>

                <button
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2 py-2 small text-danger"
                  onClick={handleLogout}
                >
                  <BsBoxArrowRight /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
