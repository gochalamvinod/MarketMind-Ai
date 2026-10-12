import React, { useState, useRef, useEffect } from 'react'
import {
  BsRobot,
  BsSendFill,
  BsTrash,
  BsArrowClockwise,
  BsCheckCircleFill,
  BsCartPlus,
  BsCashCoin,
  BsTag,
  BsBoxSeam,
  BsGraphUp,
  BsBell,
  BsShieldCheck,
  BsLightbulb
} from 'react-icons/bs'
import { toast } from 'react-toastify'
import { sendChatMessage } from '../services/api'
import LoadingSpinner from '../components/common/LoadingSpinner'

const CHEATSHEET_CATEGORIES = [
  {
    title: 'Mandi Intelligence',
    icon: BsGraphUp,
    badgeColor: 'primary',
    commands: [
      'What is the market price of Rice?',
      'Fetch latest mandi prices now',
      'Compare Rice market rate with my purchase cost'
    ]
  },
  {
    title: 'Purchases & Inventory',
    icon: BsCartPlus,
    badgeColor: 'success',
    commands: [
      'Buy 50 kg Wheat (Lokwan) at 26',
      'Buy 25 kg Toor Dal at 115',
      'Which products are low on stock?',
      'Check stock of Turmeric (Haldi)'
    ]
  },
  {
    title: 'Pricing & Catalog',
    icon: BsTag,
    badgeColor: 'warning',
    commands: [
      'Show all products in inventory',
      'Update selling price of Sugar (M-30) to 52',
      'Which products need price review?'
    ]
  },
  {
    title: 'Alerts & Analysis',
    icon: BsBell,
    badgeColor: 'danger',
    commands: [
      'Show my unread price alerts',
      'Mark all alerts as read',
      'Give me recommendations for purchasing this week'
    ]
  }
]

/**
 * Format markdown text with bold, bullet points, and rupee symbols
 */
const renderFormattedText = (text) => {
  if (!text) return null

  const lines = text.split('\n')

  return lines.map((line, idx) => {
    if (!line.trim()) {
      return <div key={idx} className="my-1" />
    }

    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')
    const cleanLine = isBullet ? line.trim().replace(/^[-*•]\s+/, '') : line

    const parts = cleanLine.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>
      }
      return part
    })

    if (isBullet) {
      return (
        <div key={idx} className="d-flex align-items-start gap-2 mb-1 ps-2">
          <span className="text-success mt-1" style={{ fontSize: '0.65rem' }}>●</span>
          <span>{parts}</span>
        </div>
      )
    }

    return (
      <div key={idx} className="mb-1">
        {parts}
      </div>
    )
  })
}

