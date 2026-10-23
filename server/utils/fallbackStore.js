const bcrypt = require('bcryptjs');

// In-memory resilient store used when MongoDB is offline/disconnected
class FallbackStore {
  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.suppliers = new Map();
    this.purchases = new Map();
    this.sales = new Map();
    this.alerts = new Map();
    this.settings = new Map();
    this.marketPrices = new Map();

    this.initDefaultData();
  }

  async initDefaultData() {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Vinod@807465', salt);

    // Only Admin Account on Launch
    const adminUser = {
      _id: '6accb03ccb1432144d0291fe',
      id: '6accb03ccb1432144d0291fe',
      name: 'Admin',
      username: 'admin',
      email: 'admin@marketmind.ai',
      password: hashedPassword,
      businessName: 'Vinod Traders',
      phone: '+91 9876543210',
      address: 'Hyderabad, Telangana',
      role: 'admin',
      createdAt: new Date()
    };
    this.users.set(adminUser.email, adminUser);
    this.users.set(adminUser.username, adminUser);
    this.users.set(adminUser._id, adminUser);

    // Default Settings for Admin
    this.settings.set(adminUser._id, {
      userId: adminUser._id,
      alertThreshold: 5,
      targetMargin: 10,
      priceCheckInterval: '6h',
      preferredState: 'Telangana',
      preferredMarkets: ['Hyderabad'],
      demoMode: false
    });
  }

  getUserByEmail(emailOrUsername) {
    if (!emailOrUsername) return null;
    const key = emailOrUsername.toLowerCase().trim();
    return this.users.get(key) || null;
  }

  getUserById(id) {
    if (!id) return null;
    return this.users.get(id.toString()) || null;
  }

  saveUser(user) {
    const id = user._id ? user._id.toString() : 'usr_' + Date.now();
    const normalized = { ...user, _id: id, id };
    if (user.email) this.users.set(user.email.toLowerCase().trim(), normalized);
    if (user.username) this.users.set(user.username.toLowerCase().trim(), normalized);
    this.users.set(id, normalized);
    return normalized;
  }

  getProductsForUser(userId) {
    return Array.from(this.products.values()).filter(p => !userId || p.userId === userId.toString());
  }

  addProduct(product) {
    const id = product._id ? product._id.toString() : 'prod_' + Date.now();
    const item = { ...product, _id: id, id };
    this.products.set(id, item);
    return item;
  }
}

const fallbackStore = new FallbackStore();
module.exports = fallbackStore;
