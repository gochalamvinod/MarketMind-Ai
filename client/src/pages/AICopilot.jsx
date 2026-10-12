import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BsRobot, BsGraphUp, BsChatDots } from 'react-icons/bs'
import AIInsights from './AIInsights'
import Chatbot from './Chatbot'

/**
 * Unified AI Copilot Hub
 * Combines Market Insights & Forecasts with the Interactive Chat Assistant into a single clean view.
 */
const AICopilot = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'chat' ? 'chat' : 'insights'
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'chat' && activeTab !== 'chat') {
      setActiveTab('chat')
    } else if (tabParam === 'insights' && activeTab !== 'insights') {
      setActiveTab('insights')
    }
  }, [searchParams, activeTab])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4">
      {/* Hub Navigation Tabs */}
      <div className="card border-0 shadow-sm rounded-3 mb-4">
        <div className="card-body p-2 bg-light rounded-3">
          <ul className="nav nav-pills nav-fill gap-2">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                  activeTab === 'insights' ? 'active bg-primary text-white shadow-sm' : 'text-dark bg-white'
                }`}
                onClick={() => handleTabChange('insights')}
              >
                <BsGraphUp className={activeTab === 'insights' ? 'text-white' : 'text-primary'} />
                <span>Market Insights & Forecasts</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                  activeTab === 'chat' ? 'active bg-primary text-white shadow-sm' : 'text-dark bg-white'
                }`}
                onClick={() => handleTabChange('chat')}
              >
                <BsChatDots className={activeTab === 'chat' ? 'text-white' : 'text-primary'} />
                <span>Interactive Copilot (Chat)</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Render Active Tab */}
      {activeTab === 'insights' ? (
        <AIInsights isEmbedded />
      ) : (
        <Chatbot isEmbedded />
      )}
    </div>
  )
}

export default AICopilot
