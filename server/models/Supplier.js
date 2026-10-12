const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Supplier must belong to a user'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Please provide supplier business name'],
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    address: {
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

// Compound index for user and supplier name
supplierSchema.index({ userId: 1, name: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;
