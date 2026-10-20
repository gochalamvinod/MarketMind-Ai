# MarketMind AI — Smart Commodity Price Intelligence & Mandi ERP 

[![Deploy to Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://marketmind-ai-6ni2.onrender.com)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Node Express](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/AI%20Engine-Google%20Gemini-8E75C2?style=for-the-badge&logo=google)](https://ai.google.dev/)

> **MarketMind AI** is an AI-powered commodity price intelligence, inventory tracking, and wholesale ERP platform designed for agricultural traders, grocery merchants, and APMC mandi shopkeepers.

---

## 🌟 Live Cloud Deployment

- **Production URL**: [https://marketmind-ai-6ni2.onrender.com](https://marketmind-ai-6ni2.onrender.com)
- **Database Engine**: MongoDB Atlas Cloud Cluster
- **Hosting Platform**: Render Cloud (Express REST API & React Vite SPA)
- **AI Intelligence**: Google Gemini AI (`gemini-3.5-flash-lite`) + Deterministic NLP Engine

---

## 🎯 Core Features & Architecture

MarketMind AI is built with a focused, streamlined architecture comprising **6 core application views** plus a **persistent global AI assistant**:

### 1. Persistent Floating AI Chatbot
- **Available Everywhere**: Floating widget docked at the bottom-right corner of every screen without obscuring content or hijacking page navigation.
- **Natural Language Command Execution (1-Shot)**:
  - *"buy 50kg sugar at market price and set selling at 52rs"* $\rightarrow$ Restocks inventory at APMC rate, updates retail price, and logs purchase history.
  - *"what is today's profit and sales"* $\rightarrow$ Instant cash flow and margin calculation.
  - *"alert me if onion drops below 20"* $\rightarrow$ Creates automated price monitoring triggers.
- **Hybrid NLP + Gemini 3.5 Engine**: Blends deterministic zero-latency regex command parsing (0.04 ms latency) with Google Gemini AI for fluid conversational replies.

### 2. Live APMC Mandi Price Intelligence (`/market-prices`)
- Direct integration with Government of India **AGMARKNET** (`data.gov.in`) wholesale market benchmarks.
- Automated background polling (every 6 hours via `node-cron`) or immediate on-demand sync.
- Pre-seeded wholesale benchmarks across 25 agricultural commodities (Rice, Pulses, Oils, Spices, Staples).

### 3. Inventory & Commodity Catalog (`/products`)
- Complete stock visibility: stock on hand, unit cost, selling price, and real-time APMC benchmark comparisons.
- Low-stock badge indicators, search filter, and inline commodity management modals.

### 4. Inward Purchases Ledger (`/purchases`)
- Inward stock logging: batch inward receipts, supplier invoice numbers, and auto-replenishment.
- **Weighted Average Cost (WAC) Accounting**:
  $$\text{New Unit Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{Incoming Qty} \times \text{Purchase Price})}{\text{Current Qty} + \text{Incoming Qty}}$$
- Historical purchase costs remain immutable regardless of future APMC market swings.

### 5. Smart Alerts & Notification Stream (`/alerts`)
- Multi-category alert feed: Mandi Price Movements, Low Inventory Warnings, AI Market Intelligence.
- Custom user-defined target price thresholds and proactive reorder warnings.
- Real-time unread bell indicator in navbar with quick dropdown preview and "Mark All Read".

### 6. Executive Dashboard (`/`)
- Unified command center with live KPI metrics cards (Total Products, Low Stock, Inventory Value).
- Recent inward purchases table, low stock alert list, APMC reference overview, and mandi commodity trend charts.

### 7. Merchant Store Settings (`/settings`)
- Business details, store location, preferred APMC mandi yards, target profit margin %, and alert thresholds.

---

## 🔒 Security & Client/Server Architecture

MarketMind AI enforces strict separation between server-side secrets and client-side code:

* **Client Frontend (`client/.env`)**:
  * Contains **ONLY** `VITE_API_URL` to connect to the backend.
  * Zero database credentials, zero API keys, zero JWT secrets are accessible to client code.
* **Server Backend (`server/.env`)**:
  * Securely holds `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `GOV_API_KEY`.
  * Passwords hashed with `bcryptjs` (auto-salted rounds).
  * Stateless JWT authentication with automatic session expiration.
  * All `.env` files are excluded from Git via `.gitignore`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 18 SPA, Vite 5, React Router DOM v6, Bootstrap 5, Bootstrap Icons |
| **Data Visualization** | Recharts, Responsive CSS Grid & Dashboards |
| **Backend Runtime** | Node.js (v18+ / v20+ / v22+), Express.js 4 |
| **Database & ODM** | MongoDB Atlas, Mongoose 8 |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **AI Engine** | Google Generative AI SDK (`@google/generative-ai`), Gemini 3.5 Flash Lite + NLP Engine |
| **Data Integration** | AGMARKNET REST API (`data.gov.in`), Axios |
| **Background Jobs** | node-cron (scheduled periodic mandi price ingestion) |
| **Cloud Hosting** | Render (Express Web Service + Vite Static Site via `render.yaml`) |

---

## 📁 Repository Structure

```
MarketMind-Ai/
├── .gitignore                # Git exclusions (builds, node_modules, .env files)
├── package.json              # Root monorepo scripts
├── README.md                 # Project documentation
├── render.yaml               # Render Blueprint cloud deployment specification
├── vercel.json               # Optional Vercel deployment specification
│
├── client/                   # Frontend React + Vite Application
│   ├── public/               # Favicon, SVGs, static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/         # FloatingChatbot.jsx (Persistent AI Assistant)
│   │   │   ├── common/       # Modals, Spinners, Stock status indicators
│   │   │   ├── layout/       # Navbar, Sidebar, Layout wrapper
│   │   │   └── notifications/# NotificationBell, NotificationDropdown
│   │   ├── context/          # React AuthContext (JWT session state)
│   │   ├── hooks/            # Custom hooks (useAuth)
│   │   ├── pages/            # 6 Core Views (Dashboard, Products, Purchases,
│   │   │                     #   MarketPrices, Notifications, Settings, Auth)
│   │   ├── services/         # Axios API client & token interceptors (api.js)
│   │   ├── utils/            # Currency, date, and math formatting helpers
│   │   ├── App.css           # Global responsive styles & component layouts
│   │   ├── App.jsx           # Core route definitions & clean redirects
│   │   └── main.jsx          # React DOM entry point
│   ├── .env.example          # Client environment template (VITE_API_URL only)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── server/                   # Backend Express + Node.js API
    ├── config/
    │   ├── db.js             # Mongoose MongoDB Atlas connection
    │   ├── gemini.js         # Google Gemini AI client configuration
    │   └── seedMarketPrices.js # APMC wholesale commodity benchmarks
    ├── controllers/          # Business logic (ai, alert, auth, chatbot, dashboard, etc.)
    ├── jobs/                 # Cron jobs for automated price polling (priceChecker.js)
    ├── middleware/           # JWT auth & centralized error handler
    ├── models/               # Mongoose Schemas (User, Product, Purchase, Alert, etc.)
    ├── routes/               # Modular Express API endpoints (/api/auth, /api/products, etc.)
    ├── services/             # AGMARKNET API integration & price monitoring logic
    ├── utils/                # In-memory fallback store & accounting helpers
    ├── .env.example          # Server environment template (DB, JWT, API keys)
    ├── package.json
    ├── seed.js               # Database seeding script
    └── server.js             # Express app entry point & API router
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [Git](https://git-scm.com/)
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or local MongoDB instance

### 1. Clone the Repository
```bash
git clone https://github.com/gochalamvinod/MarketMind-Ai.git
cd MarketMind-Ai
```

### 2. Configure Environment Files

#### A. Server Environment (`server/.env`)
Create `server/.env` based on `server/.env.example`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/marketmind?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Default Admin User
ADMIN_NAME=System Administrator
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@marketmind.ai
ADMIN_PASSWORD=your_secure_admin_password

# External APIs
GEMINI_API_KEY=your_gemini_api_key_here
GOV_API_KEY=
GOV_API_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
GOV_API_BASE_URL=https://api.data.gov.in/resource
```

#### B. Client Environment (`client/.env`)
Create `client/.env` based on `client/.env.example`:
```env
# Leave blank for local development to use the Vite proxy (/api -> http://localhost:5000)
VITE_API_URL=
```

### 3. Install Dependencies
```bash
# Install root, client, and server dependencies
npm install
npm install --prefix client
npm install --prefix server
```

### 4. Run the Development Servers
Open two terminals:

```bash
# Terminal 1: Backend Express API (port 5000)
npm run dev:server

# Terminal 2: Frontend Vite Client (port 5173)
npm run dev:client
```

Navigate to `http://localhost:5173` in your browser.

---

## ☁️ Deployment Guide (Render)

MarketMind AI is optimized for 1-click cloud deployment via [Render](https://render.com).

### Using the Render Blueprint (`render.yaml`)
1. Push your code to your GitHub repository.
2. In [MongoDB Atlas](https://cloud.mongodb.com), ensure Network Access allows `0.0.0.0/0` (Allow from anywhere).
3. In [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint**.
4. Connect `gochalamvinod/MarketMind-Ai`. Render will automatically detect [`render.yaml`](./render.yaml).
5. Fill in the required environment variables:
   * `MONGODB_URI`
   * `JWT_SECRET`
   * `ADMIN_PASSWORD`
   * `GEMINI_API_KEY`
6. Click **Apply**. Render will build and deploy both the backend API and frontend static site automatically.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new store merchant account | Public |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT token | Public |
| `GET` | `/api/auth/me` | Fetch active user profile | Private |

### Dashboard
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/dashboard` | Aggregated metrics, low stock warnings, and APMC trend overview | Private |

### Products & Inventory
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/products` | Retrieve catalog (supports `?search=`, `?category=`, `?lowStock=true`) | Private |
| `GET` | `/api/products/:id` | Get single commodity details | Private |
| `POST` | `/api/products` | Add a new commodity | Private |
| `PUT` | `/api/products/:id` | Update commodity details and prices | Private |
| `DELETE` | `/api/products/:id` | Remove commodity from catalog | Private |
| `POST` | `/api/products/seed-demo` | Seed initial demo commodities | Private |

### Inward Purchases
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/purchases` | View chronological purchase procurement ledger | Private |
| `POST` | `/api/purchases` | Log inward stock batch (updates Weighted Average Cost) | Private |

### APMC Mandi Market Prices
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/market-prices` | Fetch latest APMC mandi price observations | Private |
| `GET` | `/api/market-prices/latest` | Retrieve latest rates per commodity | Private |
| `GET` | `/api/market-prices/status` | AGMARKNET ingestion health & sync status | Private |
| `POST` | `/api/market-prices/fetch-now` | Force immediate mandi rate sync | Private |

### Alerts & Notifications
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/alerts` | List all price and stock alerts | Private |
| `GET` | `/api/alerts/unread-count` | Counter of unread notifications | Private |
| `POST` | `/api/alerts` | Create custom user price alert | Private |
| `POST` | `/api/alerts/ai-generate` | Trigger AI evaluation of market rates vs inventory | Private |
| `PUT` | `/api/alerts/:id/read` | Mark alert as read | Private |
| `PUT` | `/api/alerts/mark-all-read` | Mark all alerts as read | Private |
| `DELETE` | `/api/alerts/:id` | Delete notification | Private |

### Conversational AI Copilot
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/chatbot` | Natural language command execution & chat assistant | Private |
| `GET` | `/api/ai/insights` | Comprehensive market trend intelligence | Private |

### Store Settings
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/settings` | Retrieve store preferences & mandi configuration | Private |
| `PUT` | `/api/settings` | Update store profile & alert thresholds | Private |

---

## 📜 License
Distributed under the **MIT License**.
