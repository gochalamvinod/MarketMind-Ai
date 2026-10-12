const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Product must belong to a user'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Please select a product category'],
      enum: [
        'Rice',
        'Wheat',
        'Dal & Pulses',
        'Cooking Oil',
        'Sugar & Sweeteners',
        'Spices',
        'Flour & Grains',
        'Others'
      ]
    },
    variety: {
      type: String,
      trim: true
    },
    unit: {
      type: String,
      required: [true, 'Please specify unit of measurement'],
      enum: ['kg', 'quintal', 'litre', 'packet', 'piece', 'dozen'],
      default: 'kg'
    },
    purchaseCost: {
      type: Number,
      required: [true, 'Please provide purchase cost'],
      default: 0,
      min: [0, 'Purchase cost cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Please provide selling price'],
      default: 0,
      min: [0, 'Selling price cannot be negative']
    },
    currentReferencePrice: {
      type: Number,
      default: null
    },
    previousReferencePrice: {
      type: Number,
      default: null
    },
    stockQuantity: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      default: 0,
      min: [0, 'Stock quantity cannot be negative']
    },
    minStockLevel: {
      type: Number,
      default: 10,
      min: [0, 'Minimum stock level cannot be negative']
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    },
    description: {
      type: String,
      trim: true
    },
    govApiCommodityName: {
      type: String,
      trim: true
    },
    govApiVariety: {
      type: String,
      trim: true
    },
    lastPriceUpdate: {
      type: Date
    },
    priceSource: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for user, category, and name searches
productSchema.index({ userId: 1, category: 1, name: 1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
