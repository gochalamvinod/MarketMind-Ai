/**
 * Utility helper functions for MarketMind AI
 */

/**
 * Format currency as Indian Rupee (₹)
 * @param {number|string} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  const numericAmount = Number(amount)
  if (isNaN(numericAmount)) {
    return '₹0.00'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount)
}

/**
 * Format date as DD/MM/YYYY
 * @param {Date|string|number} date
 * @returns {string}
 */
export const formatDate = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format datetime as DD/MM/YYYY HH:MM
 * @param {Date|string|number} date
 * @returns {string}
 */
export const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const datePart = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  const timePart = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  return `${datePart} ${timePart}`
}

/**
 * Get stock status and styling information
 * @param {number} qty
 * @param {number} minLevel
 * @returns {{ status: string, color: string, label: string }}
 */
export const getStockStatus = (qty, minLevel = 10) => {
  const quantity = Number(qty) || 0
  const threshold = Number(minLevel) || 10

  if (quantity <= 0) {
    return {
      status: 'out-of-stock',
      color: 'danger',
      label: 'Out of Stock'
    }
  }

  if (quantity <= threshold) {
    return {
      status: 'low-stock',
      color: 'warning',
      label: 'Low Stock'
    }
  }

  return {
    status: 'in-stock',
    color: 'success',
    label: 'In Stock'
  }
}

/**
 * Get text color class based on price change
 * Note: Price increase (positive) is unfavorable/red, price decrease (negative) is favorable/green
 * @param {number} change
 * @returns {string}
 */
export const getPriceChangeClass = (change) => {
  const numChange = Number(change)
  if (isNaN(numChange) || numChange === 0) return ''
  return numChange > 0 ? 'text-danger' : 'text-success'
}

/**
 * Truncate long text strings with ellipsis
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export const truncateText = (text, maxLength = 40) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}
