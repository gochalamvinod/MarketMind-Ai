import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import FloatingChatbot from '../chat/FloatingChatbot'

/**
 * Clean Layout wrapper for authenticated pages with persistent Floating Chatbot
 * @param {{ children?: React.ReactNode }} props
 */
const Layout = ({ children }) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const handleToggleSidebar = () => {
    setMobileSidebarOpen((prev) => !prev)
  }

  const handleCloseMobile = () => {
    setMobileSidebarOpen(false)
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={handleCloseMobile}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Navbar onToggleSidebar={handleToggleSidebar} />

        <main className="content-area">
          <div className="container-fluid px-0">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Persistent Floating AI Chatbot */}
      <FloatingChatbot />
    </div>
  )
}

export default Layout
