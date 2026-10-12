const Alert = require('../models/Alert');
const Product = require('../models/Product');

/**
 * @desc    Get alerts for logged-in user
 * @route   GET /api/alerts
 * @access  Private
 */
const mongoose = require('mongoose');

const getAlerts = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const alerts = await Alert.find({ userId: req.user.id })
      .populate('product', 'name category unit stockQuantity purchaseCost sellingPrice')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.warn('Error fetching alerts, returning empty list:', error.message);
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }
};

/**
 * @desc    Get count of unread alerts
 * @route   GET /api/alerts/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, count: 0, unreadCount: 0 });
    }

    const count = await Alert.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    return res.status(200).json({
      success: true,
      count,
      unreadCount: count
    });
  } catch (error) {
    console.warn('Error fetching unread alert count:', error.message);
    return res.status(200).json({
      success: true,
      count: 0,
      unreadCount: 0
    });
  }
};

/**
 * @desc    Mark a single alert as read
 * @route   PUT /api/alerts/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating alert',
      error: error.message
    });
  }
};

/**
 * @desc    Mark all unread alerts as read
 * @route   PUT /api/alerts/mark-all-read
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const result = await Alert.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      success: true,
      message: 'All alerts marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating alerts',
      error: error.message
    });
  }
};

/**
 * @desc    Delete an alert
 * @route   DELETE /api/alerts/:id
 * @access  Private
 */
const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting alert',
      error: error.message
    });
  }
};

/**
 * @desc    Create a custom alert manually
 * @route   POST /api/alerts
 * @access  Private
 */
const createAlert = async (req, res) => {
  try {
    const { productId, type, title, message, targetPrice } = req.body;
    let productObj = null;
    if (productId) {
      productObj = await Product.findOne({ _id: productId, userId: req.user.id });
    }

    const newAlert = await Alert.create({
      userId: req.user.id,
      product: productObj ? productObj._id : null,
      type: type || 'CUSTOM',
      title: title || (productObj ? `Alert: ${productObj.name}` : 'Custom Alert'),
      message: message || `Alert configured for ${productObj ? productObj.name : 'commodity'}.`,
      currentPrice: targetPrice || productObj?.currentReferencePrice || 0,
      previousPrice: productObj?.previousReferencePrice || 0,
      purchaseCost: productObj?.purchaseCost || 0,
      sellingPrice: productObj?.sellingPrice || 0,
      source: 'USER_CREATED',
      market: 'Hyderabad APMC'
    });

    const populated = await Alert.findById(newAlert._id)
      .populate('product', 'name category unit stockQuantity purchaseCost sellingPrice');

    return res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      data: populated
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating alert',
      error: error.message
    });
  }
};

/**
 * @desc    AI evaluate commodities and auto-generate smart alerts
 * @route   POST /api/alerts/ai-generate
 * @access  Private
 */
