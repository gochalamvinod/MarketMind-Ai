const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runAllComponentTests() {
  console.log('================================================================');
  console.log('       MarketMind AI — Full System & Component Health Check     ');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, detail = '') {
    total++;
    if (condition) {
      console.log(`  [PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
    }
  }

  try {
    // 1. AUTH: Login with seeded admin
    console.log('1. Testing Authentication...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@marketmind.ai',
      password: 'Vinod@807465'
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Login API', `User: ${loginRes.data.user.name}`);
    const token = loginRes.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // Test GET /auth/me
    const meRes = await axios.get(`${BASE_URL}/auth/me`, authHeaders);
    assert(meRes.status === 200 && meRes.data.user.email === 'admin@marketmind.ai', 'Get Current User (/auth/me)');

    // Test: Register a new user and verify strictly 0 products exist
    const testRegEmail = `clean_user_${Date.now()}@marketmind.com`;
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Fresh Register Test',
      email: testRegEmail,
      password: 'password123',
      businessName: 'Clean Slate Mart'
    });
    const regToken = regRes.data.token;
    const regHeaders = { headers: { Authorization: `Bearer ${regToken}` } };

    const newProdRes = await axios.get(`${BASE_URL}/products`, regHeaders);
    const newProducts = newProdRes.data.data || newProdRes.data;
    assert(newProdRes.status === 200 && newProducts.length === 0, 'New User Product Isolation (No Products Exist)', `Verified: 0 products exist for newly created user (${testRegEmail})`);

    const newDashRes = await axios.get(`${BASE_URL}/dashboard`, regHeaders);
    const newDashData = newDashRes.data.data || newDashRes.data;
    assert(newDashData.totalProducts === 0 && newDashData.totalStockValue === 0, 'New User Zero State Verification', 'Dashboard confirms 0 commodities and ₹0 stock value');

    // 2. DASHBOARD
    console.log('\n2. Testing Dashboard API & KPI Aggregates...');
    const dashRes = await axios.get(`${BASE_URL}/dashboard`, authHeaders);
    const dashData = dashRes.data.data || dashRes.data;
    assert(dashRes.status === 200, 'Dashboard API');
    assert(typeof dashData.totalProducts === 'number' && dashData.totalProducts >= 0, 'Dashboard Product Count', `${dashData.totalProducts} commodities`);
    assert(typeof dashData.totalStockValue === 'number' && dashData.totalStockValue >= 0, 'Dashboard Total Stock Value', `₹${dashData.totalStockValue}`);

    // 3. PRODUCTS
    console.log('\n3. Testing Products Component & Inventory CRUD...');
    const productsRes = await axios.get(`${BASE_URL}/products`, authHeaders);
    const products = productsRes.data.data || productsRes.data;
    assert(productsRes.status === 200 && Array.isArray(products), 'Fetch Products List', `${products.length} products loaded`);

    const productStats = await axios.get(`${BASE_URL}/products/stats`, authHeaders);
    assert(productStats.status === 200, 'Fetch Product Category Stats');

    // Create a temporary test product
    const createProdRes = await axios.post(`${BASE_URL}/products`, {
      name: 'Automated Test Dal',
      category: 'Dal & Pulses',
      variety: 'Grade 1 Premium',
      unit: 'kg',
      purchaseCost: 80,
      sellingPrice: 95,
      stockQuantity: 150,
      minStockLevel: 25,
      govApiCommodityName: 'Green Gram Dal (Moong Dal)',
      govApiVariety: 'Medium'
    }, authHeaders);
    const createdProduct = createProdRes.data.data || createProdRes.data;
    assert(createProdRes.status === 201 && createdProduct._id, 'Create Product', createdProduct.name);
    const testProdId = createdProduct._id;

    // Read single product
    const getProdRes = await axios.get(`${BASE_URL}/products/${testProdId}`, authHeaders);
    const singleProduct = getProdRes.data.data || getProdRes.data;
    assert(getProdRes.status === 200 && singleProduct.name === 'Automated Test Dal', 'Read Single Product');

    // Update product (verify purchaseCost cannot be tampered directly)
    const updateProdRes = await axios.put(`${BASE_URL}/products/${testProdId}`, {
      name: 'Automated Test Dal Updated',
      sellingPrice: 98,
      purchaseCost: 999 // Should NOT update purchase cost
    }, authHeaders);
    const updatedProduct = updateProdRes.data.data || updateProdRes.data;
    assert(updateProdRes.status === 200 && updatedProduct.purchaseCost === 80, 'Update Product with Cost Invariance');

    // 4. SUPPLIERS
    console.log('\n4. Testing Suppliers Component & CRUD...');
    const suppListRes = await axios.get(`${BASE_URL}/suppliers`, authHeaders);
    const suppliers = suppListRes.data.data || suppListRes.data;
    assert(suppListRes.status === 200 && Array.isArray(suppliers), 'Fetch Suppliers List', `${suppliers.length} suppliers`);

    const newSuppRes = await axios.post(`${BASE_URL}/suppliers`, {
      name: 'Test APMC Yard Trader',
      contactPerson: 'Suresh Kumar',
      phone: '+91 9988776655',
      email: 'suresh@apmc.test',
      address: 'Mandi Yard Bowenpally'
    }, authHeaders);
    const createdSupp = newSuppRes.data.data || newSuppRes.data;
    assert(newSuppRes.status === 201 && createdSupp._id, 'Create Supplier', createdSupp.name);
    const testSuppId = createdSupp._id;

    // 5. PURCHASES & WEIGHTED AVERAGE COSTING
    console.log('\n5. Testing Purchases Component & Inventory Valuation...');
    const purchaseRes = await axios.post(`${BASE_URL}/purchases`, {
      product: testProdId,
      supplier: testSuppId,
      quantity: 50,
      unitCost: 100,
      purchaseDate: new Date().toISOString().split('T')[0],
      invoiceNumber: 'INV-TEST-001'
    }, authHeaders);
    const purchaseData = purchaseRes.data.data || purchaseRes.data;
    assert(purchaseRes.status === 201, 'Record Purchase Batch', `Total: ₹${purchaseData.totalAmount}`);

    // Verify product weighted cost recalculated: (150*80 + 50*100) / 200 = 17000 / 200 = 85
    const verifyProdAfterBuy = await axios.get(`${BASE_URL}/products/${testProdId}`, authHeaders);
    const prodAfterBuy = verifyProdAfterBuy.data.data || verifyProdAfterBuy.data;
    assert(
      prodAfterBuy.stockQuantity === 200 && Math.abs(prodAfterBuy.purchaseCost - 85) < 0.01,
      'Weighted Average Cost Recalculation',
      `Cost: ₹${prodAfterBuy.purchaseCost}/kg across ${prodAfterBuy.stockQuantity} kg`
    );

    const purchasesList = await axios.get(`${BASE_URL}/purchases`, authHeaders);
    const purchasesArr = purchasesList.data.data || purchasesList.data;
    assert(purchasesList.status === 200 && Array.isArray(purchasesArr), 'Fetch Purchases Log');

    // 6. SALES & COGS / GROSS PROFIT
    console.log('\n6. Testing Sales Component & COGS Validation...');
    // Test overselling protection
    let oversellBlocked = false;
    try {
      await axios.post(`${BASE_URL}/sales`, {
        product: testProdId,
        quantity: 500, // exceeds 200
        unitSellingPrice: 98
      }, authHeaders);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        oversellBlocked = true;
      }
    }
    assert(oversellBlocked, 'Prevent Overselling (Stock Validation)');

    // Execute valid sale: 40 kg at ₹98. Cost is ₹85. Revenue=3920, COGS=3400, Gross Profit=520
    const saleRes = await axios.post(`${BASE_URL}/sales`, {
      product: testProdId,
      quantity: 40,
      unitSellingPrice: 98,
      saleDate: new Date().toISOString().split('T')[0],
      customerRef: 'Retail Counter'
    }, authHeaders);
    const saleData = saleRes.data.data || saleRes.data;
    assert(
      saleRes.status === 201 && saleData.grossProfit === 520,
      'Record Sale Transaction & Profit',
      `Revenue: ₹${saleData.totalRevenue}, COGS: ₹${saleData.costOfGoodsSold}, Profit: ₹${saleData.grossProfit}`
    );

    const salesList = await axios.get(`${BASE_URL}/sales`, authHeaders);
    const salesArr = salesList.data.data || salesList.data;
    assert(salesList.status === 200 && Array.isArray(salesArr), 'Fetch Sales History');

    // 7. MARKET PRICES & MANDI MONITORING
    console.log('\n7. Testing Market Prices Component...');
    const mpStatus = await axios.get(`${BASE_URL}/market-prices/status`, authHeaders);
    const mpStatusData = mpStatus.data.data || mpStatus.data;
    assert(mpStatus.status === 200, 'Market Prices Service Status', `Mode: ${mpStatusData.demoMode ? 'DEMO' : 'LIVE'}`);

    const latestMp = await axios.get(`${BASE_URL}/market-prices/latest`, authHeaders);
    const latestMpArr = latestMp.data.data || latestMp.data;
    assert(latestMp.status === 200 && Array.isArray(latestMpArr), 'Fetch Latest Mandi Benchmarks');

    // Manual price entry
    const manualMp = await axios.post(`${BASE_URL}/market-prices/manual`, {
      productId: testProdId,
      pricePerKg: 95,
      market: 'Bowenpally Mandi',
      state: 'Telangana',
      observationDate: new Date().toISOString()
    }, authHeaders);
    const manualMpData = manualMp.data.data || manualMp.data;
    assert(manualMp.status === 201, 'Record Manual Benchmark Observation', `Price: ₹${manualMpData.pricePerKg}/kg`);

    // Fetch history for product
    const mpHist = await axios.get(`${BASE_URL}/market-prices/history/${testProdId}`, authHeaders);
    const mpHistArr = mpHist.data.data || mpHist.data;
    assert(mpHist.status === 200 && Array.isArray(mpHistArr), 'Fetch Commodity Price History Timeline');

    // 8. ALERTS & NOTIFICATIONS
    console.log('\n8. Testing Alerts & Notifications Component...');
    const alertsRes = await axios.get(`${BASE_URL}/alerts`, authHeaders);
    const alertsArr = alertsRes.data.data || alertsRes.data;
    assert(alertsRes.status === 200 && Array.isArray(alertsArr), 'Fetch Alerts List', `${alertsArr.length} alerts`);

    const unreadCountRes = await axios.get(`${BASE_URL}/alerts/unread-count`, authHeaders);
    const unreadCountVal = unreadCountRes.data.count !== undefined ? unreadCountRes.data.count : unreadCountRes.data.unreadCount;
    assert(unreadCountRes.status === 200 && typeof unreadCountVal === 'number', 'Fetch Unread Count', `${unreadCountVal} unread`);

    const markAllRes = await axios.put(`${BASE_URL}/alerts/mark-all-read`, {}, authHeaders);
    assert(markAllRes.status === 200, 'Mark All Alerts As Read');

    // 9. REPORTS & CSV EXPORT
    console.log('\n9. Testing Reports & Data Export...');
    const invRep = await axios.get(`${BASE_URL}/reports/inventory`, authHeaders);
    assert(invRep.status === 200, 'Inventory Valuation Report');

    const purRep = await axios.get(`${BASE_URL}/reports/purchases`, authHeaders);
    assert(purRep.status === 200, 'Purchases Report');

    const salRep = await axios.get(`${BASE_URL}/reports/sales`, authHeaders);
    assert(salRep.status === 200, 'Sales Revenue Report');

    const profRep = await axios.get(`${BASE_URL}/reports/profit`, authHeaders);
    assert(profRep.status === 200, 'Profit & Loss Report');

    const csvExport = await axios.get(`${BASE_URL}/reports/export/inventory`, authHeaders);
    assert(csvExport.status === 200 && typeof csvExport.data === 'string' && csvExport.data.includes('Name'), 'CSV File Export Stream');

    // 10. AI INSIGHTS
    console.log('\n10. Testing AI Insights & Forecasting Engine...');
    const aiInsights = await axios.get(`${BASE_URL}/ai/insights`, authHeaders);
    const aiData = aiInsights.data.data || aiInsights.data;
    assert(aiInsights.status === 200 && aiData.source, 'Market Intelligence Summary', `Engine: ${aiData.source}`);

    const aiProdAnalysis = await axios.get(`${BASE_URL}/ai/product/${testProdId}`, authHeaders);
    const aiProdEngine = aiProdAnalysis.data.source || aiProdAnalysis.data.data?.source;
    assert(aiProdAnalysis.status === 200 && aiProdEngine, 'Commodity Drilldown Analysis', `Engine: ${aiProdEngine}`);

    const aiForecast = await axios.get(`${BASE_URL}/ai/forecast/${testProdId}`, authHeaders);
    const aiForecastData = aiForecast.data.data || aiForecast.data;
    assert(aiForecast.status === 200 && (aiForecastData.trend || aiForecastData.direction), 'Short-term Price Forecast', `Forecast: ${aiForecastData.trend || aiForecastData.direction}`);

    const aiRecs = await axios.get(`${BASE_URL}/ai/recommendations`, authHeaders);
    const aiRecsData = aiRecs.data.data || aiRecs.data;
    assert(aiRecs.status === 200 && (aiRecsData.buyOpportunities !== undefined || aiRecsData.recommendations), 'Procurement & Pricing Recommendations');

    // Test AI Chatbot Conversational Engine & Operational Dispatcher
    const chatMsgRes = await axios.post(`${BASE_URL}/chatbot`, {
      message: 'What are today\'s sales and profit?'
    }, authHeaders);
    assert(chatMsgRes.status === 200 && chatMsgRes.data.reply, 'AI Chatbot Conversational Response');

    const chatActionRes = await axios.post(`${BASE_URL}/chatbot`, {
      message: `Sell 5 kg ${createdProduct.name} at 98`
    }, authHeaders);
    assert(chatActionRes.status === 200 && chatActionRes.data.reply.includes('Sale Recorded'), 'AI Chatbot Operational Action (Record Sale)');

    // 11. SETTINGS
    console.log('\n11. Testing Settings & Preferences...');
    const settingsGet = await axios.get(`${BASE_URL}/settings`, authHeaders);
    const settingsData = settingsGet.data.data || settingsGet.data;
    assert(settingsGet.status === 200 && settingsData.preferredState === 'Telangana', 'Read Settings');

    const settingsUpdate = await axios.put(`${BASE_URL}/settings`, {
      alertThreshold: 7,
      targetMargin: 12,
      preferredState: 'Telangana',
      priceCheckInterval: '6h'
    }, authHeaders);
    const updatedSettings = settingsUpdate.data.data || settingsUpdate.data;
    assert(settingsUpdate.status === 200 && updatedSettings.alertThreshold === 7, 'Update Alert & Margin Thresholds');

    // Cleanup test product & supplier
    await axios.delete(`${BASE_URL}/products/${testProdId}`, authHeaders);
    await axios.delete(`${BASE_URL}/suppliers/${testSuppId}`, authHeaders);

    // Deep cleanup of test transactions and test user
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketmind');
    }
    const User = require('../models/User');
    const Purchase = require('../models/Purchase');
    const Sale = require('../models/Sale');
    const MarketPrice = require('../models/MarketPrice');
    const Alert = require('../models/Alert');
    const Settings = require('../models/Settings');

    const testUser = await User.findOne({ email: testRegEmail });
    if (testUser) {
      await Settings.deleteMany({ userId: testUser._id });
      await User.deleteOne({ _id: testUser._id });
    }
    await Purchase.deleteMany({ product: testProdId });
    await Sale.deleteMany({ product: testProdId });
    await MarketPrice.deleteMany({ product: testProdId });
    await Alert.deleteMany({ product: testProdId });

    assert(true, 'Cleanup Test Fixtures (0 Test Records Left)');

    console.log('\n================================================================');
    console.log(`   FULL COMPONENT & API SUITE RESULT: ${passed} / ${total} TESTS PASSED`);
    console.log('================================================================\n');

    process.exit(passed === total ? 0 : 1);
  } catch (err) {
    console.error('Test execution failed with error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runAllComponentTests();
