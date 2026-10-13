import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to attach Authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle common errors (such as 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't loop redirect if already on login/register
      const currentPath = window.location.pathname
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (currentPath !== '/login' && currentPath !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

/* ==========================================================================
   AUTHENTICATION API
   ========================================================================== */
export const loginUser = (data) => api.post('/auth/login', data)
export const registerUser = (data) => api.post('/auth/register', data)
export const getMe = () => api.get('/auth/me')

/* ==========================================================================
   PRODUCTS API
   ========================================================================== */
export const getProducts = (params) => api.get('/products', { params })
export const getProduct = (id) => api.get(`/products/${id}`)
export const getProductDetails = (id) => api.get(`/products/${id}/details`)
export const createProduct = (data) => api.post('/products', data)
export const updateProduct = (id, data) => api.put(`/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)
export const getProductStats = () => api.get('/products/stats')
export const seedDemoData = () => api.post('/products/seed-demo')

/* ==========================================================================
   SUPPLIERS API
   ========================================================================== */
export const getSuppliers = () => api.get('/suppliers')
export const getSupplier = (id) => api.get(`/suppliers/${id}`)
export const createSupplier = (data) => api.post('/suppliers', data)
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data)
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`)

/* ==========================================================================
   PURCHASES API
   ========================================================================== */
export const getPurchases = (params) => api.get('/purchases', { params })
export const createPurchase = (data) => api.post('/purchases', data)

/* ==========================================================================
   SALES API
   ========================================================================== */
export const getSales = (params) => api.get('/sales', { params })
export const createSale = (data) => api.post('/sales', data)

/* ==========================================================================
   MARKET PRICES API
   ========================================================================== */
export const getMarketPrices = (params) => api.get('/market-prices', { params })
export const getLatestPrices = () => api.get('/market-prices/latest')
export const getPriceHistory = (productId) => api.get(`/market-prices/history/${productId}`)
export const addManualPrice = (data) => api.post('/market-prices/manual', data)
export const fetchPricesNow = () => api.post('/market-prices/fetch-now')
export const getApiStatus = () => api.get('/market-prices/status')

/* ==========================================================================
   ALERTS / NOTIFICATIONS API
   ========================================================================== */
export const getAlerts = () => api.get('/alerts')
export const getUnreadCount = () => api.get('/alerts/unread-count')
export const createAlert = (data) => api.post('/alerts', data)
export const generateAiAlerts = () => api.post('/alerts/ai-generate')
export const markAlertRead = (id) => api.put(`/alerts/${id}/read`)
export const markAllAlertsRead = () => api.put('/alerts/mark-all-read')
export const deleteAlert = (id) => api.delete(`/alerts/${id}`)

/* ==========================================================================
   DASHBOARD API
   ========================================================================== */
export const getDashboard = () => api.get('/dashboard')

/* ==========================================================================
   REPORTS API
   ========================================================================== */
export const getInventoryReport = (params) => api.get('/reports/inventory', { params })
export const getPurchaseReport = (params) => api.get('/reports/purchases', { params })
export const getSalesReport = (params) => api.get('/reports/sales', { params })
export const getProfitReport = (params) => api.get('/reports/profit', { params })
export const getPriceHistoryReport = (params) => api.get('/reports/price-history', { params })
export const exportCsv = (type, params) =>
  api.get(`/reports/export/${type}`, {
    params,
    responseType: 'blob'
  })

/* ==========================================================================
   AI INSIGHTS & CHATBOT API
   ========================================================================== */
export const getAIInsights = () => api.get('/ai/insights')
export const getProductAnalysis = (productId) => api.get(`/ai/product/${productId}`)
export const getForecast = (productId) => api.get(`/ai/forecast/${productId}`)
export const getRecommendations = () => api.get('/ai/recommendations')
export const sendChatMessage = (message, history = []) => api.post('/chatbot', { message, history })

/* ==========================================================================
   SETTINGS API
   ========================================================================== */
export const getSettings = () => api.get('/settings')
export const updateSettings = (data) => api.put('/settings', data)
export const getAdminSystemStatus = () => api.get('/settings/admin-system')
export const flushCache = () => api.post('/settings/admin-system/flush-cache')
export const purgeNonAdminData = () => api.post('/settings/admin-system/purge-data')

export default api
