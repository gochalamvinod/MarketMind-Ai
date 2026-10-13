require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { isDemoMode } = require('./utils/helpers');

// Server configuration


const app = express();

const initAdminUser = require('./config/initAdmin');
const { seedMarketPrices } = require('./config/seedMarketPrices');

// Database Connection
connectDB().then(async () => {
  await initAdminUser();
  await seedMarketPrices();
}).catch(() => {});

// Core Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes('localhost') ||
        origin.endsWith('.vercel.app') ||
        (process.env.CLIENT_URL && origin === process.env.CLIENT_URL)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection assurance middleware (non-blocking for serverless)
app.use(async (req, res, next) => {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
      await initAdminUser();
    } catch (err) {
      console.warn('[DB Middleware] Connecting in resilient mode:', err.message);
    }
  } else {
    initAdminUser().catch(() => {});
  }
  next();
});




// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString(),
    demoMode: isDemoMode()
  });
});

// Mount Routes directly for reliable Vercel bundling
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/market-prices', require('./routes/marketPrices'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/admin', require('./routes/admin'));

// 404 Route Handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global Centralized Error Handler Middleware
app.use(errorHandler);

// Initialize background jobs (Price Checker)
const initPriceCheckerJob = () => {
  try {
    const priceChecker = require('./jobs/priceChecker');
    if (typeof priceChecker === 'function') {
      priceChecker();
    } else if (priceChecker && typeof priceChecker.startPriceCheckerJob === 'function') {
      priceChecker.startPriceCheckerJob();
    } else if (priceChecker && typeof priceChecker.start === 'function') {
      priceChecker.start();
    }
    console.log('[Scheduler] Price checker job initialized');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.log('[Scheduler] jobs/priceChecker will be activated once module is available');
    } else {
      console.error('[Scheduler] Error starting price checker:', err.message);
    }
  }
};

initPriceCheckerJob();

// Start Server
const PORT = process.env.PORT || 5000;
let server = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    const demoStatus = isDemoMode()
      ? 'DEMO MODE (Simulated AGMARKNET prices)'
      : 'LIVE AGMARKNET API (Resource: 9ef84268-d588-465a-a308-a864a43d0070)';

    console.log('====================================================');
    console.log(`  MarketMind AI Server running on port: ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Data Mode: ${demoStatus}`);
    console.log(`  Frontend Origin: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
    console.log(`  API Health: http://localhost:${PORT}/api/health`);
    console.log('====================================================');
  });
}


module.exports = app;
module.exports.app = app;
module.exports.server = server;

