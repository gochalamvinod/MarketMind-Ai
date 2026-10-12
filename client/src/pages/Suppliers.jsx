import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  BsPlusLg,
  BsSearch,
  BsPencilSquare,
  BsTrash,
  BsPeople,
  BsTelephone,
  BsEnvelope,
  BsGeoAlt
} from 'react-icons/bs'
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
} from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ConfirmModal from '../components/common/ConfirmModal'

/**
 * Suppliers Management Page
 */
const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState(null)

  // Delete State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState(null)

  const initialFormState = {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  }
  const [formData, setFormData] = useState(initialFormState)

  const fetchSuppliersList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getSuppliers()
      const data = res?.data?.data || res?.data || []
      setSuppliers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      toast.error('Failed to load supplier directory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuppliersList()
  }, [fetchSuppliersList])

  const handleOpenAdd = () => {
    setIsEditing(false)
    setCurrentId(null)
    setFormData(initialFormState)
    setShowModal(true)
  }

  const handleOpenEdit = (sup) => {
    setIsEditing(true)
    setCurrentId(sup._id)
    setFormData({
      name: sup.name || '',
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || ''
    })
    setShowModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim()
      }

      if (isEditing) {
        await updateSupplier(currentId, payload)
        toast.success('Supplier updated successfully!')
      } else {
        await createSupplier(payload)
        toast.success('Supplier added successfully!')
      }

      setShowModal(false)
      fetchSuppliersList()
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Operation failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (sup) => {
    setSupplierToDelete(sup)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return
    try {
      await deleteSupplier(supplierToDelete._id)
      toast.success(`Removed supplier: ${supplierToDelete.name}`)
      setShowDeleteModal(false)
      setSupplierToDelete(null)
      fetchSuppliersList()
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete supplier'
      toast.error(msg)
    }
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const term = searchTerm.toLowerCase()
      return (
        s.name.toLowerCase().includes(term) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term))
      )
    })
  }, [suppliers, searchTerm])

  if (loading) {
    return <LoadingSpinner fullPage message="Loading Suppliers Directory..." />
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-0">Supplier Management</h2>
          <p className="text-muted small mb-0 mt-1">
            Maintain your wholesale mandi contacts, millers, and grain distributors
          </p>
        </div>
        <button
          className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
          onClick={handleOpenAdd}
        >
          <BsPlusLg />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3">
          <div className="row">
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <BsSearch />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search suppliers by business name, contact person, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Business Name</th>
                  <th>Contact Person</th>
                  <th>Phone Number</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th className="pe-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup._id}>
                      <td className="ps-3">
                        <span className="fw-semibold text-dark">{sup.name}</span>
                      </td>
                      <td className="text-secondary">{sup.contactPerson || '—'}</td>
                      <td>
                        {sup.phone ? (
                          <span className="d-flex align-items-center gap-1 text-dark small">
                            <BsTelephone className="text-muted" />
                            {sup.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {sup.email ? (
                          <span className="d-flex align-items-center gap-1 text-muted small">
                            <BsEnvelope />
                            {sup.email}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-muted small">
                        {sup.address ? (
                          <span className="d-flex align-items-center gap-1">
                            <BsGeoAlt />
                            {sup.address}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="pe-3 text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-secondary"
                            title="Edit Supplier"
                            onClick={() => handleOpenEdit(sup)}
                          >
                            <BsPencilSquare />
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            title="Delete Supplier"
                            onClick={() => handleDeleteClick(sup)}
                          >
                            <BsTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <BsPeople size={32} className="text-secondary mb-2 d-block mx-auto" />
                      No suppliers found. Click "Add New Supplier" to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-md modal-dialog-centered" style={{ maxHeight: '92vh' }}>
            <div className="modal-content shadow-lg border-0 rounded-3 d-flex flex-column" style={{ maxHeight: '90vh' }}>
              <div className="modal-header border-bottom bg-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <h5 className="modal-title fw-bold text-dark">
                  {isEditing ? `Edit Supplier: ${formData.name}` : 'Add New Supplier'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                <div className="modal-body p-4" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Supplier / Business Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="e.g. Telangana Grain Wholesalers Ltd"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Contact Person</label>
                    <input
                      type="text"
                      name="contactPerson"
                      className="form-control"
                      placeholder="e.g. Ramesh Patel"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        className="form-control"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        placeholder="contact@supplier.in"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Address / Mandi Yard</label>
                    <textarea
                      name="address"
                      className="form-control"
                      rows="2"
                      placeholder="Shop #12, Agricultural Market Yard, Bowenpally, Hyderabad"
                      value={formData.address}
                      onChange={handleInputChange}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light px-4 py-3" style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-bold shadow-sm"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : isEditing ? 'Save Changes' : '✓ Save Supplier'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${supplierToDelete?.name}"?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
    </div>
  )
}

export default Suppliers
