const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Alert = require('../models/Alert');
const MarketPrice = require('../models/MarketPrice');
const { flushAiCache } = require('./aiController');

/**
 * @desc    Get user or admin settings
 * @route   GET /api/settings
 * @access  Private
 */
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'name email username role businessName phone address city state firstName lastName'
    );

    const isAdmin = (user && user.role === 'admin') || req.user.role === 'admin';

    let settings = null;
    if (mongoose.connection.readyState === 1) {
      settings = await Settings.findOne({ userId: req.user.id });
      if (!settings) {
        settings = await Settings.create({
          userId: req.user.id,
          alertThreshold: 5,
          targetMargin: 10,
          priceCheckInterval: '6h',
          preferredState: 'Telangana',
          preferredMarkets: ['Hyderabad'],
          demoMode: false
        });
      }
    }

    const settingsObj = settings ? settings.toObject() : {
      alertThreshold: 5,
      targetMargin: 10,
      priceCheckInterval: '6h',
      preferredState: 'Telangana',
      preferredMarkets: ['Hyderabad'],
      demoMode: false
    };

    if (isAdmin) {
      return res.status(200).json({
        success: true,
        data: {
          ...settingsObj,
          role: 'admin',
          ownerName: 'System Administrator',
          name: 'System Administrator',
          businessName: '', // Admins maintain the platform, not a retail shop
          email: user?.email || 'admin@marketmind.ai',
          username: user?.username || 'admin',
          phone: '',
          address: '',
          city: '',
          state: '',
          geminiApiKey: process.env.GEMINI_API_KEY || '',
          govApiKey: process.env.GOV_API_KEY || settingsObj.govApiKey || '',
          govApiResourceId: process.env.GOV_API_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070',
          geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
          govApiConfigured: Boolean(process.env.GOV_API_KEY && process.env.GOV_API_KEY.trim()),
          demoMode: false
        }
      });
    }

    // Regular Merchant / User Profile
    return res.status(200).json({
      success: true,
      data: {
        ...settingsObj,
        role: 'user',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        ownerName: user?.name || '',
        name: user?.name || '',
        businessName: user?.businessName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        city: user?.city || '',
        state: user?.state || '',
        demoMode: false
      }
    });
  } catch (error) {
    console.warn('Error fetching settings:', error.message);
    return res.status(200).json({
      success: true,
      data: {
        alertThreshold: 5,
        targetMargin: 10,
        priceCheckInterval: '6h',
        preferredState: 'Telangana',
        preferredMarkets: ['Hyderabad'],
        demoMode: false,
        role: req.user.role || 'user'
      }
    });
  }
};

/**
 * @desc    Update user or admin settings
 * @route   PUT /api/settings
 * @access  Private
 */
const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const isAdmin = (user && user.role === 'admin') || req.user.role === 'admin';

    const {
      alertThreshold,
      targetMargin,
      priceCheckInterval,
      preferredState,
      preferredMarkets,
      demoMode,
      // Regular user profile
      firstName,
      lastName,
      businessName,
      phone,
      address,
      city,
      state,
      // Admin API keys
      geminiApiKey,
      govApiKey,
      govApiResourceId
    } = req.body;

    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new Settings({ userId: req.user.id });
    }

    if (alertThreshold !== undefined) settings.alertThreshold = Math.max(1, Math.min(50, Number(alertThreshold)));
    if (targetMargin !== undefined) settings.targetMargin = Math.max(1, Math.min(100, Number(targetMargin)));
    if (priceCheckInterval !== undefined) settings.priceCheckInterval = priceCheckInterval;
    if (preferredState !== undefined) settings.preferredState = preferredState.trim();
    if (preferredMarkets !== undefined) {
      if (Array.isArray(preferredMarkets)) {
        settings.preferredMarkets = preferredMarkets;
      } else if (typeof preferredMarkets === 'string') {
        settings.preferredMarkets = preferredMarkets.split(',').map((m) => m.trim()).filter(Boolean);
      }
    }
    settings.demoMode = false; // Always enforce professional live operation

    // Handle Admin-only API key updates
    if (isAdmin) {
      if (geminiApiKey !== undefined) {
        process.env.GEMINI_API_KEY = geminiApiKey.trim();
      }
      if (govApiKey !== undefined) {
        process.env.GOV_API_KEY = govApiKey.trim();
        settings.govApiKey = govApiKey.trim();
      }
      if (govApiResourceId !== undefined) {
        process.env.GOV_API_RESOURCE_ID = govApiResourceId.trim();
      }
    }

    await settings.save();

    // Handle User Profile Updates
    if (!isAdmin && user) {
      const updateFields = {};
      if (firstName !== undefined) updateFields.firstName = firstName.trim();
      if (lastName !== undefined) updateFields.lastName = lastName.trim();
      if (firstName !== undefined || lastName !== undefined) {
        const f = firstName !== undefined ? firstName.trim() : (user.firstName || '');
        const l = lastName !== undefined ? lastName.trim() : (user.lastName || '');
        updateFields.name = `${f} ${l}`.trim() || user.name;
      }
      if (businessName !== undefined) updateFields.businessName = businessName.trim();
      if (phone !== undefined) updateFields.phone = phone.trim();
      if (address !== undefined) updateFields.address = address.trim();
      if (city !== undefined) updateFields.city = city.trim();
      if (state !== undefined) updateFields.state = state.trim();

      await User.findByIdAndUpdate(req.user.id, updateFields);
    }

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error saving settings',
      error: error.message
    });
  }
};

