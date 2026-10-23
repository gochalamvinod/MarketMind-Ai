import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  BsDatabase,
  BsPeopleFill,
  BsKeyFill,
  BsServer,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsArrowRepeat,
  BsCpu,
  BsClock,
  BsCollection,
  BsShieldCheck,
  BsTrash3,
  BsBoxArrowUpRight
} from 'react-icons/bs'
import { getAdminDatabase, getAdminApiKeys, flushCache, purgeNonAdminData } from '../services/api'

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [dbData, setDbData] = useState(null)
  const [apiKeys, setApiKeys] = useState(null)
  const [flushing, setFlushing] = useState(false)
  const [purging, setPurging] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [dbRes, keyRes] = await Promise.all([
        getAdminDatabase(),
        getAdminApiKeys()
      ])
      setDbData(dbRes.data?.data || null)
      setApiKeys(keyRes.data?.data || null)
    } catch (err) {
      console.error('Admin dashboard fetch error:', err)
      toast.error('Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleFlushCache = async () => {
    setFlushing(true)
    try {
      const res = await flushCache()
      toast.success(res.data?.message || 'Cache flushed!')
    } catch (err) {
      toast.error('Failed to flush cache')
    } finally {
      setFlushing(false)
    }
  }

  const handlePurgeData = async () => {
    if (!window.confirm('⚠️ This will DELETE all non-admin users, products, sales, purchases, alerts, and market prices. This action is IRREVERSIBLE. Continue?')) return
    setPurging(true)
    try {
      const res = await purgeNonAdminData()
      toast.success(res.data?.message || 'Data purged!')
      await fetchData()
    } catch (err) {
      toast.error('Failed to purge data')
    } finally {
      setPurging(false)
    }
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

  const conn = dbData?.connection || {}
  const collections = dbData?.collections || []
  const runtime = dbData?.runtime || {}
  const totalDocs = dbData?.totalDocuments || 0

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <BsShieldCheck className="me-2 text-primary" />
            Admin Control Panel
          </h4>
          <p className="text-muted mb-0">Platform management & system health overview</p>
        </div>
        <div className="d-flex gap-2 mt-2 mt-md-0">
          <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={fetchData}>
            <BsArrowRepeat size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div className={`alert ${conn.readyState === 1 ? 'alert-success' : 'alert-warning'} d-flex align-items-center gap-2 py-2 mb-4`}>
        {conn.readyState === 1 ? (
          <BsCheckCircleFill className="text-success flex-shrink-0" />
        ) : (
          <BsExclamationTriangleFill className="text-warning flex-shrink-0" />
        )}
        <div>
          <strong>MongoDB Atlas:</strong> {conn.status || 'Unknown'} — <code className="small">{conn.host}</code> / <code className="small">{conn.databaseName}</code>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="row g-3 mb-4">
        {/* Total Documents */}
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-3">
              <BsDatabase className="text-primary mb-2" size={28} />
              <h3 className="fw-bold mb-0">{totalDocs.toLocaleString()}</h3>
              <small className="text-muted">Total Documents</small>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="col-6 col-md-3">
          <Link to="/admin/users" className="text-decoration-none">
            <div className="card border-0 shadow-sm h-100 card-hover">
              <div className="card-body text-center py-3">
                <BsPeopleFill className="text-success mb-2" size={28} />
                <h3 className="fw-bold mb-0 text-dark">
                  {collections.find(c => c.name === 'Users')?.count || 0}
                </h3>
                <small className="text-muted">Registered Users</small>
              </div>
            </div>
          </Link>
        </div>

        {/* Uptime */}
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-3">
              <BsClock className="text-info mb-2" size={28} />
              <h3 className="fw-bold mb-0">
                {runtime.uptimeSeconds ? `${Math.floor(runtime.uptimeSeconds / 60)}m` : '—'}
              </h3>
              <small className="text-muted">Server Uptime</small>
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center py-3">
              <BsCpu className="text-warning mb-2" size={28} />
              <h3 className="fw-bold mb-0">{runtime.memoryUsageMB || '—'} MB</h3>
              <small className="text-muted">Heap Memory</small>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Database Collections */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <BsCollection className="text-primary" /> MongoDB Collections
              </h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3 py-2 small text-uppercase text-muted">Collection</th>
                      <th className="py-2 small text-uppercase text-muted text-end pe-3">Documents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((col, idx) => (
                      <tr key={idx}>
                        <td className="ps-3 py-2 fw-medium">{col.name}</td>
                        <td className="py-2 text-end pe-3">
                          <span className="badge bg-primary-subtle text-primary rounded-pill px-3">
                            {col.count.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="table-light">
                    <tr>
                      <td className="ps-3 py-2 fw-bold">Total</td>
                      <td className="py-2 text-end pe-3 fw-bold">{totalDocs.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* API Keys Status + Quick Actions */}
        <div className="col-lg-5">
          {/* API Keys Status */}
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <BsKeyFill className="text-warning" /> API Configuration
              </h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div>
                  <div className="fw-medium">Google Gemini AI</div>
                  <small className="text-muted">{apiKeys?.geminiModel || 'gemini-2.0-flash'}</small>
                </div>
                {apiKeys?.geminiConfigured ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle">
                    <BsCheckCircleFill className="me-1" /> Active
                  </span>
                ) : (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                    <BsExclamationTriangleFill className="me-1" /> Not Set
                  </span>
                )}
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div>
                  <div className="fw-medium">AGMARKNET Gov API</div>
                  <small className="text-muted">data.gov.in mandi prices</small>
                </div>
                {apiKeys?.govApiConfigured ? (
                  <span className="badge bg-success-subtle text-success border border-success-subtle">
                    <BsCheckCircleFill className="me-1" /> Active
                  </span>
                ) : (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                    <BsExclamationTriangleFill className="me-1" /> Not Set
                  </span>
                )}
              </div>
              <Link to="/admin/api-keys" className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1">
                <BsKeyFill size={13} /> Manage API Keys
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h6 className="fw-bold mb-0 d-flex align-items-center gap-2">
                <BsServer className="text-info" /> System Actions
              </h6>
            </div>
            <div className="card-body d-grid gap-2">
              <button
                className="btn btn-outline-warning btn-sm d-flex align-items-center justify-content-center gap-2"
                onClick={handleFlushCache}
                disabled={flushing}
              >
                {flushing ? <span className="spinner-border spinner-border-sm" /> : <BsArrowRepeat size={14} />}
                Flush Server Cache
              </button>
              <button
                className="btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center gap-2"
                onClick={handlePurgeData}
                disabled={purging}
              >
                {purging ? <span className="spinner-border spinner-border-sm" /> : <BsTrash3 size={14} />}
                Purge All Non-Admin Data
              </button>
            </div>
          </div>

          {/* Runtime Info */}
          <div className="card border-0 shadow-sm mt-3">
            <div className="card-body">
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                <BsCpu className="text-secondary" /> Runtime
              </h6>
              <div className="small">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Node.js</span>
                  <span className="fw-medium">{runtime.nodeVersion || '—'}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Platform</span>
                  <span className="fw-medium">{runtime.platform || '—'}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Environment</span>
                  <span className="fw-medium">{runtime.environment || 'development'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
