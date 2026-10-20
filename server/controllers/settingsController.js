const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const User = require('../models/User');

/**
 * @desc    Get user store settings and profile
 * @route   GET /api/settings
 * @access  Private
 */
const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'name email username role businessName phone address city state firstName lastName'
    );

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

    return res.status(200).json({
      success: true,
      data: {
        ...settingsObj,
        role: user?.role || req.user?.role || 'user',
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
        role: req.user?.role || 'user'
      }
    });
  }
};

/**
 * @desc    Update user store settings and profile
 * @route   PUT /api/settings
 * @access  Private
 */
const updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const {
      alertThreshold,
      targetMargin,
      priceCheckInterval,
      preferredState,
      preferredMarkets,
      firstName,
      lastName,
      businessName,
      phone,
      address,
      city,
      state
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
    settings.demoMode = false;

    await settings.save();

    // Update Merchant User Profile
    if (user) {
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

module.exports = {
  getSettings,
  updateSettings
};
