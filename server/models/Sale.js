const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sale record must belong to a user'],
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Please specify the sold product']
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide sale quantity'],
      min: [0.01, 'Quantity must be at least 0.01']
    },
    unit: {
      type: String,
      required: [true, 'Please specify the measurement unit']
    },
    unitSellingPrice: {
      type: Number,
      required: [true, 'Please provide unit selling price'],
      min: [0, 'Unit selling price cannot be negative']
    },
    totalRevenue: {
      type: Number,
      required: [true, 'Total revenue is required']
    },
    costOfGoodsSold: {
      type: Number,
      required: [true, 'Cost of goods sold (COGS) is required']
    },
    grossProfit: {
      type: Number,
      required: [true, 'Gross profit is required']
    },
    profitMargin: {
      type: Number
    },
    saleDate: {
      type: Date,
      required: [true, 'Sale date is required'],
      default: Date.now
    },
    customerRef: {
      type: String,
      trim: true
    },
    invoiceNumber: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Index for chronological sales lookup per user
saleSchema.index({ userId: 1, saleDate: -1 });

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;
