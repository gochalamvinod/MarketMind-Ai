import React, { useState } from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import FloatingChatbot from '../chat/FloatingChatbot'

/**
 * Layout wrapper for authenticated pages
 * @param {{ children: React.ReactNode }} props
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
    <div className="app-container d-flex min-vh-100">
      {/* Sidebar Navigation */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={handleCloseMobile}
      />

      {/* Main Content Area */}
      <div className="main-wrapper d-flex flex-column flex-grow-1 min-vh-100">
        <Navbar onToggleSidebar={handleToggleSidebar} />

        <main className="content-area flex-grow-1 p-3 p-md-4">
          <div className="container-fluid px-0">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Interactive AI Copilot Widget */}
      <FloatingChatbot />
    </div>
  )
}

export default Layout
