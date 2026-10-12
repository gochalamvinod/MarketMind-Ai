const { model, isGeminiAvailable } = require('../config/gemini');
const Product = require('../models/Product');
const MarketPrice = require('../models/MarketPrice');
const Sale = require('../models/Sale');

// In-memory response cache to ensure instantaneous navigation and zero component delays
const aiCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache per user/product

const getCached = (key) => {
  const item = aiCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    aiCache.delete(key);
    return null;
  }
  return item.data;
};

const setCached = (key, data) => {
  aiCache.set(key, { data, timestamp: Date.now() });
};

/**
 * Fast Gemini caller with timeout race.
 * If Gemini takes > 5.5s, falls back cleanly to statistical engine so user request never hangs.
 */
const callGeminiWithTimeout = async (prompt, timeoutMs = 5500) => {
  if (!isGeminiAvailable() || !model) return null;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('AI Inference Timeout (Fast Failover)')), timeoutMs)
  );
  const geminiPromise = model.generateContent(prompt).then((res) => res.response.text());
  return Promise.race([geminiPromise, timeoutPromise]);
};

/**
 * @desc    Get overall market intelligence insights
 * @route   GET /api/ai/insights
 * @access  Private
 */
const getInsights = async (req, res) => {
  try {
    const cacheKey = `insights_${req.user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const products = await Product.find({ userId: req.user.id, isActive: true });
    const recentPrices = await MarketPrice.find({ userId: req.user.id })
      .sort({ fetchTime: -1 })
      .limit(30)
      .populate('product', 'name category purchaseCost sellingPrice');

    // Rule-based insights summary
    const risingProducts = [];
    const fallingProducts = [];
    const stableProducts = [];

    products.forEach((p) => {
      if (p.currentReferencePrice && p.previousReferencePrice) {
        const change = p.currentReferencePrice - p.previousReferencePrice;
        if (change > 0) risingProducts.push({ name: p.name, change: `+₹${change.toFixed(2)}` });
        else if (change < 0) fallingProducts.push({ name: p.name, change: `-₹${Math.abs(change).toFixed(2)}` });
        else stableProducts.push(p.name);
      }
    });

    const ruleBasedSummary = {
      marketStatus: risingProducts.length > fallingProducts.length ? 'Bullish / Inflationary Trend' : 'Stable to Softening',
      risingCount: risingProducts.length,
      fallingCount: fallingProducts.length,
      stableCount: stableProducts.length,
      topRising: risingProducts.slice(0, 5),
      topFalling: fallingProducts.slice(0, 5),
      actionableAdvice: risingProducts.length > 0
        ? `Commodities like ${risingProducts.map((p) => p.name).slice(0, 3).join(', ')} are moving up in wholesale mandis. Consider securing forward inventory or re-evaluating retail markup to maintain profit margins.`
        : 'Commodity prices are generally stable across major grains and pulses.'
    };

    if (isGeminiAvailable()) {
      try {
        const prompt = `You're a sharp commodity market advisor for a grocery shop owner in Hyderabad, Telangana. Talk like a trusted business friend — plain, direct, practical. Use ₹ not Rs.

Their inventory:
${products.map((p) => `${p.name}: Cost ₹${p.purchaseCost}/${p.unit}, Selling ₹${p.sellingPrice}/${p.unit}, Mandi Rate ₹${p.currentReferencePrice || 'N/A'}/${p.unit}`).slice(0, 15).join('\n')}

Market movement: ${risingProducts.length} commodities rising, ${fallingProducts.length} falling, ${stableProducts.length} stable.
Rising: ${risingProducts.map(p => `${p.name} (${p.change})`).slice(0, 5).join(', ') || 'none'}
Falling: ${fallingProducts.map(p => `${p.name} (${p.change})`).slice(0, 5).join(', ') || 'none'}

Give a brief, actionable market briefing:
1. What's happening in 2-3 sentences (plain language, not corporate-speak)
2. What to buy NOW before prices climb higher
3. Which selling prices to bump up to protect margins
Keep it under 200 words. Be opinionated and practical — this is a real shopkeeper who needs real advice, not a report.`;

        const aiText = await callGeminiWithTimeout(prompt);
        if (aiText) {
          const payload = {
            success: true,
            source: 'AI',
            model: 'Gemini 3.5 Flash',
            insights: aiText,
            stats: ruleBasedSummary
          };
          setCached(cacheKey, payload);
          return res.status(200).json(payload);
        }
      } catch (geminiError) {
        console.warn('[Gemini AI] Call failed, fallback to rule-based:', geminiError.message);
      }
    }

    // Fallback to deterministic rule-based output
    const fallbackPayload = {
      success: true,
      source: 'RULE_BASED',
      model: 'Deterministic Rule Engine',
      insights: ruleBasedSummary.actionableAdvice,
      stats: ruleBasedSummary
    };
    setCached(cacheKey, fallbackPayload);
    return res.status(200).json(fallbackPayload);
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate market insights',
      error: error.message
    });
  }
};

/**
 * @desc    Analyze specific product's price history
 * @route   GET /api/ai/product/:productId
 * @access  Private
 */
const getProductAnalysis = async (req, res) => {
  try {
    const { productId } = req.params;
    const cacheKey = `analysis_${productId}_${req.user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const product = await Product.findOne({ _id: productId, userId: req.user.id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const priceHistory = await MarketPrice.find({ product: productId, userId: req.user.id })
      .sort({ observationDate: 1, fetchTime: 1 })
      .limit(60);

    const prices = priceHistory.map((p) => p.pricePerKg).filter((p) => p > 0);
    const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2) : product.purchaseCost;
    const minPrice = prices.length > 0 ? Math.min(...prices).toFixed(2) : product.purchaseCost;
    const maxPrice = prices.length > 0 ? Math.max(...prices).toFixed(2) : product.purchaseCost;
    const currentRef = product.currentReferencePrice || product.purchaseCost;
    const margin = product.purchaseCost > 0
      ? (((product.sellingPrice - product.purchaseCost) / product.sellingPrice) * 100).toFixed(1)
      : 0;

    let explanation = `Historical prices for ${product.name} ranged from ₹${minPrice} to ₹${maxPrice} per ${product.unit}. The current market reference is ₹${currentRef}/${product.unit} compared to your recorded stock cost of ₹${product.purchaseCost}/${product.unit}.`;

    if (isGeminiAvailable() && priceHistory.length >= 1) {
      try {
        const prompt = `Analyze commodity price history for ${product.name} (${product.variety || ''}):
Recorded Cost: Rs ${product.purchaseCost}/${product.unit}
Current Selling Price: Rs ${product.sellingPrice}/${product.unit}
Current Market Ref Price: Rs ${currentRef}/${product.unit}
Min observed: Rs ${minPrice}, Max observed: Rs ${maxPrice}, Avg: Rs ${avgPrice}
Total historical data points: ${priceHistory.length}.

Provide 3 concise bullet points:
- Trend trajectory
- Cost vs market comparison
- Practical recommendation for the shop owner.`;

        const aiText = await callGeminiWithTimeout(prompt);
        if (aiText) explanation = aiText;
      } catch (geminiError) {
        console.warn('[Gemini AI] Product analysis fallback:', geminiError.message);
      }
    }

    const payload = {
      success: true,
      source: isGeminiAvailable() ? 'AI' : 'RULE_BASED',
      data: {
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          unit: product.unit,
          purchaseCost: product.purchaseCost,
          sellingPrice: product.sellingPrice,
          currentReferencePrice: currentRef,
          marginPercent: margin
        },
        stats: {
          dataPoints: priceHistory.length,
          avgPrice,
          minPrice,
          maxPrice,
          volatility: prices.length > 1 ? ((maxPrice - minPrice) / avgPrice * 100).toFixed(1) + '%' : '0%'
        },
        analysis: explanation,
        history: priceHistory
      }
    };
    setCached(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error analyzing product:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error analyzing product',
      error: error.message
    });
  }
};

