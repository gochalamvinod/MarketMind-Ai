import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BsSpeedometer2,
  BsBox,
  BsCartPlus,
  BsGraphUp,
  BsBell,
  BsFileText,
  BsGear,
  BsX,
  BsDatabase,
  BsPeopleFill,
  BsKeyFill,
  BsShieldCheck
} from 'react-icons/bs'
import { useAuth } from '../../context/AuthContext'
import { getUnreadCount } from '../../services/api'

// Navigation items for regular store merchants
const userNavItems = [
  { name: 'Dashboard', path: '/', icon: BsSpeedometer2 },
  { name: 'Products', path: '/products', icon: BsBox },
  { name: 'Purchases', path: '/purchases', icon: BsCartPlus },
  { name: 'Market Prices', path: '/market-prices', icon: BsGraphUp },
  { name: 'Alerts', path: '/alerts', icon: BsBell },
  { name: 'Reports', path: '/reports', icon: BsFileText },
  { name: 'Settings', path: '/settings', icon: BsGear }
]

// Navigation items for platform admin (manager)
const adminNavItems = [
  { name: 'Dashboard', path: '/', icon: BsSpeedometer2 },
  { name: 'Users', path: '/admin/users', icon: BsPeopleFill },
  { name: 'Database', path: '/admin/database', icon: BsDatabase },
  { name: 'API Keys', path: '/admin/api-keys', icon: BsKeyFill },
  { name: 'Settings', path: '/settings', icon: BsGear }
]

/**
 * Sidebar navigation component
 * Shows different nav items based on user role (admin vs merchant)
 * @param {{ mobileOpen?: boolean, onCloseMobile?: () => void }} props
 */
const Sidebar = ({ mobileOpen, onCloseMobile }) => {
  const location = useLocation()
  const { user } = useAuth()
  const [unreadAlerts, setUnreadAlerts] = useState(0)

  const isAdmin = user?.role === 'admin'
  const navItems = isAdmin ? adminNavItems : userNavItems

  useEffect(() => {
    // Only poll alerts for non-admin users
    if (isAdmin) return

    const fetchUnread = async () => {
      try {
        const res = await getUnreadCount()
        const count = res.data?.unreadCount ?? res.data?.count ?? (typeof res.data === 'number' ? res.data : 0)
        setUnreadAlerts(count)
      } catch (e) {}
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [location.pathname, isAdmin])

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop d-lg-none position-fixed top-0 start-0 w-100 h-100"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1040 }}
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`app-sidebar flex-column text-white ${
          mobileOpen ? 'd-flex sidebar-mobile-show' : 'd-none d-lg-flex'
        }`}
      >
        {/* Mobile Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom border-secondary d-lg-none">
          <div className="d-flex align-items-center gap-2">
            <img src="/favicon.svg" alt="MarketMind AI" width="28" height="28" className="rounded" />
            <span className="fw-bold fs-5 text-white">MarketMind AI</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-light bg-white bg-opacity-25 text-white border-0 p-1 rounded-2 d-flex align-items-center justify-content-center"
            style={{ width: '36px', height: '36px' }}
            onClick={(e) => {
              e.stopPropagation()
              if (onCloseMobile) onCloseMobile()
            }}
            aria-label="Close navigation menu"
          >
            <BsX size={26} />
          </button>
        </div>

        {/* Sidebar Header Brand (Desktop) */}
        <div className="sidebar-brand-section px-3 py-3 d-none d-lg-block border-bottom border-secondary border-opacity-25">
          <div className="d-flex align-items-center gap-2 mb-1">
            <img src="/favicon.svg" alt="MarketMind AI" width="28" height="28" className="rounded" />
            <span className="fw-bold fs-6 text-white tracking-tight">MarketMind <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.62rem' }}>AI</span></span>
          </div>
          <div className="small text-uppercase text-light fw-medium tracking-wider" style={{ opacity: 0.65, fontSize: '0.68rem', letterSpacing: '0.08em' }}>
            {isAdmin ? 'Platform Administration' : 'Telangana Agri Intelligence'}
          </div>
        </div>

        {/* Navigation list */}
        <div className="sidebar-nav-container flex-grow-1 overflow-y-auto py-3 px-2">
          <ul className="nav nav-pills flex-column gap-1 list-unstyled mb-0">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path)

              return (
                <li key={item.path} className="nav-item">
                  <NavLink
                    to={item.path}
                    onClick={() => {
                      if (onCloseMobile) onCloseMobile()
                    }}
                    className={`nav-link d-flex align-items-center gap-3 px-3 py-2 rounded-3 transition-all ${
                      isActive ? 'active-nav-link text-white fw-bold' : 'sidebar-link'
                    }`}
                  >
                    <Icon className="fs-5 flex-shrink-0" />
                    <span className="nav-text fw-medium">{item.name}</span>
                    {item.path === '/alerts' && !isAdmin && unreadAlerts > 0 && (
                      <span className="badge bg-danger rounded-pill ms-auto px-2 py-1" style={{ fontSize: '0.68rem' }}>
                        {unreadAlerts}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Sidebar Footer info */}
        <div className="sidebar-footer p-3 border-top border-secondary border-opacity-25 mt-auto">
          <div className="d-flex align-items-center justify-content-between text-secondary small">
            <span>MarketMind v1.0</span>
            <span className="badge bg-success-subtle text-success border border-success-subtle">Online</span>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
