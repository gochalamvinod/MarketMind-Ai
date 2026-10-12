const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const helpers = require('../utils/helpers');

/**
 * @desc    Get purchases with optional date filtering
 * @route   GET /api/purchases
 * @access  Private
 */
const getPurchases = async (req, res) => {
  try {
    const { startDate, endDate, productId, supplierId } = req.query;
    const filter = { userId: req.user.id };

    if (productId) {
      filter.product = productId;
    }

    if (supplierId) {
      filter.supplier = supplierId;
    }

    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) {
        filter.purchaseDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.purchaseDate.$lte = end;
      }
    }

    const purchases = await Purchase.find(filter)
      .populate('product', 'name category unit stockQuantity purchaseCost sellingPrice')
      .populate('supplier', 'name contactPerson phone')
      .sort({ purchaseDate: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching purchases',
      error: error.message
    });
  }
};

/**
 * @desc    Record a new purchase and update product stock & weighted average cost
 * @route   POST /api/purchases
 * @access  Private
 */
const createPurchase = async (req, res) => {
  try {
    const {
      product: productId,
      supplier,
      quantity,
      unit,
      unitCost,
      purchaseDate,
      invoiceNumber,
      notes
    } = req.body;

    if (!productId || quantity === undefined || unitCost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product, quantity, and unit cost are required'
      });
    }

    const numQuantity = Number(quantity);
    const numUnitCost = Number(unitCost);

    if (numQuantity <= 0 || numUnitCost < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0 and unit cost cannot be negative'
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

    // 2. Calculate totalAmount
    const totalAmount = Math.round(numQuantity * numUnitCost * 100) / 100;

    // 3. Create Purchase record
    const purchase = await Purchase.create({
      userId: req.user.id,
      product: product._id,
      supplier: supplier || product.supplier || null,
      quantity: numQuantity,
      unit: unit || product.unit || 'kg',
      unitCost: numUnitCost,
      totalAmount,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      invoiceNumber: invoiceNumber ? invoiceNumber.trim() : '',
      notes: notes ? notes.trim() : ''
    });

    // 4. Update Product weighted average cost and stock
    const existingQty = Number(product.stockQuantity) || 0;
    const existingCost = Number(product.purchaseCost) || 0;

    let newAvgCost;
    if (helpers && typeof helpers.calculateWeightedAvgCost === 'function') {
      newAvgCost = helpers.calculateWeightedAvgCost(existingQty, existingCost, numQuantity, numUnitCost);
    } else {
      if (existingQty <= 0) {
        newAvgCost = numUnitCost;
      } else {
        newAvgCost = ((existingQty * existingCost) + (numQuantity * numUnitCost)) / (existingQty + numQuantity);
      }
    }
    newAvgCost = Math.round(newAvgCost * 100) / 100;

    product.stockQuantity = existingQty + numQuantity;
    product.purchaseCost = newAvgCost;
    if (supplier && !product.supplier) {
      product.supplier = supplier;
    }
    await product.save();

    // 5. Return purchase with populated product and supplier
    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate('product', 'name category unit stockQuantity purchaseCost sellingPrice')
      .populate('supplier', 'name contactPerson phone');

    return res.status(201).json({
      success: true,
      data: populatedPurchase
    });
  } catch (error) {
    console.error('Error recording purchase:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error recording purchase',
      error: error.message
    });
  }
};

module.exports = {
  getPurchases,
  createPurchase
};
