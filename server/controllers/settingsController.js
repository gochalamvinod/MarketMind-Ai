const Settings = require('../models/Settings');
const User = require('../models/User');

/**
 * @desc    Get user settings
 * @route   GET /api/settings
 * @access  Private
 */
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user.id });

    if (!settings) {
      settings = await Settings.create({
        userId: req.user.id,
        alertThreshold: 5,
        targetMargin: 10,
        priceCheckInterval: '6h',
        preferredState: 'Telangana',
        preferredMarkets: ['Hyderabad'],
        demoMode: !process.env.GOV_API_KEY
      });
    }

    const user = await User.findById(req.user.id).select('name email businessName phone address');

    return res.status(200).json({
      success: true,
      data: {
        ...settings.toObject(),
        businessName: user ? user.businessName : 'My Grocery Business',
        ownerName: user ? user.name : '',
        email: user ? user.email : '',
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
        govApiConfigured: Boolean(process.env.GOV_API_KEY && process.env.GOV_API_KEY.trim())
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving settings',
      error: error.message
    });
  }
};

/**
 * @desc    Update user settings
 * @route   PUT /api/settings
 * @access  Private
 */
const updateSettings = async (req, res) => {
  try {
    const {
      alertThreshold,
      targetMargin,
      priceCheckInterval,
      preferredState,
      preferredMarkets,
      demoMode,
      businessName,
      govApiKey
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
    if (demoMode !== undefined) settings.demoMode = Boolean(demoMode);
    if (govApiKey !== undefined) settings.govApiKey = govApiKey;

    await settings.save();

    if (businessName) {
      await User.findByIdAndUpdate(req.user.id, { businessName: businessName.trim() });
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

module.exports = {
  getSettings,
  updateSettings
};
