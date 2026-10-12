require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { isDemoMode } = require('./utils/helpers');

// Helper to safely load route modules if they exist or provide graceful stub
const loadRoute = (modulePath) => {
  try {
    return require(modulePath);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND' && err.message.includes(modulePath.replace('./', ''))) {
      const router = express.Router();
      router.all('*', (req, res) => {
        res.status(501).json({
          success: false,
          message: `Endpoint ${req.originalUrl} handler (${modulePath}) is being configured.`
        });
      });
      return router;
    }
    throw err;
  }
};

const app = express();

// Database Connection (initial trigger for local dev)
if (!process.env.VERCEL) {
  connectDB();
}

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

// Database connection assurance middleware (for serverless invocations)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB Middleware] Connection failed:', err.message);
    res.status(500).json({
      success: false,
      message: 'Database connection failed. Please verify MONGODB_URI and MongoDB Atlas Network Access (0.0.0.0/0).'
    });
  }
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

// Mount Routes
app.use('/api/auth', loadRoute('./routes/auth'));
app.use('/api/products', loadRoute('./routes/products'));
app.use('/api/suppliers', loadRoute('./routes/suppliers'));
app.use('/api/purchases', loadRoute('./routes/purchases'));
app.use('/api/sales', loadRoute('./routes/sales'));
app.use('/api/market-prices', loadRoute('./routes/marketPrices'));
app.use('/api/alerts', loadRoute('./routes/alerts'));
app.use('/api/dashboard', loadRoute('./routes/dashboard'));
app.use('/api/reports', loadRoute('./routes/reports'));
app.use('/api/ai', loadRoute('./routes/ai'));
app.use('/api/chatbot', loadRoute('./routes/chatbot'));
app.use('/api/settings', loadRoute('./routes/settings'));

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

