const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const MarketPrice = require('../models/MarketPrice');
const Alert = require('../models/Alert');
const priceMonitor = require('../services/priceMonitor');
const helpers = require('../utils/helpers');

// ── Gemini AI Conversational Engine ───────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let chatModel = null;
let fallbackModel = null;

if (apiKey && apiKey.trim() !== '') {
  try {
    genAI = new GoogleGenerativeAI(apiKey.trim());
    chatModel = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    });
    fallbackModel = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.85,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    });
    console.log('[MarketMind Chatbot] Gemini conversational engine ready');
  } catch (err) {
    console.warn('[MarketMind Chatbot] Gemini init failed:', err.message);
  }
}

/**
 * Common merchant phonetic & typo normalizer (handles Indian trade terms and typos)
 */
const normalizeCommodityText = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/\bsuger\b/g, 'sugar')
    .replace(/\bshakar\b/g, 'sugar')
    .replace(/\bchini\b/g, 'sugar')
    .replace(/\bchawal\b/g, 'rice')
    .replace(/\brise\b/g, 'rice')
    .replace(/\bgehun\b/g, 'wheat')
    .replace(/\bgehu\b/g, 'wheat')
    .replace(/\bweat\b/g, 'wheat')
    .replace(/\batta\b/g, 'flour')
    .replace(/\bata\b/g, 'flour')
    .replace(/\bdall\b/g, 'dal')
    .replace(/\bdaal\b/g, 'dal')
    .replace(/\btel\b/g, 'oil')
    .replace(/\boyle\b/g, 'oil')
    .replace(/\bmirchi\b/g, 'chilli')
    .replace(/\bchili\b/g, 'chilli')
    .replace(/\bpyaz\b/g, 'onion')
    .replace(/\baloo\b/g, 'potato');
};

/**
 * Standard Levenshtein distance for fuzzy matching
 */
const levenshteinDistance = (a, b) => {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[bn][an];
};

/**
 * Ultra-flexible product finder: Exact, Normalized, Substring, and Levenshtein Fuzzy
 */
const findProductByName = (products, text) => {
  if (!text || !Array.isArray(products) || products.length === 0) return null;
  const raw = text.toLowerCase().trim();
  const normalized = normalizeCommodityText(raw);

  // 1. Exact match
  let found = products.find(p => p.name.toLowerCase() === raw || p.name.toLowerCase() === normalized);
  if (found) return found;

  // 2. Contains match
  found = products.find(p => {
    const pName = p.name.toLowerCase();
    const pNorm = normalizeCommodityText(pName);
    return pName.includes(raw) || raw.includes(pName) || pNorm.includes(normalized) || normalized.includes(pNorm);
  });
  if (found) return found;

  // 3. Keyword token match
  const tokens = normalized.split(/\s+/).filter(t => t.length >= 3);
  for (const token of tokens) {
    found = products.find(p => {
      const pTokens = normalizeCommodityText(p.name).split(/\s+/);
      return pTokens.some(pt => pt.includes(token) || token.includes(pt));
    });
    if (found) return found;
  }

  // 4. Fuzzy Levenshtein match (distance <= 2 for short words, <= 3 for longer)
  let bestMatch = null;
  let minDistance = 999;
  for (const p of products) {
    const pWords = normalizeCommodityText(p.name).split(/\s+/);
    for (const pw of pWords) {
      for (const ut of tokens.length > 0 ? tokens : [normalized]) {
        const dist = levenshteinDistance(pw, ut);
        if (dist <= 2 && dist < minDistance) {
          minDistance = dist;
          bestMatch = p;
        }
      }
    }
  }

  return bestMatch;
};

/**
 * One-shot Natural Language Command Extractor (Indian English & Merchant Phrasing)
 */
const parseDirectCommand = (rawMessage, products) => {
  const msg = rawMessage.toLowerCase().trim();
  const normalized = normalizeCommodityText(msg);

  // 1. SELL / PRICE ALERT COMMAND:
  // e.g., "set the sell alert of suger at 300 rs", "alert if sugar crosses 570", "add alert for rice below 36"
  const alertRegex = /(?:set|add|create|put|alert)?\s*(?:a|the)?\s*(?:sell|buy|price|target|mandi)?\s*alert\s*(?:of|for|on)?\s*([a-zA-Z\s]+?)\s*(?:at|when|if|crosses|above|below|reaches|cross|reach|drops?\s*below|falls?\s*below|@)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees|\/-)?$/i;
  const alertAltRegex = /(?:alert|notify)\s*(?:me\s*)?(?:if|when)?\s*([a-zA-Z\s]+?)\s*(?:crosses|above|reaches|drops?\s*below|falls?\s*below|cross|at)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees|\/-)?$/i;

  let matchAlert = msg.match(alertRegex) || msg.match(alertAltRegex);
  if (matchAlert && matchAlert[1] && matchAlert[2]) {
    const commWord = matchAlert[1].trim();
    const priceVal = parseFloat(matchAlert[2]);
    const matched = findProductByName(products, commWord);

    if (matched && !isNaN(priceVal) && priceVal > 0) {
      const isDrop = msg.includes('below') || msg.includes('drop') || msg.includes('fall') || msg.includes('buy alert');
      return {
        action: 'CREATE_ALERT',
        params: {
          commodity: matched.name,
          condition: isDrop ? 'PRICE_DECREASE' : 'PRICE_INCREASE',
          targetValue: priceVal
        },
        matchedProduct: matched
      };
    }
  }

  // 2. UPDATE SELLING PRICE COMMAND:
  // e.g., "update sugar price to 45", "change rice rate to 52 rs", "set sugar selling price 50"
  const updatePriceRegex = /(?:update|change|set|edit|modify)\s*(?:the\s*)?([a-zA-Z\s]+?)\s*(?:selling\s*)?(?:price|rate)\s*(?:to|at|as|=|is)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees|\/-)?$/i;
  const matchPrice = msg.match(updatePriceRegex);
  if (matchPrice && matchPrice[1] && matchPrice[2]) {
    const commWord = matchPrice[1].trim();
    const newPriceVal = parseFloat(matchPrice[2]);
    const matched = findProductByName(products, commWord);

    if (matched && !isNaN(newPriceVal) && newPriceVal > 0) {
      return {
        action: 'UPDATE_PRICE',
        params: {
          commodity: matched.name,
          newPrice: newPriceVal
        },
        matchedProduct: matched
      };
    }
  }

  // 3. RECORD SALE COMMAND:
  // e.g., "sell 10kg sugar at 42", "sold 5 bags of rice", "record sale 20 kg wheat"
  const saleRegex = /(?:sell|sold|record\s*sale|billed?)\s*(\d+(?:\.\d+)?)\s*(?:kg|quintal|bags?|litres?|tons?)?\s*(?:of\s*)?([a-zA-Z\s]+?)(?:\s*(?:at|@|for)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?))?(?:\s*(?:rs|rupees|\/-))?$/i;
  const matchSale = msg.match(saleRegex);
  if (matchSale && matchSale[1] && matchSale[2]) {
    const qtyVal = parseFloat(matchSale[1]);
    const commWord = matchSale[2].trim();
    const priceVal = matchSale[3] ? parseFloat(matchSale[3]) : null;
    const matched = findProductByName(products, commWord);

    if (matched && !isNaN(qtyVal) && qtyVal > 0) {
      return {
        action: 'RECORD_SALE',
        params: {
          commodity: matched.name,
          quantity: qtyVal,
          unitPrice: priceVal || matched.sellingPrice
        },
        matchedProduct: matched
      };
    }
  }

  // 4. RECORD PURCHASE / RESTOCK COMMAND:
  // e.g., "bought 50kg sugar at 38 rs", "restock 10 bags rice at 1200"
  const purchaseRegex = /(?:bought|buy|purchased?|record\s*purchase|restock)\s*(\d+(?:\.\d+)?)\s*(?:kg|quintal|bags?|litres?|tons?)?\s*(?:of\s*)?([a-zA-Z\s]+?)(?:\s*(?:at|@|for)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?))?(?:\s*(?:rs|rupees|\/-))?$/i;
  const matchPur = msg.match(purchaseRegex);
  if (matchPur && matchPur[1] && matchPur[2] && matchPur[3]) {
    const qtyVal = parseFloat(matchPur[1]);
    const commWord = matchPur[2].trim();
    const costVal = parseFloat(matchPur[3]);
    const matched = findProductByName(products, commWord);

    if (matched && !isNaN(qtyVal) && qtyVal > 0 && !isNaN(costVal) && costVal > 0) {
      return {
        action: 'RECORD_PURCHASE',
        params: {
          commodity: matched.name,
          quantity: qtyVal,
          unitCost: costVal
        },
        matchedProduct: matched
      };
    }
  }

  // 5. FETCH / SYNC MANDI PRICES COMMAND:
  if (
    msg.includes('fetch mandi') ||
    msg.includes('sync mandi') ||
    msg.includes('mandi rates now') ||
    msg.includes('fetch latest mandi') ||
    msg.includes('refresh mandi')
  ) {
    return { action: 'FETCH_PRICES', params: {} };
  }

  // 6. CLEAR ALERTS COMMAND:
  if (msg.includes('mark alerts as read') || msg.includes('clear alerts') || msg.includes('dismiss alerts')) {
    return { action: 'MARK_ALERTS_READ', params: {} };
  }

  return null;
};

/**
 * Execute real database actions on behalf of the user
 */
const executeStoreAction = async (userId, actionType, params = {}, products, suppliers) => {
  const normAction = (actionType || 'NONE').toUpperCase().trim();

  // ── CREATE ALERT ──
  if (normAction === 'CREATE_ALERT' || normAction === 'ADD_ALERT') {
    const commodityQuery = (params.commodity || 'Commodity').trim();
    const matched = findProductByName(products, commodityQuery);
    const commName = matched ? matched.name : commodityQuery.charAt(0).toUpperCase() + commodityQuery.slice(1);
    const unit = matched ? (matched.unit || 'kg') : 'kg';

    const curRef = matched ? (matched.currentReferencePrice || matched.purchaseCost || 40) : 40;
    const cond = params.condition || (params.targetValue && params.targetValue > curRef ? 'PRICE_INCREASE' : 'PRICE_DECREASE');
    let targetVal = parseFloat(params.targetValue);
    if (isNaN(targetVal) || targetVal <= 0) {
      targetVal = cond === 'PRICE_INCREASE'
        ? parseFloat((curRef * 1.05).toFixed(2))
        : parseFloat((curRef * 0.95).toFixed(2));
    }

    let alertType = 'PRICE_DECREASE';
    let title = '';
    let message = '';

    if (cond === 'PRICE_INCREASE' || cond === 'ABOVE') {
      alertType = 'PRICE_INCREASE';
      title = `📈 Wholesale Rate Surge: ${commName}`;
      message = `Copilot alert: Notify when APMC mandi rate for ${commName} rises to or above ₹${targetVal}/${unit}.`;
    } else if (cond === 'LOW_STOCK') {
      alertType = 'LOW_STOCK';
      title = `⚠️ Stock Reorder Alert: ${commName}`;
      message = `Copilot alert: Notify when inventory for ${commName} drops to ${targetVal} ${unit}.`;
    } else {
      alertType = 'PRICE_DECREASE';
      title = `📉 Mandi Restock Opportunity: ${commName}`;
      message = `Copilot alert: Notify when APMC rate for ${commName} drops below ₹${targetVal}/${unit}.`;
    }

    const newAlert = await Alert.create({
      userId,
      product: matched ? matched._id : null,
      type: alertType,
      title,
      message,
      currentPrice: targetVal,
      previousPrice: curRef,
      purchaseCost: matched ? matched.purchaseCost : targetVal * 0.9,
      sellingPrice: matched ? matched.sellingPrice : targetVal,
      source: 'AI_COPILOT',
      market: 'Hyderabad APMC'
    });

    return {
      executed: true,
      type: 'CREATE_ALERT',
      data: newAlert,
      productName: commName,
      targetValue: targetVal,
      unit,
      condition: cond
    };
  }

  // ── RECORD SALE ──
  if (normAction === 'RECORD_SALE') {
    const matched = findProductByName(products, params.commodity || '');
    const qty = parseFloat(params.quantity);

    if (!matched) return { executed: false, message: `Couldn't find "${params.commodity}" in your inventory.` };
    if (isNaN(qty) || qty <= 0) return { executed: false, message: 'Please specify the quantity you want to sell.' };
    if (matched.stockQuantity < qty) {
      return {
        executed: false,
        message: `Not enough stock! You only have ${matched.stockQuantity} ${matched.unit} of ${matched.name}, but you asked to sell ${qty} ${matched.unit}.`
      };
    }

    const unitSellingPrice = params.unitPrice && params.unitPrice > 0 ? parseFloat(params.unitPrice) : matched.sellingPrice;
    const totalRevenue = parseFloat((qty * unitSellingPrice).toFixed(2));
    const costOfGoodsSold = parseFloat((qty * matched.purchaseCost).toFixed(2));
    const grossProfit = parseFloat((totalRevenue - costOfGoodsSold).toFixed(2));
    const profitMargin = totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;

    const newSale = await Sale.create({
      userId,
      product: matched._id,
      quantity: qty,
      unit: matched.unit || 'kg',
      unitSellingPrice,
      totalRevenue,
      costOfGoodsSold,
      grossProfit,
      profitMargin,
      saleDate: new Date(),
      customerRef: params.customer || 'Direct Retail Customer',
      invoiceNumber: `INV-AI-${Date.now().toString().slice(-6)}`
    });

    matched.stockQuantity = parseFloat((matched.stockQuantity - qty).toFixed(2));
    await matched.save();

    return {
      executed: true,
      type: 'RECORD_SALE',
      data: newSale,
      productName: matched.name,
      quantity: qty,
      unit: matched.unit,
      revenue: totalRevenue,
      profit: grossProfit,
      remainingStock: matched.stockQuantity
    };
  }

  // ── RECORD PURCHASE ──
  if (normAction === 'RECORD_PURCHASE' || normAction === 'RESTOCK') {
    const matched = findProductByName(products, params.commodity || '');
    const qty = parseFloat(params.quantity);
    const unitCost = parseFloat(params.unitCost);

    if (!matched || isNaN(qty) || qty <= 0 || isNaN(unitCost) || unitCost <= 0) {
      return { executed: false, message: 'I need a valid product name, quantity, and unit cost to record a purchase.' };
    }

    const existingQty = matched.stockQuantity || 0;
    const existingCost = matched.purchaseCost || 0;
    const newCost = helpers.calculateWeightedAvgCost(existingQty, existingCost, qty, unitCost);
    const newQty = parseFloat((existingQty + qty).toFixed(2));
    const totalAmount = parseFloat((qty * unitCost).toFixed(2));
    const supplierId = matched.supplier || (suppliers.length > 0 ? suppliers[0]._id : null);

    const newPurchase = await Purchase.create({
      userId,
      product: matched._id,
      supplier: supplierId,
      quantity: qty,
      unit: matched.unit || 'kg',
      unitCost,
      totalAmount,
      purchaseDate: new Date(),
      invoiceNumber: `PUR-AI-${Date.now().toString().slice(-6)}`
    });

    matched.stockQuantity = newQty;
    matched.purchaseCost = newCost;
    await matched.save();

    return {
      executed: true,
      type: 'RECORD_PURCHASE',
      data: newPurchase,
      productName: matched.name,
      quantity: qty,
      unit: matched.unit,
      newCost,
      newStock: newQty
    };
  }

  // ── UPDATE SELLING PRICE ──
  if (normAction === 'UPDATE_PRICE' || normAction === 'UPDATE_SELLING_PRICE') {
    const matched = findProductByName(products, params.commodity || '');
    const newPrice = parseFloat(params.newPrice);

    if (!matched || isNaN(newPrice) || newPrice <= 0) {
      return { executed: false, message: 'Need a valid product and price to update.' };
    }

    const oldPrice = matched.sellingPrice;
    matched.sellingPrice = newPrice;
    await matched.save();

    return {
      executed: true,
      type: 'UPDATE_PRICE',
      productName: matched.name,
      oldPrice,
      newPrice,
      unit: matched.unit
    };
  }

  // ── ADD PRODUCT ──
  if (normAction === 'ADD_PRODUCT' || normAction === 'CREATE_PRODUCT') {
    const name = (params.name || '').trim();
    const cost = parseFloat(params.cost || 0);
    const price = parseFloat(params.sellingPrice || cost * 1.12);

    if (!name || isNaN(price) || price <= 0) {
      return { executed: false, message: 'I need at least a product name and selling price to add it to your catalog.' };
    }

    const newProduct = await Product.create({
      userId,
      name,
      category: params.category || 'General',
      variety: params.variety || 'Standard',
      unit: params.unit || 'kg',
      purchaseCost: isNaN(cost) ? 0 : cost,
      sellingPrice: price,
      stockQuantity: parseFloat(params.stock || 0),
      minStockLevel: 10,
      govApiCommodityName: name,
      isActive: true
    });

    return {
      executed: true,
      type: 'ADD_PRODUCT',
      data: newProduct,
      productName: newProduct.name,
      sellingPrice: newProduct.sellingPrice,
      unit: newProduct.unit
    };
  }

  // ── FETCH LIVE MANDI PRICES ──
  if (normAction === 'FETCH_MANDI' || normAction === 'FETCH_PRICES' || normAction === 'SYNC_PRICES') {
    const checkResult = await priceMonitor.checkPricesForUser(userId);
    return { executed: true, type: 'FETCH_PRICES', data: checkResult };
  }

  // ── MARK ALL ALERTS AS READ ──
  if (normAction === 'MARK_ALERTS_READ' || normAction === 'CLEAR_ALERTS') {
    await Alert.updateMany({ userId, isRead: false }, { isRead: true });
    return { executed: true, type: 'MARK_ALERTS_READ' };
  }

  return { executed: false };
};

