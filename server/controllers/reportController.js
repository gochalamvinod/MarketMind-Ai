const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const MarketPrice = require('../models/MarketPrice');
const mongoose = require('mongoose');

let json2csvParser = null;
try {
  const { Parser } = require('json2csv');
  json2csvParser = Parser;
} catch (err) {
  try {
    const json2csv = require('json2csv');
    json2csvParser = json2csv.Parser || json2csv;
  } catch (e) {
    json2csvParser = null;
  }
}

/**
 * Fallback CSV converter in case json2csv library is unavailable or has version discrepancies
 */
const convertToCsv = (data, fields) => {
  if (json2csvParser) {
    try {
      const parser = new json2csvParser({ fields });
      return parser.parse(data);
    } catch (err) {
      console.warn('json2csv failed, using fallback:', err.message);
    }
  }

  if (!data || data.length === 0) return '';
  const headers = fields || Object.keys(data[0]);
  const headerRow = headers.join(',');
  const rows = data.map((item) => {
    return headers.map((header) => {
      let val = item[header];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
};

/**
 * @desc    Generate inventory report with stock quantities and values
 * @route   GET /api/reports/inventory
 * @access  Private
 */
const inventoryReport = async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.id })
      .populate('supplier', 'name phone')
      .sort({ category: 1, name: 1 });

    let totalStockValue = 0;
    let totalStockQuantity = 0;

    const items = products.map((p) => {
      const stockVal = Math.round(p.stockQuantity * p.purchaseCost * 100) / 100;
      totalStockValue += stockVal;
      totalStockQuantity += p.stockQuantity;

      return {
        _id: p._id,
        name: p.name,
        category: p.category,
        variety: p.variety,
        unit: p.unit,
        stockQuantity: p.stockQuantity,
        minStockLevel: p.minStockLevel,
        purchaseCost: p.purchaseCost,
        sellingPrice: p.sellingPrice,
        stockValue: stockVal,
        currentReferencePrice: p.currentReferencePrice,
        supplierName: p.supplier ? p.supplier.name : 'N/A',
        status: p.stockQuantity <= p.minStockLevel ? 'LOW STOCK' : 'IN STOCK'
      };
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalProducts: products.length,
        totalStockQuantity,
        totalStockValue: Math.round(totalStockValue * 100) / 100
      },
      data: items
    });
  } catch (error) {
    console.error('Error generating inventory report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating inventory report',
      error: error.message
    });
  }
};

/**
 * @desc    Generate purchases report with totals and filtering
 * @route   GET /api/reports/purchases
 * @access  Private
 */
const purchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, supplierId } = req.query;
    const filter = { userId: req.user.id };

    if (supplierId) {
      filter.supplier = supplierId;
    }

    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.purchaseDate.$lte = end;
      }
    }

    const purchases = await Purchase.find(filter)
      .populate('product', 'name category unit')
      .populate('supplier', 'name')
      .sort({ purchaseDate: -1 });

    const totalAmount = purchases.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalQuantity = purchases.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return res.status(200).json({
      success: true,
      summary: {
        totalPurchases: purchases.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalQuantity
      },
      data: purchases
    });
  } catch (error) {
    console.error('Error generating purchases report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating purchases report',
      error: error.message
    });
  }
};

/**
 * @desc    Generate sales report with revenue and gross profit
 * @route   GET /api/reports/sales
 * @access  Private
 */
const salesReport = async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;
    const filter = { userId: req.user.id };

    if (productId) {
      filter.product = productId;
    }

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.saleDate.$lte = end;
      }
    }

    const sales = await Sale.find(filter)
      .populate('product', 'name category unit purchaseCost')
      .sort({ saleDate: -1 });

    const totalRevenue = sales.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
    const totalCOGS = sales.reduce((sum, item) => sum + (item.costOfGoodsSold || 0), 0);
    const totalGrossProfit = sales.reduce((sum, item) => sum + (item.grossProfit || 0), 0);
    const overallMargin = totalRevenue > 0
      ? Math.round(((totalGrossProfit / totalRevenue) * 100) * 100) / 100
      : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalSalesCount: sales.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        totalGrossProfit: Math.round(totalGrossProfit * 100) / 100,
        overallMargin
      },
      data: sales
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating sales report',
      error: error.message
    });
  }
};

