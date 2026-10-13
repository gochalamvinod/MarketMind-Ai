import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  BsKeyFill,
  BsEyeFill,
  BsEyeSlashFill,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsArrowRepeat,
  BsSave
} from 'react-icons/bs'
import { getAdminApiKeys, updateAdminApiKeys } from '../services/api'

const AdminApiKeys = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showGemini, setShowGemini] = useState(false)
  const [showGov, setShowGov] = useState(false)
  const [form, setForm] = useState({
    geminiApiKey: '',
    govApiKey: '',
    govApiResourceId: ''
  })
  const [status, setStatus] = useState({
    geminiConfigured: false,
    govApiConfigured: false,
    geminiModel: ''
  })

  const fetchKeys = useCallback(async () => {
    try {
      const res = await getAdminApiKeys()
      const data = res.data?.data || {}
      setForm({
        geminiApiKey: data.geminiApiKey || '',
        govApiKey: data.govApiKey || '',
        govApiResourceId: data.govApiResourceId || ''
      })
      setStatus({
        geminiConfigured: data.geminiConfigured || false,
        govApiConfigured: data.govApiConfigured || false,
        geminiModel: data.geminiModel || 'gemini-2.0-flash'
      })
    } catch (err) {
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateAdminApiKeys(form)
      toast.success(res.data?.message || 'API keys updated!')
      setStatus(prev => ({
        ...prev,
        geminiConfigured: res.data?.data?.geminiConfigured || false,
        govApiConfigured: res.data?.data?.govApiConfigured || false
      }))
    } catch (err) {
      toast.error('Failed to update API keys')
    } finally {
      setSaving(false)
    }
  }

  const maskKey = (key) => {
    if (!key || key.length < 8) return key || ''
    return key.substring(0, 6) + '•'.repeat(Math.min(key.length - 10, 20)) + key.substring(key.length - 4)
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-4">
        <h4 className="fw-bold text-dark mb-1">
          <BsKeyFill className="me-2 text-warning" />
          API Keys Configuration
        </h4>
        <p className="text-muted mb-0">Manage external API credentials for AI and market data services</p>
      </div>

      <div className="row g-4">
        {/* Gemini AI Key */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Google Gemini AI</h6>
              {status.geminiConfigured ? (
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  <BsCheckCircleFill className="me-1" /> Active
                </span>
              ) : (
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                  <BsExclamationTriangleFill className="me-1" /> Not Configured
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-medium text-muted">API Key</label>
                <div className="input-group">
                  <input
                    type={showGemini ? 'text' : 'password'}
                    className="form-control"
                    value={form.geminiApiKey}
                    onChange={e => setForm(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                    placeholder="Enter Google Gemini API key..."
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setShowGemini(!showGemini)}
                  >
                    {showGemini ? <BsEyeSlashFill /> : <BsEyeFill />}
                  </button>
                </div>
                <small className="text-muted mt-1 d-block">Model: {status.geminiModel} — Powers AI Copilot, chatbot, and price insights</small>
              </div>
            </div>
          </div>
        </div>

        {/* AGMARKNET Gov API Key */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">AGMARKNET / data.gov.in API</h6>
              {status.govApiConfigured ? (
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  <BsCheckCircleFill className="me-1" /> Active
                </span>
              ) : (
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                  <BsExclamationTriangleFill className="me-1" /> Not Configured
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label small fw-medium text-muted">API Key</label>
                <div className="input-group">
                  <input
                    type={showGov ? 'text' : 'password'}
                    className="form-control"
                    value={form.govApiKey}
                    onChange={e => setForm(prev => ({ ...prev, govApiKey: e.target.value }))}
                    placeholder="Enter data.gov.in API key..."
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setShowGov(!showGov)}
                  >
                    {showGov ? <BsEyeSlashFill /> : <BsEyeFill />}
                  </button>
                </div>
              </div>
              <div className="mb-0">
                <label className="form-label small fw-medium text-muted">Resource ID</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.govApiResourceId}
                  onChange={e => setForm(prev => ({ ...prev, govApiResourceId: e.target.value }))}
                  placeholder="AGMARKNET resource UUID..."
                />
                <small className="text-muted mt-1 d-block">Mandi wholesale price data source from data.gov.in</small>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="col-12">
          <button
            className="btn btn-primary d-flex align-items-center gap-2 px-4"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <span className="spinner-border spinner-border-sm" /> : <BsSave size={16} />}
            Save API Keys
          </button>
          <small className="text-muted mt-2 d-block">
            Keys are updated in the running server process. For persistence across restarts, add them to your <code>.env</code> file.
          </small>
        </div>
      </div>
    </div>
  )
}

export default AdminApiKeys
