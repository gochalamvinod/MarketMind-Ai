import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import {
  BsCashCoin,
  BsSearch,
  BsCalendarDate,
  BsBoxSeam,
  BsPerson,
  BsReceipt,
  BsArrowRepeat,
  BsCheckCircle,
  BsExclamationTriangle
} from 'react-icons/bs'
import { getSales, createSale, getProducts } from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'

/**
 * Sales Page
 * Point of sale with physical inventory checks, COGS calculation, and gross profit tracking.
 */
const Sales = () => {
  const [sales, setSales] = useState([])
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
    unitSellingPrice: '',
    saleDate: new Date().toISOString().split('T')[0],
    customerRef: '',
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

      const [salesRes, productsRes] = await Promise.all([
        getSales(params),
        getProducts({})
      ])

      setSales(salesRes?.data?.data || salesRes?.data || [])
      setProducts(productsRes?.data?.data || productsRes?.data || [])
    } catch (err) {
      console.error('Error fetching sales data:', err)
      toast.error('Failed to load sales history')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle product selection
  const handleProductChange = (e) => {
    const selectedProdId = e.target.value
    const found = products.find((p) => p._id === selectedProdId)
    setFormData((prev) => ({
      ...prev,
      product: selectedProdId,
      unit: found ? found.unit : 'kg',
      unitSellingPrice: found ? found.sellingPrice : prev.unitSellingPrice
    }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const selectedProductObj = products.find((p) => p._id === formData.product)

  // Live Financial Calculations for POS
  const calculations = useMemo(() => {
    const q = parseFloat(formData.quantity) || 0
    const sp = parseFloat(formData.unitSellingPrice) || 0
    const cost = selectedProductObj ? parseFloat(selectedProductObj.purchaseCost) || 0 : 0

    const revenue = parseFloat((q * sp).toFixed(2))
    const cogs = parseFloat((q * cost).toFixed(2))
    const profit = parseFloat((revenue - cogs).toFixed(2))
    const margin = revenue > 0 ? parseFloat(((profit / revenue) * 100).toFixed(1)) : 0

    return { revenue, cogs, profit, margin, unitCost: cost }
  }, [formData.quantity, formData.unitSellingPrice, selectedProductObj])

  // Submit Sale
  const handleSubmitSale = async (e) => {
    e.preventDefault()

    if (!formData.product) {
      toast.error('Please select a commodity product')
      return
    }

    const qty = parseFloat(formData.quantity)
    const price = parseFloat(formData.unitSellingPrice)

    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid sale quantity')
      return
    }

    if (!selectedProductObj || selectedProductObj.stockQuantity < qty) {
      toast.error(
        `Insufficient stock! Only ${selectedProductObj?.stockQuantity || 0} ${formData.unit} available in inventory.`
      )
      return
    }

    if (isNaN(price) || price < 0) {
      toast.error('Please enter a valid selling price')
      return
    }

    try {
      setSubmitting(true)
      await createSale({
        product: formData.product,
        quantity: qty,
        unit: formData.unit,
        unitSellingPrice: price,
        saleDate: formData.saleDate,
        customerRef: formData.customerRef.trim() || undefined,
        invoiceNumber: formData.invoiceNumber.trim() || undefined,
        notes: formData.notes.trim() || undefined
      })

      toast.success(`Sale recorded! Revenue: ₹${calculations.revenue}, Gross Profit: +₹${calculations.profit}`)
      setFormData(initialForm)
      await fetchData()
    } catch (err) {
      console.error('Error creating sale:', err)
      toast.error(err?.response?.data?.message || 'Failed to record sale transaction')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((item) => {
      const prodName = item.product?.name || ''
      const cust = item.customerRef || ''
      const inv = item.invoiceNumber || ''
      const term = searchTerm.toLowerCase()
      return (
        prodName.toLowerCase().includes(term) ||
        cust.toLowerCase().includes(term) ||
        inv.toLowerCase().includes(term)
      )
    })
  }, [sales, searchTerm])

  if (loading) {
    return <LoadingSpinner fullPage message="Loading Sales & Revenue Data..." />
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-0">Sales & Outward Billing</h2>
          <p className="text-muted small mb-0 mt-1">
            Dispatch inventory with real-time stock validation and gross profit margin analytics
          </p>
        </div>
      </div>

      {/* Sale Entry Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex align-items-center gap-2">
            <BsCashCoin className="text-success fs-5" />
            <h5 className="fw-bold text-dark mb-0">Record Outward Sale Transaction</h5>
          </div>
        </div>

        <div className="card-body p-4">
          <form onSubmit={handleSubmitSale}>
            <div className="row g-3">
              {/* Product */}
              <div className="col-12 col-md-5">
                <label className="form-label fw-semibold small">Commodity Product *</label>
                <select
                  name="product"
                  className="form-select"
                  value={formData.product}
                  onChange={handleProductChange}
                  required
                >
                  <option value="">-- Choose Commodity to Sell --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id} disabled={p.stockQuantity <= 0}>
                      {p.name} (In Stock: {p.stockQuantity} {p.unit} | Cost: ₹{p.purchaseCost} | Retail: ₹{p.sellingPrice})
                    </option>
                  ))}
                </select>
                {selectedProductObj && (
                  <span className={`small mt-1 d-block ${selectedProductObj.stockQuantity <= selectedProductObj.minStockLevel ? 'text-danger fw-bold' : 'text-muted'}`}>
                    Available physical stock: <strong>{selectedProductObj.stockQuantity} {selectedProductObj.unit}</strong> | Inventory cost: ₹{selectedProductObj.purchaseCost}/{selectedProductObj.unit}
                  </span>
                )}
              </div>

              {/* Quantity */}
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label fw-semibold small">Quantity to Sell *</label>
                <div className="input-group">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedProductObj ? selectedProductObj.stockQuantity : undefined}
                    name="quantity"
                    className="form-control"
                    placeholder="e.g. 10"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                  />
                  <span className="input-group-text bg-light">{formData.unit}</span>
                </div>
              </div>

              {/* Unit Selling Price */}
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label fw-semibold small">Selling Price (₹/{formData.unit}) *</label>
                <div className="input-group">
                  <span className="input-group-text bg-light">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="unitSellingPrice"
                    className="form-control"
                    placeholder="e.g. 48"
                    value={formData.unitSellingPrice}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              {/* Sale Date */}
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label fw-semibold small">Sale Date *</label>
                <input
                  type="date"
                  name="saleDate"
                  className="form-control"
                  value={formData.saleDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Customer Ref */}
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label fw-semibold small">Customer Name / Buyer Ref</label>
                <input
                  type="text"
                  name="customerRef"
                  className="form-control"
                  placeholder="e.g. Walk-in Retail / Hotel Caterer"
                  value={formData.customerRef}
                  onChange={handleInputChange}
                />
              </div>

              {/* Invoice Number */}
              <div className="col-12 col-sm-6 col-md-4">
                <label className="form-label fw-semibold small">Bill / Invoice Number</label>
                <input
                  type="text"
                  name="invoiceNumber"
                  className="form-control"
                  placeholder="e.g. SAL-2026-004"
                  value={formData.invoiceNumber}
                  onChange={handleInputChange}
                />
              </div>

              {/* Live Gross Profit Breakdown Cards */}
              <div className="col-12">
                <div className="bg-light p-3 rounded-3 border">
                  <div className="row g-2 text-center">
                    <div className="col-6 col-md-3">
                      <span className="text-muted small text-uppercase d-block">Total Revenue</span>
                      <strong className="fs-5 text-dark">₹{calculations.revenue}</strong>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small text-uppercase d-block">Cost of Goods Sold</span>
                      <strong className="fs-5 text-secondary">₹{calculations.cogs}</strong>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small text-uppercase d-block">Estimated Gross Profit</span>
                      <strong className={`fs-5 ${calculations.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {calculations.profit >= 0 ? '+' : ''}₹{calculations.profit}
                      </strong>
                    </div>
                    <div className="col-6 col-md-3">
                      <span className="text-muted small text-uppercase d-block">Profit Margin %</span>
                      <strong className={`fs-5 ${calculations.margin >= 0 ? 'text-success' : 'text-danger'}`}>
                        {calculations.margin}%
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-end">
              <button
                type="submit"
                className="btn btn-success px-4 fw-bold shadow-sm"
                disabled={submitting}
              >
                {submitting ? 'Recording Sale...' : '✓ Complete Sale Transaction'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sales History Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <h5 className="fw-bold text-dark mb-0">Sales History & Profitability Log</h5>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="input-group input-group-sm" style={{ width: '220px' }}>
                <span className="input-group-text bg-white"><BsSearch /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter product/buyer..."
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
                  <th>Selling Price (₹)</th>
                  <th>Revenue (₹)</th>
                  <th>COGS Cost (₹)</th>
                  <th>Gross Profit (₹)</th>
                  <th>Margin %</th>
                  <th>Customer / Bill</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((s) => (
                    <tr key={s._id}>
                      <td className="ps-3">{formatDate(s.saleDate || s.createdAt)}</td>
                      <td>
                        <strong>{s.product?.name || 'Commodity'}</strong>
                      </td>
                      <td><strong>{s.quantity}</strong> {s.unit || s.product?.unit || 'kg'}</td>
                      <td>{formatCurrency(s.unitSellingPrice)}</td>
                      <td className="fw-bold text-dark">{formatCurrency(s.totalRevenue)}</td>
                      <td className="text-secondary">{formatCurrency(s.costOfGoodsSold)}</td>
                      <td className={`fw-bold ${s.grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {s.grossProfit >= 0 ? '+' : ''}{formatCurrency(s.grossProfit)}
                      </td>
                      <td>
                        <span className={`badge ${s.profitMargin >= 0 ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger'}`}>
                          {s.profitMargin?.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className="text-muted small">{s.customerRef || s.invoiceNumber || 'Retail Order'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <BsBoxSeam size={32} className="text-secondary mb-2 d-block mx-auto" />
                      No sales records found matching your filters.
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

export default Sales
