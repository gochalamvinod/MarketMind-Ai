import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  BsGear,
  BsBuilding,
  BsShieldLock,
  BsCheckCircle,
  BsKey,
  BsEye,
  BsEyeSlash,
  BsSave,
  BsGeoAlt,
  BsClockHistory,
  BsCpu,
  BsDatabaseCheck,
  BsTrash,
  BsArrowRepeat,
  BsPerson,
  BsTelephone,
  BsCardList,
  BsSliders
} from 'react-icons/bs'
import {
  getSettings,
  updateSettings,
  getAdminSystemStatus,
  flushCache,
  purgeNonAdminData
} from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ConfirmModal from '../components/common/ConfirmModal'

/**
 * Settings Page
 * Dynamic view for Platform Administrator (Master API & Database Controls)
 * and Store Merchants (Merchant Profile, First/Last Name, Location, Shop Preferences).
 */
const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showGovKey, setShowGovKey] = useState(false)
  const [flushingCache, setFlushingCache] = useState(false)
  const [showPurgeModal, setShowPurgeModal] = useState(false)
  const [purging, setPurging] = useState(false)

  // Admin system statistics
  const [adminStatus, setAdminStatus] = useState(null)

  const [formData, setFormData] = useState({
    role: 'user',
    // Merchant Profile
    firstName: '',
    lastName: '',
    businessName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    email: '',
    // Market Preferences
    alertThreshold: 5,
    targetMargin: 10,
    priceCheckInterval: '6h',
    preferredState: 'Telangana',
    preferredMarkets: 'Hyderabad, Bowenpally, Malakpet',
    // Admin API Credentials
    geminiApiKey: '',
    govApiKey: '',
    govApiResourceId: '9ef84268-d588-465a-a308-a864a43d0070',
    geminiConfigured: false,
    govApiConfigured: false
  })

  const fetchSettingsData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getSettings()
      const data = res?.data?.data || res?.data || {}

      setFormData({
        role: data.role || 'user',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        businessName: data.businessName || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        email: data.email || '',
        alertThreshold: data.alertThreshold ?? 5,
        targetMargin: data.targetMargin ?? 10,
        priceCheckInterval: data.priceCheckInterval || '6h',
        preferredState: data.preferredState || 'Telangana',
        preferredMarkets: Array.isArray(data.preferredMarkets)
          ? data.preferredMarkets.join(', ')
          : data.preferredMarkets || 'Hyderabad',
        geminiApiKey: data.geminiApiKey || '',
        govApiKey: data.govApiKey || '',
        govApiResourceId: data.govApiResourceId || '9ef84268-d588-465a-a308-a864a43d0070',
        geminiConfigured: Boolean(data.geminiConfigured),
        govApiConfigured: Boolean(data.govApiConfigured)
      })

      if (data.role === 'admin') {
        try {
          const sysRes = await getAdminSystemStatus()
          if (sysRes?.data?.data) {
            setAdminStatus(sysRes.data.data)
          }
        } catch (sysErr) {
          console.warn('Admin status fetch note:', sysErr.message)
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
      toast.error('Failed to load system settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettingsData()
  }, [fetchSettingsData])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()

    try {
      setSaving(true)
      const payload = {
        alertThreshold: Number(formData.alertThreshold),
        targetMargin: Number(formData.targetMargin),
        priceCheckInterval: formData.priceCheckInterval,
        preferredState: formData.preferredState.trim(),
        preferredMarkets: formData.preferredMarkets
      }

      if (formData.role === 'admin') {
        payload.geminiApiKey = formData.geminiApiKey.trim()
        payload.govApiKey = formData.govApiKey.trim()
        payload.govApiResourceId = formData.govApiResourceId.trim()
      } else {
        payload.firstName = formData.firstName.trim()
        payload.lastName = formData.lastName.trim()
        payload.businessName = formData.businessName.trim()
        payload.phone = formData.phone.trim()
        payload.address = formData.address.trim()
        payload.city = formData.city.trim()
        payload.state = formData.state.trim()
      }

      await updateSettings(payload)
      toast.success(
        formData.role === 'admin'
          ? 'Platform API credentials and system settings updated!'
          : 'Store profile & market preferences saved successfully!'
      )
      fetchSettingsData()
    } catch (err) {
      console.error('Error saving settings:', err)
      toast.error(err?.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleFlushCache = async () => {
    try {
      setFlushingCache(true)
      const res = await flushCache()
      toast.success(res?.data?.message || 'In-memory caches flushed!')
      fetchSettingsData()
    } catch (err) {
      toast.error('Failed to flush cache')
    } finally {
      setFlushingCache(false)
    }
  }

  const handlePurgeDataConfirm = async () => {
    try {
      setPurging(true)
      const res = await purgeNonAdminData()
      toast.success(res?.data?.message || 'Non-admin data purged cleanly!')
      setShowPurgeModal(false)
      fetchSettingsData()
    } catch (err) {
      toast.error('Failed to purge data')
    } finally {
      setPurging(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage message="Loading System & Account Configuration..." />
  }

  const isAdmin = formData.role === 'admin'

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="h3 fw-bold text-dark mb-0">
              {isAdmin ? 'System Administration & Master Control' : 'Store Profile & Market Preferences'}
            </h2>
            {isAdmin && (
              <span className="badge bg-primary px-3 py-2 fw-semibold">
                Master Admin Console
              </span>
            )}
          </div>
          <p className="text-muted small mb-0 mt-1">
            {isAdmin
              ? 'Maintain MongoDB cluster, manage live Gemini AI & AGMARKNET API keys, and platform health'
              : 'Configure your merchant store details, location, alert margins, and Telangana mandi yards'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADMIN MASTER CONTROL VIEW (Strictly for Administrator)                     */}
      {/* ========================================================================= */}
      {isAdmin ? (
        <form onSubmit={handleSaveSettings}>
          <div className="row g-4">
            {/* Section 1: API Credentials (Admin Only) */}
            <div className="col-12 col-xl-7">
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <BsKey className="text-warning fs-5" />
                    <h5 className="fw-bold text-dark mb-0">API Credentials & AI Engine Controls</h5>
                  </div>
                  <span className={`badge ${formData.geminiConfigured ? 'bg-success' : 'bg-secondary'} py-2 px-3`}>
                    Gemini AI: {formData.geminiConfigured ? 'Active' : 'Not Set'}
                  </span>
                </div>
                <div className="card-body p-4">
                  <div className="mb-4">
                    <label className="form-label fw-semibold small d-flex justify-content-between">
                      <span>Google Gemini AI API Key</span>
                      <span className="text-muted small">Powers Copilot & Market Insights</span>
                    </label>
                    <div className="input-group">
                      <input
                        type={showGeminiKey ? 'text' : 'password'}
                        name="geminiApiKey"
                        className="form-control"
                        placeholder="Enter Google Gemini API key (AIzaSy...)"
                        value={formData.geminiApiKey}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowGeminiKey((prev) => !prev)}
                      >
                        {showGeminiKey ? <BsEyeSlash /> : <BsEye />}
                      </button>
                    </div>
                    <small className="text-muted mt-1 d-block">
                      Obtain free keys at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>. Changing this updates live inference instantly.
                    </small>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold small d-flex justify-content-between">
                      <span>Government of India (data.gov.in) AGMARKNET API Key</span>
                      <span className="text-muted small">Real Mandi Commodity Ingestion</span>
                    </label>
                    <div className="input-group">
                      <input
                        type={showGovKey ? 'text' : 'password'}
                        name="govApiKey"
                        className="form-control"
                        placeholder="Enter data.gov.in API key..."
                        value={formData.govApiKey}
                        onChange={handleInputChange}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowGovKey((prev) => !prev)}
                      >
                        {showGovKey ? <BsEyeSlash /> : <BsEye />}
                      </button>
                    </div>
                    <small className="text-muted mt-1 d-block">
                      Syncs Telangana wholesale rates directly from Open Government Data (data.gov.in).
                    </small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">AGMARKNET Resource ID</label>
                    <input
                      type="text"
                      name="govApiResourceId"
                      className="form-control font-monospace small"
                      value={formData.govApiResourceId}
                      onChange={handleInputChange}
                    />
                    <small className="text-muted mt-1 d-block">
                      Default: <code>9ef84268-d588-465a-a308-a864a43d0070</code> (Current national daily modal arrival records).
                    </small>
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                    <button
                      type="submit"
                      className="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                      disabled={saving}
                    >
                      <BsSave />
                      <span>{saving ? 'Updating Credentials...' : 'Save API Credentials'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Admin Mandi Global Polling Settings */}
              <div className="card border-0 shadow-sm rounded-3">
                <div className="card-header bg-white border-bottom p-3">
                  <div className="d-flex align-items-center gap-2">
                    <BsSliders className="text-success fs-5" />
                    <h5 className="fw-bold text-dark mb-0">Platform Mandi Polling & Alert Defaults</h5>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Price Volatility Threshold (%)</label>
                      <div className="input-group">
                        <input
                          type="number"
                          name="alertThreshold"
                          className="form-control"
                          min="1"
                          max="50"
                          value={formData.alertThreshold}
                          onChange={handleInputChange}
                        />
                        <span className="input-group-text bg-light">%</span>
                      </div>
                      <small className="text-muted">Default: 5% movement trigger</small>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Target Profit Margin (%)</label>
                      <div className="input-group">
                        <input
                          type="number"
                          name="targetMargin"
                          className="form-control"
                          min="1"
                          max="100"
                          value={formData.targetMargin}
                          onChange={handleInputChange}
                        />
                        <span className="input-group-text bg-light">%</span>
                      </div>
                      <small className="text-muted">Default retail target: 10%</small>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Default Mandi State</label>
                      <input
                        type="text"
                        name="preferredState"
                        className="form-control"
                        value={formData.preferredState}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Automatic Ingestion Interval</label>
                      <select
                        name="priceCheckInterval"
                        className="form-select"
                        value={formData.priceCheckInterval}
                        onChange={handleInputChange}
                      >
                        <option value="1h">Every 1 Hour</option>
                        <option value="3h">Every 3 Hours</option>
                        <option value="6h">Every 6 Hours (Recommended)</option>
                        <option value="12h">Every 12 Hours</option>
                        <option value="24h">Daily (Every 24 Hours)</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold small">Default APMC Market Yards</label>
                      <input
                        type="text"
                        name="preferredMarkets"
                        className="form-control"
                        value={formData.preferredMarkets}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-end mt-4">
                    <button
                      type="submit"
                      className="btn btn-success px-4 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                      disabled={saving}
                    >
                      <BsSave />
                      <span>{saving ? 'Saving...' : 'Save Market Defaults'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: MongoDB & Infrastructure Maintenance */}
            <div className="col-12 col-xl-5">
              <div className="card border-0 shadow-sm rounded-3 mb-4">
                <div className="card-header bg-white border-bottom p-3">
                  <div className="d-flex align-items-center gap-2">
                    <BsDatabaseCheck className="text-primary fs-5" />
                    <h5 className="fw-bold text-dark mb-0">MongoDB Atlas & Database Health</h5>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-secondary fw-semibold">Database Connection:</span>
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                        ● {adminStatus?.database?.status || 'Connected'}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-secondary fw-semibold">Target Database:</span>
                      <code className="text-dark fw-bold">{adminStatus?.database?.databaseName || 'marketmind'}</code>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="small text-secondary fw-semibold">Cluster Host:</span>
                      <small className="text-truncate" style={{ maxWidth: '180px' }}>
                        {adminStatus?.database?.host || 'MongoDB Atlas'}
                      </small>
                    </div>
                  </div>

                  <h6 className="fw-bold text-dark small mb-2 text-uppercase letter-spacing-1">
                    Live Document Counts
                  </h6>
                  <div className="row g-2 mb-4">
                    <div className="col-4">
                      <div className="border rounded p-2 text-center bg-white">
                        <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>Users</span>
                        <span className="fw-bold fs-5 text-dark">
                          {adminStatus?.database?.counts?.users ?? 1}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-2 text-center bg-white">
                        <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>Products</span>
                        <span className="fw-bold fs-5 text-dark">
                          {adminStatus?.database?.counts?.products ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-2 text-center bg-white">
                        <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>Sales</span>
                        <span className="fw-bold fs-5 text-dark">
                          {adminStatus?.database?.counts?.sales ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-2 text-center bg-white">
                        <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>Purchases</span>
                        <span className="fw-bold fs-5 text-dark">
                          {adminStatus?.database?.counts?.purchases ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-2 text-center bg-white">
                        <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>Alerts</span>
                        <span className="fw-bold fs-5 text-dark">
                          {adminStatus?.database?.counts?.alerts ?? 0}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded p-2 text-center bg-white">
                        <span className="d-block text-muted" style={{ fontSize: '0.72rem' }}>Mandi Prices</span>
                        <span className="fw-bold fs-5 text-dark">
                          {adminStatus?.database?.counts?.marketPrices ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="d-grid gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2 py-2"
                      onClick={handleFlushCache}
                      disabled={flushingCache}
                    >
                      <BsArrowRepeat className={flushingCache ? 'spinner-border spinner-border-sm' : ''} />
                      <span>{flushingCache ? 'Flushing Cache...' : 'Flush Server In-Memory Cache'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2 py-2"
                      onClick={() => setShowPurgeModal(true)}
                    >
                      <BsTrash />
                      <span>Purge Stray Non-Admin Test Accounts & Data</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Administrator Identity & Runtime Details */}
              <div className="card border-0 shadow-sm rounded-3">
                <div className="card-header bg-white border-bottom p-3">
                  <div className="d-flex align-items-center gap-2">
                    <BsShieldLock className="text-secondary fs-5" />
                    <h5 className="fw-bold text-dark mb-0">System Administrator Account</h5>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="mb-3">
                    <label className="form-label text-muted small mb-0">Administrative Role</label>
                    <p className="fw-bold text-dark mb-0">System Administrator (Full Infrastructure Access)</p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted small mb-0">System Email</label>
                    <p className="fw-bold text-dark mb-0 font-monospace">admin@marketmind.ai</p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted small mb-0">System Username</label>
                    <p className="fw-bold text-dark mb-0 font-monospace">admin</p>
                  </div>
                  <div className="p-3 bg-light rounded-3 text-secondary small">
                    <strong>Note:</strong> Administrator accounts do not hold a retail shop name. They maintain the underlying database, cloud serverless routing, and external API connectivity for all store tenants.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* ========================================================================= */
        /* REGULAR STORE MERCHANT VIEW (Shopkeeper Profile & Store Preferences)     */
        /* ========================================================================= */
        <form onSubmit={handleSaveSettings}>
          <div className="row g-4">
            {/* Merchant Identity & Location Profile */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-header bg-white border-bottom p-3">
                  <div className="d-flex align-items-center gap-2">
                    <BsBuilding className="text-primary fs-5" />
                    <h5 className="fw-bold text-dark mb-0">Merchant & Store Profile</h5>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        className="form-control"
                        placeholder="e.g. Vinod"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        className="form-control"
                        placeholder="e.g. Kumar"
                        value={formData.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Registered Business / Shop Name *</label>
                    <input
                      type="text"
                      name="businessName"
                      className="form-control"
                      placeholder="e.g. Vinod Wholesale Mart"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Store Location / Street Address</label>
                    <input
                      type="text"
                      name="address"
                      className="form-control"
                      placeholder="e.g. Shop No. 12, APMC Mandi Road"
                      value={formData.address}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">City / Town</label>
                      <input
                        type="text"
                        name="city"
                        className="form-control"
                        placeholder="e.g. Hyderabad"
                        value={formData.city}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">State</label>
                      <input
                        type="text"
                        name="state"
                        className="form-control"
                        placeholder="e.g. Telangana"
                        value={formData.state}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Contact Phone Number</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light"><BsTelephone /></span>
                      <input
                        type="tel"
                        name="phone"
                        className="form-control"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-0">
                    <label className="form-label fw-semibold small">Email Address</label>
                    <input
                      type="email"
                      className="form-control bg-light"
                      value={formData.email}
                      disabled
                    />
                    <small className="text-muted">Primary login identifier</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Monitoring & Mandi Preferences */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-header bg-white border-bottom p-3">
                  <div className="d-flex align-items-center gap-2">
                    <BsGeoAlt className="text-success fs-5" />
                    <h5 className="fw-bold text-dark mb-0">Price Monitoring & Mandi Preferences</h5>
                  </div>
                </div>
                <div className="card-body p-4">
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Price Movement Alert (%) *</label>
                      <div className="input-group">
                        <input
                          type="number"
                          name="alertThreshold"
                          className="form-control"
                          min="1"
                          max="50"
                          value={formData.alertThreshold}
                          onChange={handleInputChange}
                          required
                        />
                        <span className="input-group-text bg-light">%</span>
                      </div>
                      <small className="text-muted">Default: 5% movement trigger</small>
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Target Gross Profit Margin (%) *</label>
                      <div className="input-group">
                        <input
                          type="number"
                          name="targetMargin"
                          className="form-control"
                          min="1"
                          max="100"
                          value={formData.targetMargin}
                          onChange={handleInputChange}
                          required
                        />
                        <span className="input-group-text bg-light">%</span>
                      </div>
                      <small className="text-muted">Default retail target: 10%</small>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Preferred State *</label>
                      <input
                        type="text"
                        name="preferredState"
                        className="form-control"
                        value={formData.preferredState}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-sm-6">
                      <label className="form-label fw-semibold small">Automatic Check Interval</label>
                      <select
                        name="priceCheckInterval"
                        className="form-select"
                        value={formData.priceCheckInterval}
                        onChange={handleInputChange}
                      >
                        <option value="1h">Every 1 Hour</option>
                        <option value="3h">Every 3 Hours</option>
                        <option value="6h">Every 6 Hours (Standard)</option>
                        <option value="12h">Every 12 Hours</option>
                        <option value="24h">Daily (Every 24 Hours)</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold small">Mandi Market Yards (Comma Separated)</label>
                    <input
                      type="text"
                      name="preferredMarkets"
                      className="form-control"
                      placeholder="e.g. Hyderabad, Bowenpally, Malakpet"
                      value={formData.preferredMarkets}
                      onChange={handleInputChange}
                    />
                    <small className="text-muted">Regional APMC yards used for automated benchmark intelligence</small>
                  </div>

                  <div className="d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn btn-primary px-4 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                      disabled={saving}
                    >
                      <BsSave />
                      <span>{saving ? 'Saving...' : 'Save Store Preferences'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Confirmation Modal for Purging Stray Test Data */}
      <ConfirmModal
        show={showPurgeModal}
        title="Purge Non-Admin Test Accounts & Records?"
        message="This action will delete all test users and reset test commodity records while leaving the master Administrator account intact. Are you sure you want to proceed?"
        confirmText={purging ? 'Purging...' : 'Yes, Purge Test Data'}
        confirmVariant="danger"
        onConfirm={handlePurgeDataConfirm}
        onCancel={() => setShowPurgeModal(false)}
      />
    </div>
  )
}

export default Settings