/**
 * @desc    Aggregate sales by product to calculate profitability breakdown
 * @route   GET /api/reports/profit
 * @access  Private
 */
const profitReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { startDate, endDate } = req.query;

    const matchFilter = { userId };
    if (startDate || endDate) {
      matchFilter.saleDate = {};
      if (startDate) matchFilter.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchFilter.saleDate.$lte = end;
      }
    }

    const productProfits = await Sale.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$product',
          totalQuantitySold: { $sum: '$quantity' },
          totalRevenue: { $sum: '$totalRevenue' },
          totalCOGS: { $sum: '$costOfGoodsSold' },
          totalGrossProfit: { $sum: '$grossProfit' },
          transactionsCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          productName: '$product.name',
          category: '$product.category',
          unit: '$product.unit',
          totalQuantitySold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalCOGS: { $round: ['$totalCOGS', 2] },
          totalGrossProfit: { $round: ['$totalGrossProfit', 2] },
          transactionsCount: 1,
          profitMargin: {
            $cond: [
              { $gt: ['$totalRevenue', 0] },
              { $round: [{ $multiply: [{ $divide: ['$totalGrossProfit', '$totalRevenue'] }, 100] }, 2] },
              0
            ]
          }
        }
      },
      { $sort: { totalGrossProfit: -1 } }
    ]);

    const totalRevenue = productProfits.reduce((acc, p) => acc + p.totalRevenue, 0);
    const totalCOGS = productProfits.reduce((acc, p) => acc + p.totalCOGS, 0);
    const totalProfit = productProfits.reduce((acc, p) => acc + p.totalGrossProfit, 0);
    const overallMargin = totalRevenue > 0
      ? Math.round(((totalProfit / totalRevenue) * 100) * 100) / 100
      : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCOGS: Math.round(totalCOGS * 100) / 100,
        totalGrossProfit: Math.round(totalProfit * 100) / 100,
        overallMargin
      },
      data: productProfits
    });
  } catch (error) {
    console.error('Error generating profit report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating profit report',
      error: error.message
    });
  }
};

/**
 * @desc    Generate price history report across products
 * @route   GET /api/reports/price-history
 * @access  Private
 */
const priceHistoryReport = async (req, res) => {
  try {
    const { productId, startDate, endDate } = req.query;
    const filter = { userId: req.user.id };

    if (productId) {
      filter.product = productId;
    }

    if (startDate || endDate) {
      filter.observationDate = {};
      if (startDate) filter.observationDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.observationDate.$lte = end;
      }
    }

    const prices = await MarketPrice.find(filter)
      .populate('product', 'name category unit purchaseCost')
      .sort({ observationDate: -1, fetchTime: -1 });

    return res.status(200).json({
      success: true,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    console.error('Error generating price history report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating price history report',
      error: error.message
    });
  }
};

/**
 * @desc    Export report data as CSV file download
 * @route   GET /api/reports/export/:type
 * @access  Private
 */
