const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const MarketPrice = require('../models/MarketPrice');
const Alert = require('../models/Alert');
const priceMonitor = require('../services/priceMonitor');
const helpers = require('../utils/helpers');

// Gemini JSON Model Client
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let jsonModel = null;

if (apiKey && apiKey.trim() !== '') {
  try {
    genAI = new GoogleGenerativeAI(apiKey.trim());
    jsonModel = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash-lite',
      generationConfig: { responseMimeType: 'application/json' }
    });
  } catch (err) {
    console.warn('[Gemini AI] JSON model init warning:', err.message);
  }
}

/**
 * Fuzzy finder for product by name or keyword
 */
const findProductByName = (products, text) => {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // 1. Exact match
  let found = products.find((p) => p.name.toLowerCase() === lower);
  if (found) return found;

  // 2. Name contains text or text contains name
  found = products.find((p) => lower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lower));
  if (found) return found;

  // 3. Keyword matching (e.g. "sona masoori", "basmati", "lokwan")
  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  for (const word of words) {
    found = products.find((p) => p.name.toLowerCase().includes(word));
    if (found) return found;
  }

  return null;
};

/**
 * Execute real database actions autonomously on behalf of the user
 */
const executeStoreAction = async (userId, actionType, params = {}, products, suppliers) => {
  const normAction = (actionType || 'NONE').toUpperCase().trim();

  // 1. CREATE ALERT
  if (normAction === 'CREATE_ALERT' || normAction === 'ADD_ALERT') {
    const commodityQuery = params.commodity || '';
    const matched = findProductByName(products, commodityQuery) || (products.length > 0 ? products[0] : null);
    if (!matched) {
      return {
        executed: false,
        message: 'Could not find commodity to create alert for.'
      };
    }

    const curRef = matched.currentReferencePrice || matched.purchaseCost || 40;
    const cond = params.condition || (params.targetValue && params.targetValue > curRef ? 'PRICE_INCREASE' : 'PRICE_DECREASE');
    let targetVal = parseFloat(params.targetValue);

    if (isNaN(targetVal) || targetVal <= 0) {
      targetVal = cond === 'PRICE_INCREASE'
        ? parseFloat((curRef * 1.05).toFixed(2))
        : parseFloat((curRef * 0.95).toFixed(2));
    }

    let title = '';
    let message = '';
    let alertType = 'PRICE_DECREASE';

    if (cond === 'PRICE_INCREASE' || cond === 'ABOVE') {
      alertType = 'PRICE_INCREASE';
      title = `📈 Wholesale Rate Surge: ${matched.name}`;
      message = `Alert configured via Copilot: Notify when wholesale mandi rate for ${matched.name} rises above ₹${targetVal}/${matched.unit} to safeguard gross margins.`;
    } else if (cond === 'LOW_STOCK') {
      alertType = 'LOW_STOCK';
      title = `⚠️ Stock Reorder Alert: ${matched.name}`;
      message = `Alert configured via Copilot: Notify when inventory for ${matched.name} drops to ${targetVal} ${matched.unit}.`;
    } else {
      alertType = 'PRICE_DECREASE';
      title = `📉 Mandi Restock Opportunity: ${matched.name}`;
      message = `Alert configured via Copilot: Notify when wholesale APMC rate for ${matched.name} drops below ₹${targetVal}/${matched.unit} for bulk procurement.`;
    }

    const newAlert = await Alert.create({
      userId,
      product: matched._id,
      type: alertType,
      title,
      message,
      currentPrice: targetVal,
      previousPrice: curRef,
      purchaseCost: matched.purchaseCost,
      sellingPrice: matched.sellingPrice,
      source: 'AI_COPILOT',
      market: 'Hyderabad APMC'
    });

    return {
      executed: true,
      type: 'CREATE_ALERT',
      data: newAlert,
      productName: matched.name,
      targetValue: targetVal,
      unit: matched.unit
    };
  }

  // 2. RECORD SALE
  if (normAction === 'RECORD_SALE') {
    const commodityQuery = params.commodity || '';
    const matched = findProductByName(products, commodityQuery);
    const qty = parseFloat(params.quantity);

    if (!matched) {
      return { executed: false, message: `Commodity "${commodityQuery}" not found in inventory.` };
    }
    if (isNaN(qty) || qty <= 0) {
      return { executed: false, message: 'Please specify a valid quantity to sell.' };
    }
    if (matched.stockQuantity < qty) {
      return {
        executed: false,
        type: 'RECORD_SALE_FAILED',
        message: `Insufficient stock: You requested to sell ${qty} ${matched.unit} of ${matched.name}, but only ${matched.stockQuantity} ${matched.unit} is available.`
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
      customerRef: params.customer || 'Counter Customer',
      invoiceNumber: `INV-AI-${Date.now().toString().slice(-6)}`
    });

    // Decrement stock
    matched.stockQuantity = parseFloat((matched.stockQuantity - qty).toFixed(2));
    await matched.save();

    // Check low stock trigger
    if (matched.stockQuantity <= matched.minStockLevel) {
      await Alert.create({
        userId,
        product: matched._id,
        type: 'LOW_STOCK',
        title: `⚠️ Low Stock: ${matched.name}`,
        message: `${matched.name} is running low on stock (${matched.stockQuantity} ${matched.unit} remaining). Safety threshold is ${matched.minStockLevel} ${matched.unit}.`,
        sellingPrice: matched.sellingPrice,
        purchaseCost: matched.purchaseCost,
        source: 'INVENTORY_SCAN',
        market: 'Store Ledger'
      });
    }

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

  // 3. RECORD PURCHASE (RESTOCK)
  if (normAction === 'RECORD_PURCHASE' || normAction === 'RESTOCK') {
    const commodityQuery = params.commodity || '';
    const matched = findProductByName(products, commodityQuery);
    const qty = parseFloat(params.quantity);
    const unitCost = parseFloat(params.unitCost);

    if (!matched || isNaN(qty) || qty <= 0 || isNaN(unitCost) || unitCost <= 0) {
      return { executed: false, message: 'Invalid purchase parameters.' };
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

  // 4. UPDATE SELLING PRICE
  if (normAction === 'UPDATE_PRICE' || normAction === 'UPDATE_SELLING_PRICE') {
    const commodityQuery = params.commodity || '';
    const matched = findProductByName(products, commodityQuery);
    const newPrice = parseFloat(params.newPrice);

    if (!matched || isNaN(newPrice) || newPrice <= 0) {
      return { executed: false, message: 'Invalid price update details.' };
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

  // 5. ADD NEW COMMODITY / PRODUCT
  if (normAction === 'ADD_PRODUCT') {
    const name = params.name ? params.name.trim() : '';
    if (!name) return { executed: false, message: 'Product name is required.' };

    const cost = parseFloat(params.cost || 30);
    const sellingPrice = parseFloat(params.sellingPrice || Math.round(cost * 1.2));
    const stock = parseFloat(params.stock || 50);
    const unit = params.unit || 'kg';

    const newProd = await Product.create({
      userId,
      name,
      category: params.category || 'Others',
      unit,
      purchaseCost: cost,
      sellingPrice,
      stockQuantity: stock,
      minStockLevel: 20,
      govApiCommodityName: name,
      currentReferencePrice: cost,
      priceSource: 'AGMARKNET'
    });

    return {
      executed: true,
      type: 'ADD_PRODUCT',
      data: newProd,
      productName: newProd.name
    };
  }

  // 6. SYNC LIVE MANDI RATES
  if (normAction === 'FETCH_MANDI' || normAction === 'FETCH_PRICES' || normAction === 'SYNC_PRICES') {
    const checkResult = await priceMonitor.checkPricesForUser(userId);
    return {
      executed: true,
      type: 'FETCH_PRICES',
      data: checkResult
    };
  }

  // 7. SCAN & GENERATE SMART ALERTS
  if (normAction === 'SCAN_ALERTS') {
    const createdAlerts = [];
    for (const prod of products) {
      const curRef = prod.currentReferencePrice;
      const prevRef = prod.previousReferencePrice;
      const cost = prod.purchaseCost;
      const stock = prod.stockQuantity;
      const minStock = prod.minStockLevel || 10;

      if (curRef && prevRef && curRef < prevRef) {
        const dropPct = parseFloat((((prevRef - curRef) / prevRef) * 100).toFixed(1));
        createdAlerts.push(await Alert.create({
          userId,
          product: prod._id,
          type: 'PRICE_DECREASE',
          title: `📉 Mandi Price Drop: ${prod.name}`,
          message: `Wholesale APMC rate for ${prod.name} dropped ${dropPct}% to ₹${curRef}/${prod.unit}. Prime opportunity to restock batches.`,
          currentPrice: curRef,
          previousPrice: prevRef,
          percentageChange: -dropPct,
          purchaseCost: cost,
          sellingPrice: prod.sellingPrice,
          source: prod.priceSource || 'AGMARKNET',
          market: 'Hyderabad APMC'
        }));
      }

      if (curRef && prevRef && curRef > prevRef) {
        const risePct = parseFloat((((curRef - prevRef) / prevRef) * 100).toFixed(1));
        createdAlerts.push(await Alert.create({
          userId,
          product: prod._id,
          type: 'PRICE_INCREASE',
          title: `📈 Wholesale Rate Surge: ${prod.name}`,
          message: `Wholesale mandi rate jumped by ${risePct}% to ₹${curRef}/${prod.unit}. Review your selling price (₹${prod.sellingPrice}) to protect margin.`,
          currentPrice: curRef,
          previousPrice: prevRef,
          percentageChange: risePct,
          purchaseCost: cost,
          sellingPrice: prod.sellingPrice,
          source: prod.priceSource || 'AGMARKNET',
          market: 'Hyderabad APMC'
        }));
      }

      if (stock <= minStock) {
        createdAlerts.push(await Alert.create({
          userId,
          product: prod._id,
          type: 'LOW_STOCK',
          title: `⚠️ Critical Low Inventory: ${prod.name}`,
          message: `Current stock of ${prod.name} is ${stock} ${prod.unit} (threshold: ${minStock} ${prod.unit}).`,
          currentPrice: curRef || cost,
          purchaseCost: cost,
          sellingPrice: prod.sellingPrice,
          source: 'INVENTORY_SCAN',
          market: 'Store Ledger'
        }));
      }
    }

    if (createdAlerts.length === 0 && products.length > 0) {
      const p = products[0];
      createdAlerts.push(await Alert.create({
        userId,
        product: p._id,
        type: 'AI_INSIGHT',
        title: `🤖 AI Market Health Check: ${p.name}`,
        message: `Current Telangana mandi benchmark is ₹${p.currentReferencePrice || p.purchaseCost}/${p.unit}. Inventory is adequate and wholesale arrivals are steady.`,
        currentPrice: p.currentReferencePrice || p.purchaseCost,
        previousPrice: p.previousReferencePrice || p.purchaseCost,
        purchaseCost: p.purchaseCost,
        sellingPrice: p.sellingPrice,
        source: 'AI_INTELLIGENCE',
        market: 'Telangana APMC'
      }));
    }

    return {
      executed: true,
      type: 'SCAN_ALERTS',
      count: createdAlerts.length
    };
  }

  // 8. MARK ALL ALERTS AS READ
  if (normAction === 'MARK_ALERTS_READ' || normAction === 'CLEAR_ALERTS') {
    await Alert.updateMany({ userId, isRead: false }, { isRead: true });
    return {
      executed: true,
      type: 'MARK_ALERTS_READ'
    };
  }

  return { executed: false };
};

/**
 * Robust Deterministic NLP Fallback Engine when LLM is unavailable
 */
const fallbackRuleEngine = async (userId, message, products, suppliers, todaySales) => {
  const lower = message.toLowerCase().trim();

  // 1. Direct Alert Addition
  if (lower.includes('add alert') || lower.includes('create alert') || lower.includes('set alert') || lower.includes('let me add alert')) {
    const prod = findProductByName(products, lower) || (products.length > 0 ? products[0] : null);
    if (prod) {
      const numMatch = lower.match(/(?:below|above|drops?|rises?|at|<|>)\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i);
      const targetVal = numMatch ? parseFloat(numMatch[1]) : parseFloat(((prod.currentReferencePrice || prod.purchaseCost) * 0.95).toFixed(2));
      const cond = (lower.includes('above') || lower.includes('rises') || lower.includes('>')) ? 'PRICE_INCREASE' : 'PRICE_DECREASE';

      const actRes = await executeStoreAction(userId, 'CREATE_ALERT', {
        commodity: prod.name,
        condition: cond,
        targetValue: targetVal
      }, products, suppliers);

      return {
        executed: true,
        type: 'CREATE_ALERT',
        reply: `I've set up an alert for you right here! I'm monitoring **${prod.name}** and will notify you as soon as the APMC mandi rate ${cond === 'PRICE_INCREASE' ? 'rises above' : 'drops below'} **₹${targetVal}/${prod.unit}**. You can view it anytime on your Alerts page.`,
        suggestions: ['View all alerts', 'Latest mandi rates', "Today's sales"]
      };
    }
  }

  // 2. Direct Sale Recording
  const saleMatch = lower.match(/(?:sell|sold|record sale)\s+(\d+(?:\.\d+)?)\s*(kg|quintal|litre)?\s+(?:of\s+)?([a-z0-9\s()\-]+?)(?:\s+(?:at|for|@)\s*(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?))?$/i);
  if (saleMatch) {
    const qty = parseFloat(saleMatch[1]);
    const prodName = saleMatch[3];
    const unitPrice = saleMatch[4] ? parseFloat(saleMatch[4]) : null;
    const actRes = await executeStoreAction(userId, 'RECORD_SALE', { commodity: prodName, quantity: qty, unitPrice }, products, suppliers);

    if (actRes.executed) {
      return {
        executed: true,
        type: 'RECORD_SALE',
        reply: `Done! I've recorded the sale of **${qty} ${actRes.unit} ${actRes.productName}** for **₹${actRes.revenue.toLocaleString('en-IN')}**. Your gross profit is **₹${actRes.profit.toLocaleString('en-IN')}**, leaving **${actRes.remainingStock} ${actRes.unit}** in stock.`,
        suggestions: ["Today's sales summary", `Check ${actRes.productName} stock`, 'Latest market prices']
      };
    } else if (actRes.message) {
      return { executed: false, reply: actRes.message, suggestions: ['Check inventory', 'Latest mandi rates'] };
    }
  }

  // 3. Today's Business Summary
  if (lower.includes('today') && (lower.includes('sale') || lower.includes('profit') || lower.includes('revenue') || lower.includes('how is business'))) {
    const totalRev = todaySales.reduce((s, x) => s + (x.totalRevenue || 0), 0);
    const totalProf = todaySales.reduce((s, x) => s + (x.grossProfit || 0), 0);
    const margin = totalRev > 0 ? ((totalProf / totalRev) * 100).toFixed(1) : '0';

    return {
      executed: false,
      reply: `Here's how today looks: you've completed **${todaySales.length} orders**, generating **₹${totalRev.toLocaleString('en-IN')}** in revenue with **₹${totalProf.toLocaleString('en-IN')}** in gross profit (${margin}% overall margin).`,
      suggestions: ['Check low stock', 'Latest market prices', 'Set price alert']
    };
  }

  // 4. Default Friendly Greeting / Help
  const totalStockVal = products.reduce((s, p) => s + (p.stockQuantity * p.purchaseCost), 0);
  return {
    executed: false,
    reply: `Hello! I'm your MarketMind Copilot. You currently have **${products.length} commodities** tracked with a stock value of **₹${totalStockVal.toLocaleString('en-IN')}**. Tell me what you'd like to do — set an alert, record a sale, check mandi rates, or update prices!`,
    suggestions: ['+ Add Alert', 'Latest mandi rates', "Today's sales", 'Check low stock']
  };
};

/**
 * @desc    Main AI Copilot Conversational & Agentic Dispatcher
 * @route   POST /api/ai/chat
 * @access  Private
 */
const handleChat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // 1. Fetch live store state
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [products, suppliers, recentMarketPrices, unreadAlerts, todaySales] = await Promise.all([
      Product.find({ userId, isActive: true }),
      Supplier.find({ userId }),
      MarketPrice.find({ userId }).sort({ fetchTime: -1 }).limit(10),
      Alert.find({ userId, isRead: false }).sort({ createdAt: -1 }).limit(5),
      Sale.find({ userId, saleDate: { $gte: todayStart, $lte: todayEnd } })
    ]);

    const totalStockValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.purchaseCost), 0);
    const lowStockItems = products.filter((p) => p.stockQuantity <= p.minStockLevel);
    const todayRevenue = todaySales.reduce((s, x) => s + (x.totalRevenue || 0), 0);
    const todayProfit = todaySales.reduce((s, x) => s + (x.grossProfit || 0), 0);
    const todayMargin = todayRevenue > 0 ? ((todayProfit / todayRevenue) * 100).toFixed(1) : '0';

    // 2. Intelligent Agent Reasoning with Gemini
    if (jsonModel) {
      try {
        const inventoryContext = products.slice(0, 20).map((p) =>
          `• ${p.name}: Stock ${p.stockQuantity} ${p.unit}, Cost ₹${p.purchaseCost}/${p.unit}, Selling ₹${p.sellingPrice}/${p.unit}, APMC Mandi Benchmark ₹${p.currentReferencePrice || p.purchaseCost}/${p.unit}`
        ).join('\n');

        const systemPrompt = `You are MarketMind AI, a human-like, proactive co-pilot and business partner for a grocery store in Telangana, India.

STORE REAL-TIME STATE:
- Total Products Tracked: ${products.length} commodities
- Total Inventory Value: ₹${totalStockValue.toLocaleString('en-IN')}
- Low Stock Items: ${lowStockItems.length > 0 ? lowStockItems.map((p) => `${p.name} (${p.stockQuantity} ${p.unit})`).join(', ') : 'None, all healthy'}
- Today's Sales: ${todaySales.length} orders, Revenue: ₹${todayRevenue.toLocaleString('en-IN')}, Gross Profit: ₹${todayProfit.toLocaleString('en-IN')} (${todayMargin}% margin)
- Unread Alerts: ${unreadAlerts.length}
- Primary Commodities & APMC Benchmarks:
${inventoryContext}

YOUR AGENTIC CAPABILITIES:
You are not just a chatbot — you EXECUTE actions directly in the store database. When the user requests a task, specify the action and its parameters in your output:
- CREATE_ALERT: params { commodity: string, condition: 'PRICE_DECREASE' | 'PRICE_INCREASE' | 'LOW_STOCK', targetValue: number }
  * IMPORTANT: If user says "let me add alert from here also", "add alert", "create alert", or "set alert" without complete details, set action to CREATE_ALERT for the primary product ("${products[0]?.name || 'Rice'}") with a 5% drop threshold (₹${Math.round((products[0]?.currentReferencePrice || 40) * 0.95)})!
- RECORD_SALE: params { commodity: string, quantity: number, unitPrice?: number, customer?: string }
- RECORD_PURCHASE: params { commodity: string, quantity: number, unitCost: number }
- UPDATE_PRICE: params { commodity: string, newPrice: number }
- ADD_PRODUCT: params { name: string, category?: string, cost: number, sellingPrice: number, stock?: number, unit?: string }
- FETCH_MANDI: params {}
- SCAN_ALERTS: params {}
- MARK_ALERTS_READ: params {}
- NONE: params {} (use when greeting, answering questions, price checks, profitability advice, or general chat)

CRITICAL INSTRUCTIONS FOR REPLY:
1. Speak warmly, naturally, and intelligently like an experienced Indian store manager and trusted partner.
2. If executing an action, explain what you did in 1-2 friendly, conversational sentences.
3. If giving advice or answering queries, cite concrete numbers from the store context.
4. Always use Indian Rupee (₹).
5. Never sound robotic. Never dump long generic manuals.

User Message: "${message}"

Output ONLY a JSON object:
{
  "action": "CREATE_ALERT" | "RECORD_SALE" | "RECORD_PURCHASE" | "UPDATE_PRICE" | "ADD_PRODUCT" | "FETCH_MANDI" | "SCAN_ALERTS" | "MARK_ALERTS_READ" | "NONE",
  "params": {},
  "reply": "Warm, human conversational response",
  "suggestions": ["3 short relevant suggestions"]
}`;

        const geminiRes = await jsonModel.generateContent(systemPrompt);
        const parsed = JSON.parse(geminiRes.response.text());

        // Execute action if identified
        let actionResult = { executed: false };
        let finalReply = parsed.reply;
        if (parsed.action && parsed.action !== 'NONE') {
          actionResult = await executeStoreAction(userId, parsed.action, parsed.params, products, suppliers);
          if (actionResult.executed) {
            if (actionResult.type === 'RECORD_SALE' && !finalReply.includes('Sale Recorded')) {
              finalReply += `\n\n✅ **Sale Recorded**: ${actionResult.quantity} ${actionResult.unit} ${actionResult.productName} for ₹${actionResult.revenue.toLocaleString('en-IN')}.`;
            } else if (actionResult.type === 'CREATE_ALERT' && !finalReply.includes('Alert Added')) {
              finalReply += `\n\n✅ **Alert Added**: ${actionResult.productName} (Trigger: ₹${actionResult.targetValue}/${actionResult.unit}).`;
            }
          }
        }

        return res.status(200).json({
          success: true,
          source: 'GEMINI_AI',
          reply: finalReply,
          action: actionResult.executed ? { type: actionResult.type, data: actionResult.data || null } : null,
          suggestions: parsed.suggestions || ['Check inventory', "Today's sales", 'Latest mandi rates']
        });
      } catch (geminiError) {
        console.warn('[Gemini AI] Agent inference warning, falling back to rule engine:', geminiError.message);
      }
    }

    // 3. Fallback Deterministic Engine
    const fallbackResult = await fallbackRuleEngine(userId, message, products, suppliers, todaySales);

    return res.status(200).json({
      success: true,
      source: 'COPILOT_ENGINE',
      reply: fallbackResult.reply,
      action: fallbackResult.executed ? { type: fallbackResult.type } : null,
      suggestions: fallbackResult.suggestions || ['Check inventory', "Today's sales", 'Latest market rates']
    });
  } catch (error) {
    console.error('Error in chatbot dispatcher:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat command',
      error: error.message
    });
  }
};

module.exports = {
  handleChat
};
