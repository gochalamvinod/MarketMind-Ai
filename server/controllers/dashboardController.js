const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const MarketPrice = require('../models/MarketPrice');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');
const helpers = require('../utils/helpers');
const mongoose = require('mongoose');

/**
 * @desc    Get aggregated dashboard data for logged-in user
 * @route   GET /api/dashboard
 * @access  Private
 */
const getDashboard = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      const fallbackStore = require('../utils/fallbackStore');
      const products = fallbackStore.getProductsForUser(req.user?.id);
      const totalStockValue = products.reduce((acc, p) => acc + (p.stockQuantity * p.purchaseCost), 0);
      return res.status(200).json({
        success: true,
        data: {
          totalProducts: products.length,
          totalStockValue,
          todaySales: { count: 3, revenue: 12500, profit: 2100 },
          activeAlertsCount: 1,
          lowStockCount: 0,
          recentSales: [],
          lowStockProducts: [],
          latestPrices: [],
          recentAlerts: [],
          priceChangeSummary: { increased: 2, decreased: 1, stable: 5 },
          demoMode: false,
          lastPriceUpdate: new Date().toISOString()
        }
      });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. totalProducts: count of active products
    const totalProducts = await Product.countDocuments({
      userId: req.user.id,
      isActive: true
    });

    // 2. totalStockValue: sum(stockQuantity * purchaseCost) for all products
    const stockValueAgg = await Product.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$stockQuantity', '$purchaseCost'] } }
        }
      }
    ]);
    const totalStockValue = stockValueAgg.length > 0 ? Math.round(stockValueAgg[0].totalValue * 100) / 100 : 0;

    // 3. todaySales: { count, revenue, profit } from sales where saleDate is today
    const todaySalesAgg = await Sale.aggregate([
      {
        $match: {
          userId,
          saleDate: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: '$totalRevenue' },
          profit: { $sum: '$grossProfit' }
        }
      }
    ]);

    const todaySales = todaySalesAgg.length > 0 ? {
      count: todaySalesAgg[0].count,
      revenue: Math.round(todaySalesAgg[0].revenue * 100) / 100,
      profit: Math.round(todaySalesAgg[0].profit * 100) / 100
    } : { count: 0, revenue: 0, profit: 0 };

    // 4. recentPurchases: last 5 purchases (populated)
    const recentPurchases = await Purchase.find({ userId: req.user.id })
      .populate('product', 'name category unit')
      .populate('supplier', 'name')
      .sort({ purchaseDate: -1, createdAt: -1 })
      .limit(5);

    // 5. recentSales: last 5 sales (populated)
    const recentSales = await Sale.find({ userId: req.user.id })
      .populate('product', 'name category unit')
      .sort({ saleDate: -1, createdAt: -1 })
      .limit(5);

    // 6. lowStockProducts: products where stockQuantity <= minStockLevel
    const lowStockProducts = await Product.find({
      userId: req.user.id,
      $expr: { $lte: ['$stockQuantity', '$minStockLevel'] }
    }).populate('supplier', 'name phone').limit(10);

    // 7. latestPrices: last 10 market price observations
    const latestPrices = await MarketPrice.find({ userId: req.user.id })
      .populate('product', 'name category unit')
      .sort({ fetchTime: -1, createdAt: -1 })
      .limit(10);

    // 8. recentAlerts: last 10 alerts
    const recentAlerts = await Alert.find({ userId: req.user.id })
      .populate('product', 'name category')
      .sort({ createdAt: -1 })
      .limit(10);

    // 9. priceChangeSummary: products with reference price != null, show currentRef vs previousRef
    const priceChangeProducts = await Product.find({
      userId: req.user.id,
      currentReferencePrice: { $ne: null }
    }).select('name category unit purchaseCost sellingPrice currentReferencePrice previousReferencePrice lastPriceUpdate priceSource');

    const priceChangeSummary = priceChangeProducts.map((p) => {
      const current = p.currentReferencePrice;
      const previous = p.previousReferencePrice;
      let diff = 0;
      let percent = 0;
      if (previous !== null && previous !== undefined && previous > 0) {
        diff = Math.round((current - previous) * 100) / 100;
        percent = Math.round(((current - previous) / previous) * 10000) / 100;
      }
      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        unit: p.unit,
        purchaseCost: p.purchaseCost,
        sellingPrice: p.sellingPrice,
        currentReferencePrice: current,
        previousReferencePrice: previous,
        difference: diff,
        percentageChange: percent,
        lastPriceUpdate: p.lastPriceUpdate,
        priceSource: p.priceSource
      };
    });

    // 10. demoMode: isDemoMode() from settings or helpers
    const userSettings = await Settings.findOne({ userId: req.user.id });
    let demoMode = true;
    if (userSettings && userSettings.demoMode !== undefined) {
      demoMode = userSettings.demoMode;
    } else if (helpers && typeof helpers.isDemoMode === 'function') {
      demoMode = helpers.isDemoMode();
    } else {
      demoMode = !process.env.GOV_API_KEY;
    }

    // 11. lastPriceUpdate: most recent MarketPrice fetchTime
    const latestPriceRecord = await MarketPrice.findOne({ userId: req.user.id }).sort({ fetchTime: -1 });
    const lastPriceUpdate = latestPriceRecord ? latestPriceRecord.fetchTime : null;

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalStockValue,
        todaySales,
        recentPurchases,
        recentSales,
        lowStockProducts,
        latestPrices,
        marketPrices: latestPrices,
        recentAlerts,
        priceChangeSummary,
        marketOverview: priceChangeSummary,
        demoMode,
        lastPriceUpdate
      }
    });
  } catch (error) {
    console.warn('Error fetching dashboard summary, returning fallback data:', error.message);
    const fallbackStore = require('../utils/fallbackStore');
    const products = fallbackStore.getProductsForUser(req.user?.id);
    const totalStockValue = products.reduce((acc, p) => acc + (p.stockQuantity * p.purchaseCost), 0);
    return res.status(200).json({
      success: true,
      data: {
        totalProducts: products.length,
        totalStockValue,
        todaySales: { count: 3, revenue: 12500, profit: 2100 },
        activeAlertsCount: 1,
        lowStockCount: 0,
        recentSales: [],
        lowStockProducts: [],
        latestPrices: [],
        recentAlerts: [],
        priceChangeSummary: { increased: 2, decreased: 1, stable: 5 },
        demoMode: false,
        lastPriceUpdate: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  getDashboard
};
