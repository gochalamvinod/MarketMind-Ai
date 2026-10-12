import React from 'react'
import { formatCurrency } from '../../utils/helpers'

/**
 * PriceChangeIndicator component
 * Note: Price increases are bad for buyer margins (red ↑), price decreases are good (green ↓)
 * @param {{ change?: number, percentage?: number, showZero?: boolean }} props
 */
const PriceChangeIndicator = ({ change = 0, percentage = 0, showZero = true }) => {
  const numericChange = Number(change) || 0
  const numericPercent = Number(percentage) || 0

  if (numericChange === 0 && numericPercent === 0) {
    if (!showZero) return null
    return (
      <span className="price-stable d-inline-flex align-items-center gap-1 small fw-medium text-muted">
        <span>—</span>
        <span>0.0%</span>
      </span>
    )
  }

  const isUp = numericChange > 0
  const absChange = Math.abs(numericChange)
  const absPercent = Math.abs(numericPercent)

  return (
    <span
      className={`d-inline-flex align-items-center gap-1 small fw-semibold ${
        isUp ? 'price-up' : 'price-down'
      }`}
    >
      <span className="fs-6 lh-1">{isUp ? '↑' : '↓'}</span>
      <span>
        {formatCurrency(absChange)} ({isUp ? `+${absPercent.toFixed(1)}%` : `-${absPercent.toFixed(1)}%`})
      </span>
    </span>
  )
}

export default PriceChangeIndicator
