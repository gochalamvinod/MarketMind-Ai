# MarketMind AI — Smart Price Intelligence

> AI-Powered Commodity Price Intelligence and Business Optimization System

## Overview
MarketMind AI is a full-stack web application for grocery and commodity businesses. It helps shop owners manage inventory, track purchases and sales, monitor real-time market prices from Government of India (AGMARKNET) data, receive automated price alerts, and get AI-powered business insights using Google Gemini.

### Key Features
- **Inventory Management**: Track products, stock levels, purchase costs, and selling prices
- **Purchase & Sales Tracking**: Record transactions with automatic stock and cost updates
- **Market Price Monitoring**: Automated price fetching from AGMARKNET (Government of India) API
- **Smart Alerts**: Automatic notifications for price changes and low stock
- **AI Insights**: Google Gemini-powered market analysis and recommendations
- **Profit Analytics**: Revenue, COGS, gross profit, and margin calculations
- **Reports & Export**: Comprehensive reports with CSV export
- **Demo Mode**: Full functionality with simulated data when live API is unavailable

### Commodity Coverage (35+ Products)
Rice (Sona Masoori, Basmati, IR-64, HMT), Wheat (Lokwan, Sharbati), Toor Dal, Moong Dal, Chana Dal, Urad Dal, Masoor Dal, Rajma, Sugar, Jaggery, Groundnut Oil, Sunflower Oil, Mustard Oil, Turmeric, Red Chilli, Coriander, Cumin, Black Pepper, Maida, Sooji, Besan, Poha, Salt, Tamarind, and more.

## Technology Stack
| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite |
| Styling | Bootstrap 5 + Custom CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT + bcrypt |
| Charts | Recharts |
| Market Data | AGMARKNET API (data.gov.in) |
| AI Engine | Google Gemini API |
| Scheduler | node-cron |

## Prerequisites
- Node.js 18+ (https://nodejs.org)
- MongoDB 6+ (https://www.mongodb.com/try/download/community)
- Git

## Installation & Setup (Windows PowerShell)

### Step 1: Clone or navigate to the project
```powershell
cd "c:\Users\Sri Pallav\OneDrive\Desktop\PROJECT FSDAI\marketmind-ai"
```

### Step 2: Install backend dependencies
```powershell
cd server
npm install
```

### Step 3: Install frontend dependencies
```powershell
cd ..\client
npm install
```

### Step 4: Configure environment variables
```powershell
cd ..\server
copy ../.env.example .env
```
Edit `server/.env` with your values:
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string
- `GOV_API_KEY`: Your data.gov.in API key (optional, runs in Demo Mode without it)
- `GEMINI_API_KEY`: Your Google Gemini API key (optional)

### Step 5: Start MongoDB
Make sure MongoDB is running on localhost:27017.

### Step 6: Seed the database (optional)
```powershell
cd server
node seed.js
```
This creates a demo account (admin@marketmind.com / password123) with sample data.

### Step 7: Start the backend
```powershell
cd server
npm run dev
```
Backend runs on http://localhost:5000

### Step 8: Start the frontend (new terminal)
```powershell
cd client
npm run dev
```
Frontend runs on http://localhost:5173

### Step 9: Open in browser
Visit http://localhost:5173

## Demo Account
- Email: admin@marketmind.com
- Password: password123

## Government API Setup
1. Register free at https://data.gov.in/user/register
2. After login, go to https://data.gov.in/user/dashboard
3. Generate an API key
4. Add to `server/.env` as `GOV_API_KEY=your-key-here`
5. Restart the server

## Gemini AI Setup
1. Go to https://aistudio.google.com/app/apikey
2. Create an API key
3. Add to `server/.env` as `GEMINI_API_KEY=your-key-here`
4. Restart the server

## Demo Mode
When `GOV_API_KEY` is not configured, the app runs in **Demo Mode**:
- Simulated market prices with realistic fluctuations
- All features work (alerts, charts, comparisons)
- A visible DEMO MODE badge appears on all market data
- Simulated data is never mixed with or presented as live market data

## API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products (supports ?search=, ?category=, ?lowStock=true) |
| GET | /api/products/:id | Get product |
| POST | /api/products | Create product |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| GET | /api/products/stats | Product statistics |

### Suppliers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/suppliers | List suppliers |
| POST | /api/suppliers | Create supplier |
| PUT | /api/suppliers/:id | Update supplier |
| DELETE | /api/suppliers/:id | Delete supplier |

### Purchases
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/purchases | List purchases |
| POST | /api/purchases | Record purchase (updates stock & cost) |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sales | List sales |
| POST | /api/sales | Record sale (reduces stock, calculates profit) |

### Market Prices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/market-prices | List observations |
| GET | /api/market-prices/latest | Latest prices per product |
| GET | /api/market-prices/status | API status |
| GET | /api/market-prices/history/:productId | Price history |
| POST | /api/market-prices/manual | Manual price entry |
| POST | /api/market-prices/fetch-now | Trigger immediate fetch |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts | List alerts |
| GET | /api/alerts/unread-count | Unread count |
| PUT | /api/alerts/:id/read | Mark read |
| PUT | /api/alerts/mark-all-read | Mark all read |
| DELETE | /api/alerts/:id | Delete alert |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | All dashboard stats |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/inventory | Inventory report |
| GET | /api/reports/purchases | Purchase report |
| GET | /api/reports/sales | Sales report |
| GET | /api/reports/profit | Profit report |
| GET | /api/reports/price-history | Price history report |
| GET | /api/reports/export/:type | CSV export |

### AI Insights
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/ai/insights | Market analysis |
| GET | /api/ai/product/:productId | Product analysis |
| GET | /api/ai/forecast/:productId | Price forecast |
| GET | /api/ai/recommendations | Recommendations |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/settings | Get settings |
| PUT | /api/settings | Update settings |

## Acceptance Tests

| Test | Scenario | Expected Result |
|------|----------|----------------|
| A | Add rice, purchase at ₹40/kg, sell at ₹45/kg | Product created with correct cost and price |
| B | Market price changes ₹40→₹43 | Current ref price=₹43, previous=₹40, history has both |
| C | After market change, check stock cost | Still ₹40/kg (not overwritten by market) |
| D | 7.5% increase with 5% threshold | Alert created with full details |
| E | Sell 10kg at ₹45 with ₹40 cost | Revenue=₹450, COGS=₹400, Profit=₹50 |
| F | New purchase at ₹43/kg | Recorded separately, weighted avg updates |
| G | API failure | Last data retained, stale status shown |
| H | Demo mode | Simulated changes with DEMO label |
| I | Sale exceeding stock | Blocked with error message |
| J | Refresh/logout/login | All data persists |

## Inventory Costing Method
This application uses **Weighted Average Cost** method:
- New Cost = (Existing Qty × Existing Cost + New Qty × New Cost) ÷ Total Qty
- Market reference prices NEVER affect inventory cost
- COGS calculated using weighted average cost at time of sale

## Important Notes
- Market prices are from AGMARKNET mandi data and may differ from actual wholesale prices
- All profit figures are gross profit (before expenses like transport, rent, labour, taxes)
- AI insights and forecasts are estimates, not guarantees
- Selling prices never change automatically - owner approval required
- Price alerts detect changes on next successful check, not instantly

## Project Structure
```
marketmind-ai/
├── client/          # React Frontend (Vite)
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── context/     # Auth context
│   │   ├── services/    # API service layer
│   │   ├── hooks/       # Custom hooks
│   │   └── utils/       # Helper functions
│   └── package.json
├── server/          # Express Backend
│   ├── config/      # DB & API configuration
│   ├── controllers/ # Route handlers
│   ├── middleware/  # Auth & error handling
│   ├── models/      # Mongoose schemas
│   ├── routes/      # API routes
│   ├── services/    # Business logic
│   ├── jobs/        # Scheduled tasks
│   ├── utils/       # Utilities
│   └── server.js    # Entry point
├── .env.example     # Environment template
├── .gitignore
└── README.md
```

## License
This project is created as a Final Year B.Tech CSE Project.

## Authors
Sri Pallav
