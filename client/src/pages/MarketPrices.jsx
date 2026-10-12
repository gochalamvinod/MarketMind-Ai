import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import {
  BsGraphUp,
  BsArrowRepeat,
  BsPlusLg,
  BsClockHistory,
  BsBuilding,
  BsCalendarDate,
  BsInfoCircle,
  BsSearch,
  BsFilter
} from 'react-icons/bs'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts'
import {
  getMarketPrices,
  getLatestPrices,
  getPriceHistory,
  addManualPrice,
  fetchPricesNow,
  getApiStatus,
  getProducts
} from '../services/api'
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DemoBadge from '../components/common/DemoBadge'
import PriceChangeIndicator from '../components/common/PriceChangeIndicator'

/**
 * Market Prices Intelligence Page
 * Monitor external AGMARKNET reference prices vs physical stock cost.
 */
const MarketPrices = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submittingManual, setSubmittingManual] = useState(false)

  // API Status & Logs
  const [apiStatus, setApiStatus] = useState(null)
  const [latestPrices, setLatestPrices] = useState([])
  const [products, setProducts] = useState([])

  // Historical Chart
  const [selectedProductId, setSelectedProductId] = useState('')
  const [historyLogs, setHistoryLogs] = useState([])

  // Manual Modal
  const [showManualModal, setShowManualModal] = useState(false)
  const initialManualForm = {
    productId: '',
    pricePerKg: '',
    market: 'Hyderabad Mandi',
    state: 'Telangana',
    district: 'Hyderabad',
    observationDate: new Date().toISOString().split('T')[0]
  }
  const [manualForm, setManualForm] = useState(initialManualForm)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [statusRes, latestRes, productsRes] = await Promise.all([
        getApiStatus(),
        getLatestPrices(),
        getProducts({})
      ])

      setApiStatus(statusRes?.data || null)
      const fetchedLatest = latestRes?.data?.data || latestRes?.data || []
      setLatestPrices(fetchedLatest)

      const fetchedProducts = productsRes?.data?.data || productsRes?.data || []
      setProducts(fetchedProducts)

      if (fetchedProducts.length > 0) {
        setSelectedProductId((prev) => (prev ? prev : fetchedProducts[0]._id))
      }
    } catch (err) {
      console.error('Error fetching market prices data:', err)
      toast.error('Failed to load market prices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Fetch product price history when selected product changes
  useEffect(() => {
    if (!selectedProductId) return

    const loadHistory = async () => {
      try {
        const res = await getPriceHistory(selectedProductId)
        setHistoryLogs(res?.data?.data || res?.data || [])
      } catch (err) {
        console.error('Error loading price history for product:', err)
      }
    }
    loadHistory()
  }, [selectedProductId])

  // Immediate Fetch Trigger
  const handleFetchNow = async () => {
    try {
      setRefreshing(true)
      const res = await fetchPricesNow()
      toast.success(res?.data?.message || 'Price monitoring cycle completed!')
      await fetchData()
      if (selectedProductId) {
        const histRes = await getPriceHistory(selectedProductId)
        setHistoryLogs(histRes?.data?.data || histRes?.data || [])
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to trigger price check')
    } finally {
      setRefreshing(false)
    }
  }

  // Handle Manual Modal Submit
  const handleSubmitManual = async (e) => {
    e.preventDefault()
    if (!manualForm.productId) {
      toast.error('Please choose a commodity product')
      return
    }

    const price = parseFloat(manualForm.pricePerKg)
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price per kg')
      return
    }

    try {
      setSubmittingManual(true)
      await addManualPrice({
        productId: manualForm.productId,
        pricePerKg: price,
        market: manualForm.market,
        state: manualForm.state,
        district: manualForm.district,
        observationDate: manualForm.observationDate
      })

      toast.success('Manual market price reference added!')
      setShowManualModal(false)
      setManualForm(initialManualForm)
      await fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record manual price')
    } finally {
      setSubmittingManual(false)
    }
  }

  // Recharts Data
  const chartData = useMemo(() => {
    return [...historyLogs].map((item) => ({
      date: formatDate(item.observationDate || item.fetchTime || item.createdAt),
      price: item.pricePerKg,
      market: item.market
    }))
  }, [historyLogs])

  const isDemo = apiStatus ? Boolean(apiStatus.demoMode) : true

  if (loading) {
    return <LoadingSpinner fullPage message="Loading Mandi Market Benchmarks..." />
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="h3 fw-bold text-dark mb-0">Market Prices & Mandi Intelligence</h2>
            <DemoBadge visible={isDemo} />
          </div>
          <p className="text-muted small mb-0 mt-1">
            Official AGMARKNET wholesale reference rates vs. your actual inventory purchase costs
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 shadow-sm"
            onClick={() => setShowManualModal(true)}
          >
            <BsPlusLg />
            <span>Add Manual Price</span>
          </button>
          <button
            className="btn btn-success btn-sm d-flex align-items-center gap-2 shadow-sm"
            onClick={handleFetchNow}
            disabled={refreshing}
          >
            <BsArrowRepeat className={refreshing ? 'spin-animation' : ''} />
            <span>{refreshing ? 'Fetching Prices...' : 'Fetch Mandi Prices Now'}</span>
          </button>
        </div>
      </div>

      {/* API Status Banner */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-3">
              <span className="text-muted small text-uppercase fw-semibold d-block">Data Source</span>
              <strong className="text-dark">
                {isDemo ? '🟡 Simulated AGMARKNET Demo Feed' : '🟢 Official data.gov.in AGMARKNET API'}
              </strong>
            </div>
            <div className="col-12 col-md-3">
              <span className="text-muted small text-uppercase fw-semibold d-block">Market Hub</span>
              <strong className="text-dark">
                {apiStatus?.preferredState || 'Telangana'} ({apiStatus?.preferredMarkets?.join(', ') || 'Hyderabad Mandi'})
              </strong>
            </div>
            <div className="col-12 col-md-3">
              <span className="text-muted small text-uppercase fw-semibold d-block">Check Frequency</span>
              <strong className="text-dark">Every {apiStatus?.interval || '6h'} (node-cron scheduler)</strong>
            </div>
            <div className="col-12 col-md-3">
              <span className="text-muted small text-uppercase fw-semibold d-block">Last Observation Check</span>
              <strong className="text-dark">
                {apiStatus?.lastUpdate ? formatDateTime(apiStatus.lastUpdate) : 'Just Now'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Mandi Observations Table */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-3">
          <h5 className="fw-bold text-dark mb-0">Current Commodity Reference Benchmarks</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle custom-table mb-0">
              <thead>
                <tr>
                  <th className="ps-3">Commodity</th>
                  <th>Variety / Grade</th>
                  <th>Mandi Market</th>
                  <th>Current Ref (₹/kg)</th>
                  <th>Previous Ref (₹/kg)</th>
                  <th>Price Movement</th>
                  <th>Your Stock Cost</th>
                  <th>Your Selling Price</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {latestPrices.length > 0 ? (
                  latestPrices.map((lp) => {
                    const diff = lp.priceChange || 0
                    const pct = lp.percentageChange || 0
                    const isUp = diff > 0
                    const isDown = diff < 0

                    return (
                      <tr
                        key={lp._id}
                        className={isUp ? 'table-danger-subtle' : isDown ? 'table-success-subtle' : ''}
                      >
                        <td className="ps-3">
                          <strong className="text-dark">{lp.commodity || lp.product?.name}</strong>
                        </td>
                        <td className="text-muted small">{lp.variety || 'Standard'}</td>
                        <td className="text-secondary small">{lp.market || 'Hyderabad Yard'}</td>
                        <td>
                          <span className="fw-bold text-dark fs-6">₹{lp.pricePerKg}</span>
                        </td>
                        <td>{lp.previousPrice ? `₹${lp.previousPrice}` : '—'}</td>
                        <td>
                          {diff !== 0 ? (
                            <PriceChangeIndicator change={diff} percentage={pct} />
                          ) : (
                            <span className="text-muted small">No Change</span>
                          )}
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">
                            {(lp.product?.purchaseCost ?? lp.productDetails?.purchaseCost) !== undefined ? formatCurrency(lp.product?.purchaseCost ?? lp.productDetails?.purchaseCost) : '—'}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-light text-primary border">
                            {(lp.product?.sellingPrice ?? lp.productDetails?.sellingPrice) !== undefined ? formatCurrency(lp.product?.sellingPrice ?? lp.productDetails?.sellingPrice) : '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${lp.source === 'DEMO' ? 'bg-warning text-dark' : 'bg-success'}`}>
                            {lp.source}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      No latest price observations recorded yet. Click "Fetch Mandi Prices Now" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historical Trend Chart Section */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <h5 className="fw-bold text-dark mb-0">Mandi Price Trend Timeline</h5>
            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted fw-semibold">Select Commodity:</label>
              <select
                className="form-select form-select-sm"
                style={{ width: '220px' }}
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card-body p-4">
          {chartData.length > 0 ? (
            <div style={{ height: '320px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip formatter={(value) => [`₹${value}/kg`, 'Market Rate']} />
                  <Legend />
                  <Line type="monotone" dataKey="price" name="Mandi Benchmark (₹/kg)" stroke="#123c35" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted text-center py-4 mb-0">
              No historical data points available for this product yet.
            </p>
          )}
        </div>
      </div>

      {/* Mandi vs Wholesale Clarification Footnote */}
      <div className="alert alert-light border shadow-sm rounded-3 p-3 mb-0">
        <div className="d-flex align-items-start gap-2">
          <BsInfoCircle className="text-secondary mt-1 flex-shrink-0" />
          <div className="small text-muted">
            <strong>Important Market Principle:</strong> External market prices reflect government mandi (APMC) modal arrival rates and open wholesale auctions in Hyderabad/Telangana. They serve as intelligence for future purchase negotiations and sales pricing reviews. They never automatically overwrite your existing stock purchase costs or customer retail prices.
          </div>
        </div>
      </div>

      {/* Add Manual Price Modal */}
      {showManualModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-md modal-dialog-centered" style={{ maxHeight: '92vh' }}>
            <div className="modal-content shadow-lg border-0 rounded-3 d-flex flex-column" style={{ maxHeight: '90vh' }}>
              <div className="modal-header border-bottom bg-white" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <h5 className="modal-title fw-bold text-dark">Add Manual Mandi Observation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowManualModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmitManual} className="d-flex flex-column flex-grow-1 overflow-hidden" style={{ minHeight: 0 }}>
                <div className="modal-body p-4" style={{ overflowY: 'auto', flex: '1 1 auto' }}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Commodity Product *</label>
                    <select
                      className="form-select"
                      value={manualForm.productId}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, productId: e.target.value }))}
                      required
                    >
                      <option value="">-- Choose Commodity --</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} (Current Ref: ₹{p.currentReferencePrice || p.purchaseCost}/kg)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Observed Reference Price (₹/kg) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="form-control"
                      placeholder="e.g. 44.50"
                      value={manualForm.pricePerKg}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, pricePerKg: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Mandi Yard / Market</label>
                      <input
                        type="text"
                        className="form-control"
                        value={manualForm.market}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, market: e.target.value }))}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={manualForm.state}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Observation Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={manualForm.observationDate}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, observationDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-top bg-light px-4 py-3" style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary px-3"
                    onClick={() => setShowManualModal(false)}
                    disabled={submittingManual}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary px-4 fw-bold shadow-sm"
                    disabled={submittingManual}
                  >
                    {submittingManual ? 'Saving...' : '✓ Record Benchmark Price'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarketPrices
