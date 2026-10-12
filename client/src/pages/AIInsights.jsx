import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import {
  BsRobot,
  BsLightbulb,
  BsGraphUp,
  BsExclamationTriangle,
  BsCartPlus,
  BsCashCoin,
  BsArrowRight,
  BsCpu,
  BsShieldCheck
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
  getAIInsights,
  getProductAnalysis,
  getForecast,
  getRecommendations,
  getProducts
} from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'

/**
 * AI Insights Page
 * Gemini 2.0 Flash market analysis with deterministic rule engine fallback.
 */
const AIInsights = ({ isEmbedded = false }) => {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])

  // State for AI endpoints
  const [marketInsights, setMarketInsights] = useState(null)
  const [recommendations, setRecommendations] = useState(null)

  // Product analysis & forecast state
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productAnalysis, setProductAnalysis] = useState(null)
  const [productForecast, setProductForecast] = useState(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true)
      const [productsRes, insightsRes, recsRes] = await Promise.all([
        getProducts({}),
        getAIInsights(),
        getRecommendations()
      ])

      const fetchedProds = productsRes?.data?.data || productsRes?.data || []
      setProducts(fetchedProds)
      setMarketInsights(insightsRes?.data || null)
      setRecommendations(recsRes?.data?.data || null)

      if (fetchedProds.length > 0) {
        setSelectedProductId(fetchedProds[0]._id)
      }
    } catch (err) {
      console.error('Error fetching AI insights:', err)
      toast.error('Unable to load AI intelligence data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  // Fetch product-specific analysis and forecast when selected product changes
  useEffect(() => {
    if (!selectedProductId) return

    const loadProductData = async () => {
      try {
        setLoadingAnalysis(true)
        const [analysisRes, forecastRes] = await Promise.all([
          getProductAnalysis(selectedProductId),
          getForecast(selectedProductId)
        ])
        setProductAnalysis(analysisRes?.data?.data || null)
        setProductForecast(forecastRes?.data?.data || null)
      } catch (err) {
        console.error('Error loading product AI analysis:', err)
      } finally {
        setLoadingAnalysis(false)
      }
    }

    loadProductData()
  }, [selectedProductId])

  if (loading) {
    return <LoadingSpinner fullPage message="Consulting MarketMind AI Intelligence Engine..." />
  }

  const isAiPowered = marketInsights?.source === 'AI'

  // Format historical chart data
  const historyData = productAnalysis?.history
    ? [...productAnalysis.history].reverse().map((h) => ({
        date: formatDate(h.observationDate || h.createdAt),
        price: h.pricePerKg
      }))
    : []

  return (
    <div className={isEmbedded ? '' : 'container-fluid py-4 px-3 px-md-4'}>
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="h3 fw-bold text-dark mb-0">AI Market Intelligence & Forecasting</h2>
            <span className={`badge ${isAiPowered ? 'bg-success' : 'bg-primary-subtle text-primary border border-primary-subtle'}`}>
              <BsCpu className="me-1" />
              {isAiPowered ? 'Gemini 3.8 Flash Active' : 'Deterministic Rule Engine Active'}
            </span>
          </div>
          <p className="text-muted small mb-0 mt-1">
            Predictive trend forecasts, cost margin protection, and automated procurement signals
          </p>
        </div>
      </div>

      {/* Market Overview Card */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <BsRobot className="text-primary fs-5" />
              <h5 className="fw-bold text-dark mb-0">Executive Market Overview</h5>
            </div>
            <span className="badge bg-light text-secondary border">
              Source: {marketInsights?.model || 'Rule Engine'}
            </span>
          </div>
        </div>
        <div className="card-body p-4">
          {loading ? (
            <div className="py-4 text-center text-muted">
              <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
              Synthesizing multi-mandi intelligence...
            </div>
          ) : (
            <div className="row g-4 align-items-center">
              <div className="col-12 col-lg-8">
                <div className="p-3 bg-light rounded-3 border">
                  <p className="lead fs-6 text-dark mb-0" style={{ whiteSpace: 'pre-line', lineHeight: '1.7' }}>
                    {marketInsights?.insights || 'Commodity prices are generally stable across major Hyderabad wholesale yards.'}
                  </p>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="list-group shadow-sm">
                  <div className="list-group-item d-flex justify-content-between align-items-center p-3">
                    <span className="text-muted small">Overall Trajectory:</span>
                    <strong className="text-dark">{marketInsights?.stats?.marketStatus || 'Stable'}</strong>
                  </div>
                  <div className="list-group-item d-flex justify-content-between align-items-center p-3">
                    <span className="text-muted small">Rising Mandi Commodities:</span>
                    <span className="badge bg-danger-subtle text-danger fs-6">{marketInsights?.stats?.risingCount || 0}</span>
                  </div>
                  <div className="list-group-item d-flex justify-content-between align-items-center p-3">
                    <span className="text-muted small">Softening Commodities:</span>
                    <span className="badge bg-success-subtle text-success fs-6">{marketInsights?.stats?.fallingCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Commodity Deep-Dive & Price Forecasting Section */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <BsGraphUp className="text-success fs-5" />
              <h5 className="fw-bold text-dark mb-0">Commodity Analysis & Short-Term Forecast</h5>
            </div>
            {products.length > 0 && (
              <div className="d-flex align-items-center gap-2">
                <label className="small text-muted fw-semibold">Analyze Commodity:</label>
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
            )}
          </div>
        </div>

        <div className="card-body p-4">
          {products.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <BsBoxSeam size={32} className="text-secondary mb-2 d-block mx-auto" />
              <h6 className="text-dark fw-bold mb-1">Catalog Empty</h6>
              <p className="small mb-0">Add products to your store catalog to enable AI price forecasts, margin projections, and trend analysis.</p>
            </div>
          ) : loadingAnalysis ? (
            <LoadingSpinner message="Calculating statistical momentum..." />
          ) : (
            <div className="row g-4">
              {/* Left Column: Historical Chart */}
              <div className="col-12 col-lg-7">
                <h6 className="fw-bold mb-3 text-dark">Price History (₹/kg)</h6>
                {historyData.length > 0 ? (
                  <div style={{ height: '280px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                        <Tooltip formatter={(value) => [`₹${value}/kg`, 'Mandi Price']} />
                        <Line type="monotone" dataKey="price" stroke="#123c35" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="p-4 bg-light rounded text-center text-muted">
                    No historical observations recorded.
                  </div>
                )}

                {/* Key Statistics Bar */}
                {productAnalysis?.stats && (
                  <div className="row g-2 mt-3 text-center">
                    <div className="col-3">
                      <div className="border rounded p-2 bg-light">
                        <span className="small text-muted d-block">Average Price</span>
                        <strong>₹{productAnalysis.stats.avgPrice}</strong>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="border rounded p-2 bg-light">
                        <span className="small text-muted d-block">Min Price</span>
                        <strong>₹{productAnalysis.stats.minPrice}</strong>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="border rounded p-2 bg-light">
                        <span className="small text-muted d-block">Max Price</span>
                        <strong>₹{productAnalysis.stats.maxPrice}</strong>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="border rounded p-2 bg-light">
                        <span className="small text-muted d-block">Volatility</span>
                        <strong className="text-secondary">{productAnalysis.stats.volatility}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: AI Analysis & Forecast Callout */}
              <div className="col-12 col-lg-5">
                <h6 className="fw-bold mb-3 text-dark">AI Intelligence Breakdown</h6>
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <p className="small mb-0 text-dark" style={{ lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {productAnalysis?.analysis || 'Historical pricing aligns with regional harvest cycles.'}
                  </p>
                </div>

                {/* Forecast Box */}
                {productForecast && (
                  <div className="border border-warning rounded-3 p-3 bg-warning-subtle">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="badge bg-warning text-dark fw-bold">7-14 Day Price Forecast</span>
                      <span className="small text-muted">Horizon: {productForecast.horizon}</span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="text-dark small">Current Rate: <strong>₹{productForecast.currentPrice}/kg</strong></span>
                      <span className="text-dark small">Projected Rate: <strong className="fs-6 text-primary">₹{productForecast.estimatedPrice}/kg</strong></span>
                    </div>
                    <p className="small text-dark mb-2" style={{ lineHeight: '1.5' }}>
                      {productForecast.explanation}
                    </p>
                    <div className="d-flex align-items-center gap-1 text-danger small fw-semibold">
                      <BsExclamationTriangle />
                      <span style={{ fontSize: '0.75rem' }}>
                        ESTIMATE ONLY: Wholesale prices depend on unseasonal rains, APMC mandi arrivals, and fuel freight.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actionable Recommendations Section */}
      <div className="row g-4">
        {/* Buy Signals */}
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-white border-bottom p-3">
              <div className="d-flex align-items-center gap-2">
                <BsCartPlus className="text-success fs-5" />
                <h5 className="fw-bold text-dark mb-0">Restocking & Procurement Signals</h5>
              </div>
            </div>
            <div className="card-body p-3">
              {recommendations?.buyOpportunities?.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recommendations.buyOpportunities.map((item, idx) => (
                    <div key={idx} className="list-group-item px-0 py-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="text-dark">{item.name}</strong>
                        <span className="badge bg-success-subtle text-success border border-success-subtle">
                          Dropped {item.dropPercent}
                        </span>
                      </div>
                      <p className="small text-muted mb-1">{item.reason}</p>
                      <div className="small text-secondary">
                        Recorded Cost: ₹{item.currentCost} | Current Market: <strong>₹{item.marketPrice}</strong> | Stock: {item.stockQuantity} kg
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4 mb-0">
                  No sudden mandi price dips detected for procurement restock.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Repricing Signals */}
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-white border-bottom p-3">
              <div className="d-flex align-items-center gap-2">
                <BsCashCoin className="text-primary fs-5" />
                <h5 className="fw-bold text-dark mb-0">Selling Price Margin Protection</h5>
              </div>
            </div>
            <div className="card-body p-3">
              {recommendations?.repriceRecommendations?.length > 0 ? (
                <div className="list-group list-group-flush">
                  {recommendations.repriceRecommendations.map((item, idx) => (
                    <div key={idx} className="list-group-item px-0 py-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="text-dark">{item.name}</strong>
                        <span className="badge bg-primary">Suggested: ₹{item.suggestedPrice}</span>
                      </div>
                      <p className="small text-muted mb-1">{item.reason}</p>
                      <div className="small text-secondary">
                        Your Cost: ₹{item.currentCost} | Market: ₹{item.marketPrice} | Current Selling: <strong>₹{item.currentSellingPrice}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-center py-4 mb-0">
                  Current selling prices comfortably cover replacement wholesale procurement costs.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIInsights
