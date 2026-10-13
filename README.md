# MarketMind AI — Smart Commodity Price Intelligence & Mandi ERP

[![Deploy to Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://marketmind-ai-6ni2.onrender.com)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Node Express](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/AI%20Engine-Google%20Gemini-8E75C2?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **MarketMind AI** is an enterprise-grade cloud application built to digitize, manage, and optimize retail grocery businesses, grain merchants, and agricultural commodity traders across India. It connects internal store operations (catalog management, batch procurement, point-of-sale billing, supplier directories) with external wholesale mandi intelligence (live price feeds from the Government of India's AGMARKNET portal, automated price-spike detection, and Generative AI-powered predictive recommendations via Google Gemini).

---

## 🌟 Live Cloud Deployment

- **Live Production URL**: [https://marketmind-ai-6ni2.onrender.com](https://marketmind-ai-6ni2.onrender.com)
- **Database Engine**: MongoDB Atlas Cloud Cluster
- **Hosting Platform**: Render Cloud (Unified Full-Stack Express & React SPA Architecture)
- **AI Intelligence**: Google Gemini AI (`gemini-3.5-flash-lite` + `gemini-3.8-flash`) + High-Speed Deterministic NLP Engine
- **External Mandi Feeds**: Government of India AGMARKNET (`data.gov.in`) APMC wholesale feeds

### 🔑 Master Platform Administrator Credentials

The platform includes a dedicated **Infrastructure & Platform Manager** role:

| Field | Value |
|---|---|
| **Role** | System Administrator (`admin` Console) |
| **Email** | `admin@marketmind.ai` |
| **Username** | `admin` |
| **Password** | `Vinod@807465` |
| **Console Access** | User Management, MongoDB Atlas Metrics, API Key Configuration, Cache Management, System Purge |

> **Role Isolation Note:** The `admin` role is the infrastructure manager, not a retail shopkeeper. To test retail store workflows, sales, purchases, catalog management, and the conversational AI Copilot, register a merchant account via `/register` or sign in with any merchant credentials.

---

## 🎯 Key Capabilities & System Highlights

### 1. 10/10 Natural Language AI Copilot & Autonomous Munshi
- **Compound Multi-Step Commands (1-Shot Execution):** Executes multi-action compound sentences directly in MongoDB in a single turn:
  - *"buy the sugar at market price of 50kg and set selling at 50rs and set alert this should work"* $\rightarrow$ Restocks 50 kg Sugar at APMC rate (₹50.35/kg), updates selling price to ₹50/kg, and locks in a price alert.
  - *"buy 100kg potato at market price and set selling at 25rs"* $\rightarrow$ Creates commodity in catalog, references Bowenpally APMC wholesale rate (₹18.50/kg), logs purchase ledger, and sets retail price.
  - *"sold 10kg sugar at 52 rs"* $\rightarrow$ Deducts inventory, logs customer bill, and calculates gross profit.
- **Phono-Semantic Normalizer & Typo Tolerance:** Handles Indian trade terminology, phonetic spellings, and informal typos (`suger`/`shakar`/`chini` $\rightarrow$ sugar; `chawal`/`rise` $\rightarrow$ rice; `gehun`/`gehu`/`weat`/`atta` $\rightarrow$ wheat/flour; `daal` $\rightarrow$ dal; `tel`/`oyle` $\rightarrow$ oil; `mirchi` $\rightarrow$ chilli; `pyaz` $\rightarrow$ onion; `aloo` $\rightarrow$ potato).
- **Levenshtein Distance Fuzzy Matcher:** Automatically matches misspelled product names against store inventory with a maximum distance threshold while filtering out trade noise words.
- **Telangana APMC Mandi Market Awareness:** Knows live wholesale rates for all 25 core commodities (Bowenpally, Nizamabad, Warangal, Malakpet, Miryalaguda, Suryapet, Adilabad, Tandur, Khammam, Anakapalle) even if the store catalog is brand new:
  - *"what are the products available"* $\rightarrow$ Displays current store catalog plus wholesale commodities available to stock from Mandis.
  - *"list the top 10 cheap products"* $\rightarrow$ Returns ranked commodities by price per kg and quintal (Potato ₹18.50, Tomato ₹19.50, Wheat ₹25.80, etc.).
- **Dual-Model Gemini Architecture:** Uses `gemini-3.5-flash-lite` with automatic fallback to `gemini-3.8-flash` alongside sub-millisecond regex token parsing.
- **Container-Scoped Scrolling:** Prevents screen jumping during live chat, modal entry, or command streaming.

### 2. Real-Time APMC Mandi Price Intelligence
- Direct integration with Government of India **AGMARKNET** (`data.gov.in`) agricultural mandi data.
- Automated background polling (every 6 hours via `node-cron`) and instantaneous manual refresh.
- 3-tier resilient ingestion pipeline (Official data.gov.in API $\rightarrow$ Secondary Mandi Proxy $\rightarrow$ 25 Telangana APMC benchmark master rates).
- Pre-seeded wholesale benchmarks across 25 agricultural commodities:
  - **Paddy & Rice**: Sona Masoori, Basmati (1121), Raw Rice (Common)
  - **Pulses & Dals**: Toor Dal (Fatka), Moong Dal (Washed), Chana Dal (Desi), Urad Dal (Split), Masoor Dal (Whole), Rajma (Chitra)
  - **Edible Oils & Seeds**: Groundnut (Pod), Sunflower Oil (Refined), Mustard (Yellow)
  - **Spices & Condiments**: Turmeric (Finger), Dry Chillies (Teja), Coriander (Green), Jeera (Machine Clean), Black Pepper (Garbled), Tamarind (With Seed)
  - **Grains & Staples**: Wheat (Sharbati), Wheat (Lokwan), Sugar (M-30), Jaggery (Gur), Potato (Local), Tomato (Hybrid), Onion (Red)

### 3. Weighted Average Cost (WAC) Inventory Accounting
- True wholesale financial accounting:
  $$\text{New Unit Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{Incoming Qty} \times \text{Purchase Price})}{\text{Current Qty} + \text{Incoming Qty}}$$
- Strictly adheres to accounting integrity: market price swings **never** mutate historical purchase costs.
- COGS (Cost of Goods Sold) is computed dynamically at the exact instant of sale.
- Overselling protection prevents inventory from falling into negative numbers.

### 4. Role-Based Platform Management
- **Platform Manager (Admin):**
  - **MongoDB Atlas Health Console**: Live connection state, document metrics across all collections (Users, Products, Sales, Purchases, Alerts, MarketPrices), server uptime, heap memory usage.
  - **Merchant Management**: View all registered store owners, locations, phone numbers, and cascading account controls.
  - **API Key Console**: Live status indicators and secure runtime management of Gemini AI and AGMARKNET Gov API credentials.
  - **Cache Flushing & System Purge**: One-click flushing of in-memory caches and test-record purging.
- **Store Merchants:** Full access to inventory, sales billing, purchase orders, mandi rates, profit reports, and the AI Copilot.

### 5. Automated Volatility & Low Stock Alerts
- Automated triggers flag market shifts exceeding custom tolerance thresholds (default: $\pm 5\%$).
- Proactive low-inventory warnings when stock falls below reorder points (`stockQuantity <= minStockLevel`).
- One-click **AI Smart Scan** (`POST /api/alerts/ai-generate`) evaluates inventory across 4 intelligence dimensions:
  1. Mandi Price Dip Alert (Procurement restocking opportunity)
  2. Mandi Price Spike Alert (Margin protection)
  3. Critical Low Stock Alert
  4. Wholesale Rate vs Purchase Cost Disparity (Negative margin risk)
- Real-time in-app notification dropdown with instant read/dismiss controls.

### 6. Analytics, Financial Reports & CSV Export
- Interactive KPI cards: Today's Revenue, Gross Profit, Profit Margin %, Total Stock Value.
- Interactive charts powered by **Recharts**: Price History vs. Purchase Cost, Category Distribution, Sales Velocity.
- Instant CSV export for inventory audit, purchase records, sales ledgers, and profit analyses.

---

## 🛠️ Technology Stack & Rationale

| Layer | Technologies | Justification & Architectural Role |
|---|---|---|
| **Frontend UI** | React 18 SPA, Vite 5, React Router DOM v6, Bootstrap 5, Bootstrap Icons | Fast virtual DOM rendering, zero build latency, role-guarded declarative routes with `<Outlet />`. |
| **Data Visualization** | Recharts, Custom Responsive CSS | Declarative SVG charting for price movements, category splits, and daily sales velocity. |
| **Backend Runtime** | Node.js (v18+ / v20+ / v22+), Express.js 4 | Non-blocking asynchronous I/O event loop for handling external APIs, background timers, and REST routing. |
| **Database & ODM** | MongoDB Atlas, Mongoose 8 | Document-oriented BSON storage with strict Mongoose schema enforcement, compound indexing, and aggregation pipelines. |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs | Stateless bearer-token authentication with 10 salt rounds password hashing and role validation middleware. |
| **AI & NLP** | Google Generative AI SDK (`@google/generative-ai`), Gemini 3.5 Flash Lite + Gemini 3.8 Flash | High-speed LLM inference, native structured JSON output, paired with custom sub-millisecond regex token parser. |
| **Data Integration** | AGMARKNET REST API (`data.gov.in`), Axios | Official Government of India wholesale market prices, fallback mandi proxies, and 25 benchmark rates. |
| **Background Jobs** | `node-cron` (3.0.3) | In-process cron scheduler running every 6 hours (`0 */6 * * *`) to check prices and fire volatility alerts. |
| **Data Export** | `json2csv` (6.0.0-alpha.2) + Fallback CSV Parser | Converts MongoDB records into RFC 4180-compliant CSV download streams for business audits. |
| **Cloud Hosting** | Render (`render.yaml` Blueprint) & Vercel (`vercel.json`) | Single-deployment web service serving Express API and React static SPA with reverse-proxy rewrites. |

---

## 📁 Repository Structure & File Manifest

```
MarketMind-Ai/
├── .env.example                          # Master environment variable template
├── .gitignore                            # Git exclusions (builds, node_modules, envs)
├── package.json                          # Monorepo build and development scripts
├── README.md                             # Project documentation & reference manual
├── MARKETMIND_AI_COMPLETE_DOCUMENTATION.md # Master 2,000+ line technical handbook
├── render.yaml                           # Render Blueprint 1-click cloud deployment spec
├── vercel.json                           # Vercel serverless deployment rewrite spec
├── run.txt                               # Quick-start cheat sheet
│
├── client/                               # Frontend React + Vite Application
│   ├── public/                           # Favicon, SVGs, static assets
│   │   ├── favicon.svg                   # Application tab icon
│   │   └── logo.svg                      # Primary brand vector logo
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   └── FloatingChatbot.jsx   # Persistent floating bottom-right AI bubble
│   │   │   ├── common/
│   │   │   │   ├── ConfirmModal.jsx      # Generic confirmation modal dialog
│   │   │   │   ├── LoadingSpinner.jsx    # Animated loading spinner with message
│   │   │   │   ├── PriceChangeIndicator.jsx # Green (+)/Red (-) variance indicator
│   │   │   │   ├── StockStatus.jsx       # In Stock / Low Stock status badge
│   │   │   │   └── index.js              # Common components barrel export
│   │   │   ├── layout/
│   │   │   │   ├── Layout.jsx            # Master UI shell (Navbar + Sidebar + Outlet)
│   │   │   │   ├── Navbar.jsx            # Top navigation bar & notifications
│   │   │   │   └── Sidebar.jsx           # Role-aware side navigation menu
│   │   │   └── notifications/
│   │   │       ├── NotificationBell.jsx  # Bell icon with dynamic badge count
│   │   │       └── NotificationDropdown.jsx # Dropdown preview for latest alerts
│   │   ├── context/
│   │   │   └── AuthContext.jsx           # Global session state & token management
│   │   ├── hooks/
│   │   │   └── useAuth.js                # Custom hook exposing AuthContext methods
│   │   ├── pages/
│   │   │   ├── AdminApiKeys.jsx          # Admin: Runtime API keys configuration
│   │   │   ├── AdminDashboard.jsx        # Admin: Database overview & system health
│   │   │   ├── AdminUsers.jsx            # Admin: Merchant user directory management
│   │   │   ├── AICopilot.jsx             # Tabbed AI Hub (Insights + Chat Assistant)
│   │   │   ├── AIInsights.jsx            # Market overview & commodity trend analysis
│   │   │   ├── Chatbot.jsx               # Standalone interactive Copilot terminal
│   │   │   ├── Dashboard.jsx             # Merchant executive KPI dashboard & charts
│   │   │   ├── Login.jsx                 # Secure merchant sign-in page
│   │   │   ├── MarketPrices.jsx          # Live mandi price terminal & manual logs
│   │   │   ├── Notifications.jsx         # Alert center & threshold-breach logs
│   │   │   ├── ProductDetail.jsx         # Commodity page with historical price chart
│   │   │   ├── Products.jsx              # Catalog manager with filters & search
│   │   │   ├── Purchases.jsx             # Inward procurement restock manager
│   │   │   ├── Register.jsx              # Merchant onboarding registration page
│   │   │   ├── Reports.jsx               # Auditing reports suite & CSV export
│   │   │   ├── Sales.jsx                 # Point-of-sale terminal & sales ledger
│   │   │   ├── Settings.jsx              # Alert thresholds & APMC preferences
│   │   │   └── Suppliers.jsx             # Vendor directory management page
│   │   ├── services/
│   │   │   └── api.js                    # Central Axios client with interceptors
│   │   ├── utils/
│   │   │   └── helpers.js                # Currency, date, and math formatting helpers
│   │   ├── App.css                       # Layout CSS, responsive transitions
│   │   ├── App.jsx                       # Route definitions & access guards
│   │   ├── index.css                     # Global design system & typography
│   │   └── main.jsx                      # React DOM entry point
│   ├── index.html                        # HTML5 application template
│   ├── package.json                      # Client package specifications
│   └── vite.config.js                    # Vite bundler configuration
│
└── server/                               # Backend Express + Node.js API
    ├── config/
    │   ├── db.js                         # Mongoose MongoDB connection & DNS setup
    │   ├── gemini.js                     # Google Gemini AI client configuration
    │   ├── initAdmin.js                  # Default admin account bootstrapper
    │   └── seedMarketPrices.js           # 25-commodity APMC benchmark seeder
    ├── controllers/
    │   ├── aiController.js               # Gemini insights, forecasts, LRU cache
    │   ├── alertController.js            # Alert queries, mark read, dismissal, AI scan
    │   ├── authController.js             # User registration, login, profile queries
    │   ├── chatbotController.js          # Natural language intent & store actions
    │   ├── dashboardController.js        # Aggregated dashboard metrics & charts
    │   ├── marketPriceController.js      # Mandi observations & manual logs
    │   ├── productController.js          # Catalog CRUD, search, demo seeder
    │   ├── purchaseController.js         # Procurement batches & WAC updates
    │   ├── reportController.js           # Report generation & CSV export
    │   ├── salesController.js            # Sales transactions, COGS, low-stock alerts
    │   ├── settingsController.js         # User settings, cache flush, data purge
    │   └── supplierController.js         # Vendor directory management
    ├── jobs/
    │   └── priceChecker.js               # node-cron 6-hour automated price checker
    ├── middleware/
    │   ├── auth.js                       # JWT extraction & identity verification
    │   └── errorHandler.js               # Centralized global error handler
    ├── models/
    │   ├── Alert.js                      # Price volatility & low-stock alerts
    │   ├── MarketPrice.js                # Time-series mandi price logs
    │   ├── Product.js                    # Commodity stock, costs & ref prices
    │   ├── Purchase.js                   # Inward procurement transactions
    │   ├── Sale.js                       # Outward sales transactions
    │   ├── Settings.js                   # User thresholds & preferences
    │   ├── Supplier.js                   # Supplier business records
    │   └── User.js                       # User profile & credentials
    ├── routes/
    │   ├── admin.js                      # Admin management routes (users, db, keys)
    │   ├── ai.js                         # AI analytics endpoints
    │   ├── alerts.js                     # Alert management endpoints
    │   ├── auth.js                       # Authentication endpoints
    │   ├── chatbot.js                    # Copilot chat endpoints
    │   ├── dashboard.js                  # Dashboard metrics endpoints
    │   ├── marketPrices.js               # Mandi price endpoints
    │   ├── products.js                   # Catalog CRUD endpoints
    │   ├── purchases.js                  # Procurement endpoints
    │   ├── reports.js                    # Auditing & export endpoints
    │   ├── sales.js                      # Sales & POS endpoints
    │   ├── settings.js                   # Settings & system status endpoints
    │   └── suppliers.js                  # Supplier directory endpoints
    ├── services/
    │   ├── govApiService.js              # AGMARKNET API integration & fallbacks
    │   └── priceMonitor.js               # Price checking & alert generation
    ├── tests/
    │   ├── acceptanceTests.js            # Tests A through J acceptance verification
    │   └── testAllEndpoints.js           # Full system endpoint health check suite
    ├── utils/
    │   ├── fallbackStore.js              # In-memory transactional database fallback
    │   └── helpers.js                    # WAC, COGS, profit & format calculations
    ├── package.json                      # Server package specifications
    ├── seed.js                           # Master database seeding script
    └── server.js                         # Express application entrypoint
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18, 20, or 22 LTS)
- [Git](https://git-scm.com/)
- A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster connection string or local MongoDB instance

### 1. Clone the Repository
```bash
git clone https://github.com/gochalamvinod/MarketMind-Ai.git
cd MarketMind-Ai
```

### 2. Install Dependencies
```bash
npm install
```
*(The root `postinstall` script automatically installs and builds client dependencies).*

### 3. Configure Environment Variables
Create a `.env` file in the root or `server/` directory:
```bash
cp .env.example .env
```

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB Atlas Cloud Database Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/marketmind?retryWrites=true&w=majority

# JWT Security
JWT_SECRET=marketmind_ai_super_secret_jwt_key_telangana_2026
JWT_EXPIRE=7d

# Master Platform Admin Account
ADMIN_NAME=System Administrator
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@marketmind.ai
ADMIN_PASSWORD=Vinod@807465

# Google Gemini AI Key (Optional - uses deterministic engine if blank)
GEMINI_API_KEY=your_gemini_api_key_here

# Government of India AGMARKNET API (Optional - uses 25 Telangana APMC benchmarks if blank)
GOV_API_KEY=
GOV_API_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
GOV_API_BASE_URL=https://api.data.gov.in/resource

# Automated Market Price Monitoring
PRICE_CHECK_INTERVAL=6h
DEFAULT_STATE=Telangana
DEFAULT_MARKET=Hyderabad
ALERT_THRESHOLD=5
TARGET_MARGIN=10
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:server

# Terminal 2: Frontend Vite Client (port 5173)
npm run dev:client
```
Open `http://localhost:5173` in your browser.

---

## ☁️ Deployment Guide

### Deployment on Render (Unified Full-Stack)
MarketMind AI includes a complete `render.yaml` Blueprint:
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml`.
4. Supply your secret environment variables (`MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`).
5. Click **Apply**. Render will automatically install dependencies, build the React SPA, and launch `server/server.js`.

### Deployment on Vercel
The repository includes `vercel.json` configured for serverless execution:
- API routes `/api/(.*)` route directly to the Express server in `server/`.
- Frontend static routes `/(.*)` route to the built client SPA in `client/dist`.

---

## 📡 Complete REST API Specification

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new store owner & provision default settings | Public |
| `POST` | `/api/auth/login` | Authenticate user via email/username & return JWT | Public |
| `GET` | `/api/auth/me` | Fetch active user profile from JWT payload | Private (Bearer) |

### 2. Platform Administration (`/api/admin`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/admin/database` | Database connection status, document metrics across collections, heap memory | Admin Only |
| `GET` | `/api/admin/users` | List all registered merchant accounts | Admin Only |
| `DELETE` | `/api/admin/users/:id` | Cascading removal of a merchant store account and all records | Admin Only |
| `GET` | `/api/admin/api-keys` | Check live status of Gemini AI & AGMARKNET API keys | Admin Only |
| `PUT` | `/api/admin/api-keys` | Update runtime external API credentials | Admin Only |

### 3. Products & Catalog (`/api/products`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/products` | Retrieve catalog (supports `?search=`, `?category=`, `?lowStock=true`) | Private |
| `GET` | `/api/products/:id` | Get single product by ID with supplier populated | Private |
| `GET` | `/api/products/:id/details` | Complete product drilldown: 30-day price history, purchases, sales, analytics | Private |
| `GET` | `/api/products/stats` | Aggregated counts, stock values, and category breakdowns | Private |
| `POST` | `/api/products` | Add a new commodity to catalog | Private |
| `PUT` | `/api/products/:id` | Update product details (purchase cost cannot be directly mutated) | Private |
| `DELETE` | `/api/products/:id` | Delete product and associated market prices and alerts | Private |
| `POST` | `/api/products/seed-demo` | Preload 10 authentic grocery commodities with price logs & suppliers | Private |

### 4. Inward Purchases (`/api/purchases`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/purchases` | View purchase ledger with date filters (`?startDate=`, `?endDate=`) | Private |
| `POST` | `/api/purchases` | Record inward purchase batch & recalculate Weighted Average Cost | Private |

### 5. Sales & Point-of-Sale (`/api/sales`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/sales` | View sales history with revenue and gross profit | Private |
| `POST` | `/api/sales` | Record customer sale, validate stock, compute COGS & profit, check low-stock | Private |

### 6. APMC Mandi Market Prices (`/api/market-prices`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/market-prices` | Fetch latest market price observations (supports `?commodity=`) | Private |
| `GET` | `/api/market-prices/latest` | Retrieve latest price observation per commodity | Private |
| `GET` | `/api/market-prices/history/:productId` | Retrieve historical price series for chart rendering (with backfill) | Private |
| `POST` | `/api/market-prices/manual` | Record a manual market price observation and evaluate alert threshold | Private |
| `POST` | `/api/market-prices/fetch-now` | Trigger immediate AGMARKNET mandi price polling | Private |
| `GET` | `/api/market-prices/status` | Ingestion status, demo mode flag, last fetch timestamp | Private |

### 7. Proactive Alerts (`/api/alerts`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/alerts` | Get all alerts for the user | Private |
| `GET` | `/api/alerts/unread-count` | Get count of unread alerts for navigation badge | Private |
| `POST` | `/api/alerts` | Create custom user alert with target price | Private |
| `POST` | `/api/alerts/ai-generate` | Run AI smart scan across commodities to generate proactive alerts | Private |
| `PUT` | `/api/alerts/:id/read` | Mark single alert as read | Private |
| `PUT` | `/api/alerts/mark-all-read` | Mark all alerts as read | Private |
| `DELETE` | `/api/alerts/:id` | Delete alert notification | Private |

### 8. AI Intelligence & Copilot (`/api/ai`, `/api/chatbot`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/chatbot` | Conversational AI Copilot & compound 1-shot natural language execution | Private |
| `POST` | `/api/chatbot/message` | Alternate alias for Copilot chat endpoint | Private |
| `GET` | `/api/ai/insights` | Market condition summary, top rising/falling commodities | Private |
| `GET` | `/api/ai/product/:productId` | Commodity-level price range analysis & margin health check | Private |
| `GET` | `/api/ai/forecast/:productId` | 7 to 14-day damped momentum price forecast with disclaimer | Private |
| `GET` | `/api/ai/recommendations` | Procurement restocking opportunities & repricing advice | Private |

### 9. Auditing Reports & Export (`/api/reports`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/reports/inventory` | Inventory valuation and stock status report | Private |
| `GET` | `/api/reports/purchases` | Detailed procurement records | Private |
| `GET` | `/api/reports/sales` | Detailed sales volume and revenue report | Private |
| `GET` | `/api/reports/profit` | Profitability and margin breakdown grouped by product | Private |
| `GET` | `/api/reports/price-history` | Historical commodity price records | Private |
| `GET` | `/api/reports/export/:type` | Instant RFC 4180 CSV export download (`inventory`, `purchases`, `sales`, `profit`) | Private |

### 10. Dashboard & System Settings (`/api/dashboard`, `/api/settings`)
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/dashboard` | Aggregated metrics: stock value, today's sales, profit, low stock items | Private |
| `GET` | `/api/settings` | Get user/merchant preferences or admin system keys | Private |
| `PUT` | `/api/settings` | Update alert thresholds, margins, contact info, API keys | Private |
| `GET` | `/api/settings/admin-system` | Database connection host, collection counts, runtime memory, uptime | Admin Only |
| `POST` | `/api/settings/admin-system/flush-cache` | Flush in-memory AI & mandi price caches | Admin Only |
| `POST` | `/api/settings/admin-system/purge-data` | Purge all non-admin test accounts, products, sales, and alerts | Admin Only |

---

## 🧪 Automated Testing & Verification Suite

The repository contains an automated test harness designed for academic and enterprise validation:

### 1. Acceptance Tests A through J
Run the automated verification script:
```bash
node server/tests/acceptanceTests.js
```
The test suite verifies:
- **Test A — Product Setup:** Sets up Rice with cost ₹40/kg, selling price ₹45/kg, stock 100 kg.
- **Test B — Reference Price Update:** Observes market rate jump from ₹40 to ₹43/kg; verifies history preservation.
- **Test C — Cost Preservation Invariant:** Verifies that physical purchase cost strictly remains ₹40/kg despite market price rising to ₹43/kg.
- **Test D — Threshold Alert Generation:** Verifies that +7.5% change exceeds 5% threshold and triggers an alert.
- **Test E — Sales Profit Calculations:** Sells 10 kg at ₹45/kg; verifies Revenue ₹450, COGS ₹400, Gross Profit ₹50 (11.11% margin).
- **Test F — Weighted Average Costing Update:** Buys 110 kg at ₹43/kg into existing 90 kg @ ₹40/kg; verifies new blended unit cost of ₹41.65/kg.
- **Test G — External Source Failure Resilience:** Simulates API failure; verifies retention of last valid observation without fabricating prices.
- **Test H — Demo Mode Transparency:** Verifies fallback observations are explicitly tagged `isDemo: true` and `source: 'DEMO'`.
- **Test I — Stock Control & Low-Stock Alerts:** Verifies overselling blocking (250 kg > 200 kg) and low-stock alert when inventory drops below safety threshold.
- **Test J — Multi-Collection Data Persistence:** Verifies all records persist cleanly across server restarts.

### 2. Full Endpoint & Component Health Check
Verify all REST endpoints:
```bash
node server/tests/testAllEndpoints.js
```

---

## 🔒 Security & Data Integrity

- **Password Encryption:** All passwords hashed using `bcryptjs` with auto-salted rounds (10 rounds).
- **JWT Protection:** Stateless bearer token authentication with expiration safeguards (`JWT_EXPIRE=7d`).
- **Role Isolation:** Strict separation between Platform Admin (`admin@marketmind.ai`) and merchant store tenants.
- **Tenant Scoping:** All database collections strictly filter by `{ userId: req.user.id }` to prevent data leakage.
- **Secrets Protection:** Environment variables are strictly excluded from git tracking via `.gitignore` and `sync: false` Render configurations.

---

## 📜 License
Distributed under the **MIT License**.
