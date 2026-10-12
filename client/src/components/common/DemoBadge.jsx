import React from 'react'

/**
 * DemoBadge component indicating simulated or mock data
 * @param {{ visible?: boolean }} props
 */
const DemoBadge = ({ visible = true }) => {
  if (!visible) return null

  return (
    <span
      className="badge demo-badge text-dark d-inline-flex align-items-center gap-1 shadow-sm px-2 py-1"
      title="Running in Demo Mode: using simulated market intelligence"
    >
      <span className="demo-indicator-dot"></span>
      <span className="fw-semibold">DEMO MODE</span>
      <span className="text-secondary small d-none d-sm-inline">| Simulated Data</span>
    </span>
  )
}

export default DemoBadge