const Chatbot = ({ isEmbedded = false }) => {
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome-page-1',
      role: 'assistant',
      content: "👋 **Hey! I'm your MarketMind business partner.**\nI'm connected directly to your store inventory and live Telangana APMC mandis. What can I help you take care of today? I can record sales, check mandi prices, set alerts, update product rates, or review your profits!",
      suggestions: [
        "Today's Profit & Sales",
        "Which products are low on stock?",
        "What is the market price of Rice?",
        "Set an alert for Rice below 36"
      ],
      timestamp: new Date()
    }
  ])

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (textToSend) => {
    const message = (textToSend || inputMessage).trim()
    if (!message || loading) return

    const updatedMessages = [
      ...messages,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date()
      }
    ]

    setMessages(updatedMessages)
    setInputMessage('')
    setLoading(true)

    try {
      const history = updatedMessages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content
      }))

      const response = await sendChatMessage(message, history)
      const data = response.data

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.reply || "I've completed your request.",
          action: data.action || null,
          suggestions: data.suggestions || [
            "Today's sales and profit",
            'Check low stock',
            'Latest market prices'
          ],
          timestamp: new Date()
        }
      ])
    } catch (err) {
      toast.error('Failed to communicate with AI Copilot')
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "⚠️ I encountered an error communicating with the server. Please try again.",
          timestamp: new Date()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: "Chat cleared. What would you like to do or check right now?",
        suggestions: [
          "Today's sales and profit",
          "Which products are low on stock?",
          "Fetch latest mandi prices"
        ],
        timestamp: new Date()
      }
    ])
  }

  return (
    <div className={isEmbedded ? '' : 'container-fluid py-4 px-3 px-md-4'}>
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="h3 fw-bold text-dark mb-0">MarketMind AI Copilot</h2>
            <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1 px-2 py-1">
              <span className="badge-pulse bg-success rounded-circle d-inline-block" style={{ width: '6px', height: '6px' }} />
              Live AGMARKNET Engine
            </span>
          </div>
          <p className="text-muted small mb-0 mt-1">
            Perform inventory operations, record sales & purchases, check live mandi rates, and receive business intelligence
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1 shadow-sm"
          onClick={clearChat}
        >
          <BsTrash size={14} />
          <span>Clear Conversation</span>
        </button>
      </div>

      <div className="row g-4">
        {/* Left Column: Command Center Cheatsheet */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm rounded-4 p-3 mb-3 bg-white">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <BsLightbulb className="text-warning fs-5" />
              <span>Voice & Text Command Center</span>
            </h6>
            <p className="text-muted small mb-3">
              Click any quick command below to dispatch it instantly:
            </p>

            <div className="d-flex flex-column gap-3">
              {CHEATSHEET_CATEGORIES.map((cat, idx) => {
                const Icon = cat.icon
                return (
                  <div key={idx} className="border rounded-3 p-2 bg-light bg-opacity-50">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className={`badge bg-${cat.badgeColor}-subtle text-${cat.badgeColor} p-1 rounded`}>
                        <Icon size={14} />
                      </span>
                      <strong className="small text-dark">{cat.title}</strong>
                    </div>

                    <div className="d-flex flex-column gap-1">
                      {cat.commands.map((cmd, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          className="btn btn-sm btn-white border border-opacity-50 text-start small py-1 px-2 text-dark bg-white rounded-2 shadow-2xs hover-primary"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => handleSendMessage(cmd)}
                        >
                          → {cmd}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="alert alert-success border-0 shadow-sm rounded-4 p-3 small mb-0">
            <strong className="d-block mb-1">💡 Real Action Execution:</strong>
            All sales, purchases, and price updates executed via the chatbot update your database in real time.
          </div>
        </div>

        {/* Right Column: Full Conversational Chat Window */}
        <div className="col-12 col-lg-8">
          <div
            className="card border-0 shadow-sm rounded-4 overflow-hidden d-flex flex-column"
            style={{ height: '720px', backgroundColor: '#ffffff' }}
          >
            {/* Chat Messages Feed */}
            <div
              className="flex-grow-1 p-3 p-md-4 overflow-y-auto custom-chat-scroll"
              style={{ backgroundColor: '#f8fafc', fontSize: '0.92rem' }}
            >
              {messages.map((msg) => {
                const isUser = msg.role === 'user'

                return (
                  <div
                    key={msg.id}
                    className={`d-flex flex-column mb-3 ${isUser ? 'align-items-end' : 'align-items-start'}`}
                  >
                    <div className="d-flex align-items-start gap-2" style={{ maxWidth: '85%' }}>
                      {!isUser && (
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0 mt-1"
                          style={{ width: '32px', height: '32px', backgroundColor: '#123c35' }}
                        >
                          <BsRobot size={16} />
                        </div>
                      )}

                      <div
                        className={`p-3 rounded-4 shadow-sm ${
                          isUser
                            ? 'text-white ms-auto'
                            : 'bg-white text-dark border border-secondary border-opacity-10'
                        }`}
                        style={{
                          backgroundColor: isUser ? '#123c35' : '#ffffff',
                          backgroundImage: isUser ? 'linear-gradient(135deg, #123c35 0%, #1d6155 100%)' : 'none',
                          lineHeight: '1.5',
                          wordBreak: 'break-word'
                        }}
                      >
                        {renderFormattedText(msg.content)}

                        {/* Action Execution Receipt */}
                        {msg.action && (
                          <div className="mt-2 pt-2 border-top border-secondary border-opacity-10 small">
                            <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
                              <BsCheckCircleFill size={10} /> Executed: {msg.action.type}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-muted mt-1 px-1 ${isUser ? 'text-end' : 'ms-5'}`}
                      style={{ fontSize: '0.7rem', opacity: 0.7 }}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Follow-up Suggestion Chips */}
                    {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="d-flex flex-wrap gap-1 mt-2 ms-5">
                        {msg.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-3 text-start small border-opacity-25"
                            style={{ fontSize: '0.78rem', backgroundColor: '#ffffff' }}
                            onClick={() => handleSendMessage(sug)}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Thinking Indicator */}
              {loading && (
                <div className="d-flex align-items-center gap-2 text-muted small p-2 ms-5">
                  <div className="spinner-grow spinner-grow-sm text-success" role="status" style={{ width: '8px', height: '8px' }} />
                  <span>AI Copilot is processing your command...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Action Chips Tray (Clean Horizontal Scroll without ugly scrollbars) */}
            <div
              className="px-3 py-2 border-top bg-light bg-opacity-75 d-flex gap-2 overflow-x-auto text-nowrap no-scrollbar"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {[
                { label: "Today's Profit", icon: '💰', prompt: "What are today's sales and profit?" },
                { label: 'Low Stock', icon: '⚠️', prompt: 'Which products are low on stock?' },
                { label: 'Mandi Rates', icon: '📈', prompt: 'What is the market price of Rice and Wheat?' },
                { label: 'Sell 5 kg Rice', icon: '🛒', prompt: 'Sell 5 kg Rice (Sona Masoori) at 48' },
                { label: 'Buy 20 kg Wheat', icon: '📦', prompt: 'Buy 20 kg Wheat (Lokwan) at 26' },
                { label: 'Sync Mandi', icon: '🔄', prompt: 'Fetch latest mandi prices now' }
              ].map((chip, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  className="quick-chip d-inline-flex align-items-center gap-1 flex-shrink-0"
                  onClick={() => handleSendMessage(chip.prompt)}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 border-top bg-white">
              <div className="input-group">
                <input
                  ref={inputRef}
                  type="text"
                  className="form-control border-end-0 rounded-start-pill ps-3 shadow-none py-2"
                  placeholder="Ask a question or enter a command (e.g. Sell 5 kg Rice at 48, What products are low on stock?)..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  style={{ fontSize: '0.9rem' }}
                />
                <button
                  className="btn btn-success rounded-end-pill px-4 shadow-none"
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={loading || !inputMessage.trim()}
                  style={{ backgroundColor: '#123c35', borderColor: '#123c35' }}
                >
                  <BsSendFill size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chatbot
