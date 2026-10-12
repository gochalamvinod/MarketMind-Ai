const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Alert = require('../models/Alert');
const helpers = require('../utils/helpers');

/**
 * @desc    Get sales with optional date filtering
 * @route   GET /api/sales
 * @access  Private
 */
const getSales = async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    const filter = { userId: req.user.id };

    if (productId) {
      filter.product = productId;
    }

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) {
        filter.saleDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.saleDate.$lte = end;
      }
    }

    const sales = await Sale.find(filter)
      .populate('product', 'name category unit stockQuantity purchaseCost sellingPrice')
      .sort({ saleDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching sales',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new sale, reduce inventory, check low stock alert
 * @route   POST /api/sales
 * @access  Private
 */
const createSale = async (req, res) => {
  try {
    const {
      product: productId,
      quantity,
      unit,
      unitSellingPrice,
      saleDate,
      customerRef,
      invoiceNumber,
      notes
    } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product and quantity are required'
      });
    }

    const numQuantity = Number(quantity);
    if (numQuantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    // 1. Validate product exists and belongs to user
    const product = await Product.findOne({
      _id: productId,
      userId: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // 2. Check product.stockQuantity >= quantity
    if (product.stockQuantity < numQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock'
      });
    }

    const actualSellingPrice = unitSellingPrice !== undefined && unitSellingPrice !== null
      ? Number(unitSellingPrice)
      : product.sellingPrice;

    // 3. Calculate: totalRevenue = quantity * unitSellingPrice
    const totalRevenue = Math.round(numQuantity * actualSellingPrice * 100) / 100;

    // 4. Calculate: costOfGoodsSold = quantity * product.purchaseCost (weighted avg)
    const costOfGoodsSold = Math.round(numQuantity * product.purchaseCost * 100) / 100;

    // 5. Calculate: grossProfit = totalRevenue - costOfGoodsSold
    let grossProfit;
    if (helpers && typeof helpers.calculateGrossProfit === 'function') {
      grossProfit = helpers.calculateGrossProfit(totalRevenue, costOfGoodsSold);
    } else {
      grossProfit = Math.round((totalRevenue - costOfGoodsSold) * 100) / 100;
    }

    // 6. Calculate: profitMargin = (grossProfit / totalRevenue) * 100
    let profitMargin;
    if (helpers && typeof helpers.calculateProfitMargin === 'function') {
      profitMargin = helpers.calculateProfitMargin(grossProfit, totalRevenue);
    } else {
      profitMargin = totalRevenue > 0 ? Math.round(((grossProfit / totalRevenue) * 100) * 100) / 100 : 0;
    }

    // 7. Create Sale record
    const sale = await Sale.create({
      userId: req.user.id,
      product: product._id,
      quantity: numQuantity,
      unit: unit || product.unit || 'kg',
      unitSellingPrice: actualSellingPrice,
      totalRevenue,
      costOfGoodsSold,
      grossProfit,
      profitMargin,
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      customerRef: customerRef ? customerRef.trim() : '',
      invoiceNumber: invoiceNumber ? invoiceNumber.trim() : '',
      notes: notes ? notes.trim() : ''
    });

    // 8. Reduce product.stockQuantity by quantity
    product.stockQuantity -= numQuantity;
    await product.save();

    // 9. Check if new stockQuantity <= product.minStockLevel, if so create LOW_STOCK alert
    if (product.stockQuantity <= product.minStockLevel) {
      // Check if unread low stock alert exists already to avoid spamming
      const existingAlert = await Alert.findOne({
        userId: req.user.id,
        product: product._id,
        type: 'LOW_STOCK',
        isDismissed: false,
        isRead: false
      });

      if (!existingAlert) {
        await Alert.create({
          userId: req.user.id,
          product: product._id,
          type: 'LOW_STOCK',
          title: `Low Stock: ${product.name}`,
          message: `Stock level for ${product.name} has fallen to ${product.stockQuantity} ${product.unit} (Minimum threshold: ${product.minStockLevel} ${product.unit}). Please reorder soon.`,
          purchaseCost: product.purchaseCost,
          sellingPrice: product.sellingPrice,
          source: 'INTERNAL',
          isRead: false,
          isDismissed: false
        });
      }
    }

    // 10. Return sale with populated product
    const populatedSale = await Sale.findById(sale._id)
      .populate('product', 'name category unit stockQuantity purchaseCost sellingPrice');

    return res.status(201).json({
      success: true,
      data: populatedSale
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating sale',
      error: error.message
    });
  }
};

module.exports = {
  getSales,
  createSale
};
