/**
 * Utility helpers for MarketMind AI Backend
 * Commodity price intelligence and retail arithmetic operations
 */

/**
 * Format numeric amount into Indian Rupee format (₹XX,XX,XXX.XX)
 * @param {number|string} amount - Monetary amount to format
 * @returns {string} Formatted currency string with ₹ symbol
 */
const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || amount === null || amount === undefined) {
    return '₹0.00';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount);
};

/**
 * Convert price per quintal (100 kg) to price per kg
 * @param {number} pricePerQuintal
 * @returns {number} Price per kilogram
 */
const quintalToKg = (pricePerQuintal) => {
  const val = Number(pricePerQuintal);
  if (isNaN(val) || val <= 0) return 0;
  return Number((val / 100).toFixed(2));
};

/**
 * Convert price per kg to price per quintal (100 kg)
 * @param {number} pricePerKg
 * @returns {number} Price per quintal
 */
const kgToQuintal = (pricePerKg) => {
  const val = Number(pricePerKg);
  if (isNaN(val) || val <= 0) return 0;
  return Number((val * 100).toFixed(2));
};

/**
 * Calculate percentage change between previous and current prices
 * Formula: ((newPrice - oldPrice) / oldPrice) * 100
 * @param {number} oldPrice - Base or previous price
 * @param {number} newPrice - Current or new price
 * @returns {number} Percentage change (positive for increase, negative for decrease)
 */
const calculatePercentageChange = (oldPrice, newPrice) => {
  const oldVal = Number(oldPrice);
  const newVal = Number(newPrice);

  if (isNaN(oldVal) || isNaN(newVal) || oldVal === 0) {
    return 0;
  }

  const change = ((newVal - oldVal) / oldVal) * 100;
  return Number(change.toFixed(2));
};

/**
 * Calculate weighted-average unit cost for inventory upon new batch purchase
 * Formula: ((existingQty * existingCost) + (newQty * newCost)) / (existingQty + newQty)
 * @param {number} existingQty - Current stock quantity
 * @param {number} existingCost - Current weighted-average unit cost
 * @param {number} newQty - Incoming purchase batch quantity
 * @param {number} newCost - Incoming purchase batch unit cost
 * @returns {number} Updated weighted-average cost per unit
 */
const calculateWeightedAvgCost = (existingQty, existingCost, newQty, newCost) => {
  const currentQ = Math.max(0, Number(existingQty) || 0);
  const currentC = Math.max(0, Number(existingCost) || 0);
  const batchQ = Math.max(0, Number(newQty) || 0);
  const batchC = Math.max(0, Number(newCost) || 0);

  const totalQuantity = currentQ + batchQ;
  if (totalQuantity <= 0) {
    return 0;
  }

  const totalValuation = (currentQ * currentC) + (batchQ * batchC);
  const weightedCost = totalValuation / totalQuantity;
  return Number(weightedCost.toFixed(2));
};

/**
 * Calculate gross profit
 * Formula: revenue - costOfGoodsSold
 * @param {number} revenue - Total sales revenue
 * @param {number} cogs - Cost of goods sold
 * @returns {number} Gross profit amount
 */
const calculateGrossProfit = (revenue, cogs) => {
  const rev = Number(revenue) || 0;
  const cost = Number(cogs) || 0;
  return Number((rev - cost).toFixed(2));
};

/**
 * Calculate profit margin percentage
 * Formula: (grossProfit / revenue) * 100
 * @param {number} grossProfit - Gross profit
 * @param {number} revenue - Total revenue
 * @returns {number} Profit margin percentage
 */
const calculateProfitMargin = (grossProfit, revenue) => {
  const profit = Number(grossProfit) || 0;
  const rev = Number(revenue) || 0;

  if (rev <= 0) {
    return 0;
  }

  const margin = (profit / rev) * 100;
  return Number(margin.toFixed(2));
};

/**
 * Calculate suggested selling price based on cost and target profit margin %
 * Formula: cost / (1 - (targetMargin / 100))
 * @param {number} cost - Product unit cost
 * @param {number} targetMargin - Desired profit margin percentage (e.g., 15 for 15%)
 * @returns {number} Suggested selling price
 */
const calculateSuggestedPrice = (cost, targetMargin) => {
  const unitCost = Number(cost) || 0;
  const margin = Number(targetMargin) || 0;

  if (margin >= 100 || margin < 0) {
    return unitCost;
  }

  const price = unitCost / (1 - (margin / 100));
  return Number(price.toFixed(2));
};

/**
 * Determine if system is operating in demo mode
 * @returns {boolean} False since live AGMARKNET Mandi API is integrated; true only if explicitly enabled
 */
const isDemoMode = () => {
  return process.env.DEMO_MODE === 'true';
};

module.exports = {
  formatCurrency,
  quintalToKg,
  kgToQuintal,
  calculatePercentageChange,
  calculateWeightedAvgCost,
  calculateGrossProfit,
  calculateProfitMargin,
  calculateSuggestedPrice,
  isDemoMode
};
