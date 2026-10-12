import React, { useState, useEffect, useRef } from 'react'
import { BsBellFill } from 'react-icons/bs'
import { getUnreadCount } from '../../services/api'
import NotificationDropdown from './NotificationDropdown'

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const bellContainerRef = useRef(null)

  const fetchCount = async () => {
    try {
      const res = await getUnreadCount()
      if (res.data && typeof res.data.count === 'number') {
        setUnreadCount(res.data.count)
      } else if (res.data && typeof res.data.unreadCount === 'number') {
        setUnreadCount(res.data.unreadCount)
      } else if (typeof res.data === 'number') {
        setUnreadCount(res.data)
      }
    } catch (err) {
      // Graceful fallback for unauthenticated or polling errors
      console.warn('Failed to fetch unread notification count:', err?.message)
    }
  }

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close when clicking outside of the bell container
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (bellContainerRef.current && !bellContainerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev)
  }

  return (
    <div className="position-relative" ref={bellContainerRef}>
      <button
        type="button"
        className="btn btn-light rounded-circle position-relative p-2 d-flex align-items-center justify-content-center text-dark border-0 notification-bell-btn shadow-sm"
        onClick={toggleDropdown}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <BsBellFill className="fs-5 text-secondary" />
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light"
            style={{ fontSize: '0.65rem' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
            <span className="visually-hidden">unread messages</span>
          </span>
        )}
      </button>

      <NotificationDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAlertsUpdated={fetchCount}
      />
    </div>
  )
}

export default NotificationBell
