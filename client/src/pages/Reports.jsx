import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import {
  BsFileEarmarkText,
  BsDownload,
  BsSearch,
  BsCalendarDate,
  BsBoxSeam,
  BsCashCoin,
  BsCartPlus,
  BsGraphUp,
  BsBarChartLine,
  BsInfoCircle
} from 'react-icons/bs'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts'
import {
  getInventoryReport,
  getPurchaseReport,
  getSalesReport,
  getProfitReport,
  getPriceHistoryReport,
  exportCsv,
  getProducts
} from '../services/api'
import { formatCurrency, formatDate } from '../utils/helpers'
import LoadingSpinner from '../components/common/LoadingSpinner'
import StockStatus from '../components/common/StockStatus'

/**
 * Reports Page
 * Comprehensive inventory valuation, procurement, sales, profit breakdown, and price history with CSV export.
 */
const Reports = () => {
  const [activeTab, setActiveTab] = useState('inventory') // 'inventory', 'purchases', 'sales', 'profit', 'price-history'
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [productsList, setProductsList] = useState([])

  // Reports Data
  const [inventoryData, setInventoryData] = useState([])
  const [purchaseData, setPurchaseData] = useState([])
  const [salesData, setSalesData] = useState([])
  const [profitData, setProfitData] = useState([])
  const [priceHistoryData, setPriceHistoryData] = useState([])

  // Load product list for filters
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await getProducts({})
        setProductsList(res?.data?.data || res?.data || [])
      } catch (e) {}
    }
    loadProducts()
  }, [])

  // Fetch report data according to active tab
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (selectedProductId) params.productId = selectedProductId

      if (activeTab === 'inventory') {
        const res = await getInventoryReport(params)
        setInventoryData(res?.data?.data || res?.data || [])
      } else if (activeTab === 'purchases') {
        const res = await getPurchaseReport(params)
        setPurchaseData(res?.data?.data || res?.data || [])
      } else if (activeTab === 'sales') {
        const res = await getSalesReport(params)
        setSalesData(res?.data?.data || res?.data || [])
      } else if (activeTab === 'profit') {
        const res = await getProfitReport(params)
        setProfitData(res?.data?.data || res?.data || [])
      } else if (activeTab === 'price-history') {
        const res = await getPriceHistoryReport(params)
        setPriceHistoryData(res?.data?.data || res?.data || [])
      }
    } catch (err) {
      console.error('Error fetching report:', err)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [activeTab, startDate, endDate, selectedProductId])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // CSV Export Handler
  const handleExportCsv = async () => {
    try {
      setExporting(true)
      const params = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (selectedProductId) params.productId = selectedProductId

      const response = await exportCsv(activeTab, params)

      // Trigger browser download
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `marketmind_${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Report exported to CSV successfully!')
    } catch (err) {
      console.error('Error exporting CSV:', err)
      toast.error('Failed to export CSV report')
    } finally {
      setExporting(false)
    }
  }

  // Inventory Totals
  const totalStockVal = useMemo(() => {
    return inventoryData.reduce((sum, item) => sum + (item.totalStockValue || (item.stockQuantity * item.purchaseCost)), 0)
  }, [inventoryData])

  // Purchase Totals
  const purchaseTotals = useMemo(() => {
    const totalAmount = purchaseData.reduce((sum, item) => sum + (item.totalAmount || 0), 0)
    const totalQty = purchaseData.reduce((sum, item) => sum + (item.quantity || 0), 0)
    return { totalAmount, totalQty }
  }, [purchaseData])

  // Sales Totals
  const salesTotals = useMemo(() => {
    const rev = salesData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0)
    const profit = salesData.reduce((sum, item) => sum + (item.grossProfit || 0), 0)
    const cogs = salesData.reduce((sum, item) => sum + (item.costOfGoodsSold || 0), 0)
    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : 0
    return { rev, profit, cogs, margin }
  }, [salesData])

  // Profit Chart Data
  const profitChartData = useMemo(() => {
    return profitData.slice(0, 10).map((p) => ({
      name: p.productName || p.product?.name || 'Item',
      profit: p.grossProfit || 0,
      revenue: p.totalRevenue || 0
    }))
  }, [profitData])

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="h3 fw-bold text-dark mb-0">Analytics & Business Reports</h2>
          <p className="text-muted small mb-0 mt-1">
            Persisted ledger valuation, cost-of-goods breakdown, and exportable financial reports
          </p>
        </div>

        <button
          className="btn btn-outline-success btn-sm d-flex align-items-center gap-2 shadow-sm"
          onClick={handleExportCsv}
          disabled={exporting}
        >
          <BsDownload />
          <span>{exporting ? 'Generating CSV...' : `Export ${activeTab.toUpperCase()} to CSV`}</span>
        </button>
      </div>

      {/* Report Type Navigation Tabs */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-tabs card-header-tabs px-3 pt-2 border-0">
            <li className="nav-item">
              <button
                className={`nav-link border-0 pb-3 fw-semibold ${activeTab === 'inventory' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => setActiveTab('inventory')}
              >
                <BsBoxSeam className="me-1" /> Inventory Valuation
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link border-0 pb-3 fw-semibold ${activeTab === 'purchases' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => setActiveTab('purchases')}
              >
                <BsCartPlus className="me-1" /> Procurement Log
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link border-0 pb-3 fw-semibold ${activeTab === 'price-history' ? 'active text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => setActiveTab('price-history')}
              >
                <BsGraphUp className="me-1" /> Mandi Price History
              </button>
            </li>
          </ul>
        </div>

        {/* Filters Toolbar */}
        <div className="card-body p-3 bg-light border-bottom">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-muted fw-bold">Date Range:</span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: '150px' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="From"
              />
              <span className="text-muted small">to</span>
              <input
                type="date"
                className="form-control form-control-sm"
                style={{ width: '150px' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="To"
              />
              {(startDate || endDate) && (
                <button
                  className="btn btn-sm btn-link text-decoration-none p-0 text-muted"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                >
                  Clear dates
                </button>
              )}
            </div>

            {activeTab === 'price-history' && (
              <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-bold">Commodity:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: '200px' }}
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">All Commodities</option>
                  {productsList.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="card-body p-0">
          {loading ? (
            <div className="p-5 text-center">
              <LoadingSpinner message="Querying persisted database records..." />
            </div>
          ) : (
            <div>
              {/* TAB 1: Inventory Valuation */}
              {activeTab === 'inventory' && (
                <div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle custom-table mb-0">
                      <thead>
                        <tr>
                          <th className="ps-3">Commodity Product</th>
                          <th>Category</th>
                          <th>Stock Quantity</th>
                          <th>Unit Cost (₹)</th>
                          <th>Selling Price (₹)</th>
                          <th>Total Valuation (₹)</th>
                          <th>Stock Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryData.map((item) => (
                          <tr key={item._id}>
                            <td className="ps-3">
                              <strong>{item.name}</strong>
                              <span className="d-block text-muted small">{item.variety || 'Standard'}</span>
                            </td>
                            <td><span className="badge bg-light text-dark border">{item.category}</span></td>
                            <td><strong>{item.stockQuantity}</strong> {item.unit}</td>
                            <td>{formatCurrency(item.purchaseCost)}</td>
                            <td className="text-primary">{formatCurrency(item.sellingPrice)}</td>
                            <td className="fw-bold text-dark">
                              {formatCurrency(item.totalStockValue || (item.stockQuantity * item.purchaseCost))}
                            </td>
                            <td>
                              <StockStatus quantity={item.stockQuantity} minLevel={item.minStockLevel || 10} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-light">
                          <td colSpan="5" className="ps-3 fw-bold text-dark">
                            Total Inventory Valuation:
                          </td>
                          <td colSpan="2" className="fw-bold fs-5 text-success">
                            {formatCurrency(totalStockVal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Purchase Report */}
              {activeTab === 'purchases' && (
                <div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle custom-table mb-0">
                      <thead>
                        <tr>
                          <th className="ps-3">Date</th>
                          <th>Commodity</th>
                          <th>Batch Quantity</th>
                          <th>Unit Cost (₹)</th>
                          <th>Total Amount (₹)</th>
                          <th>Bill Ref</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseData.map((p) => (
                          <tr key={p._id}>
                            <td className="ps-3">{formatDate(p.purchaseDate || p.createdAt)}</td>
                            <td><strong>{p.product?.name || 'Commodity'}</strong></td>
                            <td><strong>{p.quantity}</strong> {p.unit}</td>
                            <td>{formatCurrency(p.unitCost)}</td>
                            <td className="fw-bold text-dark">{formatCurrency(p.totalAmount)}</td>
                            <td><span className="font-monospace text-muted small">{p.invoiceNumber || '—'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-light">
                          <td colSpan="4" className="ps-3 fw-bold text-dark">Total Procurement Outflow:</td>
                          <td colSpan="2" className="fw-bold fs-5 text-dark">
                            {formatCurrency(purchaseTotals.totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: Price History */}
              {activeTab === 'price-history' && (
                <div>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle custom-table mb-0">
                      <thead>
                        <tr>
                          <th className="ps-3">Observation Date</th>
                          <th>Commodity</th>
                          <th>Mandi Market</th>
                          <th>Modal Price (₹/kg)</th>
                          <th>Min Price (₹/kg)</th>
                          <th>Max Price (₹/kg)</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistoryData.map((ph) => (
                          <tr key={ph._id}>
                            <td className="ps-3">{formatDate(ph.observationDate || ph.createdAt)}</td>
                            <td><strong>{ph.commodity}</strong> ({ph.variety || 'Standard'})</td>
                            <td>{ph.market || 'Hyderabad'}</td>
                            <td><strong className="fs-6 text-dark">₹{ph.pricePerKg}</strong></td>
                            <td className="text-muted">₹{(ph.minPrice / 100).toFixed(2)}</td>
                            <td className="text-muted">₹{(ph.maxPrice / 100).toFixed(2)}</td>
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financial Accounting Disclosure Footnote */}
      <div className="alert alert-light border shadow-sm rounded-3 p-3 mb-0">
        <div className="d-flex align-items-start gap-2">
          <BsInfoCircle className="text-secondary mt-1 flex-shrink-0" />
          <div className="small text-muted">
            <strong>Accounting Clarification:</strong> Gross profit estimates represent Trading Gross Profit (Revenue minus Cost of Goods Sold) calculated strictly using the <strong>Weighted-Average Cost</strong> of physical inward batches. Operating overheads (mandi hamali/labour, transport/freight, shop rent, GST) are not deducted.
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
