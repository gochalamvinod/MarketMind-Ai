require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Supplier = require('./models/Supplier');
const Purchase = require('./models/Purchase');
const Sale = require('./models/Sale');
const MarketPrice = require('./models/MarketPrice');
const Alert = require('./models/Alert');
const Settings = require('./models/Settings');

const seedDatabase = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketmind';

  try {
    console.log('[Seeder] Connecting to MongoDB at:', mongoURI);
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

    // 2. Create Owner Account
    console.log('[Seeder] Creating admin user...');
    const user = await User.create({
      name: 'Admin',
      email: 'admin@marketmind.com',
      username: 'admin',
      password: 'Vinod@807465',
      role: 'admin',
      businessName: 'Sri Lakshmi Grocery & Commodity Mart',
      phone: '+91 98765 43210',
      address: 'Shop #14, Begum Bazar Mandi Road, Hyderabad, Telangana - 500012'
    });

    // 3. Create Settings
    console.log('[Seeder] Configuring settings...');
    await Settings.create({
      userId: user._id,
      alertThreshold: 5,
      targetMargin: 10,
      priceCheckInterval: '6h',
      preferredState: 'Telangana',
      preferredMarkets: ['Hyderabad', 'Bowenpally', 'Malakpet'],
      demoMode: !process.env.GOV_API_KEY
    });

    // 4. Create Suppliers
    console.log('[Seeder] Adding suppliers...');
    const suppliers = await Supplier.insertMany([
      {
        userId: user._id,
        name: 'Hyderabad Wholesale Grain Traders',
        contactPerson: 'K. Ramesh Kumar',
        phone: '+91 98490 12345',
        email: 'ramesh@hyderabadgrains.com',
        address: 'Wholesale Market Yard, Malakpet, Hyderabad',
        notes: 'Primary supplier for Sona Masoori, Basmati rice and wheat'
      },
      {
        userId: user._id,
        name: 'Telangana Pulses & Oilseeds Syndicate',
        contactPerson: 'V. Satyanarayana',
        phone: '+91 94401 56789',
        email: 'satya@telanganapulses.in',
        address: 'APMC Market, Nizamabad & Bowenpally Depot, Hyderabad',
        notes: 'Direct mill supplies of Toor, Moong, Chana and Urad Dal'
      },
      {
        userId: user._id,
        name: 'Krishna Oil Mills Ltd',
        contactPerson: 'Suresh Agarwal',
        phone: '+91 93910 88990',
        email: 'sales@krishnaoil.com',
        address: 'IDA Kattedan Industrial Area, Hyderabad',
        notes: 'Groundnut, Sunflower and Mustard oil 15L tins and loose'
      },
      {
        userId: user._id,
        name: 'Deccan Spice & Condiments',
        contactPerson: 'Mohammed Farooq',
        phone: '+91 98850 44321',
        email: 'farooq@deccanspices.com',
        address: 'Mir Alam Mandi, Hyderabad',
        notes: 'Turmeric, Guntur Chilli, Jeera, Coriander wholesale'
      }
    ]);

    const sGrains = suppliers[0]._id;
    const sPulses = suppliers[1]._id;
    const sOils = suppliers[2]._id;
    const sSpices = suppliers[3]._id;

    // 5. Create 30+ Products covering All Required Categories
    console.log('[Seeder] Creating commodities catalog...');
    const productsData = [
      // RICE
      {
        name: 'Rice (Sona Masoori)',
        category: 'Rice',
        variety: 'Sona Massuri Old Stock',
        unit: 'kg',
        purchaseCost: 40,
        sellingPrice: 45,
        currentReferencePrice: 43,
        previousReferencePrice: 40,
        stockQuantity: 450,
        minStockLevel: 50,
        supplier: sGrains,
        govApiCommodityName: 'Rice',
        govApiVariety: 'Sona Massuri',
        description: 'Premium aged Sona Masoori raw rice popular for daily consumption'
      },
      {
        name: 'Rice (Basmati)',
        category: 'Rice',
        variety: '1121 Traditional',
        unit: 'kg',
        purchaseCost: 85,
        sellingPrice: 98,
        currentReferencePrice: 88,
        previousReferencePrice: 85,
        stockQuantity: 180,
        minStockLevel: 30,
        supplier: sGrains,
        govApiCommodityName: 'Rice',
        govApiVariety: 'Basmati',
        description: 'Long grain aromatic Basmati rice'
      },
      {
        name: 'Rice (IR-64)',
        category: 'Rice',
        variety: 'IR-64 Raw',
        unit: 'kg',
        purchaseCost: 32,
        sellingPrice: 38,
        currentReferencePrice: 33,
        previousReferencePrice: 32,
        stockQuantity: 300,
        minStockLevel: 40,
        supplier: sGrains,
        govApiCommodityName: 'Rice',
        govApiVariety: 'IR-64',
        description: 'Standard medium grain boiled/raw rice'
      },
      {
        name: 'Rice (HMT)',
        category: 'Rice',
        variety: 'HMT Fine',
        unit: 'kg',
        purchaseCost: 48,
        sellingPrice: 55,
        currentReferencePrice: 50,
        previousReferencePrice: 48,
        stockQuantity: 120,
        minStockLevel: 25,
        supplier: sGrains,
        govApiCommodityName: 'Rice',
        govApiVariety: 'H.M.T.',
        description: 'Fine fragrant medium grain'
      },

      // WHEAT
      {
        name: 'Wheat (Lokwan)',
        category: 'Wheat',
        variety: 'Lokwan Grade 1',
        unit: 'kg',
        purchaseCost: 28,
        sellingPrice: 34,
        currentReferencePrice: 30,
        previousReferencePrice: 28,
        stockQuantity: 400,
        minStockLevel: 60,
        supplier: sGrains,
        govApiCommodityName: 'Wheat',
        govApiVariety: 'Lok-1',
        description: 'Golden hard grain wheat suitable for fresh atta grinding'
      },
      {
        name: 'Wheat (Sharbati)',
        category: 'Wheat',
        variety: 'Sehore Sharbati',
        unit: 'kg',
        purchaseCost: 36,
        sellingPrice: 44,
        currentReferencePrice: 38,
        previousReferencePrice: 36,
        stockQuantity: 200,
        minStockLevel: 30,
        supplier: sGrains,
        govApiCommodityName: 'Wheat',
        govApiVariety: 'Sharbati',
        description: 'Sweet rich golden MP Sharbati wheat'
      },

      // DALS & PULSES
      {
        name: 'Toor Dal (Arhar)',
        category: 'Dal & Pulses',
        variety: 'Fatka Desi',
        unit: 'kg',
        purchaseCost: 120,
        sellingPrice: 140,
        currentReferencePrice: 128,
        previousReferencePrice: 120,
        stockQuantity: 220,
        minStockLevel: 40,
        supplier: sPulses,
        govApiCommodityName: 'Arhar (Tur/Red Gram)(Whole)',
        govApiVariety: 'Desi',
        description: 'Unpolished premium toor dal'
      },
      {
        name: 'Moong Dal (Yellow)',
        category: 'Dal & Pulses',
        variety: 'Dhuli Clean',
        unit: 'kg',
        purchaseCost: 95,
        sellingPrice: 112,
        currentReferencePrice: 98,
        previousReferencePrice: 95,
        stockQuantity: 160,
        minStockLevel: 30,
        supplier: sPulses,
        govApiCommodityName: 'Green Gram Dal (Moong Dal)',
        govApiVariety: 'Other',
        description: 'Split washed yellow moong dal'
      },
      {
        name: 'Chana Dal',
        category: 'Dal & Pulses',
        variety: 'Bold Grade',
        unit: 'kg',
        purchaseCost: 70,
        sellingPrice: 84,
        currentReferencePrice: 74,
        previousReferencePrice: 70,
        stockQuantity: 250,
        minStockLevel: 50,
        supplier: sPulses,
        govApiCommodityName: 'Bengal Gram Dal (Chana Dal)',
        govApiVariety: 'Chana Dal',
        description: 'Bengal gram split dal'
      },
      {
        name: 'Urad Dal (White Gota)',
        category: 'Dal & Pulses',
        variety: 'Gota Whole Washed',
        unit: 'kg',
        purchaseCost: 110,
        sellingPrice: 130,
        currentReferencePrice: 115,
        previousReferencePrice: 110,
        stockQuantity: 130,
        minStockLevel: 25,
        supplier: sPulses,
        govApiCommodityName: 'Black Gram (Urd Beans)(Whole)',
        govApiVariety: 'Black Gram',
        description: 'Whole skinned urad gota for idli/dosa batter'
      },
      {
        name: 'Masoor Dal (Red)',
        category: 'Dal & Pulses',
        variety: 'Malka Split',
        unit: 'kg',
        purchaseCost: 74,
        sellingPrice: 88,
        currentReferencePrice: 76,
        previousReferencePrice: 74,
        stockQuantity: 110,
        minStockLevel: 20,
        supplier: sPulses,
        govApiCommodityName: 'Masur Dal',
        govApiVariety: 'Masoor Gota',
        description: 'Split red lentils'
      },
      {
        name: 'Rajma (Chitra)',
        category: 'Dal & Pulses',
        variety: 'Himalayan Chitra',
        unit: 'kg',
        purchaseCost: 130,
        sellingPrice: 155,
        currentReferencePrice: 134,
        previousReferencePrice: 130,
        stockQuantity: 90,
        minStockLevel: 20,
        supplier: sPulses,
        govApiCommodityName: 'Kidney Beans (Rajma)',
        govApiVariety: 'Chitra',
        description: 'Kidney beans'
      },
      {
        name: 'Kabuli Chana',
        category: 'Dal & Pulses',
        variety: 'Dollar White (12mm)',
        unit: 'kg',
        purchaseCost: 115,
        sellingPrice: 138,
        currentReferencePrice: 118,
        previousReferencePrice: 115,
        stockQuantity: 100,
        minStockLevel: 20,
        supplier: sPulses,
        govApiCommodityName: 'Kabuli Chana(Chickpeas-White)',
        govApiVariety: 'Bold',
        description: 'Large chick peas'
      },

      // COOKING OILS
      {
        name: 'Groundnut Oil',
        category: 'Cooking Oil',
        variety: 'Filtered Cold Pressed',
        unit: 'litre',
        purchaseCost: 160,
        sellingPrice: 185,
        currentReferencePrice: 168,
        previousReferencePrice: 160,
        stockQuantity: 150,
        minStockLevel: 30,
        supplier: sOils,
        govApiCommodityName: 'Groundnut Oil',
        govApiVariety: 'Filtered',
        description: 'Pure groundnut cooking oil'
      },
      {
        name: 'Sunflower Oil',
        category: 'Cooking Oil',
        variety: 'Refined Oil',
        unit: 'litre',
        purchaseCost: 118,
        sellingPrice: 135,
        currentReferencePrice: 122,
        previousReferencePrice: 118,
        stockQuantity: 200,
        minStockLevel: 40,
        supplier: sOils,
        govApiCommodityName: 'Sunflower Oil',
        govApiVariety: 'Refined',
        description: 'Clear refined sunflower oil'
      },
      {
        name: 'Mustard Oil',
        category: 'Cooking Oil',
        variety: 'Kachi Ghani Raw',
        unit: 'litre',
        purchaseCost: 142,
        sellingPrice: 165,
        currentReferencePrice: 145,
        previousReferencePrice: 142,
        stockQuantity: 80,
        minStockLevel: 15,
        supplier: sOils,
        govApiCommodityName: 'Mustard Oil',
        govApiVariety: 'Kachi Ghani',
        description: 'Pungent mustard oil'
      },

      // SUGAR & SWEETENERS
      {
        name: 'Sugar (M-30)',
        category: 'Sugar & Sweeteners',
        variety: 'Medium Crystal M-30',
        unit: 'kg',
        purchaseCost: 40,
        sellingPrice: 46,
        currentReferencePrice: 42,
        previousReferencePrice: 40,
        stockQuantity: 600,
        minStockLevel: 100,
        supplier: sGrains,
        govApiCommodityName: 'Sugar',
        govApiVariety: 'M-30',
        description: 'Refined white cane sugar'
      },
      {
        name: 'Jaggery (Bellam)',
        category: 'Sugar & Sweeteners',
        variety: 'Organic Block Gold',
        unit: 'kg',
        purchaseCost: 46,
        sellingPrice: 58,
        currentReferencePrice: 48,
        previousReferencePrice: 46,
        stockQuantity: 140,
        minStockLevel: 25,
        supplier: sGrains,
        govApiCommodityName: 'Jaggery',
        govApiVariety: 'Local',
        description: 'Natural solid jaggery blocks'
      },

      // SPICES
      {
        name: 'Turmeric (Haldi)',
        category: 'Spices',
        variety: 'Nizamabad Finger Whole',
        unit: 'kg',
        purchaseCost: 140,
        sellingPrice: 175,
        currentReferencePrice: 148,
        previousReferencePrice: 140,
        stockQuantity: 70,
        minStockLevel: 15,
        supplier: sSpices,
        govApiCommodityName: 'Turmeric',
        govApiVariety: 'Finger',
        description: 'High curcumin Nizamabad turmeric fingers'
      },
      {
        name: 'Red Chilli (Dry)',
        category: 'Spices',
        variety: 'Guntur Teja (With Stem)',
        unit: 'kg',
        purchaseCost: 190,
        sellingPrice: 235,
        currentReferencePrice: 205,
        previousReferencePrice: 190,
        stockQuantity: 60,
        minStockLevel: 15,
        supplier: sSpices,
        govApiCommodityName: 'Dry Chillies',
        govApiVariety: 'Guntur Teja',
        description: 'Spicy vibrant red dry chillies'
      },
      {
        name: 'Coriander Seeds (Dhania)',
        category: 'Spices',
        variety: 'Badami Green Whole',
        unit: 'kg',
        purchaseCost: 82,
        sellingPrice: 105,
        currentReferencePrice: 85,
        previousReferencePrice: 82,
        stockQuantity: 50,
        minStockLevel: 10,
        supplier: sSpices,
        govApiCommodityName: 'Coriander(Dhania)(Whole)',
        govApiVariety: 'Badami',
        description: 'Fragrant dry coriander seeds'
      },
      {
        name: 'Cumin Seeds (Jeera)',
        category: 'Spices',
        variety: 'Unjha Super Bold',
        unit: 'kg',
        purchaseCost: 290,
        sellingPrice: 345,
        currentReferencePrice: 305,
        previousReferencePrice: 290,
        stockQuantity: 35,
        minStockLevel: 10,
        supplier: sSpices,
        govApiCommodityName: 'Cummin Seed(Jeera)',
        govApiVariety: 'Bold',
        description: 'Aromatic cumin seeds'
      },
      {
        name: 'Black Pepper',
        category: 'Spices',
        variety: 'Tellicherry Bold (TGSEB)',
        unit: 'kg',
        purchaseCost: 520,
        sellingPrice: 620,
        currentReferencePrice: 535,
        previousReferencePrice: 520,
        stockQuantity: 20,
        minStockLevel: 5,
        supplier: sSpices,
        govApiCommodityName: 'Black Pepper',
        govApiVariety: 'Garbled',
        description: 'Malabar black pepper whole'
      },

      // FLOUR & GRAINS
      {
        name: 'Wheat Flour (Atta)',
        category: 'Flour & Grains',
        variety: 'Chakki Fresh Whole Wheat',
        unit: 'kg',
        purchaseCost: 32,
        sellingPrice: 38,
        currentReferencePrice: 33,
        previousReferencePrice: 32,
        stockQuantity: 240,
        minStockLevel: 40,
        supplier: sGrains,
        govApiCommodityName: 'Wheat',
        govApiVariety: 'Atta',
        description: '100% whole wheat stone ground flour'
      },
      {
        name: 'Maida (All Purpose)',
        category: 'Flour & Grains',
        variety: 'Super Fine',
        unit: 'kg',
        purchaseCost: 29,
        sellingPrice: 36,
        currentReferencePrice: 30,
        previousReferencePrice: 29,
        stockQuantity: 150,
        minStockLevel: 30,
        supplier: sGrains,
        govApiCommodityName: 'Wheat',
        govApiVariety: 'Maida',
        description: 'Refined wheat flour'
      },
      {
        name: 'Sooji / Rava',
        category: 'Flour & Grains',
        variety: 'Bombay Rava Fine',
        unit: 'kg',
        purchaseCost: 34,
        sellingPrice: 42,
        currentReferencePrice: 35,
        previousReferencePrice: 34,
        stockQuantity: 120,
        minStockLevel: 25,
        supplier: sGrains,
        govApiCommodityName: 'Wheat',
        govApiVariety: 'Suji',
        description: 'Semolina for upma and sweets'
      },
      {
        name: 'Besan (Gram Flour)',
        category: 'Flour & Grains',
        variety: 'Pure Chana Dal Flour',
        unit: 'kg',
        purchaseCost: 72,
        sellingPrice: 88,
        currentReferencePrice: 75,
        previousReferencePrice: 72,
        stockQuantity: 110,
        minStockLevel: 20,
        supplier: sPulses,
        govApiCommodityName: 'Bengal Gram Dal (Chana Dal)',
        govApiVariety: 'Besan',
        description: 'Fine ground gram flour'
      },
      {
        name: 'Poha (Flattened Rice)',
        category: 'Flour & Grains',
        variety: 'Medium Thick Flakes',
        unit: 'kg',
        purchaseCost: 38,
        sellingPrice: 48,
        currentReferencePrice: 40,
        previousReferencePrice: 38,
        stockQuantity: 90,
        minStockLevel: 20,
        supplier: sGrains,
        govApiCommodityName: 'Rice',
        govApiVariety: 'Poha',
        description: 'Flattened rice for breakfast'
      },

      // OTHERS (One low-stock item for testing alerts)
      {
        name: 'Iodized Crystal Salt',
        category: 'Others',
        variety: 'Grade 1 Crystal',
        unit: 'kg',
        purchaseCost: 14,
        sellingPrice: 18,
        currentReferencePrice: 15,
        previousReferencePrice: 14,
        stockQuantity: 180,
        minStockLevel: 30,
        supplier: sGrains,
        govApiCommodityName: 'Other',
        govApiVariety: 'Salt',
        description: 'Triple refined crystal salt'
      },
      {
        name: 'Tamarind (Imli)',
        category: 'Others',
        variety: 'Seedless Pressed Flower',
        unit: 'kg',
        purchaseCost: 85,
        sellingPrice: 110,
        currentReferencePrice: 92,
        previousReferencePrice: 85,
        stockQuantity: 8, // INTENTIONALLY LOW STOCK (< minStockLevel of 15) to demonstrate low-stock alert!
        minStockLevel: 15,
        supplier: sSpices,
        govApiCommodityName: 'Tamarind Fruit',
        govApiVariety: 'Seedless',
        description: 'Pressed sour tamarind slab'
      }
    ];

    const insertedProducts = await Product.insertMany(
      productsData.map((p) => ({
        ...p,
        userId: user._id,
        lastPriceUpdate: new Date(Date.now() - 3 * 3600000),
        priceSource: 'DEMO',
        isActive: true
      }))
    );

    console.log(`[Seeder] Seeded ${insertedProducts.length} commodity products.`);

    // 6. Create Historical Purchases
    console.log('[Seeder] Recording purchases...');
    const riceProd = insertedProducts.find((p) => p.name === 'Rice (Sona Masoori)');
    const toorProd = insertedProducts.find((p) => p.name === 'Toor Dal (Arhar)');
    const wheatProd = insertedProducts.find((p) => p.name === 'Wheat (Lokwan)');
    const oilProd = insertedProducts.find((p) => p.name === 'Groundnut Oil');

    await Purchase.insertMany([
      {
        userId: user._id,
        product: riceProd._id,
        supplier: sGrains,
        quantity: 500,
        unit: 'kg',
        unitCost: 40,
        totalAmount: 20000,
        purchaseDate: new Date(Date.now() - 14 * 86400000),
        invoiceNumber: 'INV-HW-2026-108',
        notes: 'Initial bulk procurement of new crop'
      },
      {
        userId: user._id,
        product: toorProd._id,
        supplier: sPulses,
        quantity: 250,
        unit: 'kg',
        unitCost: 120,
        totalAmount: 30000,
        purchaseDate: new Date(Date.now() - 10 * 86400000),
        invoiceNumber: 'INV-TP-4091',
        notes: 'High grade unpolished desi toor'
      },
      {
        userId: user._id,
        product: wheatProd._id,
        supplier: sGrains,
        quantity: 450,
        unit: 'kg',
        unitCost: 28,
        totalAmount: 12600,
        purchaseDate: new Date(Date.now() - 8 * 86400000),
        invoiceNumber: 'INV-HW-2026-119'
      },
      {
        userId: user._id,
        product: oilProd._id,
        supplier: sOils,
        quantity: 160,
        unit: 'litre',
        unitCost: 160,
        totalAmount: 25600,
        purchaseDate: new Date(Date.now() - 5 * 86400000),
        invoiceNumber: 'INV-KO-8821'
      }
    ]);

    // 7. Create Historical Sales
    console.log('[Seeder] Recording sales transactions...');
    await Sale.insertMany([
      {
        userId: user._id,
        product: riceProd._id,
        quantity: 50,
        unit: 'kg',
        unitSellingPrice: 45,
        totalRevenue: 2250,
        costOfGoodsSold: 2000,
        grossProfit: 250,
        profitMargin: 11.11,
        saleDate: new Date(Date.now() - 4 * 86400000),
        customerRef: 'Walk-in Retail Order',
        invoiceNumber: 'SAL-001'
      },
      {
        userId: user._id,
        product: toorProd._id,
        quantity: 30,
        unit: 'kg',
        unitSellingPrice: 140,
        totalRevenue: 4200,
        costOfGoodsSold: 3600,
        grossProfit: 600,
        profitMargin: 14.29,
        saleDate: new Date(Date.now() - 3 * 86400000),
        customerRef: 'Sita Ram Sweet House & Caterers',
        invoiceNumber: 'SAL-002'
      },
      {
        userId: user._id,
        product: wheatProd._id,
        quantity: 50,
        unit: 'kg',
        unitSellingPrice: 34,
        totalRevenue: 1700,
        costOfGoodsSold: 1400,
        grossProfit: 300,
        profitMargin: 17.65,
        saleDate: new Date(Date.now() - 1 * 86400000),
        customerRef: 'Local Neighborhood Customers',
        invoiceNumber: 'SAL-003'
      },
      {
        userId: user._id,
        product: oilProd._id,
        quantity: 10,
        unit: 'litre',
        unitSellingPrice: 185,
        totalRevenue: 1850,
        costOfGoodsSold: 1600,
        grossProfit: 250,
        profitMargin: 13.51,
        saleDate: new Date(),
        customerRef: 'Daily Counter Sale',
        invoiceNumber: 'SAL-004'
      }
    ]);

    // 8. Create Market Price History
    console.log('[Seeder] Generating price history entries...');
    const historicalDates = [
      new Date(Date.now() - 21 * 86400000),
      new Date(Date.now() - 14 * 86400000),
      new Date(Date.now() - 7 * 86400000),
      new Date(Date.now() - 2 * 86400000),
      new Date()
    ];

    const ricePrices = [38, 39.5, 40, 41.5, 43];
    for (let i = 0; i < historicalDates.length; i++) {
      await MarketPrice.create({
        userId: user._id,
        product: riceProd._id,
        commodity: 'Rice',
        variety: 'Sona Massuri',
        market: 'Bowenpally Mandi',
        state: 'Telangana',
        district: 'Hyderabad',
        minPrice: (ricePrices[i] - 1) * 100,
        maxPrice: (ricePrices[i] + 1) * 100,
        modalPrice: ricePrices[i] * 100,
        pricePerKg: ricePrices[i],
        unit: 'kg',
        source: 'DEMO',
        observationDate: historicalDates[i],
        fetchTime: historicalDates[i],
        previousPrice: i > 0 ? ricePrices[i - 1] : 38,
        priceChange: i > 0 ? parseFloat((ricePrices[i] - ricePrices[i - 1]).toFixed(2)) : 0,
        percentageChange: i > 0 ? parseFloat((((ricePrices[i] - ricePrices[i - 1]) / ricePrices[i - 1]) * 100).toFixed(2)) : 0,
        isDemo: true
      });
    }

    const toorPrices = [112, 115, 118, 120, 128];
    for (let i = 0; i < historicalDates.length; i++) {
      await MarketPrice.create({
        userId: user._id,
        product: toorProd._id,
        commodity: 'Arhar (Tur/Red Gram)(Whole)',
        variety: 'Desi',
        market: 'Malakpet Market Yard',
        state: 'Telangana',
        district: 'Hyderabad',
        minPrice: (toorPrices[i] - 2) * 100,
        maxPrice: (toorPrices[i] + 2) * 100,
        modalPrice: toorPrices[i] * 100,
        pricePerKg: toorPrices[i],
        unit: 'kg',
        source: 'DEMO',
        observationDate: historicalDates[i],
        fetchTime: historicalDates[i],
        previousPrice: i > 0 ? toorPrices[i - 1] : 110,
        priceChange: i > 0 ? parseFloat((toorPrices[i] - toorPrices[i - 1]).toFixed(2)) : 0,
        percentageChange: i > 0 ? parseFloat((((toorPrices[i] - toorPrices[i - 1]) / toorPrices[i - 1]) * 100).toFixed(2)) : 0,
        isDemo: true
      });
    }

    // 9. Create Alerts (Price + Low Stock)
    console.log('[Seeder] Generating persistent alerts...');
    await Alert.create({
      userId: user._id,
      product: riceProd._id,
      type: 'PRICE_INCREASE',
      title: 'Rice (Sona Masoori) Reference Price Increase (+7.5%)',
      message: 'Rice (Sona Masoori) market reference price increased from ₹40/kg to ₹43/kg. Increase: +₹3/kg (+7.5%). Your recorded inventory purchase cost is ₹40/kg and your current selling price is ₹45/kg. Review future purchasing decisions and selling prices.',
      previousPrice: 40,
      currentPrice: 43,
      priceDifference: 3,
      percentageChange: 7.5,
      purchaseCost: 40,
      sellingPrice: 45,
      source: 'DEMO',
      market: 'Bowenpally Mandi',
      isRead: false,
      isDismissed: false
    });

    await Alert.create({
      userId: user._id,
      product: toorProd._id,
      type: 'PRICE_INCREASE',
      title: 'Toor Dal Market Price Alert (+6.67%)',
      message: 'Toor Dal market reference price increased from ₹120/kg to ₹128/kg (+₹8/kg, +6.67%). Your recorded inventory cost is ₹120/kg and selling price is ₹140/kg.',
      previousPrice: 120,
      currentPrice: 128,
      priceDifference: 8,
      percentageChange: 6.67,
      purchaseCost: 120,
      sellingPrice: 140,
      source: 'DEMO',
      market: 'Malakpet Market Yard',
      isRead: false,
      isDismissed: false
    });

    const tamarindProd = insertedProducts.find((p) => p.name === 'Tamarind (Imli)');
    await Alert.create({
      userId: user._id,
      product: tamarindProd._id,
      type: 'LOW_STOCK',
      title: 'Low Stock Warning: Tamarind (Imli)',
      message: 'Tamarind (Imli) stock quantity has reached 8 kg, which is below your minimum threshold of 15 kg. Please restock.',
      purchaseCost: tamarindProd.purchaseCost,
      sellingPrice: tamarindProd.sellingPrice,
      isRead: false,
      isDismissed: false
    });

    console.log('====================================================');
    console.log('  Database Seeding Completed Successfully!');
    console.log('  Admin Login: admin@marketmind.com');
    console.log('  Password:    password123');
    console.log(`  Products:    ${insertedProducts.length} items`);
    console.log(`  Suppliers:   ${suppliers.length} vendors`);
    console.log('====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[Seeder] Critical error during seeding:', err);
    process.exit(1);
  }
};

seedDatabase();