const checkIsAdmin = async (req) => {
  if (req.user?.role === 'admin') return true;
  if (req.user?.email === 'admin@marketmind.ai') return true;
  if (req.user?.id && mongoose.connection.readyState === 1) {
    const user = await User.findById(req.user.id).select('role email');
    return user && (user.role === 'admin' || user.email === 'admin@marketmind.ai');
  }
  return false;
};

/**
 * @desc    Get Admin System & Database Health Status
 * @route   GET /api/settings/admin-system
 * @access  Private (Admin only)
 */
const getAdminSystemStatus = async (req, res) => {
  try {
    const isAdmin = await checkIsAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
    }

    const host = mongoose.connection.host || 'MongoDB Atlas Cluster';
    const dbName = mongoose.connection.name || 'marketmind';
    const readyState = mongoose.connection.readyState;

    const [userCount, prodCount, saleCount, purCount, alertCount, priceCount] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Sale.countDocuments(),
      Purchase.countDocuments(),
      Alert.countDocuments(),
      MarketPrice.countDocuments()
    ]);

    return res.status(200).json({
      success: true,
      data: {
        database: {
          status: readyState === 1 ? 'Connected' : 'Connecting/Fallback',
          host,
          databaseName: dbName,
          counts: {
            users: userCount,
            products: prodCount,
            sales: saleCount,
            purchases: purCount,
            alerts: alertCount,
            marketPrices: priceCount
          }
        },
        runtime: {
          nodeVersion: process.version,
          platform: process.platform,
          uptimeSeconds: Math.floor(process.uptime()),
          environment: process.env.NODE_ENV || 'development',
          geminiModel: 'gemini-3.5-flash-lite',
          geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
          govApiConfigured: Boolean(process.env.GOV_API_KEY && process.env.GOV_API_KEY.trim())
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Flush Server In-Memory AI and Price Caches
 * @route   POST /api/settings/admin-system/flush-cache
 * @access  Private (Admin only)
 */
const flushCache = async (req, res) => {
  try {
    const isAdmin = await checkIsAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin role required' });
    }

    flushAiCache();
    return res.status(200).json({
      success: true,
      message: 'All in-memory AI & market price caches flushed successfully!'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc    Purge All Non-Admin Test Accounts and Records
 * @route   POST /api/settings/admin-system/purge-data
 * @access  Private (Admin only)
 */
const purgeNonAdminData = async (req, res) => {
  try {
    const isAdmin = await checkIsAdmin(req);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin role required' });
    }

    const adminEmail = 'admin@marketmind.ai';

    await Promise.all([
      User.deleteMany({ email: { $ne: adminEmail } }),
      Product.deleteMany({}),
      Purchase.deleteMany({}),
      Sale.deleteMany({}),
      Alert.deleteMany({}),
      Supplier.deleteMany({}),
      MarketPrice.deleteMany({})
    ]);

    flushAiCache();

    return res.status(200).json({
      success: true,
      message: 'All non-admin test accounts and temporary records purged cleanly!'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getAdminSystemStatus,
  flushCache,
  purgeNonAdminData
};
