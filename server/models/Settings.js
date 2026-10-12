const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Settings must belong to a user'],
      unique: true
    },
    alertThreshold: {
      type: Number,
      default: 5,
      min: [1, 'Alert threshold must be at least 1%'],
      max: [50, 'Alert threshold cannot exceed 50%']
    },
    targetMargin: {
      type: Number,
      default: 10,
      min: [1, 'Target margin must be at least 1%'],
      max: [100, 'Target margin cannot exceed 100%']
    },
    priceCheckInterval: {
      type: String,
      default: '6h',
      enum: ['1h', '3h', '6h', '12h', '24h']
    },
    preferredState: {
      type: String,
      default: 'Telangana',
      trim: true
    },
    preferredMarkets: {
      type: [String],
      default: ['Hyderabad']
    },
    demoMode: {
      type: Boolean,
      default: false
    },
    govApiKey: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
