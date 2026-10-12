const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Purchase record must belong to a user'],
      index: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Please specify the purchased product']
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide purchase quantity'],
      min: [0.01, 'Quantity must be at least 0.01']
    },
    unit: {
      type: String,
      required: [true, 'Please specify the measurement unit']
    },
    unitCost: {
      type: Number,
      required: [true, 'Please provide unit purchase cost'],
      min: [0, 'Unit cost cannot be negative']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required']
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now
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

// Index for chronological purchase queries per user
purchaseSchema.index({ userId: 1, purchaseDate: -1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase;
