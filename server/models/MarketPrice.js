const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    commodity: {
      type: String,
      required: [true, 'Commodity name is required'],
      trim: true
    },
    variety: {
      type: String,
      trim: true
    },
    market: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    minPrice: {
      type: Number
    },
    maxPrice: {
      type: Number
    },
    modalPrice: {
      type: Number
    },
    pricePerKg: {
      type: Number
    },
    unit: {
      type: String,
      default: 'kg'
    },
    source: {
      type: String,
      required: [true, 'Price source is required'],
      enum: ['AGMARKNET', 'DEMO', 'MANUAL']
    },
    observationDate: {
      type: Date
    },
    fetchTime: {
      type: Date,
      default: Date.now
    },
    previousPrice: {
      type: Number
    },
    priceChange: {
      type: Number
    },
    percentageChange: {
      type: Number
    },
    isDemo: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound indices
marketPriceSchema.index({ userId: 1, product: 1, observationDate: -1 });
marketPriceSchema.index({ userId: 1, commodity: 1, fetchTime: -1 });

const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema);

module.exports = MarketPrice;
