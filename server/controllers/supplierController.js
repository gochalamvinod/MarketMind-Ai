const Supplier = require('../models/Supplier');

/**
 * @desc    Get all suppliers for logged in user
 * @route   GET /api/suppliers
 * @access  Private
 */
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ userId: req.user.id }).sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: suppliers.length,
      data: suppliers
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching suppliers',
      error: error.message
    });
  }
};

/**
 * @desc    Get single supplier by ID
 * @route   GET /api/suppliers/:id
 * @access  Private
 */
const getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching supplier',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new supplier
 * @route   POST /api/suppliers
 * @access  Private
 */
const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email, address, notes } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    const supplier = await Supplier.create({
      userId: req.user.id,
      name: name.trim(),
      contactPerson: contactPerson ? contactPerson.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      notes: notes ? notes.trim() : ''
    });

    return res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating supplier',
      error: error.message
    });
  }
};

/**
 * @desc    Update a supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private
 */
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const updates = { ...req.body };
    delete updates.userId;

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      data: updatedSupplier
    });
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating supplier',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private
 */
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    await Supplier.deleteOne({ _id: supplier._id });

    return res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting supplier',
      error: error.message
    });
  }
};

module.exports = {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
