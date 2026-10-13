const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Alert = require('../models/Alert');
const MarketPrice = require('../models/MarketPrice');

/**
 * Admin-only middleware
 */
const adminOnly = async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') return next();
    if (req.user?.email === 'admin@marketmind.ai') return next();
    if (req.user?.id) {
      const user = await User.findById(req.user.id).select('role email');
      if (user && (user.role === 'admin' || user.email === 'admin@marketmind.ai')) {
        req.user.role = 'admin';
        return next();
      }
    }
    return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

router.use(auth);
router.use(adminOnly);

/**
 * @desc    Get all registered users (merchants)
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('name email role businessName phone address city state firstName lastName createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @desc    Delete a user (non-admin only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private (Admin only)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role === 'admin' || user.email === 'admin@marketmind.ai') {
      return res.status(400).json({ success: false, message: 'Cannot delete admin account' });
    }

    // Clean up user's data
    await Promise.all([
      Product.deleteMany({ userId: user._id }),
      Sale.deleteMany({ userId: user._id }),
      Purchase.deleteMany({ userId: user._id }),
      Alert.deleteMany({ userId: user._id }),
      User.findByIdAndDelete(user._id)
    ]);

    return res.status(200).json({
      success: true,
      message: `User ${user.name || user.email} and all their data deleted successfully`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @desc    Get full database overview (collections, counts, connection info)
 * @route   GET /api/admin/database
 * @access  Private (Admin only)
 */
router.get('/database', async (req, res) => {
  try {
    const host = mongoose.connection.host || 'MongoDB Atlas Cluster';
    const dbName = mongoose.connection.name || 'marketmind';
    const readyState = mongoose.connection.readyState;
    const stateMap = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };

    const [userCount, prodCount, saleCount, purCount, alertCount, priceCount] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Sale.countDocuments(),
      Purchase.countDocuments(),
      Alert.countDocuments(),
      MarketPrice.countDocuments()
    ]);

    // Get recent activity
    const recentUsers = await User.find({}).select('name email role createdAt').sort({ createdAt: -1 }).limit(5);

    return res.status(200).json({
      success: true,
      data: {
        connection: {
          status: stateMap[readyState] || 'Unknown',
          host,
          databaseName: dbName,
          readyState
        },
        collections: [
          { name: 'Users', count: userCount, icon: 'people' },
          { name: 'Products', count: prodCount, icon: 'box' },
          { name: 'Sales', count: saleCount, icon: 'cart' },
          { name: 'Purchases', count: purCount, icon: 'receipt' },
          { name: 'Alerts', count: alertCount, icon: 'bell' },
          { name: 'Market Prices', count: priceCount, icon: 'graph' }
        ],
        totalDocuments: userCount + prodCount + saleCount + purCount + alertCount + priceCount,
        recentUsers,
        runtime: {
          nodeVersion: process.version,
          platform: process.platform,
          uptimeSeconds: Math.floor(process.uptime()),
          memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          environment: process.env.NODE_ENV || 'development'
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @desc    Get API keys configuration status
 * @route   GET /api/admin/api-keys
 * @access  Private (Admin only)
 */
router.get('/api-keys', async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
        geminiModel: 'gemini-2.0-flash',
        govApiKey: process.env.GOV_API_KEY || '',
        govApiConfigured: Boolean(process.env.GOV_API_KEY && process.env.GOV_API_KEY.trim()),
        govApiResourceId: process.env.GOV_API_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @desc    Update API keys
 * @route   PUT /api/admin/api-keys
 * @access  Private (Admin only)
 */
router.put('/api-keys', async (req, res) => {
  try {
    const { geminiApiKey, govApiKey, govApiResourceId } = req.body;

    if (geminiApiKey !== undefined) process.env.GEMINI_API_KEY = geminiApiKey.trim();
    if (govApiKey !== undefined) process.env.GOV_API_KEY = govApiKey.trim();
    if (govApiResourceId !== undefined) process.env.GOV_API_RESOURCE_ID = govApiResourceId.trim();

    return res.status(200).json({
      success: true,
      message: 'API keys updated successfully (runtime). Add to .env for persistence.',
      data: {
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
        govApiConfigured: Boolean(process.env.GOV_API_KEY && process.env.GOV_API_KEY.trim())
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