/**
 * @desc    Get short term forecast for a product (Explicitly labeled as ESTIMATE)
 * @route   GET /api/ai/forecast/:productId
 * @access  Private
 */
const getForecast = async (req, res) => {
  try {
    const { productId } = req.params;
    const cacheKey = `forecast_${productId}_${req.user.id}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const product = await Product.findOne({ _id: productId, userId: req.user.id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const priceHistory = await MarketPrice.find({ product: productId, userId: req.user.id })
      .sort({ observationDate: -1 })
      .limit(14);

    const currentPrice = product.currentReferencePrice || product.purchaseCost || 40;

    // Moving average / momentum estimate
    let trendDirection = 'STABLE';
    let expectedPercentageChange = 0;

    if (priceHistory.length >= 2) {
      const oldest = priceHistory[priceHistory.length - 1].pricePerKg;
      const newest = priceHistory[0].pricePerKg;
      const change = ((newest - oldest) / oldest) * 100;
      expectedPercentageChange = parseFloat((change * 0.5).toFixed(1)); // Damped momentum
      if (expectedPercentageChange > 1.5) trendDirection = 'UPWARD';
      else if (expectedPercentageChange < -1.5) trendDirection = 'DOWNWARD';
    }

    const forecastedPrice = parseFloat((currentPrice * (1 + expectedPercentageChange / 100)).toFixed(2));

    let forecastExplanation = `Based on historical observations, short-term wholesale prices for ${product.name} are expected to remain ${trendDirection.toLowerCase()} around ₹${forecastedPrice}/${product.unit} (approx ${expectedPercentageChange > 0 ? '+' : ''}${expectedPercentageChange}%).`;

    if (isGeminiAvailable() && priceHistory.length >= 1) {
      try {
        const prompt = `Give a short 2-sentence estimated price outlook for ${product.name} in Telangana wholesale markets. Current reference: Rs ${currentPrice}/${product.unit}. Expected directional movement: ${trendDirection} (${expectedPercentageChange}%). Remind the merchant that this is an estimate.`;
        const aiText = await callGeminiWithTimeout(prompt);
        if (aiText) forecastExplanation = aiText;
      } catch (err) {
        console.warn('[Gemini AI] Forecast error:', err.message);
      }
    }

    const payload = {
      success: true,
      source: isGeminiAvailable() ? 'AI_ESTIMATE' : 'STATISTICAL_ESTIMATE',
      disclaimer: 'DISCLAIMER: This is an automated estimate based on historical trends, not a guaranteed price prediction.',
      data: {
        productName: product.name,
        currentPrice,
        estimatedPrice: forecastedPrice,
        projectedChangePercent: expectedPercentageChange,
        trend: trendDirection,
        horizon: '7-14 Days',
        explanation: forecastExplanation
      }
    };
    setCached(cacheKey, payload);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('Error generating forecast:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating price forecast',
      error: error.message
    });
  }
};

/**
 * @desc    Get purchasing & retail price recommendations
 * @route   GET /api/ai/recommendations
 * @access  Private
 */
const getRecommendations = async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.id, isActive: true });
    const buyOpportunities = [];
    const priceAdjustmentSuggestions = [];

    products.forEach((p) => {
      const refPrice = p.currentReferencePrice;
      const prevRef = p.previousReferencePrice;

      if (refPrice && refPrice < p.purchaseCost * 0.95) {
        buyOpportunities.push({
          product: p.name,
          productId: p._id,
          unit: p.unit,
          currentCost: p.purchaseCost,
          mandiRate: refPrice,
          potentialSavingsPercent: (((p.purchaseCost - refPrice) / p.purchaseCost) * 100).toFixed(1),
          advice: `Mandi benchmark rate (₹${refPrice}/${p.unit}) is below your current inventory cost (₹${p.purchaseCost}/${p.unit}). Good restocking window to average down.`
        });
      }

      const grossMargin = p.sellingPrice > 0 ? ((p.sellingPrice - p.purchaseCost) / p.sellingPrice) * 100 : 0;
      if (grossMargin < 8 && p.purchaseCost > 0) {
        const suggestedSelling = Math.ceil(p.purchaseCost * 1.15);
        priceAdjustmentSuggestions.push({
          product: p.name,
          productId: p._id,
          unit: p.unit,
          currentSelling: p.sellingPrice,
          purchaseCost: p.purchaseCost,
          currentMargin: grossMargin.toFixed(1) + '%',
          suggestedSelling,
          targetMargin: '15%',
          advice: `Current profit margin is thin (${grossMargin.toFixed(1)}%). Consider increasing retail price to ₹${suggestedSelling}/${p.unit} for a healthy 15% margin.`
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        buyOpportunities,
        priceAdjustmentSuggestions,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error.message
    });
  }
};

module.exports = {
  getInsights,
  getProductAnalysis,
  getForecast,
  getRecommendations
};
