import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  BsBuilding,
  BsGeoAlt,
  BsSave,
  BsTelephone
} from 'react-icons/bs'
import { getSettings, updateSettings } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

/**
 * Settings Page
 * Clean store merchant profile and mandi price monitoring preferences.
 */
const Settings = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    email: '',
    alertThreshold: 5,
    targetMargin: 10,
    priceCheckInterval: '6h',
    preferredState: 'Telangana',
    preferredMarkets: 'Hyderabad, Bowenpally, Malakpet'
  })

  const fetchSettingsData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getSettings()
      const data = res?.data?.data || res?.data || {}

      setFormData({
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
          : data.preferredMarkets || 'Hyderabad, Bowenpally, Malakpet'
      })
    } catch (err) {
      console.error('Error fetching settings:', err)
      toast.error('Failed to load store settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettingsData()
  }, [fetchSettingsData])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        businessName: formData.businessName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        alertThreshold: Number(formData.alertThreshold),
        targetMargin: Number(formData.targetMargin),
        priceCheckInterval: formData.priceCheckInterval,
        preferredState: formData.preferredState,
        preferredMarkets: formData.preferredMarkets
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
      }

      await updateSettings(payload)
      toast.success('Store profile & preferences saved successfully!')
      await fetchSettingsData()
    } catch (err) {
      console.error('Error saving settings:', err)
      toast.error(err?.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage message="Loading Store Settings..." />
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-0">Store Settings & Preferences</h2>
          <p className="text-muted small mb-0 mt-1">
            Manage your store identity, contact info, and APMC mandi price alert thresholds
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings}>
        <div className="row g-4">
          {/* Merchant Profile */}
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
                      placeholder="e.g. Ramesh"
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
                  <label className="form-label fw-semibold small">Business / Shop Name *</label>
                  <input
                    type="text"
                    name="businessName"
                    className="form-control"
                    placeholder="e.g. Telangana Wholesale Mart"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Store Address / Location</label>
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
                  <label className="form-label fw-semibold small">Registered Email Address</label>
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

          {/* Mandi & Alert Preferences */}
          <div className="col-12 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3 h-100">
              <div className="card-header bg-white border-bottom p-3">
                <div className="d-flex align-items-center gap-2">
                  <BsGeoAlt className="text-success fs-5" />
                  <h5 className="fw-bold text-dark mb-0">Mandi Benchmarks & Alerts</h5>
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
                    <label className="form-label fw-semibold small">Target Profit Margin (%) *</label>
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
                    <small className="text-muted">Default target margin: 10%</small>
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
                    <label className="form-label fw-semibold small">Check Interval</label>
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
                      <option value="24h">Daily (24 Hours)</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold small">Mandi Market Yards</label>
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
    </div>
  )
}

export default Settings
