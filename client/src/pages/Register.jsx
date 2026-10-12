import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { BsGraphUpArrow, BsPerson, BsEnvelope, BsLock, BsBuilding, BsArrowRight } from 'react-icons/bs'
import { useAuth } from '../context/AuthContext'

/**
 * Register Page
 * User registration with business name, credentials, and password validation
 */
const Register = () => {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    password: '',
    confirmPassword: ''
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

    const { name, email, businessName, password, confirmPassword } = formData

    if (!name.trim() || !email.trim() || !businessName.trim() || !password) {
      toast.error('Please fill in all required fields')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      const res = await register(
        name.trim(),
        email.trim(),
        password,
        businessName.trim()
      )

      if (res.success) {
        toast.success('Registration successful! Welcome to MarketMind AI.')
        navigate('/')
      } else {
        toast.error(res.error || 'Registration failed. Please try again.')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Registration failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center bg-light py-5">
      <div className="row w-100 justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
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
                <h3 className="fw-bold text-dark mb-1">Create an Account</h3>
                <p className="text-muted small">
                  Join MarketMind AI to empower your agri-commodity wholesale business
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} noValidate>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-secondary small" htmlFor="name">
                      Full Name
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0 text-muted">
                        <BsPerson />
                      </span>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        className="form-control border-start-0 ps-0"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-secondary small" htmlFor="businessName">
                      Business Name
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0 text-muted">
                        <BsBuilding />
                      </span>
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        className="form-control border-start-0 ps-0"
                        placeholder="Sri Lakshmi Traders"
                        value={formData.businessName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold text-secondary small" htmlFor="email">
                    Email Address
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 text-muted">
                      <BsEnvelope />
                    </span>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-control border-start-0 ps-0"
                      placeholder="trader@marketmind.in"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
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
                        placeholder="Min. 6 chars"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                      />
                    </div>

                    {/* Password Strength Meter */}
                    {formData.password && (
                      <div className="password-strength-container mt-2">
                        {(() => {
                          const pwd = formData.password;
                          let score = 0;
                          if (pwd.length >= 6) score++;
                          if (pwd.length >= 8) score++;
                          if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
                          if (/\d/.test(pwd)) score++;
                          if (/[^A-Za-z0-9]/.test(pwd)) score++;

                          let label = 'Weak';
                          let barColor = '#ef4444';
                          let percent = 20;

                          if (score <= 1) {
                            label = 'Weak';
                            barColor = '#ef4444';
                            percent = 25;
                          } else if (score === 2) {
                            label = 'Fair';
                            barColor = '#f59e0b';
                            percent = 50;
                          } else if (score === 3) {
                            label = 'Good';
                            barColor = '#3b82f6';
                            percent = 75;
                          } else {
                            label = 'Strong';
                            barColor = '#10b981';
                            percent = 100;
                          }

                          return (
                            <div>
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>Strength:</span>
                                <span className="fw-bold" style={{ fontSize: '0.75rem', color: barColor }}>{label}</span>
                              </div>
                              <div className="strength-bar-track" style={{ height: '5px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  className="strength-bar-fill"
                                  style={{
                                    width: `${percent}%`,
                                    height: '100%',
                                    backgroundColor: barColor,
                                    transition: 'width 0.3s ease, background-color 0.3s ease'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="col-md-6 mb-4">
                    <label className="form-label fw-semibold text-secondary small" htmlFor="confirmPassword">
                      Confirm Password
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0 text-muted">
                        <BsLock />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        className="form-control border-start-0 ps-0"
                        placeholder="Re-type password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                      />
                    </div>
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
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <BsArrowRight />
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <div className="text-center mt-4 pt-3 border-top">
                <p className="text-muted small mb-0">
                  Already have an account?{' '}
                  <Link to="/login" className="fw-semibold text-primary text-decoration-none">
                    Log in here
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <small className="text-muted">
              MarketMind AI &bull; Transparent, Real-time Mandi-Linked Wholesale Management
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
