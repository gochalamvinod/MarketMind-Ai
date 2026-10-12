import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { BsGraphUpArrow, BsEnvelope, BsPerson, BsLock, BsArrowRight } from 'react-icons/bs'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/common/LoadingSpinner'

/**
 * Login Page
 * Handles user authentication with username or email and password
 */
const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.email.trim() || !formData.password) {
      toast.error('Please enter your username or email and password')
      return
    }

    try {
      setLoading(true)
      const res = await login(formData.email.trim(), formData.password)
      if (res.success) {
        toast.success('Welcome back to MarketMind AI!')
        navigate('/')
      } else {
        toast.error(res.error || 'Invalid credentials. Please try again.')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Login failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="row w-100 justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
          <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
            <div className="card-body p-4 p-sm-5">
              {/* Header / Logo */}
              <div className="text-center mb-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle shadow-sm mb-3"
                  style={{ width: '56px', height: '56px' }}
                >
                  <BsGraphUpArrow size={26} />
                </div>
                <h3 className="fw-bold text-dark mb-1">MarketMind AI</h3>
                <p className="text-muted small">
                  Smart Market Intelligence & Inventory Management
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small" htmlFor="email">
                    Username or Email
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 text-muted">
                      <BsPerson />
                    </span>
                    <input
                      type="text"
                      id="email"
                      name="email"
                      className="form-control border-start-0 ps-0"
                      placeholder="Enter username or email"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label fw-semibold text-secondary small" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none small text-muted"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 text-muted">
                      <BsLock />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      className="form-control border-start-0 ps-0"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <BsArrowRight />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="text-center mt-4 pt-3 border-top">
                <p className="text-muted small mb-0">
                  Don't have an account?{' '}
                  <Link to="/register" className="fw-semibold text-primary text-decoration-none">
                    Register your business
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <small className="text-muted">
              MarketMind AI &bull; Mandi-aligned commodity tracking & pricing
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
