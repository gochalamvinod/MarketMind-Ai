import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import {
  BsBell,
  BsCheckAll,
  BsCheckCircle,
  BsTrash,
  BsArrowUpRight,
  BsArrowDownRight,
  BsExclamationTriangle,
  BsInfoCircle,
  BsPlusLg,
  BsRobot,
  BsInbox,
  BsX,
  BsCpu
} from 'react-icons/bs'
import {
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
  deleteAlert,
  createAlert,
  generateAiAlerts,
  getProducts
} from '../services/api'
import { formatCurrency, formatDateTime } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'

/**
 * Alerts Page (/alerts)
 * Live mandi rate movement alerts, stock threshold warnings, manual custom triggers, and AI automated evaluations.
 */
const Notifications = () => {
  const [alerts, setAlerts] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL') // 'ALL', 'UNREAD', 'PRICE', 'STOCK', 'AI'

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const initialForm = {
    productId: '',
    type: 'PRICE_DECREASE',
    title: '',
    message: '',
    targetPrice: ''
  }
  const [formData, setFormData] = useState(initialForm)

  const fetchAlertsData = useCallback(async () => {
    try {
      setLoading(true)
      const [alertsRes, prodsRes] = await Promise.all([
        getAlerts(),
        getProducts({})
      ])
      setAlerts(alertsRes?.data?.data || alertsRes?.data || [])
      setProducts(prodsRes?.data?.data || prodsRes?.data || [])
    } catch (err) {
      console.error('Error fetching alerts:', err)
      toast.error('Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlertsData()
  }, [fetchAlertsData])

  // Mark single alert as read
  const handleMarkRead = async (id) => {
    try {
      await markAlertRead(id)
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
      )
    } catch (err) {
      toast.error('Failed to update alert')
    }
  }

  // Mark all alerts as read
  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead()
      toast.success('All alerts marked as read')
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
    } catch (err) {
      toast.error('Failed to mark all alerts as read')
    }
  }

  // Delete an alert
  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      await deleteAlert(id)
      setAlerts((prev) => prev.filter((a) => a._id !== id))
      toast.success('Alert removed')
    } catch (err) {
      toast.error('Failed to delete alert')
    }
  }

  // Handle Product select in form
  const handleProductSelect = (e) => {
    const prodId = e.target.value
    const found = products.find((p) => p._id === prodId)
    setFormData((prev) => ({
      ...prev,
      productId: prodId,
      title: found ? `Alert: ${found.name}` : prev.title,
      targetPrice: found ? (found.currentReferencePrice || found.purchaseCost || '') : prev.targetPrice
    }))
  }

  // Create Custom Alert
  const handleCreateAlertSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Please enter an alert title')
      return
    }

    try {
      setSubmitting(true)
      await createAlert({
        productId: formData.productId || undefined,
        type: formData.type,
        title: formData.title.trim(),
        message: formData.message.trim() || undefined,
        targetPrice: parseFloat(formData.targetPrice) || undefined
      })

      toast.success('Custom alert created successfully!')
      setShowModal(false)
      setFormData(initialForm)
      await fetchAlertsData()
    } catch (err) {
      console.error('Error creating custom alert:', err)
      toast.error(err?.response?.data?.message || 'Failed to create alert')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (activeTab === 'UNREAD') return !a.isRead
      if (activeTab === 'PRICE')
        return a.type === 'PRICE_INCREASE' || a.type === 'PRICE_DECREASE'
      if (activeTab === 'STOCK') return a.type === 'LOW_STOCK'
      if (activeTab === 'AI') return a.type === 'AI_INSIGHT'
      return true
    })
  }, [alerts, activeTab])

  const unreadCount = alerts.filter((a) => !a.isRead).length

  if (loading) {
    return <LoadingSpinner fullPage message="Loading Mandi & Inventory Alerts..." />
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="h3 fw-bold text-dark mb-0">Mandi & Stock Alerts</h2>
            {unreadCount > 0 && (
              <span className="badge bg-danger rounded-pill">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-muted small mb-0 mt-1">
            Real-time mandi price spikes, drop opportunities, minimum stock warnings, and AI market scans
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          {/* Add Custom Alert Button */}
          <button
            type="button"
            className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
            onClick={() => setShowModal(true)}
          >
            <BsPlusLg />
            <span>Add Alert</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="btn btn-light btn-sm d-flex align-items-center gap-1 border shadow-sm"
              onClick={handleMarkAllRead}
            >
              <BsCheckAll className="fs-5" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-pills p-2 gap-2">
            <li className="nav-item">
              <button
                className={`btn btn-sm ${activeTab === 'ALL' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setActiveTab('ALL')}
              >
                All Alerts ({alerts.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`btn btn-sm ${activeTab === 'UNREAD' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setActiveTab('UNREAD')}
              >
                Unread ({unreadCount})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`btn btn-sm ${activeTab === 'PRICE' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setActiveTab('PRICE')}
              >
                Mandi Price Movements
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`btn btn-sm ${activeTab === 'STOCK' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setActiveTab('STOCK')}
              >
                Low Inventory Warnings
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`btn btn-sm ${activeTab === 'AI' ? 'btn-primary' : 'btn-light'}`}
                onClick={() => setActiveTab('AI')}
              >
                AI Market Intelligence
              </button>
            </li>
          </ul>
        </div>

        {/* Notifications List */}
        <div className="card-body p-0">
          {filteredAlerts.length > 0 ? (
            <div className="list-group list-group-flush">
              {filteredAlerts.map((alert) => {
                const isIncrease = alert.type === 'PRICE_INCREASE'
                const isDecrease = alert.type === 'PRICE_DECREASE'
                const isStock = alert.type === 'LOW_STOCK'
                const isAi = alert.type === 'AI_INSIGHT'

                return (
                  <div
                    key={alert._id}
                    className={`list-group-item p-4 border-bottom transition-all ${
                      alert.isRead ? 'bg-white' : 'bg-success-subtle bg-opacity-25'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => !alert.isRead && handleMarkRead(alert._id)}
                  >
                    <div className="d-flex align-items-start justify-content-between gap-3">
                      <div className="d-flex align-items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`rounded-circle p-2 mt-1 flex-shrink-0 ${
                            isIncrease
                              ? 'bg-danger-subtle text-danger'
                              : isDecrease
                              ? 'bg-success-subtle text-success'
                              : isStock
                              ? 'bg-warning-subtle text-warning'
                              : isAi
                              ? 'bg-primary-subtle text-primary'
                              : 'bg-info-subtle text-info'
                          }`}
                        >
                          {isIncrease && <BsArrowUpRight className="fs-5" />}
                          {isDecrease && <BsArrowDownRight className="fs-5" />}
                          {isStock && <BsExclamationTriangle className="fs-5" />}
                          {isAi && <BsRobot className="fs-5" />}
                          {!isIncrease && !isDecrease && !isStock && !isAi && <BsBell className="fs-5" />}
                        </div>

                        {/* Content */}
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <h6 className={`mb-0 ${alert.isRead ? 'fw-semibold text-dark' : 'fw-bold text-dark'}`}>
                              {alert.title}
                            </h6>
                            {!alert.isRead && (
                              <span className="badge bg-primary" style={{ fontSize: '0.65rem' }}>
                                NEW
                              </span>
                            )}
                            {isAi && (
                              <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.65rem' }}>
                                AI Engine
                              </span>
                            )}
                          </div>

                          <p className="small text-secondary mb-2" style={{ lineHeight: '1.6' }}>
                            {alert.message}
                          </p>

                          {/* Price Details Context Badges if available */}
                          {(alert.currentPrice || alert.purchaseCost) && (
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                              {alert.previousPrice > 0 && (
                                <span className="badge bg-light text-dark border">
                                  Previous: ₹{alert.previousPrice}
                                </span>
                              )}
                              {alert.currentPrice > 0 && (
                                <span className="badge bg-light text-dark border">
                                  Observed: ₹{alert.currentPrice}
                                </span>
                              )}
                              {alert.percentageChange && (
                                <span className={`badge ${alert.percentageChange > 0 ? 'bg-danger text-white' : 'bg-success text-white'}`}>
                                  {alert.percentageChange > 0 ? '+' : ''}{alert.percentageChange}%
                                </span>
                              )}
                              {alert.purchaseCost > 0 && (
                                <span className="badge bg-light text-dark border">
                                  Stock Cost: ₹{alert.purchaseCost}
                                </span>
                              )}
                              {alert.source && (
                                <span className="badge bg-secondary text-white">
                                  Source: {alert.source}
                                </span>
                              )}
                            </div>
                          )}

                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {formatDateTime(alert.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        {!alert.isRead && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success border-0 p-1"
                            title="Mark as Read"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkRead(alert._id)
                            }}
                          >
                            <BsCheckCircle />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger border-0 p-1"
                          title="Delete Alert"
                          onClick={(e) => handleDelete(alert._id, e)}
                        >
                          <BsTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-5 px-3">
              <div className="bg-light d-inline-flex rounded-circle p-3 mb-3 text-secondary">
                <BsInbox size={42} />
              </div>
              <h5 className="fw-bold text-dark mb-1">No Alerts in this View</h5>
              <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '420px' }}>
                You have no active alerts. Click Add Alert to set up custom threshold triggers or wait for automatic mandi price updates.
              </p>
              <div className="d-flex justify-content-center align-items-center">
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center gap-1 shadow-sm px-4 py-2"
                  onClick={() => setShowModal(true)}
                >
                  <BsPlusLg />
                  <span>Add Alert</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add Custom Alert */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom p-3">
                <div className="d-flex align-items-center gap-2">
                  <BsBell className="text-primary fs-5" />
                  <h5 className="modal-title fw-bold text-dark">Add New Alert</h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                  aria-label="Close"
                />
              </div>

              <form onSubmit={handleCreateAlertSubmit}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Commodity Product (Optional)</label>
                    <select
                      className="form-select"
                      value={formData.productId}
                      onChange={handleProductSelect}
                    >
                      <option value="">-- General / All Commodities --</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} (Current Mandi: ₹{p.currentReferencePrice || p.purchaseCost}/{p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Alert Trigger Type *</label>
                    <select
                      className="form-select"
                      value={formData.type}
                      onChange={(e) => {
                        const newType = e.target.value
                        setFormData((prev) => ({
                          ...prev,
                          type: newType,
                          title:
                            newType === 'PRICE_DECREASE'
                              ? '📉 Wholesale Rate Drop Opportunity'
                              : newType === 'PRICE_INCREASE'
                              ? '📈 Wholesale Rate Surge Alert'
                              : newType === 'LOW_STOCK'
                              ? '⚠️ Low Stock Threshold'
                              : '🎯 Target Benchmark Trigger'
                        }))
                      }}
                      required
                    >
                      <option value="PRICE_DECREASE">📉 Mandi Price Drop (Restock Opportunity)</option>
                      <option value="PRICE_INCREASE">📈 Mandi Price Surge (Margin Protection)</option>
                      <option value="LOW_STOCK">⚠️ Low Inventory Stock Level</option>
                      <option value="TARGET_PRICE">🎯 Target Price Threshold</option>
                      <option value="CUSTOM">🔔 Custom Reminder</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Alert Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Rice Price Dip Trigger"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Target Price / Threshold (₹)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="e.g. 38.00"
                        value={formData.targetPrice}
                        onChange={(e) => setFormData((prev) => ({ ...prev, targetPrice: e.target.value }))}
                      />
                    </div>
                    <span className="small text-muted mt-1 d-block">
                      Price or quantity threshold to monitor against APMC mandi rates.
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Details & Notes</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      placeholder="Describe what action to take when this alert fires..."
                      value={formData.message}
                      onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="modal-footer border-top p-3 bg-light rounded-bottom">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating Alert...' : 'Create Alert'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications
