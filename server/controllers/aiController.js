const { model, isGeminiAvailable } = require('../config/gemini');
const Product = require('../models/Product');
const MarketPrice = require('../models/MarketPrice');
const Sale = require('../models/Sale');

/**
 * @desc    Get overall market intelligence insights
 * @route   GET /api/ai/insights
 * @access  Private
 */
const getInsights = async (req, res) => {
  try {
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
        const prompt = `You are MarketMind AI, a commodity market intelligence advisor for an Indian grocery business in Hyderabad, Telangana.
Analyze the following inventory and market price movements:
Products tracked: ${products.map((p) => `${p.name} (Cost: Rs ${p.purchaseCost}/kg, Selling: Rs ${p.sellingPrice}/kg, Ref Price: Rs ${p.currentReferencePrice || 'N/A'}/kg)`).slice(0, 15).join('; ')}.
Recent trends: ${risingProducts.length} rising, ${fallingProducts.length} falling.

Provide:
1. Concise executive summary of market conditions (2-3 sentences)
2. Strategic advice for purchasing (which commodities to buy early before price rises)
3. Pricing advice (which retail prices to protect margins on)
Keep language plain, practical, and in INR (Rs). Keep response under 250 words.`;

        const result = await model.generateContent(prompt);
        const aiText = result.response.text();

        return res.status(200).json({
          success: true,
          source: 'AI',
          model: 'Gemini 3.5 Flash',
          insights: aiText,
          stats: ruleBasedSummary
        });
      } catch (geminiError) {
        console.warn('[Gemini AI] Call failed, fallback to rule-based:', geminiError.message);
      }
    }

    // Fallback to deterministic rule-based output
    return res.status(200).json({
      success: true,
      source: 'RULE_BASED',
      model: 'Deterministic Rule Engine',
      insights: ruleBasedSummary.actionableAdvice,
      stats: ruleBasedSummary
    });
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

        const result = await model.generateContent(prompt);
        explanation = result.response.text();
      } catch (geminiError) {
        console.warn('[Gemini AI] Product analysis fallback:', geminiError.message);
      }
    }

    return res.status(200).json({
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
    });
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
        const result = await model.generateContent(prompt);
        forecastExplanation = result.response.text();
      } catch (err) {
        console.warn('[Gemini AI] Forecast error:', err.message);
      }
    }

    return res.status(200).json({
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
    });
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
 * @desc    Get actionable recommendations for buying and pricing
 * @route   GET /api/ai/recommendations
 * @access  Private
 */
const getRecommendations = async (req, res) => {
  try {
    const products = await Product.find({ userId: req.user.id, isActive: true });

    const buyOpportunities = [];
    const repriceRecommendations = [];

    products.forEach((p) => {
      if (p.currentReferencePrice) {
        // If market price is rising above purchase cost, suggest reviewing selling price
        if (p.currentReferencePrice > p.purchaseCost * 1.1) {
          const suggestedSelling = (p.currentReferencePrice / 0.9).toFixed(2); // 10% target margin
          repriceRecommendations.push({
            productId: p._id,
            name: p.name,
            currentCost: p.purchaseCost,
            marketPrice: p.currentReferencePrice,
            currentSellingPrice: p.sellingPrice,
            suggestedPrice: suggestedSelling,
            reason: `Market reference (₹${p.currentReferencePrice}) exceeds your purchase cost by >10%. Review selling price to protect future replenishment margin.`
          });
        }

        // If market price dipped below previous reference, buying opportunity
        if (p.previousReferencePrice && p.currentReferencePrice < p.previousReferencePrice) {
          const dropPercent = (((p.previousReferencePrice - p.currentReferencePrice) / p.previousReferencePrice) * 100).toFixed(1);
          buyOpportunities.push({
            productId: p._id,
            name: p.name,
            currentCost: p.purchaseCost,
            marketPrice: p.currentReferencePrice,
            dropPercent: `${dropPercent}%`,
            stockQuantity: p.stockQuantity,
            reason: `Wholesale market dropped by ${dropPercent}% (now ₹${p.currentReferencePrice}/${p.unit}). Favorable entry point for stock restocking.`
          });
        }
      }
    });

    return res.status(200).json({
      success: true,
      source: 'CALCULATED_RECOMMENDATIONS',
      notice: 'Recommendations require business owner review and approval before action.',
      data: {
        buyOpportunities: buyOpportunities.slice(0, 6),
        repriceRecommendations: repriceRecommendations.slice(0, 6)
      }
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating recommendations',
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
