require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const User = require('./models/User');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');
const Purchase = require('./models/Purchase');
const Sale = require('./models/Sale');
const MarketPrice = require('./models/MarketPrice');
const Alert = require('./models/Alert');
const Settings = require('./models/Settings');

const seedDatabase = async () => {
  const mongoURI =
    process.env.MONGODB_URI ||
    'mongodb+srv://vinod:Vinod%40807465@marketmind-ai.gmwcc2v.mongodb.net/marketmind?retryWrites=true&w=majority&appName=MarketMind-Ai';

  try {
    console.log('[Seeder] Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('[Seeder] Connected successfully.');

    // 1. Clear existing collections
    console.log('[Seeder] Clearing old records...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Supplier.deleteMany({}),
      Purchase.deleteMany({}),
      Sale.deleteMany({}),
      MarketPrice.deleteMany({}),
      Alert.deleteMany({}),
      Settings.deleteMany({})
    ]);

    // 2. Create Owner/Admin Account
    console.log('[Seeder] Creating admin user (admin / admin@marketmind.ai)...');
    const user = await User.create({
      name: 'Admin',
      email: 'admin@marketmind.ai',
      username: 'admin',
      password: 'Vinod@807465',
      role: 'admin',
      businessName: 'Vinod Traders',
      phone: '+91 9876543210',
      address: 'Hyderabad, Telangana'
    });

    // 3. Create Settings
    console.log('[Seeder] Configuring default settings...');
    await Settings.create({
      userId: user._id,
      alertThreshold: 5,
      targetMargin: 10,
      priceCheckInterval: '6h',
      preferredState: 'Telangana',
      preferredMarkets: ['Hyderabad'],
      demoMode: false
    });

    console.log('====================================================');
    console.log(' DATABASE INITIALIZATION COMPLETE');
    console.log(' The application contains ONLY the admin account:');
    console.log(' - Username: admin');
    console.log(' - Email:    admin@marketmind.ai');
    console.log(' - Password: Vinod@807465');
    console.log(' - Products: 0 (Clean Launch)');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Error initializing database:', error.message);
    process.exit(1);
  }
};

seedDatabase();
