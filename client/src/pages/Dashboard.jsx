import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  BsBoxSeam,
  BsCashStack,
  BsCartCheck,
  BsGraphUpArrow,
  BsClockHistory,
  BsExclamationTriangle,
  BsBell,
  BsArrowRight,
  BsArrowRepeat,
  BsCheckCircle,
  BsExclamationCircle,
  BsPlusLg,
  BsCartPlus,
  BsCashCoin,
  BsLightningCharge
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
import { getDashboard, fetchPricesNow, seedDemoData } from '../services/api'
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StockStatus from '../components/common/StockStatus'
import PriceChangeIndicator from '../components/common/PriceChangeIndicator'

/**
 * Dashboard Page
 * Primary overview showing KPIs, recent transactions, stock status, mandi price movements, and trends.
 */
const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await getDashboard()
      const payload = response?.data?.data || response?.data || {}
      setDashboardData(payload)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard overview')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setSeeding(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleRefreshPrices = async () => {
    try {
      setRefreshing(true)
      const res = await fetchPricesNow()
      toast.success(res?.data?.message || 'Market prices updated successfully!')
      await fetchDashboardData()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to fetch latest mandi prices')
      setRefreshing(false)
    }
  }

  const handleSeedDemoData = async () => {
    try {
      setSeeding(true)
      const res = await seedDemoData()
      toast.success(res?.data?.message || 'Preloaded 30 grocery commodities!')
      await fetchDashboardData()
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to seed demo data')
      setSeeding(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage message="Loading MarketMind AI Dashboard..." />
  }

  const kpis = dashboardData?.kpis || {
    totalProducts: dashboardData?.totalProducts || 0,
    totalStockValue: dashboardData?.totalStockValue || 0,
    todaySales: dashboardData?.todaySales || 0,
    todayProfit: dashboardData?.todayProfit || 0
  }

  const isDemo = dashboardData?.isDemo ?? dashboardData?.demoMode ?? true
  const lastUpdate = dashboardData?.lastPriceUpdate || dashboardData?.lastUpdated
  const recentSales = dashboardData?.recentSales || []
  const recentPurchases = dashboardData?.recentPurchases || []
  const lowStockProducts = dashboardData?.lowStockProducts || []
  const marketOverview = dashboardData?.priceChangeSummary || dashboardData?.latestPrices || dashboardData?.marketPrices || dashboardData?.marketOverview || []
  const recentAlerts = dashboardData?.recentAlerts || dashboardData?.alerts || []
  const priceTrends = dashboardData?.priceTrends || dashboardData?.priceHistory || []

  // Palette for chart lines
  const lineColors = ['#0d6efd', '#198754', '#fd7e14', '#6f42c1', '#0dcaf0']

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Title & Actions Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="h3 fw-bold text-dark mb-0">Dashboard</h2>
          </div>
          <p className="text-muted small mb-0 mt-1">
            Real-time wholesale operations & mandi reference tracking
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {lastUpdate && (
            <div className="d-none d-md-flex align-items-center text-muted small me-2">
              <BsClockHistory className="me-1" />
              <span>Prices as of: {formatDateTime(lastUpdate)}</span>
            </div>
          )}
          <Link to="/products" className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm">
            <BsPlusLg size={13} />
            <span>Add Product</span>
          </Link>
          <button
            className="btn btn-outline-success btn-sm d-flex align-items-center gap-1 shadow-sm"
            onClick={handleRefreshPrices}
            disabled={refreshing}
          >
            <BsArrowRepeat className={refreshing ? 'spin-animation' : ''} />
            <span>{refreshing ? 'Updating Prices...' : 'Fetch Mandi Prices'}</span>
          </button>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="card border-0 shadow-sm rounded-3 mb-4 p-3 bg-white">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="text-muted small fw-bold text-uppercase me-2">Quick Actions:</span>
            <Link to="/products" className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1">
              <BsBoxSeam size={14} className="text-primary" />
              <span>Manage Products</span>
            </Link>
            <Link to="/purchases" className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1">
              <BsCartPlus size={14} className="text-success" />
              <span>Record Purchase</span>
            </Link>
            <Link to="/market-prices" className="btn btn-sm btn-outline-dark d-flex align-items-center gap-1">
              <BsGraphUpArrow size={14} className="text-info" />
              <span>Market Prices</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Clean Empty State Banner if no products */}
      {kpis.totalProducts === 0 && (
        <div className="alert alert-light border shadow-2xs rounded-3 d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <h6 className="fw-bold mb-1 text-dark">Your Commodity Catalog is Empty</h6>
            <p className="small mb-0 text-muted">
              No products exist in your inventory yet. Add your first commodity to start tracking stock and mandi rates.
            </p>
          </div>
          <Link to="/products" className="btn btn-primary btn-sm fw-semibold">
            + Add Your First Product
          </Link>
        </div>
      )}

      {/* Row 1: KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 border-start border-4 border-primary">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small text-uppercase fw-semibold mb-1">
                    Total Products
                  </div>
                  <h3 className="fw-bold text-dark mb-0">{kpis.totalProducts}</h3>
                </div>
                <div className="bg-primary-subtle text-primary p-3 rounded-circle">
                  <BsBoxSeam size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 border-start border-4 border-success">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small text-uppercase fw-semibold mb-1">
                    Total Stock Value
                  </div>
                  <h3 className="fw-bold text-dark mb-0">
                    {formatCurrency(kpis.totalStockValue)}
                  </h3>
                </div>
                <div className="bg-success-subtle text-success p-3 rounded-circle">
                  <BsCashStack size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 border-start border-4 border-warning">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small text-uppercase fw-semibold mb-1">
                    Low Stock Items
                  </div>
                  <h3 className="fw-bold text-dark mb-0">
                    {lowStockProducts.length}
                  </h3>
                </div>
                <div className="bg-warning-subtle text-warning p-3 rounded-circle">
                  <BsExclamationTriangle size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm rounded-3 h-100 border-start border-4 border-info">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-muted small text-uppercase fw-semibold mb-1">
                    Mandi Benchmark
                  </div>
                  <h3 className="fw-bold text-dark mb-0" style={{ fontSize: '1.25rem' }}>
                    Telangana APMC
                  </h3>
                </div>
                <div className="bg-info-subtle text-info p-3 rounded-circle">
                  <BsGraphUpArrow size={22} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Recent Purchases */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-3 h-100">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark">Recent Purchases</h5>
              <Link to="/purchases" className="text-primary text-decoration-none small fw-semibold">
                View All <BsArrowRight />
              </Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Date</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Cost</th>
                      <th className="pe-3">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPurchases.length > 0 ? (
                      recentPurchases.slice(0, 5).map((item, idx) => (
                        <tr key={item._id || idx}>
                          <td className="ps-3 text-muted small">{formatDate(item.purchaseDate || item.createdAt)}</td>
                          <td className="fw-semibold text-dark">
                            {item.product?.name || item.productName || 'Agri Commodity'}
                          </td>
                          <td>
                            {item.quantity} <span className="small text-muted">{item.unit || item.product?.unit || 'kg'}</span>
                          </td>
                          <td className="text-muted small">
                            {formatCurrency(item.unitCost || (item.totalCost && item.quantity ? item.totalCost / item.quantity : 0))}
                          </td>
                          <td className="pe-3 fw-medium">
                            {formatCurrency(item.totalCost || item.totalAmount || 0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center py-4 text-muted">
                          No recent purchases recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Low Stock Products */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <BsExclamationTriangle className="text-warning" size={18} />
                <h5 className="fw-bold mb-0 text-dark">Low Stock Alerts</h5>
              </div>
              <Link to="/products" className="text-primary text-decoration-none small fw-semibold">
                Manage Inventory <BsArrowRight />
              </Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Product Name</th>
                      <th>Category</th>
                      <th>Current Stock</th>
                      <th>Threshold Level</th>
                      <th>Status</th>
                      <th className="pe-3 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.length > 0 ? (
                      lowStockProducts.map((p) => (
                        <tr key={p._id}>
                          <td className="ps-3 fw-semibold text-dark">{p.name}</td>
                          <td>
                            <span className="badge bg-light text-secondary border">
                              {p.category || 'General'}
                            </span>
                          </td>
                          <td className="fw-bold text-danger">
                            {p.stockQuantity} {p.unit}
                          </td>
                          <td className="text-muted">
                            {p.minStockLevel || 10} {p.unit}
                          </td>
                          <td>
                            <StockStatus
                              quantity={p.stockQuantity}
                              minLevel={p.minStockLevel || 10}
                            />
                          </td>
                          <td className="pe-3 text-end">
                            <Link
                              to="/purchases"
                              className="btn btn-sm btn-outline-primary py-1 px-2"
                            >
                              Restock Now
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          <BsCheckCircle className="text-success me-2" />
                          All products are well above minimum inventory levels!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Market Price Overview */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0 text-dark">Mandi Reference Price Overview</h5>
                <small className="text-muted">
                  Live benchmark prices vs your wholesale purchase costs
                </small>
              </div>
              <Link to="/market-prices" className="text-primary text-decoration-none small fw-semibold">
                Full Market Monitor <BsArrowRight />
              </Link>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Commodity / Variety</th>
                      <th>Market / Mandi</th>
                      <th>Latest Mandi Price (₹/kg)</th>
                      <th>Change</th>
                      <th>Your Unit Cost (₹/kg)</th>
                      <th>Your Selling Price (₹/kg)</th>
                      <th className="pe-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketOverview.length > 0 ? (
                      marketOverview.map((item, idx) => (
                        <tr key={item._id || idx}>
                          <td className="ps-3">
                            <div className="fw-semibold text-dark">
                              {item.productName || item.product?.name || item.commodityName || item.name}
                            </div>
                            <small className="text-muted">{item.variety || 'Standard'}</small>
                          </td>
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary">
                              {item.market || item.marketName || 'Hyderabad'}
                            </span>
                          </td>
                          <td className="fw-bold text-dark">
                            {formatCurrency(item.currentReferencePrice || item.pricePerKg || item.price || item.currentPrice || 0)}
                          </td>
                          <td>
                            <PriceChangeIndicator
                              change={item.difference !== undefined ? item.difference : (item.priceChange || item.change || 0)}
                              percentage={item.percentageChange !== undefined ? item.percentageChange : (item.priceChangePercent || item.changePercent || 0)}
                            />
                          </td>
                          <td className="text-muted">
                            {formatCurrency(item.product?.purchaseCost || item.purchaseCost || 0)}
                          </td>
                          <td className="text-muted">
                            {formatCurrency(item.product?.sellingPrice || item.sellingPrice || 0)}
                          </td>
                          <td className="pe-3 text-muted small">
                            {formatDate(item.observationDate || item.lastPriceUpdate || item.date || item.updatedAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">
                          No mandi prices tracked yet. Click "Refresh Prices" or link commodities.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 5: Recent Alerts */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <BsBell className="text-primary" size={18} />
                <h5 className="fw-bold mb-0 text-dark">Recent Alerts</h5>
              </div>
              <Link to="/alerts" className="text-primary text-decoration-none small fw-semibold">
                View All Alerts <BsArrowRight />
              </Link>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {recentAlerts.length > 0 ? (
                  recentAlerts.slice(0, 5).map((alert, idx) => {
                    const isPriceUp = alert.type === 'PRICE_INCREASE' || alert.type?.includes('INCREASE')
                    const isPriceDown = alert.type === 'PRICE_DECREASE' || alert.type?.includes('DECREASE')
                    const isLowStock = alert.type === 'LOW_STOCK' || alert.type?.includes('STOCK')

                    return (
                      <div
                        key={alert._id || idx}
                        className={`list-group-item px-3 py-3 d-flex align-items-start gap-3 ${
                          !alert.isRead ? 'bg-primary-subtle bg-opacity-25' : ''
                        }`}
                      >
                        <div className="pt-1">
                          {isPriceUp && <BsGraphUpArrow className="text-danger" size={18} />}
                          {isPriceDown && <BsGraphUpArrow className="text-success" style={{ transform: 'scaleY(-1)' }} size={18} />}
                          {isLowStock && <BsExclamationCircle className="text-warning" size={18} />}
                          {!isPriceUp && !isPriceDown && !isLowStock && (
                            <BsBell className="text-primary" size={18} />
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className={`small ${!alert.isRead ? 'fw-bold text-dark' : 'fw-semibold text-secondary'}`}>
                              {alert.title || 'Market Update'}
                            </span>
                            <span className="text-muted small">
                              {formatDateTime(alert.createdAt || alert.date)}
                            </span>
                          </div>
                          <p className="mb-0 text-muted small">{alert.message}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-4 text-muted">
                    No active notifications or alerts.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 6: Price Trend Chart */}
      <div className="row g-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-3">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0 text-dark">Top Mandi Commodity Price Trends</h5>
                <small className="text-muted">
                  Daily modal prices (₹/kg) across recent market recordings
                </small>
              </div>
              <Link to="/ai-copilot?tab=insights" className="text-primary text-decoration-none small fw-semibold">
                AI Forecast & Intelligence <BsArrowRight />
              </Link>
            </div>
            <div className="card-body p-3">
              {priceTrends && priceTrends.length > 0 ? (
                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer>
                    <LineChart data={priceTrends} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9ecef" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6c757d" />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#6c757d"
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Tooltip
                        formatter={(val) => [`₹${Number(val).toFixed(2)} / kg`, 'Price']}
                        labelFormatter={(lbl) => `Date: ${lbl}`}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #dee2e6'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      {Object.keys(priceTrends[0] || {})
                        .filter((k) => k !== 'date' && k !== '_id')
                        .map((key, i) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={key}
                            stroke={lineColors[i % lineColors.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 6 }}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <p className="mb-0">
                    Sufficient historical mandi data is being compiled. Continue tracking prices to view trend charts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
