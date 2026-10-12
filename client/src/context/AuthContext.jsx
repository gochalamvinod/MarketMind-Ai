import React, { createContext, useContext, useState, useEffect } from 'react'
import { loginUser, registerUser, getMe } from '../services/api'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (storedToken) {
        setToken(storedToken)
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser))
          } catch (e) {
            console.error('Error parsing stored user:', e)
          }
        }

        try {
          const res = await getMe()
          if (res.data && res.data.user) {
            setUser(res.data.user)
            localStorage.setItem('user', JSON.stringify(res.data.user))
          } else if (res.data) {
            setUser(res.data)
            localStorage.setItem('user', JSON.stringify(res.data))
          }
        } catch (error) {
          console.warn('Token validation failed:', error?.response?.data?.message || error.message)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (identifier, password) => {
    try {
      const response = await loginUser({
        email: identifier,
        username: identifier,
        identifier,
        password
      })
      const data = response.data
      const receivedToken = data.token
      const receivedUser = data.user || data

      localStorage.setItem('token', receivedToken)
      localStorage.setItem('user', JSON.stringify(receivedUser))

      setToken(receivedToken)
      setUser(receivedUser)
      return { success: true, data }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Login failed'
      return { success: false, error: errorMessage }
    }
  }

  const register = async (name, email, password, businessName) => {
    try {
      const response = await registerUser({ name, email, password, businessName })
      const data = response.data
      const receivedToken = data.token
      const receivedUser = data.user || data

      if (receivedToken) {
        localStorage.setItem('token', receivedToken)
        localStorage.setItem('user', JSON.stringify(receivedUser))
        setToken(receivedToken)
        setUser(receivedUser)
      }
      return { success: true, data }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message || 'Registration failed'
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    setUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
