const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const MarketPrice = require('../models/MarketPrice');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');

async function dryRunAndClean(execute = false) {
  await mongoose.connect('mongodb://localhost:27017/marketmind');
  console.log(`=== ${execute ? 'EXECUTING CLEANUP' : 'DRY RUN AUDIT'} ===\n`);

  // 1. Identify test users
  const testUserFilter = {
    $or: [
      { email: /demo/i },
      { email: /test/i },
      { email: /clean_user/i },
      { email: /fresh_user/i },
      { email: /freshuser/i },
      { email: /newuser/i },
      { email: 'pallav1@gmail.com' }
    ]
  };
  const testUsers = await User.find(testUserFilter);
  const testUserIds = testUsers.map(u => u._id);
  console.log(`Found ${testUsers.length} test user accounts:`);
  testUsers.forEach(u => console.log(`  - ${u.email} (${u.name})`));

  // 2. Identify test products
  const testProducts = await Product.find({
    $or: [
      { name: /test/i },
      { userId: { $in: testUserIds } }
    ]
  });
  const testProductIds = testProducts.map(p => p._id);
  console.log(`\nFound ${testProducts.length} test products to remove:`);
  testProducts.forEach(p => console.log(`  - ${p.name} (ID: ${p._id})`));

  // 3. Identify test suppliers
  const testSuppliers = await Supplier.find({
    $or: [
      { name: /test/i },
      { userId: { $in: testUserIds } }
    ]
  });
  const testSupplierIds = testSuppliers.map(s => s._id);
  console.log(`\nFound ${testSuppliers.length} test suppliers to remove:`);
  testSuppliers.forEach(s => console.log(`  - ${s.name} (ID: ${s._id})`));

  // 4. Check all active products to find orphaned purchases/sales/market prices
  const allActiveProducts = await Product.find({ _id: { $nin: testProductIds } });
  const activeProductIds = allActiveProducts.map(p => p._id.toString());

  // Orphaned or test purchases
  const allPurchases = await Purchase.find({});
  const purchasesToDelete = allPurchases.filter(p => {
    if (testUserIds.some(uid => uid.equals(p.userId))) return true;
    if (!p.product) return true;
    if (testProductIds.some(tpid => tpid.equals(p.product))) return true;
    if (!activeProductIds.includes(p.product.toString())) return true;
    if (p.supplier && testSupplierIds.some(tsid => tsid.equals(p.supplier))) return true;
    return false;
  });
  console.log(`\nFound ${purchasesToDelete.length} test/orphaned purchases to remove`);

  // Orphaned or test sales
  const allSales = await Sale.find({});
  const salesToDelete = allSales.filter(s => {
    if (testUserIds.some(uid => uid.equals(s.userId))) return true;
    if (!s.product) return true;
    if (testProductIds.some(tpid => tpid.equals(s.product))) return true;
    if (!activeProductIds.includes(s.product.toString())) return true;
    return false;
  });
  console.log(`Found ${salesToDelete.length} test/orphaned sales to remove`);

  // Orphaned or test market prices
  const allMarketPrices = await MarketPrice.find({});
  const marketPricesToDelete = allMarketPrices.filter(m => {
    if (testUserIds.some(uid => uid.equals(m.userId))) return true;
    if (m.commodity && m.commodity.toLowerCase().includes('test')) return true;
    if (m.product && testProductIds.some(tpid => tpid.equals(m.product))) return true;
    if (m.product && !activeProductIds.includes(m.product.toString())) return true;
    return false;
  });
  console.log(`Found ${marketPricesToDelete.length} test/orphaned market price records to remove`);

  // Test or orphaned alerts
  const allAlerts = await Alert.find({});
  const alertsToDelete = allAlerts.filter(a => {
    if (testUserIds.some(uid => uid.equals(a.userId))) return true;
    if (a.title && a.title.toLowerCase().includes('test')) return true;
    if (a.message && a.message.toLowerCase().includes('test')) return true;
    if (a.product && testProductIds.some(tpid => tpid.equals(a.product))) return true;
    if (a.product && !activeProductIds.includes(a.product.toString())) return true;
    return false;
  });
  console.log(`Found ${alertsToDelete.length} test/orphaned alerts to remove`);

  // Settings for test users
  const settingsToDelete = await Settings.find({ userId: { $in: testUserIds } });
  console.log(`Found ${settingsToDelete.length} test user settings records to remove`);

  if (!execute) {
    console.log('\nDRY RUN COMPLETE. Pass "true" to execute cleanup.');
    process.exit(0);
  }

  // EXECUTE CLEANUP
  console.log('\n--> Deleting records from MongoDB...');
  await Purchase.deleteMany({ _id: { $in: purchasesToDelete.map(p => p._id) } });
  await Sale.deleteMany({ _id: { $in: salesToDelete.map(s => s._id) } });
  await MarketPrice.deleteMany({ _id: { $in: marketPricesToDelete.map(m => m._id) } });
  await Alert.deleteMany({ _id: { $in: alertsToDelete.map(a => a._id) } });
  await Product.deleteMany({ _id: { $in: testProductIds } });
  await Supplier.deleteMany({ _id: { $in: testSupplierIds } });
  await Settings.deleteMany({ userId: { $in: testUserIds } });
  await User.deleteMany({ _id: { $in: testUserIds } });

  console.log('\n=== CLEANUP COMPLETED SUCCESSFULLY ===');

  // Verify remaining data
  const remainingUsers = await User.find({});
  console.log(`\nRemaining Users (${remainingUsers.length}):`);
  for (const u of remainingUsers) {
    const pC = await Product.countDocuments({ userId: u._id });
    const sC = await Supplier.countDocuments({ userId: u._id });
    const purC = await Purchase.countDocuments({ userId: u._id });
    const salC = await Sale.countDocuments({ userId: u._id });
    const aC = await Alert.countDocuments({ userId: u._id });
    console.log(`  - ${u.email} (${u.name}) -> Products: ${pC}, Suppliers: ${sC}, Purchases: ${purC}, Sales: ${salC}, Alerts: ${aC}`);
  }

  process.exit(0);
}

const shouldExecute = process.argv.includes('--execute');
dryRunAndClean(shouldExecute).catch(e => {
  console.error('Error during cleanup:', e);
  process.exit(1);
});
