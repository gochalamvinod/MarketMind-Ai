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
  BsCpu
} from 'react-icons/bs'
import { getSettings, updateSettings } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

/**
 * Settings Page
 * Manage business profile, mandi location preferences, alert threshold, target profit margin, and API credentials.
 */
const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const [formData, setFormData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    alertThreshold: 5,
    targetMargin: 10,
    priceCheckInterval: '6h',
    preferredState: 'Telangana',
    preferredMarkets: 'Hyderabad, Bowenpally, Malakpet',
    demoMode: true,
    govApiKey: '',
    geminiConfigured: false,
    govApiConfigured: false
  })

  const fetchSettingsData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getSettings()
      const data = res?.data?.data || res?.data || {}

      setFormData({
        businessName: data.businessName || 'My Commodity Mart',
        ownerName: data.ownerName || '',
        email: data.email || '',
        alertThreshold: data.alertThreshold ?? 5,
        targetMargin: data.targetMargin ?? 10,
        priceCheckInterval: data.priceCheckInterval || '6h',
        preferredState: data.preferredState || 'Telangana',
        preferredMarkets: Array.isArray(data.preferredMarkets)
          ? data.preferredMarkets.join(', ')
          : data.preferredMarkets || 'Hyderabad',
        demoMode: Boolean(data.demoMode),
        govApiKey: data.govApiKey || '',
        geminiConfigured: Boolean(data.geminiConfigured),
        govApiConfigured: Boolean(data.govApiConfigured)
      })
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
      await updateSettings({
        businessName: formData.businessName.trim(),
        alertThreshold: Number(formData.alertThreshold),
        targetMargin: Number(formData.targetMargin),
        priceCheckInterval: formData.priceCheckInterval,
        preferredState: formData.preferredState.trim(),
        preferredMarkets: formData.preferredMarkets,
        demoMode: formData.demoMode,
        govApiKey: formData.govApiKey.trim() || undefined
      })

      toast.success('Settings and market preferences saved successfully!')
    } catch (err) {
      console.error('Error saving settings:', err)
      toast.error(err?.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage message="Loading System Settings..." />
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-0">System & Market Settings</h2>
          <p className="text-muted small mb-0 mt-1">
            Configure APMC mandi hubs, alert thresholds, target markup margins, and API credentials
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings}>
        <div className="row g-4">
          {/* Section 1: Business Profile */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white border-bottom p-3">
                <div className="d-flex align-items-center gap-2">
                  <BsBuilding className="text-primary fs-5" />
                  <h5 className="fw-bold text-dark mb-0">Business Enterprise Profile</h5>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Registered Business / Shop Name *</label>
                  <input
                    type="text"
                    name="businessName"
                    className="form-control"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Business Owner</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value={formData.ownerName || 'Business Owner'}
                    disabled
                  />
                </div>

                <div className="mb-0">
                  <label className="form-label fw-semibold small">Email Address</label>
                  <input
                    type="email"
                    className="form-control bg-light"
                    value={formData.email}
                    disabled
                  />
                  <span className="small text-muted mt-1 d-block">
                    Isolated database tenancy linked to this owner ID.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Mandi & Alert Thresholds */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white border-bottom p-3">
                <div className="d-flex align-items-center gap-2">
                  <BsGeoAlt className="text-success fs-5" />
                  <h5 className="fw-bold text-dark mb-0">Price Monitoring & Mandi Preferences</h5>
                </div>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-semibold small">Price Movement Alert Threshold (%) *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        name="alertThreshold"
                        className="form-control"
                        value={formData.alertThreshold}
                        onChange={handleInputChange}
                        required
                      />
                      <span className="input-group-text bg-light">%</span>
                    </div>
                    <span className="small text-muted mt-1 d-block">Default: 5% movement trigger</span>
                  </div>

                  <div className="col-12 col-sm-6">
                    <label className="form-label fw-semibold small">Target Gross Profit Margin (%) *</label>
                    <div className="input-group">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        name="targetMargin"
                        className="form-control"
                        value={formData.targetMargin}
                        onChange={handleInputChange}
                        required
                      />
                      <span className="input-group-text bg-light">%</span>
                    </div>
                    <span className="small text-muted mt-1 d-block">Default retail target: 10%</span>
                  </div>

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
                      <option value="6h">Every 6 Hours (Default)</option>
                      <option value="12h">Every 12 Hours</option>
                      <option value="24h">Daily (24 Hours)</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold small">Mandi Market Yards (Comma Separated)</label>
                    <input
                      type="text"
                      name="preferredMarkets"
                      className="form-control"
                      value={formData.preferredMarkets}
                      onChange={handleInputChange}
                    />
                    <span className="small text-muted mt-1 d-block">
                      e.g. Hyderabad, Bowenpally, Malakpet, Gudimalkapur
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: API & Demo Mode Configuration */}
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-header bg-white border-bottom p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <BsKey className="text-warning fs-5" />
                    <h5 className="fw-bold text-dark mb-0">API Credentials & Demo Operation</h5>
                  </div>
                  <div className="d-flex gap-2">
                    <span className={`badge ${formData.geminiConfigured ? 'bg-success' : 'bg-secondary'}`}>
                      <BsCpu className="me-1" />
                      Gemini AI: {formData.geminiConfigured ? 'Connected' : 'Offline'}
                    </span>
                    <span className={`badge ${formData.demoMode ? 'bg-warning text-dark' : 'bg-success'}`}>
                      {formData.demoMode ? 'Demo Mode Active' : 'Live AGMARKNET API'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-body p-4">
                <div className="form-check form-switch mb-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="demoMode"
                    name="demoMode"
                    checked={formData.demoMode}
                    onChange={handleInputChange}
                  />
                  <label className="form-check-label fw-semibold text-dark" htmlFor="demoMode">
                    Run in Demo Mode with realistic simulated Telangana mandi price movements
                  </label>
                  <p className="small text-muted mb-0 mt-1">
                    Ideal for academic project vivas, presentations, and testing price alert generation without external government network dependencies.
                  </p>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">
                    Government of India (data.gov.in) API Key
                  </label>
                  <div className="input-group">
                    <input
                      type={showKey ? 'text' : 'password'}
                      name="govApiKey"
                      className="form-control"
                      placeholder="Enter data.gov.in API key..."
                      value={formData.govApiKey}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowKey((prev) => !prev)}
                    >
                      {showKey ? <BsEyeSlash /> : <BsEye />}
                    </button>
                  </div>
                  <span className="small text-muted mt-1 d-block">
                    Register free at data.gov.in for live AGMARKNET Resource ID <code>9ef84268-d588-465a-a308-a864a43d0070</code>. Leave empty to use Demo Mode.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-4 text-end">
          <button
            type="submit"
            className="btn btn-primary px-4 py-2 fw-bold shadow-sm"
            disabled={saving}
          >
            <BsSave className="me-2" />
            {saving ? 'Saving Preferences...' : 'Save Settings & Preferences'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Settings
