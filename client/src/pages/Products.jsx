import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  BsPlusLg,
  BsSearch,
  BsPencilSquare,
  BsTrash,
  BsFilter,
  BsBoxSeam,
  BsLightbulb,
  BsArrowRepeat,
  BsEye
} from 'react-icons/bs'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSuppliers,
  getSettings,
  fetchPricesNow
} from '../services/api'
import { formatCurrency } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ConfirmModal from '../components/common/ConfirmModal'
import StockStatus from '../components/common/StockStatus'
import PriceChangeIndicator from '../components/common/PriceChangeIndicator'

const CATEGORIES = [
  'Rice',
  'Wheat',
  'Dal & Pulses',
  'Cooking Oil',
  'Sugar & Sweeteners',
  'Spices',
  'Flour & Grains',
  'Others'
]

const UNITS = ['kg', 'quintal', 'bag', 'litre', 'ton']

/**
 * Products Management Page
 */
const Products = () => {
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshingPrices, setRefreshingPrices] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [onlyLowStock, setOnlyLowStock] = useState(false)

  // Default target margin %
  const [targetMargin, setTargetMargin] = useState(12)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState(null)

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [productToDelete, setProductToDelete] = useState(null)

  // Form State
  const initialFormState = {
    name: '',
    category: 'Rice',
    variety: '',
    unit: 'kg',
    sellingPrice: '',
    minStockLevel: 10,
    supplier: '',
    description: '',
    govApiCommodityName: '',
    govApiVariety: '',
    stockQuantity: 0,
    purchaseCost: 0
  }
  const [formData, setFormData] = useState(initialFormState)
  const modalBodyRef = useRef(null)
  const nameInputRef = useRef(null)

  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTop = 0
        }
        nameInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [showModal])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [prodRes, suppRes, setRes] = await Promise.all([
        getProducts(),
        getSuppliers(),
        getSettings().catch(() => null)
      ])

      const prodData = prodRes?.data?.data || prodRes?.data || []
      const suppData = suppRes?.data?.data || suppRes?.data || []
      setProducts(Array.isArray(prodData) ? prodData : [])
      setSuppliers(Array.isArray(suppData) ? suppData : [])

      if (setRes?.data?.targetMargin || setRes?.data?.data?.targetProfitMargin) {
        setTargetMargin(
          Number(setRes?.data?.targetMargin || setRes?.data?.data?.targetProfitMargin) || 12
        )
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      toast.error('Failed to load products list')
    } finally {
      setLoading(false)
    }
  }, [])

  const location = useLocation()

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (location.search.includes('add') || location.search.includes('new')) {
      handleOpenAddModal()
    }
  }, [location.search, suppliers])

  // Open modal for new product
  const handleOpenAddModal = () => {
    setIsEditing(false)
    setCurrentId(null)
    setFormData({
      ...initialFormState,
      supplier: suppliers.length > 0 ? suppliers[0]._id : ''
    })
    setShowModal(true)
  }

  // Open modal for editing
  const handleOpenEditModal = (product) => {
    setIsEditing(true)
    setCurrentId(product._id)
    setFormData({
      name: product.name || '',
      category: product.category || 'Rice',
      variety: product.variety || '',
      unit: product.unit || 'kg',
      sellingPrice: product.sellingPrice || '',
      minStockLevel: product.minStockLevel || 10,
      supplier: product.supplier?._id || product.supplier || '',
      description: product.description || '',
      govApiCommodityName: product.govApiCommodityName || '',
      govApiVariety: product.govApiVariety || '',
      stockQuantity: product.stockQuantity || 0,
      purchaseCost: product.purchaseCost || 0
    })
    setShowModal(true)
  }

  // Form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  // Calculate suggested selling price
  const calculateSuggestedPrice = (cost) => {
    const numericCost = Number(cost) || 0
    if (numericCost <= 0) return 0
    return (numericCost * (1 + targetMargin / 100)).toFixed(2)
  }

  const handleApplySuggestedPrice = () => {
    const cost = formData.purchaseCost
    const suggested = calculateSuggestedPrice(cost)
    if (suggested > 0) {
      setFormData((prev) => ({ ...prev, sellingPrice: suggested }))
      toast.info(`Suggested price ₹${suggested} applied (${targetMargin}% margin)`)
    }
  }

  // Submit product create/edit
  const handleSubmitProduct = async (e) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Product Name is required (please fill in the commodity name at the top)')
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
      setTimeout(() => nameInputRef.current?.focus(), 100)
      return
    }

    if (Number(formData.sellingPrice) <= 0) {
      toast.error('Selling price must be greater than 0')
      return
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      variety: formData.variety.trim(),
      unit: formData.unit,
      sellingPrice: Number(formData.sellingPrice),
      minStockLevel: Number(formData.minStockLevel) || 0,
      supplier: formData.supplier || undefined,
      description: formData.description.trim(),
      govApiCommodityName: formData.govApiCommodityName.trim(),
      govApiVariety: formData.govApiVariety.trim()
    }

    if (!isEditing) {
      payload.stockQuantity = Number(formData.stockQuantity) || 0
      payload.purchaseCost = Number(formData.purchaseCost) || 0
    }

    try {
      setSubmitting(true)
      if (isEditing) {
        await updateProduct(currentId, payload)
        toast.success('Product updated successfully!')
      } else {
        await createProduct(payload)
        toast.success('Product added successfully!')
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Operation failed'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Delete handling
  const handleDeleteClick = (product) => {
    setProductToDelete(product)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!productToDelete) return
    try {
      await deleteProduct(productToDelete._id)
      toast.success(`Deleted product: ${productToDelete.name}`)
      setShowDeleteModal(false)
      setProductToDelete(null)
      fetchData()
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to delete product'
      toast.error(msg)
    }
  }

  const handleFetchMandiPrices = async () => {
    try {
      setRefreshingPrices(true)
      const res = await fetchPricesNow()
      toast.success(res?.data?.message || 'Latest Mandi rates fetched!')
      fetchData()
    } catch (err) {
      toast.error('Failed to sync mandi rates')
    } finally {
      setRefreshingPrices(false)
    }
  }

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.variety && p.variety.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory ? p.category === selectedCategory : true
      const matchesLowStock = onlyLowStock
        ? Number(p.stockQuantity) <= Number(p.minStockLevel || 10)
        : true

      return matchesSearch && matchesCategory && matchesLowStock
    })
  }, [products, searchTerm, selectedCategory, onlyLowStock])

  if (loading) {
    return <LoadingSpinner fullPage message="Loading Inventory & Commodity Records..." />
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-0">Product & Inventory Management</h2>
          <p className="text-muted small mb-0 mt-1">
            Track inventory, mandi reference rates, and selling prices
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            className="btn btn-outline-success d-flex align-items-center gap-2 shadow-sm"
            onClick={handleFetchMandiPrices}
            disabled={refreshingPrices}
          >
            <BsArrowRepeat className={refreshingPrices ? 'spin-animation' : ''} />
            <span>{refreshingPrices ? 'Syncing...' : 'Fetch Mandi Prices'}</span>
          </button>
          <button
            className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
            onClick={handleOpenAddModal}
          >
            <BsPlusLg />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            {/* Search */}
            <div className="col-12 col-md-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <BsSearch />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search products by name or variety..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="col-12 col-sm-6 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <BsFilter />
                </span>
                <select
                  className="form-select border-start-0 ps-0"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Low Stock Checkbox */}
            <div className="col-12 col-sm-6 col-md-3">
              <div className="form-check form-switch pt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="lowStockFilter"
                  checked={onlyLowStock}
                  onChange={(e) => setOnlyLowStock(e.target.checked)}
                />
                <label className="form-check-label text-dark small fw-semibold" htmlFor="lowStockFilter">
                  Show Low Stock Only
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3">Name</th>
                  <th>Category</th>
                  <th>Variety</th>
                  <th>Stock Qty</th>
                  <th>Unit</th>
                  <th>Purchase Cost</th>
                  <th>Selling Price</th>
                  <th>Market Ref Price</th>
                  <th>Price Change</th>
                  <th>Stock Status</th>
                  <th className="pe-3 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const marketRef = p.currentReferencePrice !== null && p.currentReferencePrice !== undefined
                      ? Number(p.currentReferencePrice)
                      : (p.marketPrice || p.latestMarketPrice || p.currentMarketPrice || 0)

                    const prevRef = p.previousReferencePrice !== null && p.previousReferencePrice !== undefined
                      ? Number(p.previousReferencePrice)
                      : null

                    let priceDiff = p.marketPriceChange || p.priceChange || 0
                    let pricePercent = p.marketPriceChangePercent || p.priceChangePercent || 0

                    if (marketRef > 0 && prevRef !== null && prevRef > 0) {
                      priceDiff = parseFloat((marketRef - prevRef).toFixed(2))
                      pricePercent = parseFloat((((marketRef - prevRef) / prevRef) * 100).toFixed(2))
                    }

                    return (
                      <tr key={p._id}>
                        <td className="ps-3">
                          <Link to={`/products/${p._id}`} className="fw-semibold text-dark text-decoration-none text-primary-hover">
                            {p.name}
                          </Link>
                          {p.govApiCommodityName && (
                            <span className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                              Mandi link: {p.govApiCommodityName}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-light text-secondary border">
                            {p.category}
                          </span>
                        </td>
                        <td className="text-muted small">{p.variety || '—'}</td>
                        <td className="fw-bold text-dark">{p.stockQuantity}</td>
                        <td className="text-muted small">{p.unit}</td>
                        <td className="fw-medium text-dark">{formatCurrency(p.purchaseCost || 0)}</td>
                        <td className="fw-bold text-primary">{formatCurrency(p.sellingPrice || 0)}</td>
                        <td className="fw-medium text-secondary">
                          {marketRef > 0 ? formatCurrency(marketRef) : '—'}
                        </td>
                        <td>
                          <PriceChangeIndicator change={priceDiff} percentage={pricePercent} />
                        </td>
                        <td>
                          <StockStatus quantity={p.stockQuantity} minLevel={p.minStockLevel || 10} />
                        </td>
                        <td className="pe-3 text-end">
                          <div className="btn-group btn-group-sm">
                            <Link
                              to={`/products/${p._id}`}
                              className="btn btn-outline-info"
                              title="View Details, History & Recommendations"
                            >
                              <BsEye />
                            </Link>
                            <button
                              className="btn btn-outline-secondary"
                              title="Edit Product"
                              onClick={() => handleOpenEditModal(p)}
                            >
                              <BsPencilSquare />
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              title="Delete Product"
                              onClick={() => handleDeleteClick(p)}
                            >
                              <BsTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="text-center py-5 text-muted">
                      <BsBoxSeam size={32} className="text-secondary mb-2 d-block mx-auto" />
                      No products found matching your filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header border-bottom bg-white py-3">
                <h5 className="modal-title fw-bold text-dark">
                  {isEditing ? `Edit Product: ${formData.name}` : 'Add New Commodity Product'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitProduct} className="d-flex flex-column" style={{ minHeight: 0 }}>
                <div ref={modalBodyRef} className="modal-body p-4" style={{ overflowY: 'auto' }}>
                  <div className="row g-3">
                    {/* Basic Info */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">Product Name *</label>
                      <input
                        ref={nameInputRef}
                        type="text"
                        name="name"
                        className="form-control"
                        placeholder="e.g. Sona Masoori Raw Rice"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold small">Category *</label>
                      <select
                        name="category"
                        className="form-select"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold small">Variety</label>
                      <input
                        type="text"
                        name="variety"
                        className="form-control"
                        placeholder="e.g. Grade A / Premium"
                        value={formData.variety}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold small">Unit of Measurement</label>
                      <select
                        name="unit"
                        className="form-select"
                        value={formData.unit}
                        onChange={handleInputChange}
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold small">Min Stock Level (Alert Threshold)</label>
                      <input
                        type="number"
                        name="minStockLevel"
                        className="form-control"
                        min="0"
                        value={formData.minStockLevel}
                        onChange={handleInputChange}
                      />
                    </div>

                    {/* Initial stock and cost ONLY when creating new product */}
                    {!isEditing && (
                      <>
                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small">Initial Stock Quantity</label>
                          <input
                            type="number"
                            name="stockQuantity"
                            className="form-control"
                            min="0"
                            placeholder="0"
                            value={formData.stockQuantity}
                            onChange={handleInputChange}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label className="form-label fw-semibold small">
                            Initial Purchase Cost (₹ / {formData.unit})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            name="purchaseCost"
                            className="form-control"
                            min="0"
                            placeholder="0.00"
                            value={formData.purchaseCost}
                            onChange={handleInputChange}
                          />
                          <small className="text-muted">
                            Subsequent cost changes occur automatically via Purchases (Weighted Average Cost).
                          </small>
                        </div>
                      </>
                    )}

                    {isEditing && (
                      <div className="col-12">
                        <div className="alert alert-secondary py-2 small mb-0">
                          <strong>Note:</strong> Unit purchase cost (current:{' '}
                          {formatCurrency(formData.purchaseCost)}) & stock quantity ({formData.stockQuantity}{' '}
                          {formData.unit}) are governed by Purchases transactions.
                        </div>
                      </div>
                    )}

                    {/* Pricing */}
                    <div className="col-12">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label fw-semibold small mb-0">Selling Price (₹) *</label>
                        {formData.purchaseCost > 0 && (
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-decoration-none small"
                            onClick={handleApplySuggestedPrice}
                          >
                            <BsLightbulb className="me-1" />
                            Suggest (+{targetMargin}%)
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        name="sellingPrice"
                        className="form-control"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.sellingPrice}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Mandi link configuration */}
                    <div className="col-12 pt-2 border-top">
                      <div className="fw-semibold text-dark small mb-2">
                        Government Mandi (AGMARKNET) Alignment
                      </div>
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <label className="form-label text-muted small">AGMARKNET Commodity Name</label>
                          <input
                            type="text"
                            name="govApiCommodityName"
                            className="form-control form-control-sm"
                            placeholder="e.g. Rice, Wheat, Onion"
                            value={formData.govApiCommodityName}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label className="form-label text-muted small">AGMARKNET Variety Name</label>
                          <input
                            type="text"
                            name="govApiVariety"
                            className="form-control form-control-sm"
                            placeholder="e.g. Common, Medium, Sona"
                            value={formData.govApiVariety}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold small">Description / Storage Notes</label>
                      <textarea
                        name="description"
                        className="form-control"
                        rows="2"
                        placeholder="Warehouse location, moisture specs, packaging notes..."
                        value={formData.description}
                        onChange={handleInputChange}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light px-4 py-3">
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
                    {submitting ? 'Saving Commodity...' : isEditing ? 'Save Changes' : '✓ Save & Create Product'}
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
        title="Delete Commodity Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? All associated inventory records will be affected.`}
        confirmText="Yes, Delete Product"
        cancelText="Cancel"
      />
    </div>
  )
}

export default Products