const exportCsv = async (req, res) => {
  try {
    const { type } = req.params;
    let csvData = '';
    let filename = `marketmind_${type}_${Date.now()}.csv`;

    if (type === 'inventory') {
      const products = await Product.find({ userId: req.user.id }).populate('supplier', 'name');
      const formatted = products.map((p) => ({
        Name: p.name,
        Category: p.category,
        Variety: p.variety || '',
        Unit: p.unit,
        'Stock Quantity': p.stockQuantity,
        'Min Stock Level': p.minStockLevel,
        'Purchase Cost (₹)': p.purchaseCost,
        'Selling Price (₹)': p.sellingPrice,
        'Current Reference Price (₹)': p.currentReferencePrice || '',
        'Total Stock Value (₹)': Math.round(p.stockQuantity * p.purchaseCost * 100) / 100,
        Supplier: p.supplier ? p.supplier.name : ''
      }));
      csvData = convertToCsv(formatted, [
        'Name',
        'Category',
        'Variety',
        'Unit',
        'Stock Quantity',
        'Min Stock Level',
        'Purchase Cost (₹)',
        'Selling Price (₹)',
        'Current Reference Price (₹)',
        'Total Stock Value (₹)',
        'Supplier'
      ]);
    } else if (type === 'purchases') {
      const purchases = await Purchase.find({ userId: req.user.id })
        .populate('product', 'name')
        .populate('supplier', 'name')
        .sort({ purchaseDate: -1 });

      const formatted = purchases.map((p) => ({
        Date: p.purchaseDate ? p.purchaseDate.toISOString().split('T')[0] : '',
        Product: p.product ? p.product.name : 'Unknown',
        Supplier: p.supplier ? p.supplier.name : 'Unknown',
        Quantity: p.quantity,
        Unit: p.unit,
        'Unit Cost (₹)': p.unitCost,
        'Total Amount (₹)': p.totalAmount,
        'Invoice Number': p.invoiceNumber || ''
      }));
      csvData = convertToCsv(formatted, [
        'Date',
        'Product',
        'Supplier',
        'Quantity',
        'Unit',
        'Unit Cost (₹)',
        'Total Amount (₹)',
        'Invoice Number'
      ]);
    } else if (type === 'sales') {
      const sales = await Sale.find({ userId: req.user.id })
        .populate('product', 'name')
        .sort({ saleDate: -1 });

      const formatted = sales.map((s) => ({
        Date: s.saleDate ? s.saleDate.toISOString().split('T')[0] : '',
        Product: s.product ? s.product.name : 'Unknown',
        Quantity: s.quantity,
        Unit: s.unit,
        'Selling Price (₹)': s.unitSellingPrice,
        'Total Revenue (₹)': s.totalRevenue,
        'COGS (₹)': s.costOfGoodsSold,
        'Gross Profit (₹)': s.grossProfit,
        'Margin (%)': s.profitMargin,
        Invoice: s.invoiceNumber || '',
        Customer: s.customerRef || ''
      }));
      csvData = convertToCsv(formatted, [
        'Date',
        'Product',
        'Quantity',
        'Unit',
        'Selling Price (₹)',
        'Total Revenue (₹)',
        'COGS (₹)',
        'Gross Profit (₹)',
        'Margin (%)',
        'Invoice',
        'Customer'
      ]);
    } else if (type === 'profit') {
      const userId = new mongoose.Types.ObjectId(req.user.id);
      const profitData = await Sale.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: '$product',
            totalQuantity: { $sum: '$quantity' },
            revenue: { $sum: '$totalRevenue' },
            cogs: { $sum: '$costOfGoodsSold' },
            profit: { $sum: '$grossProfit' }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' }
      ]);

      const formatted = profitData.map((d) => {
        const rev = Math.round(d.revenue * 100) / 100;
        const prof = Math.round(d.profit * 100) / 100;
        const margin = rev > 0 ? Math.round(((prof / rev) * 100) * 100) / 100 : 0;
        return {
          Product: d.product.name,
          Category: d.product.category,
          'Total Sold': d.totalQuantity,
          'Total Revenue (₹)': rev,
          'Total COGS (₹)': Math.round(d.cogs * 100) / 100,
          'Gross Profit (₹)': prof,
          'Margin (%)': margin
        };
      });
      csvData = convertToCsv(formatted, [
        'Product',
        'Category',
        'Total Sold',
        'Total Revenue (₹)',
        'Total COGS (₹)',
        'Gross Profit (₹)',
        'Margin (%)'
      ]);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Supported types: inventory, purchases, sales, profit'
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvData);
  } catch (error) {
    console.error('Error exporting CSV report:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error exporting CSV',
      error: error.message
    });
  }
};

module.exports = {
  inventoryReport,
  purchaseReport,
  salesReport,
  profitReport,
  priceHistoryReport,
  exportCsv
};
