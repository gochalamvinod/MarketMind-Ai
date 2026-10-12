import React, { useState, useRef, useEffect } from 'react'
import {
  BsRobot,
  BsDashLg,
  BsSendFill,
  BsTrash,
  BsCheckCircleFill,
  BsArrowsFullscreen
} from 'react-icons/bs'
import { useNavigate } from 'react-router-dom'
import { sendChatMessage } from '../../services/api'

const QUICK_ACTION_CHIPS = [
  { label: 'Set Alert', icon: '🔔', prompt: 'Add alert for Rice when price drops below 36' },
  { label: 'Mandi Rates', icon: '📈', prompt: 'What is the market price of Rice and Wheat?' },
  { label: 'Low Stock', icon: '⚠️', prompt: 'Which products are low on stock?' },
  { label: 'Sync Mandi', icon: '🔄', prompt: 'Fetch latest mandi prices now' },
  { label: 'Procure Stock', icon: '📥', prompt: 'Buy 50 kg Wheat (Lokwan) at 26' },
  { label: 'Price Alerts', icon: '🔔', prompt: 'Show my unread price alerts' }
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
        return <strong key={pIdx} className="fw-bold">{part.slice(2, -2)}</strong>
      }
      return part
    })

    if (isBullet) {
      return (
        <div key={idx} className="d-flex align-items-start gap-2 mb-1 ps-2">
          <span className="text-success mt-1" style={{ fontSize: '0.55rem' }}>●</span>
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

const FloatingChatbot = () => {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "👋 **Hey! I'm your MarketMind business partner.**\nI can run tasks directly in your store — set price alerts, record sales & purchases, check mandi rates, update prices, or review profits. What can I do for you today?",
      suggestions: [
        "Today's Profit & Sales",
        "Add alert for Rice below 36",
        "Which products are low on stock?",
        "What is the market price of Rice?"
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
    if (isOpen) {
      scrollToBottom()
      inputRef.current?.focus()
    }
  }, [isOpen, messages])

  const handleSendMessage = async (textToSend) => {
    const message = (textToSend || inputMessage).trim()
    if (!message || loading) return

    const userMessageId = `user-${Date.now()}`
    const updatedMessages = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        content: message,
        timestamp: new Date()
      }
    ]

    setMessages(updatedMessages)
    setInputMessage('')
    setLoading(true)

    try {
      const history = updatedMessages.slice(-6).map((m) => ({
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
          content: data.reply || "I've processed your request.",
          action: data.action || null,
          suggestions: data.suggestions || [
            "Today's sales summary",
            'Check low stock',
            'Latest market prices'
          ],
          timestamp: new Date()
        }
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "⚠️ I encountered an error communicating with the server. Please check connection and try again.",
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
        content: "Chat cleared. What would you like to check or execute right now?",
        suggestions: [
          "Set alert for Rice",
          "Today's sales and profit",
          "Which products are low on stock?",
          "Fetch latest mandi prices"
        ],
        timestamp: new Date()
      }
    ])
  }

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right) */}
      {!isOpen && (
        <button
          type="button"
          className="btn floating-chat-pill shadow-lg d-flex align-items-center gap-2 border-0 rounded-pill px-3 py-2 text-white"
          onClick={() => setIsOpen(true)}
          title="Open MarketMind AI Copilot"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 1045,
            backgroundColor: '#123c35',
            backgroundImage: 'linear-gradient(135deg, #123c35 0%, #1c5e53 100%)',
            boxShadow: '0 8px 24px rgba(18, 60, 53, 0.45)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div className="position-relative">
            <BsRobot className="fs-5" />
            <span
              className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle"
              style={{ width: '8px', height: '8px' }}
            />
          </div>
          <span className="fw-semibold small d-none d-sm-inline">AI Copilot</span>
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div
          className="card floating-chat-window shadow-2xl border-0 rounded-4 overflow-hidden"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '410px',
            maxWidth: 'calc(100vw - 32px)',
            height: '600px',
            maxHeight: 'calc(100vh - 48px)',
            zIndex: 1050,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.28)'
          }}
        >
          {/* Header (Clean, Pure AI Header without extra buttons) */}
          <div
            className="p-3 text-white d-flex align-items-center justify-content-between"
            style={{
              backgroundColor: '#123c35',
              backgroundImage: 'linear-gradient(135deg, #0d2e28 0%, #1a564c 100%)'
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white"
                style={{
                  width: '36px',
                  height: '36px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)'
                }}
              >
                <BsRobot className="fs-5" />
              </div>
              <div className="lh-1">
                <span className="fw-bold d-block small" style={{ letterSpacing: '0.02em' }}>
                  MarketMind AI Copilot
                </span>
                <span className="text-light small d-inline-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.72rem', opacity: 0.88 }}>
                  <span className="badge-pulse bg-success rounded-circle d-inline-block" style={{ width: '6px', height: '6px' }} />
                  Live AGMARKNET Engine
                </span>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              <button
                type="button"
                className="btn btn-sm btn-link text-white text-opacity-75 p-1 border-0"
                onClick={() => navigate('/ai-copilot?tab=chat')}
                title="Open Fullscreen Page"
              >
                <BsArrowsFullscreen size={13} />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-white text-opacity-75 p-1 border-0"
                onClick={clearChat}
                title="Clear Chat History"
              >
                <BsTrash size={14} />
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-white text-opacity-75 p-1 border-0"
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
              >
                <BsDashLg size={16} />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            className="flex-grow-1 p-3 overflow-y-auto custom-chat-scroll"
            style={{ backgroundColor: '#f8fafc', fontSize: '0.88rem' }}
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user'

              return (
                <div
                  key={msg.id}
                  className={`d-flex flex-column mb-3 ${isUser ? 'align-items-end' : 'align-items-start'}`}
                >
                  <div
                    className={`p-3 shadow-sm ${
                      isUser
                        ? 'chat-bubble-user text-white'
                        : 'chat-bubble-ai text-dark'
                    }`}
                    style={{
                      maxWidth: '88%',
                      lineHeight: '1.45',
                      wordBreak: 'break-word'
                    }}
                  >
                    {renderFormattedText(msg.content)}

                    {/* Action Execution Receipt */}
                    {msg.action && (
                      <div className="mt-2 pt-2 border-top border-secondary border-opacity-10 small">
                        <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1 py-1 px-2 rounded-pill">
                          <BsCheckCircleFill size={11} /> Executed: {msg.action.type}
                        </span>
                      </div>
                    )}
                  </div>

                  <span
                    className="text-muted mt-1 px-1"
                    style={{ fontSize: '0.68rem', opacity: 0.7 }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Contextual Suggestions Chips */}
                  {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mt-2 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className="quick-chip"
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
              <div className="d-flex align-items-center gap-2 text-muted small p-2">
                <div className="spinner-grow spinner-grow-sm text-success" role="status" style={{ width: '8px', height: '8px' }} />
                <span className="fst-italic" style={{ fontSize: '0.82rem' }}>MarketMind AI is processing...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Action Chips Tray */}
          <div
            className="px-2 py-2 border-top bg-light bg-opacity-75 d-flex gap-2 overflow-x-auto text-nowrap no-scrollbar"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {QUICK_ACTION_CHIPS.map((chip, cIdx) => (
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
          <div className="p-2 border-top bg-white">
            <div className="input-group">
              <input
                ref={inputRef}
                type="text"
                className="form-control form-control-sm border-end-0 rounded-start-pill ps-3 shadow-none py-2"
                placeholder="Ask or command (e.g. Set alert for Rice below 36)..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                style={{ fontSize: '0.86rem' }}
              />
              <button
                className="btn btn-success rounded-end-pill px-3 shadow-none d-flex align-items-center justify-content-center"
                type="button"
                onClick={() => handleSendMessage()}
                disabled={loading || !inputMessage.trim()}
                style={{ backgroundColor: '#123c35', borderColor: '#123c35' }}
                title="Send command"
              >
                <BsSendFill size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FloatingChatbot