/**
 * Build rich, personality-driven system prompt with live store data
 */
const buildSystemPrompt = (storeData) => {
  const {
    products, suppliers, todaySales, todayRevenue, todayProfit,
    todayMargin, lowStockItems, totalStockValue, unreadAlerts
  } = storeData;

  const inventoryLines = products.map(p => {
    const margin = p.sellingPrice > 0 && p.purchaseCost > 0
      ? (((p.sellingPrice - p.purchaseCost) / p.sellingPrice) * 100).toFixed(0)
      : '?';
    return `  • ${p.name} — ${p.stockQuantity} ${p.unit} | Cost ₹${p.purchaseCost}/${p.unit} | Sell ₹${p.sellingPrice}/${p.unit} | Mandi ₹${p.currentReferencePrice || 'N/A'}/${p.unit} | Margin ~${margin}%`;
  }).join('\n');

  return `You are MarketMind AI — the personal business co-pilot and trusted munshi (manager) for this grocery/commodity business. You work directly with the store owner to maximize profits and execute operations instantly.

YOUR PERSONALITY (10/10 Natural Human Merchant Partner):
- Speak like an experienced, trusted Indian business partner — warm, concise, confident, and direct.
- Keep responses short and impactful (1 to 3 sentences max for operations).
- Understand colloquial Indian English, typos, and abbreviations:
  "suger" = Sugar, "chawal" = Rice, "gehun" = Wheat, "rs" = rupees, "bhav" = rate, "sell alert at 300" = alert when price hits 300.
- When an owner gives a command with numbers, NEVER ask redundant questions — EXECUTE IT IN ONE SHOT!
- Reference REAL numbers from the inventory below. Always use ₹ for currency.
- Strict Domain Scope: Only discuss store business (commodities, stock, prices, mandi rates, sales, profits, suppliers, alerts). Politely decline unrelated topics (movies, weather, politics, recipes, coding).

═══════════════════════════════════
LIVE STORE INVENTORY & TODAY'S STATUS:
═══════════════════════════════════
📦 Catalog: ${products.length} commodities | Stock Value: ₹${totalStockValue.toLocaleString('en-IN')}
📊 Today's Register: ${todaySales.length} sales | Revenue ₹${todayRevenue.toLocaleString('en-IN')} | Profit ₹${todayProfit.toLocaleString('en-IN')} (${todayMargin}% margin)
🔔 Unread Alerts: ${unreadAlerts.length}
⚠️ Low Stock: ${lowStockItems.length > 0 ? lowStockItems.map(p => `${p.name} (${p.stockQuantity} ${p.unit})`).join(', ') : 'Fully stocked up 👍'}

CURRENT COMMODITIES:
${inventoryLines || '  (Catalog empty — encourage owner to add products)'}
═══════════════════════════════════

AVAILABLE ACTIONS:
- CREATE_ALERT: params { commodity, condition: "PRICE_INCREASE" or "PRICE_DECREASE", targetValue }
- UPDATE_PRICE: params { commodity, newPrice }
- RECORD_SALE: params { commodity, quantity, unitPrice }
- RECORD_PURCHASE: params { commodity, quantity, unitCost }
- ADD_PRODUCT: params { name, sellingPrice, cost, unit }
- FETCH_MANDI: params {}
- MARK_ALERTS_READ: params {}
- NONE: for general conversation / answers

OUTPUT FORMAT — Return ONLY this JSON:
{
  "action": "ACTION_NAME",
  "params": {},
  "reply": "Warm, direct, human response",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;
};

/**
 * @desc    AI Copilot Chat Handler
 * @route   POST /api/chatbot  |  POST /api/chatbot/message
 * @access  Private
 */
const handleChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // ── 1. Fetch live store state ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [products, suppliers, unreadAlerts, todaySales] = await Promise.all([
      Product.find({ userId, isActive: true }),
      Supplier.find({ userId }),
      Alert.find({ userId, isRead: false }).sort({ createdAt: -1 }).limit(5),
      Sale.find({ userId, saleDate: { $gte: todayStart, $lte: todayEnd } })
    ]);

    const totalStockValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.purchaseCost), 0);
    const lowStockItems = products.filter(p => p.stockQuantity <= (p.minStockLevel || 10));
    const todayRevenue = todaySales.reduce((s, x) => s + (x.totalRevenue || 0), 0);
    const todayProfit = todaySales.reduce((s, x) => s + (x.grossProfit || 0), 0);
    const todayMargin = todayRevenue > 0 ? ((todayProfit / todayRevenue) * 100).toFixed(1) : '0';

    // ── 2. Fast Deterministic NLP Pre-Check (One-Shot 10/10 Execution) ──
    const directCmd = parseDirectCommand(message, products);
    if (directCmd) {
      const result = await executeStoreAction(
        userId,
        directCmd.action,
        directCmd.params,
        products,
        suppliers
      );

      if (result.executed) {
        let replyText = '';
        let suggestions = [];

        switch (result.type) {
          case 'CREATE_ALERT':
            replyText = `Locked in! 🔔 I've set your sell alert for **${result.productName}** at **₹${result.targetValue}/${result.unit}**. As soon as the APMC mandi wholesale rate crosses ₹${result.targetValue}, I'll alert you immediately so you can sell at peak profit!`;
            suggestions = [`Check ${result.productName} stock`, 'Fetch mandi rates', "Today's sales"];
            break;
          case 'UPDATE_PRICE':
            replyText = `Done! 🏷️ Updated selling price for **${result.productName}** from ₹${result.oldPrice} → **₹${result.newPrice}/${result.unit}**. All subsequent sales bills will use this new rate.`;
            suggestions = [`Sell ${result.productName}`, 'Check margin', 'View inventory'];
            break;
          case 'RECORD_SALE':
            replyText = `Billed! 💰 Recorded sale of **${result.quantity} ${result.unit} ${result.productName}** at ₹${result.revenue / result.quantity}/${result.unit}. Total: **₹${result.revenue.toLocaleString('en-IN')}** (Gross Profit: ₹${result.profit.toLocaleString('en-IN')}). Remaining stock: **${result.remainingStock} ${result.unit}**.`;
            suggestions = ["Today's profit", `Sell more ${result.productName}`, 'Check stock'];
            break;
          case 'RECORD_PURCHASE':
            replyText = `Restocked! 📦 Recorded purchase of **${result.quantity} ${result.unit} ${result.productName}** at ₹${result.data.unitCost}/${result.unit}. New weighted average cost is **₹${result.newCost}/${result.unit}** with total stock at **${result.newStock} ${result.unit}**.`;
            suggestions = [`Check ${result.productName} margin`, 'View purchases', 'Set price alert'];
            break;
          case 'FETCH_PRICES':
            replyText = `Syncing right now! 🔄 Polled the latest live APMC mandi wholesale rates for Telangana. All commodity benchmarks and alert triggers are up to date!`;
            suggestions = ['Check mandi rates', 'View price changes', 'Set alert'];
            break;
          case 'MARK_ALERTS_READ':
            replyText = `All clear! 🔔 Marked all unread price and stock alerts as read. Your notification drawer is clean.`;
            suggestions = ['Inventory status', "Today's profit", 'Mandi rates'];
            break;
        }

        return res.status(200).json({
          success: true,
          source: 'DIRECT_NLP',
          reply: replyText,
          action: { type: result.type, data: result.data || null },
          suggestions
        });
      }
    }

    // ── 3. Full Gemini Conversational Inference ──
    if (!chatModel) {
      return res.status(200).json({
        success: true,
        source: 'SYSTEM',
        reply: "Hey! The AI engine needs a Gemini API key. Add your key in Settings or server `.env` file to enable conversational intelligence 🔑",
        action: null,
        suggestions: ['Go to Settings', 'Check inventory']
      });
    }

    const systemPrompt = buildSystemPrompt({
      products, suppliers, todaySales, todayRevenue, todayProfit,
      todayMargin, lowStockItems, totalStockValue, unreadAlerts
    });

    const recentHistory = history.slice(-8);
    if (recentHistory.length > 0 && recentHistory[recentHistory.length - 1]?.content === message) {
      recentHistory.pop();
    }

    const conversationContext = recentHistory.length > 0
      ? recentHistory.map(msg => `${msg.role === 'user' ? 'Owner' : 'MarketMind'}: ${msg.content}`).join('\n\n')
      : '(New conversation)';

    const fullPrompt = `${systemPrompt}

───── CONVERSATION HISTORY ─────
${conversationContext}

───── STORE OWNER JUST SAID ─────
"${message}"

Respond with ONLY valid JSON:`;

    try {
      let result;
      try {
        result = await chatModel.generateContent(fullPrompt);
      } catch (err1) {
        if (fallbackModel) {
          result = await fallbackModel.generateContent(fullPrompt);
        } else {
          throw err1;
        }
      }

      const responseText = result.response.text();
      let parsed;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = {
          action: 'NONE',
          params: {},
          reply: responseText.replace(/```json\n?|\n?```/g, '').trim(),
          suggestions: ['Check inventory', "Today's sales", 'Mandi rates']
        };
      }

      let finalReply = parsed.reply || "Got it!";
      let actionResult = { executed: false };

      if (parsed.action && parsed.action !== 'NONE') {
        actionResult = await executeStoreAction(
          userId, parsed.action, parsed.params || {}, products, suppliers
        );

        if (actionResult.executed) {
          switch (actionResult.type) {
            case 'RECORD_SALE':
              if (!finalReply.includes('Billed') && !finalReply.includes('Sale Recorded')) {
                finalReply += `\n\n✅ **Sale Recorded**: Billed ${actionResult.quantity} ${actionResult.unit} ${actionResult.productName} for ₹${actionResult.revenue.toLocaleString('en-IN')}. Stock remaining: ${actionResult.remainingStock} ${actionResult.unit}.`;
              }
              break;
            case 'RECORD_PURCHASE':
              if (!finalReply.includes('Restocked')) {
                finalReply += `\n\n✅ **Purchase Recorded**: Restocked ${actionResult.quantity} ${actionResult.unit} ${actionResult.productName}. New avg cost: ₹${actionResult.newCost}/${actionResult.unit}. Total stock: ${actionResult.newStock} ${actionResult.unit}.`;
              }
              break;
            case 'CREATE_ALERT':
              if (!finalReply.includes('Locked in') && !finalReply.includes('Alert Added')) {
                finalReply += `\n\n✅ **Alert Set**: ${actionResult.productName} (Trigger: ₹${actionResult.targetValue}/${actionResult.unit}).`;
              }
              break;
            case 'UPDATE_PRICE':
              if (!finalReply.includes('Updated')) {
                finalReply += `\n\n✅ **Price Updated**: ${actionResult.productName} selling price updated from ₹${actionResult.oldPrice} → ₹${actionResult.newPrice}/${actionResult.unit}.`;
              }
              break;
            case 'FETCH_PRICES':
              finalReply += `\n\n🔄 Mandi rates synced from AGMARKNET!`;
              break;
            case 'MARK_ALERTS_READ':
              finalReply += `\n\n✅ All alerts marked as read!`;
              break;
          }
        } else if (actionResult.message) {
          finalReply += `\n\n⚠️ ${actionResult.message}`;
        }
      }

      return res.status(200).json({
        success: true,
        source: 'GEMINI_AI',
        reply: finalReply,
        action: actionResult.executed
          ? { type: actionResult.type, data: actionResult.data || null }
          : null,
        suggestions: parsed.suggestions || ['Check inventory', "Today's sales", 'Latest mandi rates']
      });

    } catch (geminiError) {
      console.error('[Gemini AI] Chat error:', geminiError.message);

      // Fast, helpful fallback if external API is temporarily unreachable
      return res.status(200).json({
        success: true,
        source: 'FALLBACK_MUNSHI',
        reply: `I'm right here! You currently have ${products.length} commodities in your store worth ₹${totalStockValue.toLocaleString('en-IN')}. Ask me to set price alerts, update prices, record sales, or review profits anytime!`,
        action: null,
        suggestions: ['Set sugar price alert', "Today's sales", 'Check inventory']
      });
    }

  } catch (error) {
    console.error('Error in chatbot handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat',
      error: error.message
    });
  }
};

module.exports = { handleChat };
