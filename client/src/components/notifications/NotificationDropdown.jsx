import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BsBell,
  BsExclamationTriangle,
  BsGraphUp,
  BsGraphDown,
  BsBoxSeam,
  BsCheck2All,
  BsInfoCircle
} from 'react-icons/bs'
import { getAlerts, markAlertRead, markAllAlertsRead } from '../../services/api'

/**
 * Format relative time (e.g. "5m ago", "2h ago", "1d ago")
 * @param {string|Date} timestamp
 * @returns {string}
 */
const timeAgo = (timestamp) => {
  if (!timestamp) return ''
  const now = new Date()
  const past = new Date(timestamp)
  const diffSec = Math.floor((now - past) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return past.toLocaleDateString('en-IN')
}

/**
 * Get icon and color badge for an alert type
 * @param {string} type
 */
const getAlertIcon = (type) => {
  switch (type?.toLowerCase()) {
    case 'price_spike':
    case 'price_increase':
      return <BsGraphUp className="text-danger flex-shrink-0 fs-5" />
    case 'price_drop':
    case 'price_decrease':
      return <BsGraphDown className="text-success flex-shrink-0 fs-5" />
    case 'low_stock':
    case 'out_of_stock':
      return <BsBoxSeam className="text-warning flex-shrink-0 fs-5" />
    case 'warning':
      return <BsExclamationTriangle className="text-warning flex-shrink-0 fs-5" />
    case 'info':
    default:
      return <BsInfoCircle className="text-primary flex-shrink-0 fs-5" />
  }
}

/**
 * NotificationDropdown Component
 * @param {{ isOpen: boolean, onClose: () => void, onAlertsUpdated: () => void }} props
 */
const NotificationDropdown = ({ isOpen, onClose, onAlertsUpdated }) => {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchRecentAlerts = async () => {
    try {
      setLoading(true)
      const res = await getAlerts()
      const list = Array.isArray(res.data) ? res.data : res.data?.alerts || []
      setAlerts(list.slice(0, 10))
    } catch (err) {
      console.error('Failed to fetch alerts in dropdown:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRecentAlerts()
    }
  }, [isOpen])

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return
    try {
      await markAlertRead(id)
      setAlerts((prev) =>
        prev.map((item) => (item._id === id || item.id === id ? { ...item, isRead: true } : item))
      )
      if (onAlertsUpdated) onAlertsUpdated()
    } catch (err) {
      console.error('Failed to mark alert as read:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true)
      await markAllAlertsRead()
      setAlerts((prev) => prev.map((item) => ({ ...item, isRead: true })))
      if (onAlertsUpdated) onAlertsUpdated()
    } catch (err) {
      console.error('Failed to mark all alerts as read:', err)
    } finally {
      setActionLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="notification-dropdown dropdown-menu dropdown-menu-end show shadow-lg border-0 p-0"
      style={{
        width: '360px',
        maxWidth: '90vw',
        position: 'absolute',
        top: '100%',
        right: 0,
        zIndex: 1050
      }}
    >
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom bg-light rounded-top">
        <div className="d-flex align-items-center gap-2">
          <BsBell className="text-primary fw-bold" />
          <h6 className="mb-0 fw-semibold text-dark">Notifications</h6>
        </div>
        <button
          className="btn btn-link btn-sm text-decoration-none p-0 text-primary small d-flex align-items-center gap-1"
          onClick={handleMarkAllRead}
          disabled={actionLoading || alerts.every((a) => a.isRead)}
        >
          <BsCheck2All /> Mark All Read
        </button>
      </div>

      <div className="notification-list" style={{ maxHeight: '380px', overflowY: 'auto' }}>
        {loading ? (
          <div className="p-4 text-center text-muted small">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            Loading notifications...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-4 text-center text-muted small">
            <BsCheck2All className="fs-3 text-secondary mb-2 d-block mx-auto" />
            No notifications available.
          </div>
        ) : (
          alerts.map((alert) => {
            const alertId = alert._id || alert.id
            const isRead = alert.isRead || alert.read
            return (
              <div
                key={alertId}
                className={`p-3 border-bottom notification-item transition-all ${
                  !isRead ? 'bg-primary-subtle border-start border-primary border-3' : 'bg-white'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleMarkAsRead(alertId, isRead)}
              >
                <div className="d-flex align-items-start gap-2">
                  <div className="mt-1">{getAlertIcon(alert.type || alert.alertType)}</div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex justify-content-between align-items-baseline gap-1">
                      <p
                        className={`mb-1 text-truncate ${
                          !isRead ? 'fw-semibold text-dark' : 'text-secondary'
                        }`}
                        style={{ fontSize: '0.875rem' }}
                      >
                        {alert.title || alert.message || 'Notification'}
                      </p>
                      <span className="text-muted small text-nowrap" style={{ fontSize: '0.72rem' }}>
                        {timeAgo(alert.createdAt || alert.date)}
                      </span>
                    </div>
                    {alert.message && alert.title && (
                      <p
                        className="mb-0 text-muted small text-truncate-2"
                        style={{ fontSize: '0.785rem' }}
                      >
                        {alert.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="p-2 text-center border-top bg-light rounded-bottom">
        <Link
          to="/alerts"
          className="btn btn-sm btn-link text-decoration-none w-100 fw-semibold text-primary"
          onClick={onClose}
        >
          View All Alerts →
        </Link>
      </div>
    </div>
  )
}

export default NotificationDropdown
