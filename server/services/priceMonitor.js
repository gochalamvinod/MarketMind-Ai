const Product = require('../models/Product');
const MarketPrice = require('../models/MarketPrice');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');
const govApiService = require('./govApiService');
const helpers = require('../utils/helpers');

/**
 * Generate a realistic demo price change for testing/demonstration
 * Small movements (-4% to +6%), occasional unchanged
 */
const generateDemoPrice = (currentPrice) => {
  if (!currentPrice || currentPrice <= 0) return 40;
  // 20% chance of staying unchanged
  if (Math.random() < 0.2) return currentPrice;

  // -5% to +8% fluctuation
  const changePercent = (Math.random() * 13 - 5) / 100;
  const newPrice = parseFloat((currentPrice * (1 + changePercent)).toFixed(2));
  return Math.max(1, newPrice);
};

/**
 * Run automatic price monitoring check for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Execution summary
 */
const checkPricesForUser = async (userId) => {
  try {
    const settings = await Settings.findOne({ userId });
    const threshold = settings && settings.alertThreshold ? settings.alertThreshold : 5;
    const preferredState = settings && settings.preferredState ? settings.preferredState : 'Telangana';
    const preferredMarkets = settings && settings.preferredMarkets && settings.preferredMarkets.length > 0
      ? settings.preferredMarkets[0]
      : 'Hyderabad';

    const isDemo = settings ? Boolean(settings.demoMode) : helpers.isDemoMode();

    const products = await Product.find({ userId, isActive: true });
    if (!products || products.length === 0) {
      return { totalChecked: 0, updated: 0, alertsCreated: 0, message: 'No active products found' };
    }

    let updatedCount = 0;
    let alertsCount = 0;

    for (const product of products) {
      let observedPriceKg = null;
      let sourceName = isDemo ? 'DEMO' : 'AGMARKNET';
      let marketName = preferredMarkets;

      if (isDemo) {
        // Demo Mode Price Generation
        const basePrice = product.currentReferencePrice || product.purchaseCost || 40;
        observedPriceKg = generateDemoPrice(basePrice);
        sourceName = 'DEMO';
      } else {
        // Live AGMARKNET API Fetch
        const commodityQuery = product.govApiCommodityName || product.name;
        const apiResult = await govApiService.fetchCommodityPrices(
          commodityQuery,
          preferredState,
          preferredMarkets,
          product.govApiVariety || product.variety
        );

        if (apiResult.success && apiResult.records && apiResult.records.length > 0) {
          const matchedRecord = apiResult.records[0];
          observedPriceKg = matchedRecord.modalPriceKg;
          marketName = matchedRecord.market || preferredMarkets;
          sourceName = 'AGMARKNET';
        } else {
          // If live API returns no record for this commodity, retain last reference or skip
          continue;
        }
      }

      if (observedPriceKg !== null && !isNaN(observedPriceKg)) {
        const prevRefPrice = product.currentReferencePrice;
        let priceDiff = 0;
        let percentageChange = 0;

        if (prevRefPrice !== null && prevRefPrice !== undefined) {
          priceDiff = parseFloat((observedPriceKg - prevRefPrice).toFixed(2));
          percentageChange = parseFloat(helpers.calculatePercentageChange(prevRefPrice, observedPriceKg).toFixed(2));
        }

        // Avoid duplicate log if price and source did not change and updated recently (< 1 hr)
        if (prevRefPrice === observedPriceKg) {
          const recentLog = await MarketPrice.findOne({
            userId,
            product: product._id,
            pricePerKg: observedPriceKg,
            fetchTime: { $gte: new Date(Date.now() - 3600000) }
          });
          if (recentLog) {
            continue; // Skip identical observation within 1 hour
          }
        }

        // 1. Create durable MarketPrice historical record
        await MarketPrice.create({
          userId,
          product: product._id,
          commodity: product.name,
          variety: product.variety || 'Standard',
          market: marketName,
          state: preferredState,
          district: preferredMarkets,
          minPrice: observedPriceKg * 100,
          maxPrice: observedPriceKg * 100,
          modalPrice: observedPriceKg * 100,
          pricePerKg: observedPriceKg,
          unit: product.unit || 'kg',
          source: sourceName,
          observationDate: new Date(),
          fetchTime: new Date(),
          previousPrice: prevRefPrice,
          priceChange: priceDiff,
          percentageChange: percentageChange,
          isDemo: sourceName === 'DEMO'
        });

        // 2. Update Product cached reference prices WITHOUT TOUCHING purchaseCost
        product.previousReferencePrice = prevRefPrice;
        product.currentReferencePrice = observedPriceKg;
        product.lastPriceUpdate = new Date();
        product.priceSource = sourceName;
        await product.save();
        updatedCount++;

        // 3. Evaluate Alert condition if threshold exceeded
        if (prevRefPrice !== null && Math.abs(percentageChange) >= threshold) {
          // Check for recent duplicate alert within 12 hours
          const existingAlert = await Alert.findOne({
            userId,
            product: product._id,
            currentPrice: observedPriceKg,
            createdAt: { $gte: new Date(Date.now() - 12 * 3600000) }
          });

          if (!existingAlert) {
            const isIncrease = percentageChange > 0;
            const alertType = isIncrease ? 'PRICE_INCREASE' : 'PRICE_DECREASE';
            const changeSign = isIncrease ? '+' : '';

            const message = `${product.name} market reference price ${isIncrease ? 'increased' : 'decreased'} from ₹${prevRefPrice}/${product.unit} to ₹${observedPriceKg}/${product.unit}. ${isIncrease ? 'Increase' : 'Decrease'}: ${changeSign}₹${priceDiff}/${product.unit} (${changeSign}${percentageChange}%). Your recorded inventory purchase cost is ₹${product.purchaseCost}/${product.unit} and your current selling price is ₹${product.sellingPrice}/${product.unit}. Review your future purchasing decisions and pricing.`;

            await Alert.create({
              userId,
              product: product._id,
              type: alertType,
              title: `${product.name} Reference Price ${isIncrease ? 'Jump' : 'Drop'} (${changeSign}${percentageChange}%)`,
              message,
              previousPrice: prevRefPrice,
              currentPrice: observedPriceKg,
              priceDifference: priceDiff,
              percentageChange,
              purchaseCost: product.purchaseCost,
              sellingPrice: product.sellingPrice,
              source: sourceName,
              market: marketName,
              isRead: false,
              isDismissed: false
            });

            alertsCount++;
          }
        }
      }
    }

    return {
      success: true,
      totalChecked: products.length,
      updated: updatedCount,
      alertsCreated: alertsCount,
      timestamp: new Date()
    };
  } catch (error) {
    console.error(`[PriceMonitor] Check failed for user ${userId}:`, error.message);
    throw error;
  }
};

module.exports = {
  checkPricesForUser,
  generateDemoPrice
};
