const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Alert must belong to a user'],
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    type: {
      type: String,
      required: [true, 'Alert type is required'],
      enum: ['PRICE_INCREASE', 'PRICE_DECREASE', 'LOW_STOCK', 'PRICE_STABLE', 'API_ERROR', 'AI_INSIGHT', 'TARGET_PRICE', 'CUSTOM']
    },
    title: {
      type: String,
      required: [true, 'Alert title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Alert message is required'],
      trim: true
    },
    previousPrice: {
      type: Number
    },
    currentPrice: {
      type: Number
    },
    priceDifference: {
      type: Number
    },
    percentageChange: {
      type: Number
    },
    purchaseCost: {
      type: Number
    },
    sellingPrice: {
      type: Number
    },
    source: {
      type: String,
      trim: true
    },
    market: {
      type: String,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    isDismissed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast alert retrieval per user
alertSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
