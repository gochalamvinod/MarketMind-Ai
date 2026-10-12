const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const Alert = require('../models/Alert');
const MarketPrice = require('../models/MarketPrice');

let isInitialized = false;

/**
 * Ensure database contains only the requested admin account on launch
 * Username: admin
 * Password: Vinod@807465
 * Email: admin@marketmind.ai
 */
const initAdminUser = async () => {
  if (isInitialized || mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    const adminEmail = 'admin@marketmind.ai';
    const adminUsername = 'admin';
    const rawPassword = 'Vinod@807465';

    // Check if admin already exists
    let admin = await User.findOne({
      $or: [{ email: adminEmail }, { username: adminUsername }]
    });

    if (!admin) {
      console.log('[AdminInit] Initializing admin account (admin / admin@marketmind.ai)...');

      // Clear any legacy test data so launch contains ONLY admin
      await Promise.all([
        User.deleteMany({ email: { $ne: adminEmail } }),
        Product.deleteMany({}),
        Supplier.deleteMany({}),
        Purchase.deleteMany({}),
        Sale.deleteMany({}),
        Alert.deleteMany({}),
        MarketPrice.deleteMany({}),
        Settings.deleteMany({})
      ]);

      admin = await User.create({
        name: 'Admin',
        username: adminUsername,
        email: adminEmail,
        password: rawPassword,
        role: 'admin',
        businessName: 'Vinod Traders',
        phone: '+91 9876543210',
        address: 'Hyderabad, Telangana'
      });

      await Settings.create({
        userId: admin._id,
        alertThreshold: 5,
        targetMargin: 10,
        priceCheckInterval: '6h',
        preferredState: 'Telangana',
        preferredMarkets: ['Hyderabad'],
        demoMode: false
      });

      console.log('[AdminInit] Admin account created successfully! (Username: admin, Email: admin@marketmind.ai)');
    } else {
      // Ensure password and username are up to date
      admin.password = rawPassword;
      admin.username = adminUsername;
      admin.role = 'admin';
      await admin.save();
    }

    isInitialized = true;
  } catch (err) {
    console.warn('[AdminInit] Note during admin verification:', err.message);
  }
};

module.exports = initAdminUser;
