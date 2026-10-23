import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  BsPeopleFill,
  BsPersonBadge,
  BsShop,
  BsGeoAlt,
  BsEnvelope,
  BsTelephone,
  BsTrash3,
  BsArrowRepeat,
  BsShieldCheck,
  BsCalendar3
} from 'react-icons/bs'
import { getAdminUsers, deleteAdminUser } from '../services/api'

const AdminUsers = () => {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [deleting, setDeleting] = useState(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await getAdminUsers()
      setUsers(res.data?.data || [])
    } catch (err) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}" and ALL their data (products, sales, purchases, alerts)? This cannot be undone.`)) return
    setDeleting(userId)
    try {
      const res = await deleteAdminUser(userId)
      toast.success(res.data?.message || 'User deleted')
      setUsers(prev => prev.filter(u => u._id !== userId))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user')
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
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

  const adminUsers = users.filter(u => u.role === 'admin')
  const merchantUsers = users.filter(u => u.role !== 'admin')

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-start mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">
            <BsPeopleFill className="me-2 text-primary" />
            User Management
          </h4>
          <p className="text-muted mb-0">{users.length} total users — {adminUsers.length} admin, {merchantUsers.length} merchants</p>
        </div>
        <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 mt-2 mt-md-0" onClick={fetchUsers}>
          <BsArrowRepeat size={14} /> Refresh
        </button>
      </div>

      {/* Admin Account Card */}
      {adminUsers.map(admin => (
        <div key={admin._id} className="card border-0 shadow-sm mb-4">
          <div className="card-body d-flex align-items-center gap-3 py-3">
            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: 48, height: 48, fontSize: '1.1rem' }}>
              <BsShieldCheck size={22} />
            </div>
            <div>
              <div className="fw-bold text-dark">{admin.name || 'System Administrator'}</div>
              <div className="text-muted small">{admin.email}</div>
            </div>
            <span className="badge bg-primary-subtle text-primary ms-auto">Platform Admin</span>
          </div>
        </div>
      ))}

      {/* Merchant Users Table */}
      {merchantUsers.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <BsPeopleFill size={48} className="text-muted mb-3" />
            <h5 className="text-muted fw-medium">No Merchant Accounts</h5>
            <p className="text-muted small mb-0">No store merchants have registered yet.</p>
          </div>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom py-3">
            <h6 className="fw-bold mb-0">Registered Merchants ({merchantUsers.length})</h6>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3 py-2 small text-uppercase text-muted">User</th>
                  <th className="py-2 small text-uppercase text-muted">Shop / Business</th>
                  <th className="py-2 small text-uppercase text-muted">Location</th>
                  <th className="py-2 small text-uppercase text-muted">Contact</th>
                  <th className="py-2 small text-uppercase text-muted">Joined</th>
                  <th className="py-2 small text-uppercase text-muted text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchantUsers.map(user => (
                  <tr key={user._id}>
                    <td className="ps-3 py-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0" style={{ width: 36, height: 36, fontSize: '0.85rem' }}>
                          {(user.firstName || user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-medium text-dark small">
                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || '—'}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.72rem' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2">
                      <span className="small">{user.businessName || '—'}</span>
                    </td>
                    <td className="py-2">
                      <span className="small text-muted">
                        {[user.city, user.state].filter(Boolean).join(', ') || user.address || '—'}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className="small text-muted">{user.phone || '—'}</span>
                    </td>
                    <td className="py-2">
                      <span className="small text-muted">{formatDate(user.createdAt)}</span>
                    </td>
                    <td className="py-2 text-center">
                      <button
                        className="btn btn-outline-danger btn-sm py-0 px-2"
                        onClick={() => handleDeleteUser(user._id, user.name || user.email)}
                        disabled={deleting === user._id}
                        title="Delete user and all their data"
                      >
                        {deleting === user._id ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : (
                          <BsTrash3 size={13} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