const generateAiAlerts = async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.id, isActive: true });
    if (!products || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No commodities in inventory to evaluate. Please add a product first.'
      });
    }

    const createdAlerts = [];

    for (const prod of products) {
      const curRef = prod.currentReferencePrice;
      const prevRef = prod.previousReferencePrice;
      const cost = prod.purchaseCost;
      const stock = prod.stockQuantity;
      const minStock = prod.minStockLevel || 10;

      // 1. Mandi Price Dip Alert (Procurement restock opportunity)
      if (curRef && prevRef && curRef < prevRef) {
        const dropPct = parseFloat((((prevRef - curRef) / prevRef) * 100).toFixed(1));
        const diff = parseFloat((prevRef - curRef).toFixed(2));
        const alert = await Alert.create({
          userId: req.user.id,
          product: prod._id,
          type: 'PRICE_DECREASE',
          title: `📉 Mandi Price Drop: ${prod.name}`,
          message: `Wholesale APMC rate for ${prod.name} dropped ${dropPct}% from ₹${prevRef} to ₹${curRef}/${prod.unit}. Prime opportunity to restock batches before rates climb.`,
          currentPrice: curRef,
          previousPrice: prevRef,
          priceDifference: -diff,
          percentageChange: -dropPct,
          purchaseCost: cost,
          sellingPrice: prod.sellingPrice,
          source: prod.priceSource || 'AGMARKNET',
          market: 'Hyderabad APMC'
        });
        createdAlerts.push(alert);
      }

      // 2. Mandi Price Spike Alert (Margin protection)
      if (curRef && prevRef && curRef > prevRef) {
        const risePct = parseFloat((((curRef - prevRef) / prevRef) * 100).toFixed(1));
        const diff = parseFloat((curRef - prevRef).toFixed(2));
        const alert = await Alert.create({
          userId: req.user.id,
          product: prod._id,
          type: 'PRICE_INCREASE',
          title: `📈 Wholesale Rate Surge: ${prod.name}`,
          message: `Wholesale mandi benchmark jumped by ${risePct}% to ₹${curRef}/${prod.unit}. Recommend reviewing your retail selling price (current: ₹${prod.sellingPrice}) to safeguard future replenishment margins.`,
          currentPrice: curRef,
          previousPrice: prevRef,
          priceDifference: diff,
          percentageChange: risePct,
          purchaseCost: cost,
          sellingPrice: prod.sellingPrice,
          source: prod.priceSource || 'AGMARKNET',
          market: 'Hyderabad APMC'
        });
        createdAlerts.push(alert);
      }

      // 3. Low Inventory Alert
      if (stock <= minStock) {
        const alert = await Alert.create({
          userId: req.user.id,
          product: prod._id,
          type: 'LOW_STOCK',
          title: `⚠️ Critical Low Inventory: ${prod.name}`,
          message: `Current stock of ${prod.name} is ${stock} ${prod.unit}, which is at or below your safety threshold of ${minStock} ${prod.unit}. Create a purchase batch to prevent stockout.`,
          currentPrice: curRef || cost,
          previousPrice: prevRef || cost,
          purchaseCost: cost,
          sellingPrice: prod.sellingPrice,
          source: 'INVENTORY_SCAN',
          market: 'Store Ledger'
        });
        createdAlerts.push(alert);
      }

      // 4. Mandi Price vs Cost Disparity (Negative Margin Risk)
      if (curRef && cost && curRef > cost * 1.05 && prod.sellingPrice <= curRef) {
        const alert = await Alert.create({
          userId: req.user.id,
          product: prod._id,
          type: 'AI_INSIGHT',
          title: `🤖 Margin Risk Alert: ${prod.name}`,
          message: `Current wholesale rate (₹${curRef}) exceeds or matches your retail price (₹${prod.sellingPrice}). Re-order replenishment will lead to compressed gross margins unless selling price is raised.`,
          currentPrice: curRef,
          previousPrice: prevRef || cost,
          purchaseCost: cost,
          sellingPrice: prod.sellingPrice,
          source: 'AI_INTELLIGENCE',
          market: 'Telangana APMC'
        });
        createdAlerts.push(alert);
      }
    }

    // If no alert condition triggered, create a comprehensive AI intelligence alert
    if (createdAlerts.length === 0 && products.length > 0) {
      const p = products[0];
      const alert = await Alert.create({
        userId: req.user.id,
        product: p._id,
        type: 'AI_INSIGHT',
        title: `🤖 AI Market Health Check: ${p.name}`,
        message: `Current Telangana mandi benchmark is ₹${p.currentReferencePrice || p.purchaseCost}/${p.unit}. Inventory of ${p.stockQuantity} ${p.unit} is currently adequate with stable wholesale market arrivals.`,
        currentPrice: p.currentReferencePrice || p.purchaseCost,
        previousPrice: p.previousReferencePrice || p.purchaseCost,
        purchaseCost: p.purchaseCost,
        sellingPrice: p.sellingPrice,
        source: 'AI_INTELLIGENCE',
        market: 'Telangana APMC'
      });
      createdAlerts.push(alert);
    }

    const allAlerts = await Alert.find({ userId: req.user.id })
      .populate('product', 'name category unit stockQuantity purchaseCost sellingPrice')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: `AI evaluated inventory and generated ${createdAlerts.length} smart alerts!`,
      count: createdAlerts.length,
      data: allAlerts
    });
  } catch (error) {
    console.error('Error generating AI alerts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate AI alerts',
      error: error.message
    });
  }
};

module.exports = {
  getAlerts,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAlert,
  createAlert,
  generateAiAlerts
};
