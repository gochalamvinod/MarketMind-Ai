import React from 'react'
import { getStockStatus } from '../../utils/helpers'

/**
 * StockStatus badge component
 * @param {{ quantity: number, minLevel?: number }} props
 */
const StockStatus = ({ quantity = 0, minLevel = 10 }) => {
  const { status, label } = getStockStatus(quantity, minLevel)

  let badgeClass = 'stock-ok'
  if (status === 'low-stock') {
    badgeClass = 'stock-low'
  } else if (status === 'out-of-stock') {
    badgeClass = 'stock-out'
  }

  return (
    <span className={`badge ${badgeClass} fw-medium px-2 py-1 rounded-pill`}>
      {label}
    </span>
  )
}

export default StockStatus
