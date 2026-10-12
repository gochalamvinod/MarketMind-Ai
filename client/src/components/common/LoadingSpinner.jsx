import React from 'react'

/**
 * LoadingSpinner component
 * @param {{ message?: string, fullPage?: boolean, size?: 'sm' | 'md' | 'lg' }} props
 */
const LoadingSpinner = ({ message = 'Loading...', fullPage = false, size = 'md' }) => {
  const spinnerClass = size === 'sm' ? 'spinner-border-sm' : size === 'lg' ? 'spinner-border-lg' : ''

  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center p-4">
      <div className={`spinner-border text-primary ${spinnerClass}`} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      {message && <div className="mt-2 text-muted fw-medium small">{message}</div>}
    </div>
  )

  if (fullPage) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '60vh', width: '100%' }}
      >
        {content}
      </div>
    )
  }

  return content
}

export default LoadingSpinner
