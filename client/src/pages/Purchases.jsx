import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import {
  BsCartPlus,
  BsSearch,
  BsCalendarDate,
  BsBoxSeam,
  BsPeople,
  BsCashCoin,
  BsReceipt,
  BsArrowRepeat
} from 'react-icons/bs'
import { getPurchases, createPurchase, getProducts } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'

/**
 * Purchases Page
 * Record incoming commodity batches, auto-update weighted average cost and physical stock.
 */
const Purchases = () => {
  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Form State
  const initialForm = {
    product: '',
    quantity: '',
    unit: 'kg',
    unitCost: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    notes: ''
  }
  const [formData, setFormData] = useState(initialForm)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const [purchasesRes, productsRes] = await Promise.all([
        getPurchases(params),
        getProducts({})
      ])

      setPurchases(purchasesRes?.data?.data || purchasesRes?.data || [])
      setProducts(productsRes?.data?.data || productsRes?.data || [])
    } catch (err) {
      console.error('Error fetching purchases data:', err)
      toast.error('Failed to load purchases history')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle product dropdown selection
  const handleProductChange = (e) => {
    const selectedProdId = e.target.value
    const found = products.find((p) => p._id === selectedProdId)
    setFormData((prev) => ({
      ...prev,
      product: selectedProdId,
      unit: found ? found.unit : 'kg',
      unitCost: found ? found.purchaseCost : prev.unitCost
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Auto-calculated total amount
  const totalAmount = useMemo(() => {
    const q = parseFloat(formData.quantity) || 0
    const c = parseFloat(formData.unitCost) || 0
    return (q * c).toFixed(2)
  }, [formData.quantity, formData.unitCost])

  // Submit Purchase
  const handleSubmitPurchase = async (e) => {
    e.preventDefault()

    if (!formData.product) {
      toast.error('Please select a commodity product')
      return
    }

    const qty = parseFloat(formData.quantity)
    const cost = parseFloat(formData.unitCost)

    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid positive quantity')
      return
    }

    if (isNaN(cost) || cost < 0) {
      toast.error('Please enter a valid purchase cost per unit')
      return
    }

    try {
      setSubmitting(true)
      await createPurchase({
        product: formData.product,
        quantity: qty,
        unit: formData.unit,
        unitCost: cost,
        purchaseDate: formData.purchaseDate,
        invoiceNumber: formData.invoiceNumber.trim() || undefined,
        notes: formData.notes.trim() || undefined
      })

      toast.success('Purchase recorded! Stock quantity and weighted-average cost updated.')
      setFormData(initialForm)
      await fetchData()
    } catch (err) {
      console.error('Error creating purchase:', err)
      toast.error(err?.response?.data?.message || 'Failed to record purchase transaction')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((item) => {
      const prodName = item.product?.name || ''
      const inv = item.invoiceNumber || ''
      const term = searchTerm.toLowerCase()
      return (
        prodName.toLowerCase().includes(term) ||
        inv.toLowerCase().includes(term)
      )
    })
  }, [purchases, searchTerm])

  const selectedProductObj = products.find((p) => p._id === formData.product)

  if (loading) {
    return <LoadingSpinner fullPage message="Loading Purchase Records..." />
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-0">Purchases & Stock Inward</h2>
          <p className="text-muted small mb-0 mt-1">
            Record procurement batches with automatic weighted-average inventory costing
          </p>
        </div>
      </div>

      {/* Purchase Entry Form Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex align-items-center gap-2">
            <BsCartPlus className="text-primary fs-5" />
            <h5 className="fw-bold text-dark mb-0">Record New Purchase Batch</h5>
          </div>
        </div>

        <div className="card-body p-4">
          <form onSubmit={handleSubmitPurchase}>
            <div className="row g-3">
              {/* Product Selection */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold small">Commodity Product *</label>
                <select
                  name="product"
                  className="form-select"
                  value={formData.product}
                  onChange={handleProductChange}
                  required
                >
                  <option value="">-- Choose Commodity --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Current Stock: {p.stockQuantity} {p.unit} @ ₹{p.purchaseCost}/{p.unit})
                    </option>
                  ))}
                </select>
                {selectedProductObj && (
                  <span className="small text-muted mt-1 d-block">
                    Current weighted cost: <strong>{formatCurrency(selectedProductObj.purchaseCost)}/{selectedProductObj.unit}</strong>
                  </span>
                )}
              </div>

              {/* Purchase Date */}
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold small">Purchase Date *</label>
                <input
                  type="date"
                  name="purchaseDate"
                  className="form-control"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Quantity */}
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label fw-semibold small">Batch Quantity *</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="quantity"
                    className="form-control"
                    placeholder="e.g. 50"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                  <span className="input-group-text bg-light">{formData.unit}</span>
                </div>
              </div>

              {/* Unit Cost */}
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label fw-semibold small">Actual Unit Cost (₹/{formData.unit}) *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="unitCost"
                    className="form-control"
                    placeholder="e.g. 42.50"
                    value={formData.unitCost}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Invoice Number */}
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label fw-semibold small">Invoice / Mandi Bill Ref</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  className="form-control"
                  placeholder="e.g. INV-HYD-9912"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                />
              </div>

              {/* Calculated Total Card */}
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label fw-semibold small">Total Procurement Value</label>
                <div className="form-control bg-light fw-bold text-success fs-6 d-flex align-items-center">
                  ₹ {totalAmount}
                </div>
              </div>

              {/* Notes */}
              <div className="col-12">
                <label className="form-label fw-semibold small">Procurement Notes / Batch Details</label>
                <input
                  type="text"
                  name="notes"
                  className="form-control"
                  placeholder="Batch #, moisture specs, vehicle delivery notes..."
                  value={formData.notes}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="mt-4 text-end">
              <button
                type="submit"
                className="btn btn-primary px-4 fw-bold shadow-sm"
                disabled={submitting}
              >
                {submitting ? 'Saving Batch...' : '✓ Record Inward Purchase Batch'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Historical Purchases Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <h5 className="fw-bold text-dark mb-0">Purchase History & Procurement Log</h5>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="input-group input-group-sm" style={{ width: '220px' }}>
                <span className="input-group-text bg-white"><BsSearch /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter product/vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: '140px' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start Date"
              />
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: '140px' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="End Date"
              />
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle custom-table mb-0">
              <thead>
                <tr>
                  <th className="ps-3">Date</th>
                  <th>Commodity Product</th>
                  <th>Quantity</th>
                  <th>Unit Cost (₹)</th>
                  <th>Total Amount (₹)</th>
                  <th>Invoice Ref</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.length > 0 ? (
                  filteredPurchases.map((p) => (
                    <tr key={p._id}>
                      <td className="ps-3">{formatDate(p.purchaseDate || p.createdAt)}</td>
                      <td>
                        <strong>{p.product?.name || 'Commodity'}</strong>
                      </td>
                      <td><strong>{p.quantity}</strong> {p.unit || p.product?.unit || 'kg'}</td>
                      <td>{formatCurrency(p.unitCost)}</td>
                      <td className="fw-bold text-success">{formatCurrency(p.totalAmount)}</td>
                      <td><span className="text-muted font-monospace">{p.invoiceNumber || '—'}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <BsBoxSeam size={32} className="text-secondary mb-2 d-block mx-auto" />
                      No purchase records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Purchases
