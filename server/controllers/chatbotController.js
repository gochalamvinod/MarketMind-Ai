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
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    });
    fallbackModel = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.9,
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
 * Fuzzy product finder by name/keyword
 */
const findProductByName = (products, text) => {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Exact match
  let found = products.find(p => p.name.toLowerCase() === lower);
  if (found) return found;

  // Partial match
  found = products.find(p => lower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lower));
  if (found) return found;

  // Keyword match
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  for (const word of words) {
    found = products.find(p => p.name.toLowerCase().includes(word));
    if (found) return found;
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
    const commodityQuery = params.commodity || '';
    const matched = findProductByName(products, commodityQuery) || (products.length > 0 ? products[0] : null);
    if (!matched) {
      return { executed: false, message: 'Could not find that commodity in your inventory.' };
    }

    const curRef = matched.currentReferencePrice || matched.purchaseCost || 40;
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
      title = `📈 Wholesale Rate Surge: ${matched.name}`;
      message = `Copilot alert: Notify when APMC mandi rate for ${matched.name} rises above ₹${targetVal}/${matched.unit}.`;
    } else if (cond === 'LOW_STOCK') {
      alertType = 'LOW_STOCK';
      title = `⚠️ Stock Reorder Alert: ${matched.name}`;
      message = `Copilot alert: Notify when inventory for ${matched.name} drops to ${targetVal} ${matched.unit}.`;
    } else {
      alertType = 'PRICE_DECREASE';
      title = `📉 Mandi Restock Opportunity: ${matched.name}`;
      message = `Copilot alert: Notify when APMC rate for ${matched.name} drops below ₹${targetVal}/${matched.unit}.`;
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
      executed: true, type: 'CREATE_ALERT', data: newAlert,
      productName: matched.name, targetValue: targetVal, unit: matched.unit
    };
  }

  // ── RECORD SALE ──
  if (normAction === 'RECORD_SALE') {
    const matched = findProductByName(products, params.commodity || '');
    const qty = parseFloat(params.quantity);

    if (!matched) return { executed: false, message: `Couldn't find "${params.commodity}" in your inventory.` };
    if (isNaN(qty) || qty <= 0) return { executed: false, message: 'Please tell me how much quantity to sell.' };
    if (matched.stockQuantity < qty) {
      return { executed: false, message: `Not enough stock! You only have ${matched.stockQuantity} ${matched.unit} of ${matched.name}, but you asked to sell ${qty}.` };
    }

    const unitSellingPrice = params.unitPrice && params.unitPrice > 0 ? parseFloat(params.unitPrice) : matched.sellingPrice;
    const totalRevenue = parseFloat((qty * unitSellingPrice).toFixed(2));
    const costOfGoodsSold = parseFloat((qty * matched.purchaseCost).toFixed(2));
    const grossProfit = parseFloat((totalRevenue - costOfGoodsSold).toFixed(2));
    const profitMargin = totalRevenue > 0 ? parseFloat(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;

    const newSale = await Sale.create({
      userId, product: matched._id, quantity: qty,
      unit: matched.unit || 'kg', unitSellingPrice, totalRevenue,
      costOfGoodsSold, grossProfit, profitMargin,
      saleDate: new Date(),
      customerRef: params.customer || 'Counter Customer',
      invoiceNumber: `INV-AI-${Date.now().toString().slice(-6)}`
    });

    matched.stockQuantity = parseFloat((matched.stockQuantity - qty).toFixed(2));
    await matched.save();

    if (matched.stockQuantity <= matched.minStockLevel) {
      await Alert.create({
        userId, product: matched._id, type: 'LOW_STOCK',
        title: `⚠️ Low Stock: ${matched.name}`,
        message: `${matched.name} is down to ${matched.stockQuantity} ${matched.unit} (safety level: ${matched.minStockLevel} ${matched.unit}).`,
        sellingPrice: matched.sellingPrice, purchaseCost: matched.purchaseCost,
        source: 'INVENTORY_SCAN', market: 'Store Ledger'
      });
    }

    return {
      executed: true, type: 'RECORD_SALE', data: newSale,
      productName: matched.name, quantity: qty, unit: matched.unit,
      revenue: totalRevenue, profit: grossProfit, remainingStock: matched.stockQuantity
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
      userId, product: matched._id, supplier: supplierId,
      quantity: qty, unit: matched.unit || 'kg', unitCost, totalAmount,
      purchaseDate: new Date(),
      invoiceNumber: `PUR-AI-${Date.now().toString().slice(-6)}`
    });

    matched.stockQuantity = newQty;
    matched.purchaseCost = newCost;
    await matched.save();

    return {
      executed: true, type: 'RECORD_PURCHASE', data: newPurchase,
      productName: matched.name, quantity: qty, unit: matched.unit,
      newCost, newStock: newQty
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
      executed: true, type: 'UPDATE_PRICE',
      productName: matched.name, oldPrice, newPrice, unit: matched.unit
    };
  }

  // ── ADD NEW PRODUCT ──
  if (normAction === 'ADD_PRODUCT') {
    const name = params.name ? params.name.trim() : '';
    if (!name) return { executed: false, message: 'I need a product name to add it.' };

    const cost = parseFloat(params.cost || 30);
    const sellingPrice = parseFloat(params.sellingPrice || Math.round(cost * 1.2));
    const stock = parseFloat(params.stock || 50);
    const unit = params.unit || 'kg';

    const newProd = await Product.create({
      userId, name,
      category: params.category || 'Others',
      unit, purchaseCost: cost, sellingPrice, stockQuantity: stock,
      minStockLevel: 20, govApiCommodityName: name,
      currentReferencePrice: cost, priceSource: 'AGMARKNET'
    });

    return { executed: true, type: 'ADD_PRODUCT', data: newProd, productName: newProd.name };
  }

  // ── FETCH LIVE MANDI PRICES ──
  if (normAction === 'FETCH_MANDI' || normAction === 'FETCH_PRICES' || normAction === 'SYNC_PRICES') {
    const checkResult = await priceMonitor.checkPricesForUser(userId);
    return { executed: true, type: 'FETCH_PRICES', data: checkResult };
  }

  // ── SCAN & GENERATE ALERTS ──
  if (normAction === 'SCAN_ALERTS') {
    const createdAlerts = [];
    for (const prod of products) {
      const curRef = prod.currentReferencePrice;
      const prevRef = prod.previousReferencePrice;
      const stock = prod.stockQuantity;
      const minStock = prod.minStockLevel || 10;

      if (curRef && prevRef && curRef < prevRef) {
        const dropPct = parseFloat((((prevRef - curRef) / prevRef) * 100).toFixed(1));
        createdAlerts.push(await Alert.create({
          userId, product: prod._id, type: 'PRICE_DECREASE',
          title: `📉 Mandi Price Drop: ${prod.name}`,
          message: `Wholesale rate for ${prod.name} dropped ${dropPct}% to ₹${curRef}/${prod.unit}.`,
          currentPrice: curRef, previousPrice: prevRef, percentageChange: -dropPct,
          purchaseCost: prod.purchaseCost, sellingPrice: prod.sellingPrice,
          source: prod.priceSource || 'AGMARKNET', market: 'Hyderabad APMC'
        }));
      }
      if (curRef && prevRef && curRef > prevRef) {
        const risePct = parseFloat((((curRef - prevRef) / prevRef) * 100).toFixed(1));
        createdAlerts.push(await Alert.create({
          userId, product: prod._id, type: 'PRICE_INCREASE',
          title: `📈 Wholesale Rate Surge: ${prod.name}`,
          message: `Rate for ${prod.name} jumped ${risePct}% to ₹${curRef}/${prod.unit}.`,
          currentPrice: curRef, previousPrice: prevRef, percentageChange: risePct,
          purchaseCost: prod.purchaseCost, sellingPrice: prod.sellingPrice,
          source: prod.priceSource || 'AGMARKNET', market: 'Hyderabad APMC'
        }));
      }
      if (stock <= minStock) {
        createdAlerts.push(await Alert.create({
          userId, product: prod._id, type: 'LOW_STOCK',
          title: `⚠️ Low Inventory: ${prod.name}`,
          message: `${prod.name} stock is ${stock} ${prod.unit} (threshold: ${minStock} ${prod.unit}).`,
          currentPrice: curRef || prod.purchaseCost,
          purchaseCost: prod.purchaseCost, sellingPrice: prod.sellingPrice,
          source: 'INVENTORY_SCAN', market: 'Store Ledger'
        }));
      }
    }

    return { executed: true, type: 'SCAN_ALERTS', count: createdAlerts.length };
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

  return `You are MarketMind AI — the personal business assistant for an Indian grocery and commodity store. You're like a smart, trusted "munshi" (business manager) who genuinely cares about the shopkeeper's profits and runs the store alongside them.

YOUR PERSONALITY & TONE:
- Talk naturally like a smart Indian business friend — warm, direct, and confident
- Keep it SHORT: 1-3 sentences for simple things, 3-5 for detailed analysis
- Never write walls of text, bullet-point dumps, or generic business advice
- Be opinionated: say "I'd suggest..." or "Go for it!" — not "you might consider"
- Reference REAL numbers from the store data — never make up data
- Use ₹ for all currency
- Add occasional emoji — but don't overload (1-2 per response max)
- If you notice a business issue (low stock, thin margins), proactively mention it
- Sound like a human partner, not a robot or a customer service bot

═══════════════════════════════════
YOUR STORE — LIVE SNAPSHOT
═══════════════════════════════════
📦 Products: ${products.length} commodities
💰 Inventory Value: ₹${totalStockValue.toLocaleString('en-IN')}
📊 Today: ${todaySales.length} sales | Revenue ₹${todayRevenue.toLocaleString('en-IN')} | Profit ₹${todayProfit.toLocaleString('en-IN')} (${todayMargin}% margin)
🔔 Unread Alerts: ${unreadAlerts.length}
⚠️ Low Stock: ${lowStockItems.length > 0 ? lowStockItems.map(p => `${p.name} (${p.stockQuantity} ${p.unit})`).join(', ') : 'All stocked up 👍'}
👥 Suppliers: ${suppliers.length > 0 ? suppliers.map(s => s.name).join(', ') : 'None yet'}

📋 INVENTORY:
${inventoryLines || '  (Empty — no products added yet)'}
═══════════════════════════════════

ACTIONS YOU CAN EXECUTE:
You're not just a chatbot — you directly run store operations. When the user wants something done, set the right action:

| Action            | Params Needed                                                    |
|-------------------|------------------------------------------------------------------|
| RECORD_SALE       | { commodity, quantity, unitPrice? (optional), customer? }        |
| RECORD_PURCHASE   | { commodity, quantity, unitCost }                                |
| CREATE_ALERT      | { commodity, condition: PRICE_DECREASE/PRICE_INCREASE/LOW_STOCK, targetValue } |
| UPDATE_PRICE      | { commodity, newPrice }                                          |
| ADD_PRODUCT       | { name, cost, sellingPrice, category?, stock?, unit? }           |
| FETCH_MANDI       | {} (syncs latest APMC mandi rates)                               |
| SCAN_ALERTS       | {} (scans inventory for issues and creates alerts)               |
| MARK_ALERTS_READ  | {}                                                               |
| NONE              | {} (for greetings, answers, advice — no database change)         |

ABSOLUTE RULES — NEVER BREAK:
1. ONLY discuss store and business topics: products, stock, prices, mandi rates, sales, purchases, profits, margins, suppliers, alerts, and MarketMind features.
2. If someone asks about ANYTHING unrelated (politics, weather, sports, movies, coding, jokes, recipes, general knowledge, math, science, personal life, news, etc.) — warmly decline. Example: "Haha, I wish I knew! But I'm strictly your store guy 😄 Ask me about stock, sales, or prices!"
3. NEVER invent product data. Only talk about products listed in the inventory above. If a product isn't there, say so clearly.
4. When you execute a sale or purchase, always state the quantity, product, and ₹ amount clearly.
5. If the user's request is unclear, ask ONE short clarifying question — don't guess.
6. Never say "I'm just an AI" — stay in character as their business partner.
7. When the store inventory is empty, encourage the user to add products first.

EXAMPLES OF GOOD RESPONSES:

User: "hi"
→ {"action":"NONE","params":{},"reply":"Hey! 👋 Welcome back. You've got ${products.length} products worth ₹${totalStockValue.toLocaleString('en-IN')} in stock. What can I help with today?","suggestions":["Today's sales","Check low stock","Mandi rates"]}

User: "sell 5 kg rice at 48"
→ {"action":"RECORD_SALE","params":{"commodity":"Rice","quantity":5,"unitPrice":48},"reply":"Done! Billing 5 kg Rice at ₹48/kg — that's ₹240 in the register 💰","suggestions":["Today's total profit","Check Rice stock","Sell more"]}

User: "tell me a joke"
→ {"action":"NONE","params":{},"reply":"Ha! I'm tempted, but jokes aren't my department 😄 I'm all about your store — ask me about stock levels, mandi prices, or sales!","suggestions":["Today's business","Low stock items","Market prices"]}

User: "which items are running low?"
→ {"action":"NONE","params":{},"reply":"${lowStockItems.length > 0 ? `Watch out — ${lowStockItems.map(p => p.name).join(', ')} ${lowStockItems.length === 1 ? 'is' : 'are'} running thin. I'd restock soon before the mandi rates climb.` : `Everything looks healthy! No items below their safety stock right now 👍`}","suggestions":["Restock suggestions","Set low stock alert","Mandi rates"]}

OUTPUT FORMAT — respond with ONLY a valid JSON object:
{
  "action": "NONE",
  "params": {},
  "reply": "your warm, natural, human response",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;
};

/**
 * @desc    AI Copilot Chat Handler — Pure Gemini Engine
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

    // ── Guard: Gemini must be available ──
    if (!chatModel) {
      return res.status(200).json({
        success: true,
        source: 'SYSTEM',
        reply: "Hey! The AI engine needs a Gemini API key to work. Add your GEMINI_API_KEY to the server .env file and restart. Get a free key at https://aistudio.google.com/app/apikey 🔑",
        action: null,
        suggestions: ['How to set up Gemini?']
      });
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

    // ── 2. Build the system prompt with live data ──
    const systemPrompt = buildSystemPrompt({
      products, suppliers, todaySales, todayRevenue, todayProfit,
      todayMargin, lowStockItems, totalStockValue, unreadAlerts
    });

    // ── 3. Format conversation history ──
    const recentHistory = history.slice(-10);
    // Remove current message from history (it's passed separately as the prompt)
    if (recentHistory.length > 0 && recentHistory[recentHistory.length - 1]?.content === message) {
      recentHistory.pop();
    }

    const conversationContext = recentHistory.length > 0
      ? recentHistory.map(msg => {
          const role = msg.role === 'user' ? 'Customer' : 'MarketMind';
          return `${role}: ${msg.content}`;
        }).join('\n\n')
      : '(New conversation — no prior messages)';

    // ── 4. Compose full prompt ──
    const fullPrompt = `${systemPrompt}

───── CONVERSATION SO FAR ─────
${conversationContext}

───── CUSTOMER SAYS NOW ─────
"${message}"

Respond with ONLY the JSON object:`;

    // ── 5. Call Gemini ──
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
        // If Gemini somehow returns non-JSON, use the raw text
        parsed = {
          action: 'NONE',
          params: {},
          reply: responseText.replace(/```json\n?|\n?```/g, '').trim(),
          suggestions: ['Check inventory', "Today's sales", 'Mandi rates']
        };
      }

      // ── 6. Execute action if Gemini requested one ──
      let actionResult = { executed: false };
      let finalReply = parsed.reply || "Got it!";

      if (parsed.action && parsed.action !== 'NONE') {
        actionResult = await executeStoreAction(
          userId, parsed.action, parsed.params || {}, products, suppliers
        );

        if (actionResult.executed) {
          // Append concrete confirmation if Gemini's reply missed the numbers
          switch (actionResult.type) {
            case 'RECORD_SALE':
              if (!finalReply.includes('Sale Recorded')) {
                finalReply += `\n\n✅ **Sale Recorded**: Sold ${actionResult.quantity} ${actionResult.unit} ${actionResult.productName} for ₹${actionResult.revenue.toLocaleString('en-IN')}. Profit: ₹${actionResult.profit.toLocaleString('en-IN')}. Stock remaining: ${actionResult.remainingStock} ${actionResult.unit}.`;
              }
              break;
            case 'RECORD_PURCHASE':
              if (!finalReply.includes('Purchase Recorded')) {
                finalReply += `\n\n✅ **Purchase Recorded**: Restocked ${actionResult.quantity} ${actionResult.unit} ${actionResult.productName}. New avg cost: ₹${actionResult.newCost}/${actionResult.unit}. Total stock: ${actionResult.newStock} ${actionResult.unit}.`;
              }
              break;
            case 'CREATE_ALERT':
              if (!finalReply.includes('Alert Added')) {
                finalReply += `\n\n✅ **Alert Added**: ${actionResult.productName} (Trigger: ₹${actionResult.targetValue}/${actionResult.unit}).`;
              }
              break;
            case 'UPDATE_PRICE':
              if (!finalReply.includes('Price Updated')) {
                finalReply += `\n\n✅ **Price Updated**: ${actionResult.productName} selling price updated from ₹${actionResult.oldPrice} → ₹${actionResult.newPrice}/${actionResult.unit}.`;
              }
              break;
            case 'ADD_PRODUCT':
              if (!finalReply.toLowerCase().includes('added')) {
                finalReply += `\n\n✅ **Product added:** ${actionResult.productName} is now in your inventory!`;
              }
              break;
            case 'FETCH_PRICES':
              if (!finalReply.toLowerCase().includes('sync') && !finalReply.toLowerCase().includes('fetch')) {
                finalReply += `\n\n🔄 Mandi rates synced from AGMARKNET!`;
              }
              break;
            case 'SCAN_ALERTS':
              finalReply += `\n\n🔍 Scanned inventory — ${actionResult.count} alert(s) generated.`;
              break;
            case 'MARK_ALERTS_READ':
              if (!finalReply.toLowerCase().includes('clear') && !finalReply.toLowerCase().includes('read')) {
                finalReply += `\n\n✅ All alerts marked as read!`;
              }
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
      return res.status(200).json({
        success: true,
        source: 'ERROR',
        reply: `Oops, my AI brain hiccupped for a second! 😅 Try again — I'll be right back.\n\n_Error: ${geminiError.message}_`,
        action: null,
        suggestions: ['Try again', 'Check inventory', "Today's sales"]
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
