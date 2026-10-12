# MarketMind AI — Smart Commodity Price Intelligence & Mandi ERP

[![Deploy with Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://marketmind-ai-new.vercel.app)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/atlas)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Node Express](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Google Gemini](https://img.shields.io/badge/AI%20Engine-Google%20Gemini-8E75C2?style=for-the-badge&logo=google)](https://ai.google.dev/)

> **MarketMind AI** is an AI-powered commodity price intelligence, inventory optimization, and wholesale enterprise resource planning (ERP) platform designed for agricultural traders, grocery merchants, and mandi shopkeepers.

---

## 🌟 Live Demo & Cloud Deployment

- **Live Production URL**: [https://marketmind-ai-new.vercel.app](https://marketmind-ai-new.vercel.app)
- **Database Engine**: MongoDB Atlas Cloud Cluster
- **Backend Architecture**: Serverless Express on Vercel with RESTful API architecture

### 🔑 Default Launch Credentials
The application is pre-configured with a clean launch state featuring a single administrative account:

| Field | Credentials |
|---|---|
| **Role** | System Administrator |
| **Username** | `admin` |
| **Email** | `admin@marketmind.ai` |
| **Password** | `Vinod@807465` |

*(All users have complete data isolation. New users who register begin with a pristine zero-state inventory.)*

---

## 🎯 Key Features

### 1. Real-Time APMC Mandi Price Intelligence
- Direct synchronization with Government of India **AGMARKNET** (`data.gov.in`) agricultural mandi data.
- Automated background polling (every 6 hours) or instantaneous manual refresh.
- Deep tracking for **35+ major agricultural commodities** with regional market context (e.g., Bowenpally, Malakpet, Gaddiannaram in Telangana):
  - **Paddy & Rice**: Sona Masoori, Basmati, IR-64, HMT, Raw Rice
  - **Pulses & Dals**: Toor Dal, Moong Dal, Chana Dal, Urad Dal, Masoor Dal, Rajma
  - **Edible Oils**: Groundnut Oil, Sunflower Oil, Mustard Oil, Palm Oil
  - **Spices & Condiments**: Turmeric, Red Chilli, Coriander, Cumin, Black Pepper
  - **Grains & Staples**: Wheat (Lokwan, Sharbati), Maida, Sooji, Besan, Poha, Sugar, Jaggery, Salt
- **Demo Mode Fallback**: Provides realistic market simulation with volatility indexes if government API keys or external endpoints are temporarily unreachable.

### 2. Weighted Average Cost (WAC) Inventory Engine
- True wholesale financial accounting:
  $$\text{New Unit Cost} = \frac{(\text{Current Qty} \times \text{Current Cost}) + (\text{Incoming Qty} \times \text{Purchase Price})}{\text{Current Qty} + \text{Incoming Qty}}$$
- Strictly adheres to accounting integrity: external market price swings **never** mutate historical book purchase costs.
- COGS (Cost of Goods Sold) is computed dynamically at the exact instant of sale.

### 3. AI Copilot & Business Chatbot (Google Gemini)
- Conversational market assistant powered by **Google Gemini Pro 1.5**.
- Contextually aware of your live catalog, stock levels, sales velocity, and regional APMC trends.
- Answers queries such as:
  - *"Should I restock Sona Masoori rice now based on Hyderabad mandi trends?"*
  - *"Which dal gave me the highest gross profit margin this week?"*
  - *"Give me a negotiation recommendation for sunflower oil suppliers."*
- Rule-based algorithmic fallback ensures continuous 24/7 intelligence even without an external AI key.

### 4. Automated Volatility & Low Stock Alerts
- Automated triggers flag sudden market shifts exceeding custom tolerance thresholds (default: $\pm 5\%$).
- Proactive low-inventory warnings when stock falls below reorder points.
- Real-time in-app notification dropdown with instant read/dismiss controls.

### 5. Sales, Purchasing & Supplier Relationship Management
- One-click purchase recording with automated supplier linkage and instant inventory increments.
- Fast checkout billing with live stock validation (prevents negative-stock overselling).
- Comprehensive supplier directory tracking contact information, payment terms, and historical deliveries.

### 6. Analytics, Financial Reports & CSV Export
- Interactive KPI cards: Total Revenue, Gross Margin %, Inventory Valuation, Total Products.
- Interactive charts powered by **Recharts**: Price History vs. Purchase Cost, Category Distribution, Sales Velocity.
- Instant CSV export for inventory audit, purchase records, sales ledgers, and profit analyses.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend UI** | React 18, Vite 5, React Router DOM v6, Bootstrap 5, Bootstrap Icons |
| **Data Visualization** | Recharts, Custom CSS Responsive Dashboards |
| **Backend Runtime** | Node.js (v18+ / v20+), Express.js 4 |
| **Database & ODM** | MongoDB Atlas, Mongoose 8 |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs (salt rounds: 10) |
| **AI & NLP** | Google Generative AI SDK (`@google/generative-ai`), Gemini Pro |
| **Data Integration** | AGMARKNET REST API (`data.gov.in`), Axios |
| **Background Jobs** | node-cron (scheduled periodic mandi price ingestion) |
| **Deployment** | Vercel (multi-service configuration via `vercel.json`) |

---

## 📁 Repository Structure

```
MarketMind-Ai/
├── .env.example              # Master environment variable template
├── .gitignore                # Git exclusions (builds, node_modules, envs)
├── package.json              # Monorepo build and development scripts
├── README.md                 # Project documentation & reference manual
├── vercel.json               # Vercel serverless multi-route routing config
│
├── client/                   # Frontend React + Vite Application
│   ├── public/               # Favicon, SVGs, static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/         # Floating AI Chatbot widget
│   │   │   ├── common/       # Modals, Spinners, Badges, Stock indicators
│   │   │   ├── layout/       # Sidebar, Topbar, Responsive Layout wrapper
│   │   │   └── notifications/# Bell badge & notification drawer
│   │   ├── context/          # React AuthContext (JWT session state)
│   │   ├── hooks/            # Custom hooks (useAuth)
│   │   ├── pages/            # Page Views (Dashboard, Products, Sales, AI Insights, etc.)
│   │   ├── services/         # Axios API client & interceptors
│   │   ├── utils/            # Currency, date, and math formatting helpers
│   │   ├── App.jsx           # Application route definitions
│   │   └── main.jsx          # React DOM entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── server/                   # Backend Express + Node.js API
    ├── config/
    │   ├── db.js             # Mongoose MongoDB Atlas connection
    │   ├── gemini.js         # Google Gemini AI client configuration
    │   └── initAdmin.js      # Automatic launch administrator bootstrap
    ├── controllers/          # Request handlers for auth, products, sales, AI, etc.
    ├── jobs/                 # Cron jobs for automated price polling
    ├── middleware/           # JWT verification & global error handler
    ├── models/               # Mongoose Schemas (User, Product, Sale, Purchase, etc.)
    ├── routes/               # Modular Express API endpoints
    ├── services/             # AGMARKNET API scraper & price monitoring logic
    ├── tests/                # Automated verification and acceptance suites
    ├── utils/                # Calculation utilities & fallback in-memory store
    ├── package.json
    ├── seed.js               # Standalone database seed utility
    └── server.js             # Express app entry point & route registration
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

### 2. Install Dependencies
Install all root, backend, and frontend dependencies:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### 3. Configure Environment Variables
Create a `.env` file in the `server/` directory:
```bash
cp .env.example server/.env
```

Configure your environment settings:
```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas or Local Database Connection
MONGODB_URI=mongodb+srv://vinod:Vinod%40807465@marketmind-ai.gmwcc2v.mongodb.net/marketmind?retryWrites=true&w=majority&appName=MarketMind-Ai

# Authentication
JWT_SECRET=marketmind_ai_super_secret_jwt_key_telangana_2026
JWT_EXPIRE=7d

# Google Gemini AI (Optional - falls back to heuristic analysis if omitted)
GEMINI_API_KEY=your_gemini_api_key_here

# Government of India Data API (Optional - runs in Demo Mode if omitted)
GOV_API_KEY=
GOV_API_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
GOV_API_BASE_URL=https://api.data.gov.in/resource

# Market Defaults
DEFAULT_STATE=Telangana
DEFAULT_MARKET=Hyderabad
ALERT_THRESHOLD=5
TARGET_MARGIN=10
```

### 4. Start the Application
You can run both backend and frontend concurrently:

**Terminal 1 (Backend Server):**
```bash
cd server
npm run dev
# Server will listen on http://localhost:5000
# Automatic admin bootstrap runs on startup
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Vite client will run at http://localhost:5173
```

Visit `http://localhost:5173` and log in with:
- **Email**: `admin@marketmind.ai`
- **Password**: `Vinod@807465`

---

## ☁️ Deployment Guide (Vercel)

The repository includes a ready-to-use `vercel.json` configuration that builds the Vite client and exposes the Express server as serverless functions.

### Steps to Deploy:
1. Push your code to your GitHub repository:
   ```bash
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com) and import the `MarketMind-Ai` repository.
3. In the project settings, configure the following Environment Variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY` (optional)
   - `GOV_API_KEY` (optional)
4. Trigger the deployment. Vercel will automatically build the React client and mount Express API routes under `/api/*`.

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new store owner | Public |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | Public |
| `GET` | `/api/auth/me` | Fetch active profile | Private |

### Products & Inventory
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/products` | Retrieve catalog (supports `?search=`, `?category=`, `?lowStock=true`) | Private |
| `GET` | `/api/products/:id` | Get individual product details | Private |
| `POST` | `/api/products` | Add a new commodity | Private |
| `PUT` | `/api/products/:id` | Update product specifications | Private |
| `DELETE` | `/api/products/:id` | Remove product | Private |
| `GET` | `/api/products/stats` | Aggregate inventory valuation statistics | Private |

### Purchases & Sales
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/purchases` | View purchase ledger | Private |
| `POST` | `/api/purchases` | Record purchase (recalculates weighted average cost) | Private |
| `GET` | `/api/sales` | View sales history | Private |
| `POST` | `/api/sales` | Record sale (deducts stock, evaluates gross margin) | Private |

### APMC Mandi Market Prices
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/market-prices` | Fetch latest market price observations | Private |
| `GET` | `/api/market-prices/latest` | Retrieve latest price per commodity | Private |
| `GET` | `/api/market-prices/status` | Ingestion status & connection health | Private |
| `GET` | `/api/market-prices/history/:productId`| Historical price trend for commodity | Private |
| `POST` | `/api/market-prices/fetch-now` | Force immediate AGMARKNET scrape | Private |

### AI Insights & Copilot
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/ai/insights` | Comprehensive market trend analysis | Private |
| `GET` | `/api/ai/product/:productId` | AI valuation & margin recommendation | Private |
| `GET` | `/api/ai/forecast/:productId` | Predictive commodity price trajectory | Private |
| `POST` | `/api/chatbot/message` | Interactive conversation with MarketMind AI Copilot | Private |

### Reports & Exports
| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/reports/inventory` | Inventory status report | Private |
| `GET` | `/api/reports/purchases` | Detailed purchase records | Private |
| `GET` | `/api/reports/sales` | Detailed sales report | Private |
| `GET` | `/api/reports/profit` | Profit & Loss statement | Private |
| `GET` | `/api/reports/export/:type` | Instant CSV export (`inventory`, `purchases`, `sales`, `profit`) | Private |

---

## 🧪 Acceptance Testing & Verification

The project includes automated verification covering financial mathematics, data isolation, and boundary conditions:

Run the test suite:
```bash
cd server
npm test
```

### Verified Scenarios:
- **Scenario A**: Product addition with specified baseline cost & selling price.
- **Scenario B**: APMC mandi price update tracking and historical trend persistence.
- **Scenario C**: Stock cost retention (ensuring market price fluctuations never alter actual inventory purchase cost).
- **Scenario D**: Volatility threshold detection ($>5\%$ shift triggering automated alert).
- **Scenario E**: COGS deduction and gross profit accuracy on sales.
- **Scenario F**: Multi-batch purchase weighted average cost recalculation.
- **Scenario G**: External API failover and seamless fallback store resilience.
- **Scenario H**: Transparent Demo Mode operation when government API keys are absent.
- **Scenario I**: Strict negative-stock overselling prevention.
- **Scenario J**: Multi-tenant data isolation and session persistence.

---

## 🔒 Security & Data Integrity

- **Password Encryption**: All passwords securely hashed using `bcryptjs` with auto-salted key stretching.
- **JWT Protection**: Secure stateless token authentication with expiration safeguards.
- **Sanitization & Validation**: All incoming requests validated using `express-validator`.
- **Tenant Isolation**: Every database query scoped strictly to the authenticated `userId`.

---

## 📜 License
Distributed under the **MIT License**. See `LICENSE` for more information.
