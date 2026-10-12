import React from 'react'

/**
 * ConfirmModal component for deletion or important actions
 * @param {{
 *  show: boolean,
 *  onClose: () => void,
 *  onConfirm: () => void,
 *  title?: string,
 *  message?: string,
 *  confirmText?: string,
 *  cancelText?: string
 * }} props
 */
const ConfirmModal = ({
  show,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel'
}) => {
  if (!show) return null

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1060 }}
      aria-modal="true"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content shadow border-0">
          <div className="modal-header border-bottom-0 pb-1">
            <h5 className="modal-title fw-semibold text-dark">{title}</h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body py-3">
            <p className="text-secondary mb-0">{message}</p>
          </div>
          <div className="modal-footer border-top-0 pt-1">
            <button
              type="button"
              className="btn btn-outline-secondary px-3"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="btn btn-danger px-4"
              onClick={() => {
                onConfirm()
                onClose()
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
