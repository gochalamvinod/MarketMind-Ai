import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  BsArrowLeft,
  BsBoxSeam,
  BsGraphUp,
  BsCartPlus,
  BsCashCoin,
  BsLightbulb,
  BsBuilding,
  BsCalendarDate,
  BsClockHistory,
  BsArrowRepeat
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
import { getProductDetails } from '../services/api'
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StockStatus from '../components/common/StockStatus'
import PriceChangeIndicator from '../components/common/PriceChangeIndicator'

/**
 * Product Details Page (/products/:id)
 * Detailed commodity drilldown with stock, cost separation, price history, purchases, and sales.
 */
const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true)
      const res = await getProductDetails(id)
      if (res?.data?.data) {
        setData(res.data.data)
      } else {
        toast.error('Product details not found')
        navigate('/products')
      }
    } catch (err) {
      console.error('Error fetching product details:', err)
      toast.error(err?.response?.data?.message || 'Failed to load product details')
      navigate('/products')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  if (loading) {
    return <LoadingSpinner fullPage message="Loading Commodity Details..." />
  }

  if (!data || !data.product) {
    return (
      <div className="container-fluid py-4 text-center">
        <h4>Product Not Found</h4>
        <Link to="/products" className="btn btn-primary mt-3">Back to Products</Link>
      </div>
    )
  }

  const { product, priceHistory = [], purchases = [], sales = [], analytics = {} } = data

  const currentRef = product.currentReferencePrice || (priceHistory.length > 0 ? priceHistory[0].pricePerKg : null)
  const prevRef = product.previousReferencePrice || (priceHistory.length > 1 ? priceHistory[1].pricePerKg : null)
  const purchaseCost = product.purchaseCost
  const sellingPrice = product.sellingPrice

  let refDiff = 0
  let refPct = 0
  if (currentRef !== null && prevRef !== null && prevRef > 0) {
    refDiff = parseFloat((currentRef - prevRef).toFixed(2))
    refPct = parseFloat((((currentRef - prevRef) / prevRef) * 100).toFixed(2))
  }

  // Format price history for chart
  const chartData = [...priceHistory].reverse().map((p) => ({
    date: formatDate(p.observationDate || p.createdAt),
    price: p.pricePerKg,
    source: p.source
  }))

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Header & Back Action */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <Link to="/products" className="btn btn-outline-secondary btn-sm mb-2 d-inline-flex align-items-center gap-1">
            <BsArrowLeft /> Back to Inventory
          </Link>
          <div className="d-flex align-items-center gap-2">
            <h2 className="h3 fw-bold text-dark mb-0">{product.name}</h2>
            <StockStatus quantity={product.stockQuantity} minLevel={product.minStockLevel} />
          </div>
          <p className="text-muted small mb-0 mt-1">
            Category: <strong className="text-dark">{product.category}</strong> | Variety/Grade: <strong className="text-dark">{product.variety || 'Standard'}</strong> | Unit: <strong className="text-dark">{product.unit}</strong>
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link to="/purchases" className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 shadow-sm">
            <BsCartPlus /> Record Purchase
          </Link>
        </div>
      </div>

      {/* Critical Price Separation Comparison Cards */}
      <div className="row g-3 mb-4">
        {/* Card 1: Actual Inventory Purchase Cost */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 border-start border-4 border-success">
            <div className="card-body p-3">
              <div className="text-muted small text-uppercase fw-semibold mb-1">
                Actual Purchase Cost (Paid)
              </div>
              <h3 className="fw-bold text-dark mb-1">
                {formatCurrency(purchaseCost)} <span className="fs-6 fw-normal text-muted">/{product.unit}</span>
              </h3>
              <p className="text-success small mb-0 fw-medium">
                Weighted-average inventory cost
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Current Selling Price */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 border-start border-4 border-primary">
            <div className="card-body p-3">
              <div className="text-muted small text-uppercase fw-semibold mb-1">
                Current Selling Price
              </div>
              <h3 className="fw-bold text-dark mb-1">
                {formatCurrency(sellingPrice)} <span className="fs-6 fw-normal text-muted">/{product.unit}</span>
              </h3>
              <p className="text-primary small mb-0 fw-medium">
                Current retail customer price
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Current Market Reference Price */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 border-start border-4 border-warning">
            <div className="card-body p-3">
              <div className="text-muted small text-uppercase fw-semibold mb-1">
                Current Market Ref Price
              </div>
              <h3 className="fw-bold text-dark mb-1">
                {currentRef ? `${formatCurrency(currentRef)}` : 'N/A'}{' '}
                <span className="fs-6 fw-normal text-muted">/{product.unit}</span>
              </h3>
              <div className="small mb-0">
                {refDiff !== 0 ? (
                  <PriceChangeIndicator change={refDiff} percentage={refPct} />
                ) : (
                  <span className="text-muted">Observation matches previous</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Previous Reference Price */}
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 border-start border-4 border-secondary">
            <div className="card-body p-3">
              <div className="text-muted small text-uppercase fw-semibold mb-1">
                Previous Market Ref Price
              </div>
              <h3 className="fw-bold text-dark mb-1">
                {prevRef ? `${formatCurrency(prevRef)}` : 'N/A'}{' '}
                <span className="fs-6 fw-normal text-muted">/{product.unit}</span>
              </h3>
              <p className="text-muted small mb-0">
                Source: {product.priceSource || 'AGMARKNET'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Concept Callout Note */}
      <div className="alert alert-info border-info shadow-sm rounded-3 p-3 mb-4">
        <h6 className="fw-bold mb-1">💡 Critical Pricing Principle</h6>
        <p className="small mb-0">
          The <strong>Actual Purchase Cost ({formatCurrency(purchaseCost)})</strong> is what your business paid for existing physical stock, and only updates when new purchases arrive. The <strong>Market Reference Price ({currentRef ? formatCurrency(currentRef) : 'N/A'})</strong> is external mandi intelligence to help you quote sales prices and negotiate future supplier procurements.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-tabs card-header-tabs px-3 pt-2 border-0">
            <li className="nav-item">
              <button
                className={`nav-link border-0 pb-3 fw-semibold ${activeTab === 'overview' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => setActiveTab('overview')}
              >
                <BsLightbulb className="me-1" /> Overview & Recommendations
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link border-0 pb-3 fw-semibold ${activeTab === 'prices' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => setActiveTab('prices')}
              >
                <BsGraphUp className="me-1" /> Mandi Price History ({priceHistory.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link border-0 pb-3 fw-semibold ${activeTab === 'purchases' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => setActiveTab('purchases')}
              >
                <BsCartPlus className="me-1" /> Purchase Batches ({purchases.length})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {/* TAB 1: Overview & Pricing Suggestions */}
          {activeTab === 'overview' && (
            <div>
              <div className="row g-4">
                <div className="col-12 col-lg-7">
                  <h6 className="fw-bold mb-3 text-dark">External Market Reference Trend (₹/{product.unit})</h6>
                  {chartData.length > 0 ? (
                    <div style={{ height: '300px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                          <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                          <Tooltip formatter={(value) => [`₹${value}/${product.unit}`, 'Mandi Price']} />
                          <Legend />
                          <Line type="monotone" dataKey="price" name="Mandi Price (₹/kg)" stroke="#198754" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="p-5 text-center text-muted bg-light rounded-3">
                      No historical mandi price observations recorded yet.
                    </div>
                  )}
                </div>

                <div className="col-12 col-lg-5">
                  <h6 className="fw-bold mb-3 text-dark">Pricing & Margin Suggestions</h6>
                  <div className="list-group shadow-sm">
                    <div className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-dark">10% Target Margin Recommendation</span>
                        <span className="badge bg-primary fs-6">{formatCurrency(analytics.suggestedPrice10 || 0)}</span>
                      </div>
                      <p className="small text-muted mb-0">
                        Formula: Cost ÷ (1 - 0.10). Suggested selling price to maintain a 10% gross profit margin.
                      </p>
                    </div>
                    <div className="list-group-item p-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-dark">15% Target Margin Recommendation</span>
                        <span className="badge bg-success fs-6">{formatCurrency(analytics.suggestedPrice15 || 0)}</span>
                      </div>
                      <p className="small text-muted mb-0">
                        Formula: Cost ÷ (1 - 0.15). Suggested selling price for premium seasonal margin.
                      </p>
                    </div>
                    <div className="list-group-item p-3">
                      <span className="fw-bold text-dark d-block mb-1">Physical Stock Level</span>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small">Current Inventory:</span>
                        <strong>{product.stockQuantity} {product.unit}</strong>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small">Minimum Stock Threshold:</span>
                        <span>{product.minStockLevel} {product.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Market Price History Table */}
          {activeTab === 'prices' && (
            <div>
              <h6 className="fw-bold mb-3 text-dark">Chronological Mandi Price Observations</h6>
              {priceHistory.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle custom-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Market Location</th>
                        <th>Observed Price</th>
                        <th>Previous Price</th>
                        <th>Movement</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceHistory.map((ph, idx) => (
                        <tr key={ph._id || idx}>
                          <td>{formatDateTime(ph.observationDate || ph.createdAt)}</td>
                          <td>{ph.market || 'Telangana Mandi'}</td>
                          <td><strong>₹{ph.pricePerKg}</strong> /{ph.unit || 'kg'}</td>
                          <td>{ph.previousPrice ? `₹${ph.previousPrice}` : '—'}</td>
                          <td>
                            {ph.priceChange ? (
                              <PriceChangeIndicator change={ph.priceChange} percentage={ph.percentageChange} />
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${ph.source === 'DEMO' ? 'bg-warning text-dark' : 'bg-success'}`}>
                              {ph.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center py-4">No price observations recorded.</p>
              )}
            </div>
          )}

          {/* TAB 3: Purchases Table */}
          {activeTab === 'purchases' && (
            <div>
              <h6 className="fw-bold mb-3 text-dark">Recorded Purchase Batches</h6>
              {purchases.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle custom-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Batch Qty</th>
                        <th>Unit Purchase Cost</th>
                        <th>Total Amount</th>
                        <th>Invoice / Ref</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchases.map((pc, idx) => (
                        <tr key={pc._id || idx}>
                          <td>{formatDate(pc.purchaseDate || pc.createdAt)}</td>
                          <td><strong>{pc.quantity}</strong> {pc.unit}</td>
                          <td>{formatCurrency(pc.unitCost)}</td>
                          <td><strong>{formatCurrency(pc.totalAmount)}</strong></td>
                          <td><span className="text-muted font-monospace">{pc.invoiceNumber || '—'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center py-4">No purchase batches recorded for this commodity.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
