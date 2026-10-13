const { GoogleGenerativeAI } = require('@google/generative-ai');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const MarketPrice = require('../models/MarketPrice');
const Alert = require('../models/Alert');
const priceMonitor = require('../services/priceMonitor');
const helpers = require('../utils/helpers');
const { APMC_MARKET_COMMODITIES } = require('../config/seedMarketPrices');

const COMMODITY_EMOJIS = {
  'Potato': '🥔',
  'Tomato': '🍅',
  'Wheat': '🌾',
  'Wheat (Lokwan)': '🌾',
  'Onion': '🧅',
  'Rice': '🍚',
  'Rice (Sona Masoori)': '🍚',
  'Jaggery': '🍬',
  'Sugar': '⚪',
  'Masoor Dal': '🥣',
  'Mustard': '🌻',
  'Sunflower Oil': '🌻',
  'Groundnut': '🥜',
  'Urad Dal': '🥣',
  'Chana Dal': '🥜',
  'Rice (Basmati)': '🍚',
  'Moong Dal': '🥣',
  'Tamarind': '🟤',
  'Rajma': '🫘',
  'Toor Dal': '🟡',
  'Turmeric': '🟡',
  'Coriander': '🌿',
  'Dry Chillies': '🌶️',
  'Jeera': '🌱',
  'Black Pepper': '⚫'
};

/**
 * Safely map any commodity name to a valid Product schema category enum:
 * ['Rice', 'Wheat', 'Dal & Pulses', 'Cooking Oil', 'Sugar & Sweeteners', 'Spices', 'Flour & Grains', 'Others']
 */
const getCategoryForCommodity = (name = '') => {
  const n = String(name).toLowerCase();
  if (n.includes('rice')) return 'Rice';
  if (n.includes('wheat') || n.includes('atta') || n.includes('flour')) return 'Wheat';
  if (n.includes('dal') || n.includes('chana') || n.includes('rajma') || n.includes('urad') || n.includes('moong') || n.includes('masoor') || n.includes('toor')) return 'Dal & Pulses';
  if (n.includes('oil') || n.includes('tel')) return 'Cooking Oil';
  if (n.includes('sugar') || n.includes('jaggery') || n.includes('gur') || n.includes('shakar') || n.includes('chini')) return 'Sugar & Sweeteners';
  if (n.includes('spice') || n.includes('turmeric') || n.includes('chilli') || n.includes('mirchi') || n.includes('coriander') || n.includes('jeera') || n.includes('pepper')) return 'Spices';
  if (n.includes('grain') || n.includes('maize') || n.includes('bajra') || n.includes('jowar')) return 'Flour & Grains';
  return 'Others';
};

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
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    });
    fallbackModel = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 1024
      }
    });
    console.log('[MarketMind Chatbot] Gemini conversational engine ready (gemini-3.5-flash-lite)');
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

const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/**
 * Ultra-flexible product finder: Exact, Whole-word, Token, and Levenshtein Fuzzy
 */
const findProductByName = (products, text) => {
  if (!text || !Array.isArray(products) || products.length === 0) return null;
  const raw = text.toLowerCase().trim();
  const normalized = normalizeCommodityText(raw);

  // 1. Exact match
  let found = products.find(p => p.name.toLowerCase() === raw || p.name.toLowerCase() === normalized);
  if (found) return found;

  // 2. Whole-word boundary match
  found = products.find(p => {
    const pName = p.name.toLowerCase();
    const pNorm = normalizeCommodityText(pName);
    const pRegex = new RegExp(`\\b${escapeRegex(pNorm)}\\b`, 'i');
    return pRegex.test(normalized) || pRegex.test(raw);
  });
  if (found) return found;

  // 3. Keyword token match (full word or prefix >= 4 letters)
  const tokens = normalized.split(/\s+/).filter(t => t.length >= 3);
  for (const token of tokens) {
    found = products.find(p => {
      const pTokens = normalizeCommodityText(p.name).split(/\s+/);
      return pTokens.some(pt => pt === token || (pt.length >= 4 && (token.startsWith(pt) || pt.startsWith(token))));
    });
    if (found) return found;
  }

  // 4. Fuzzy Levenshtein match (distance <= 1 for short words, <= 2 for longer words, strictly avoiding noise words)
  const noiseWords = new Set(['price', 'market', 'selling', 'stock', 'alert', 'mandi', 'rate', 'cost', 'bhav', 'today', 'profit', 'sales']);
  let bestMatch = null;
  let minDistance = 999;
  for (const p of products) {
    const pWords = normalizeCommodityText(p.name).split(/\s+/);
    for (const pw of pWords) {
      if (pw.length < 3) continue;
      for (const ut of tokens.length > 0 ? tokens : [normalized]) {
        if (noiseWords.has(ut) || ut.length < 3) continue;
        const dist = levenshteinDistance(pw, ut);
        const maxAllowed = pw.length <= 4 ? 1 : 2;
        if (dist <= maxAllowed && dist < minDistance) {
          minDistance = dist;
          bestMatch = p;
        }
      }
    }
  }

  return bestMatch;
};

/**
 * Compound & Single Natural Language Command Extractor (10/10 Human Flexibility)
 */
const parseDirectCommands = (rawMessage, products) => {
  if (!rawMessage || typeof rawMessage !== 'string') return null;

  let msg = rawMessage.toLowerCase().trim();

  // ── A. HELP / WHAT CAN YOU DO ──
  if (/^(?:\?|help|what can you do|commands|options|who are you)$/i.test(msg)) {
    return [{ action: 'HELP_QUERY', params: {} }];
  }

  // Strip conversational noise / instructions (keep 'today' as it's needed for daily sales/profit queries)
  msg = msg.replace(/\b(?:this\s+should\s+work|and\s+this\s+should\s+not\s+go\s+up\s+while\s+scrolling|this\s+should\s+not\s+go\s+up\s+while\s+scrolling|please|fast|right\s+now|ok|okay|boss|bhai|bhaiya|munshi)\b/gi, '').trim();

  // Normalize phonetic and trade typos
  let normalized = normalizeCommodityText(msg);
  normalized = normalized.replace(/\bmarker\s+(?:price|rate|bhav)?\b/gi, 'market price');
  normalized = normalized.replace(/\bmaket\s+(?:price|rate|bhav)?\b/gi, 'market price');
  normalized = normalized.replace(/\bmarkit\s+(?:price|rate|bhav)?\b/gi, 'market price');
  normalized = normalized.replace(/(\d+)(kg|quintal|bags?|litres?|tons?|rs|rupees)/gi, '$1 $2');

  // Try to pre-identify the primary commodity mentioned in the whole message
  let primaryCommodity = null;
  const commonCommodities = ['potato', 'tomato', 'wheat', 'onion', 'rice', 'jaggery', 'sugar', 'dal', 'oil', 'mustard', 'groundnut', 'tamarind', 'rajma', 'turmeric', 'coriander', 'chilli', 'jeera', 'pepper', 'flour'];
  for (const cc of commonCommodities) {
    if (new RegExp(`\\b${cc}\\b`, 'i').test(normalized)) {
      primaryCommodity = cc;
      break;
    }
  }
  if (!primaryCommodity) {
    const wholeMatched = findProductByName(products, normalized);
    if (wholeMatched) {
      primaryCommodity = wholeMatched.name;
    }
  }

  // ── B. TOP CHEAP COMMODITIES INQUIRY ──
  // e.g. "i mean list the top 10 cheap products", "list the top 10 cheap products", "top 10 cheap products", "cheapest products", "cheap items"
  if (
    !/\b(?:buy|bought|purchase|restock|order|sell|sold|alert)\b/i.test(normalized) &&
    (
      /\b(?:top\s*\d*\s*cheap|cheapest|lowest\s*price|low\s*cost|saste\s*products|sasti\s*cheezein|sasta\s*maal)\b/i.test(normalized) ||
      (/\bcheap\b/i.test(normalized) && /\b(?:products?|commodit(?:y|ies)|items?|list)\b/i.test(normalized))
    )
  ) {
    const limitMatch = normalized.match(/\b(?:top\s*)?(\d+)\b/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 10;
    return [{ action: 'TOP_CHEAP_QUERY', params: { limit: Math.min(limit, 25) } }];
  }

  // ── C. AVAILABLE PRODUCTS / COMMODITIES INQUIRY ──
  // e.g. "what are the products avalible", "what products are available", "what can i buy", "what is available to purchase", "list products", "show catalog"
  const isAvailableProductsQuery = (
    /\b(?:what\s+can\s+i\s+(?:buy|purchase|stock|order|sell|trade)|what\s+should\s+i\s+(?:buy|purchase|stock)|what\s+to\s+(?:buy|purchase|stock)|what\s+is\s+available\s+to\s+(?:buy|purchase)|what\s+products\s+can\s+i\s+buy)\b/i.test(normalized) ||
    /\b(?:products?\s*ava(?:i|y)?l(?:a|i)?ble|commodit(?:y|ies)\s*ava(?:i|y)?l(?:a|i)?ble|items?\s*ava(?:i|y)?l(?:a|i)?ble)\b/i.test(normalized) ||
    /\b(?:ava(?:i|y)?l(?:a|i)?ble\s*(?:products?|commodit(?:y|ies)|items?|stock))\b/i.test(normalized) ||
    /\b(?:list\s*(?:all\s*)?(?:products?|commodit(?:y|ies)|items?|catalog)|show\s*(?:all\s*)?(?:products?|commodit(?:y|ies)|items?|catalog)|view\s*(?:all\s*)?(?:products?|commodit(?:y|ies)|items?|catalog))\b/i.test(normalized) ||
    /\b(?:what\s+(?:items?|products?|commodities)\s+do\s+(?:you|we)\s+have|what\s+do\s+(?:you|we)\s+have|what\s+do\s+(?:you|we)\s+sell|what\s+can\s+i\s+sell)\b/i.test(normalized) ||
    (/\b(?:what|which)\b/i.test(normalized) && /\b(?:products?|commodit(?:y|ies)|items?)\b/i.test(normalized) && /\bava(?:i|y)?l/i.test(normalized)) ||
    /^(?:catalog|products|commodities|all\s+products)$/i.test(normalized)
  );
  if (isAvailableProductsQuery) {
    return [{ action: 'AVAILABLE_PRODUCTS_QUERY', params: {} }];
  }

  // ── D. TOP EXPENSIVE / PREMIUM PRODUCTS INQUIRY ──
  if (/\b(?:top\s*\d*\s*expensive|most\s*expensive|highest\s*price|premium\s*products)\b/i.test(normalized)) {
    return [{ action: 'TOP_EXPENSIVE_QUERY', params: { limit: 10 } }];
  }

  // ── E. LOW STOCK INQUIRY ──
  if (
    !/\b(?:buy|bought|purchase|restock|order|sell|sold)\b/i.test(normalized) &&
    (/\b(?:low\s*stock|low\s*inventory|out\s*of\s*stock|reorder\s*items?|running\s*low|shortage)\b/i.test(normalized) ||
     (/\bwhich\s*products\b/i.test(normalized) && /\blow\b/i.test(normalized)))
  ) {
    return [{ action: 'LOW_STOCK_QUERY', params: {} }];
  }

  // ── F. UNREAD ALERTS INQUIRY ──
  if (
    !/\b(?:set|create|add|new|trigger|at|crosses|below|above)\b/i.test(normalized) &&
    /\b(?:unread\s*alerts?|my\s*alerts?|show\s*alerts?|check\s*alerts?|view\s*alerts?|price\s*alerts?)\b/i.test(normalized)
  ) {
    return [{ action: 'ALERTS_QUERY', params: {} }];
  }

  // ── G. TODAY'S PROFIT & REGISTER INQUIRY ──
  if (
    !/\b(?:buy|bought|purchase|restock|order|sell|sold|alert)\b/i.test(normalized) &&
    /\b(?:today'?s?\s*(?:profit|sales|revenue)|how much profit|daily profit|how much sales|my profit|total sales|register|check register|check sales|check profit|profit today|sales today)\b/i.test(normalized)
  ) {
    return [{ action: 'PROFIT_QUERY', params: {} }];
  }

  // ── H. STOCK INQUIRY ──
  if (
    !/\b(?:buy|bought|purchase|restock|order|sell|sold)\b/i.test(normalized) &&
    (/\b(?:stock|inventory|how much .* in stock|how much .* left|how much .* do i have|check stock)\b/i.test(normalized))
  ) {
    return [{ action: 'STOCK_QUERY', params: { commodity: primaryCommodity } }];
  }

  // ── I. PRICE / MANDI RATE INQUIRY ──
  // e.g. "what is market price of sugar", "sugar market price", "sugar rate", "what is the mandi price of rice", "how much is sugar"
  if (
    !/\b(?:buy|bought|purchase|restock|order|sell|sold|set|update|change|create|alert|notify)\b/i.test(normalized) &&
    (
      /\b(?:what is (?:the )?(?:market )?(?:price|rate|bhav)|how much is|current (?:price|rate|bhav)|mandi rate of|market price of|price of|rate of|bhav of)\b/i.test(normalized) ||
      (/\b(?:price|rate|bhav|cost|mandi)\b/i.test(normalized) && (primaryCommodity || /\b(?:sugar|rice|wheat|dal|oil|onion|potato)\b/i.test(normalized)))
    )
  ) {
    return [{ action: 'PRICE_QUERY', params: { commodity: primaryCommodity || 'sugar' } }];
  }

  // Split into clauses by "and then", "and", "then", "&", ",", ";"
  const clauses = normalized
    .split(/\s+(?:and\s+then|and|then|also|\&)\s+|,\s*|;\s*/i)
    .map(c => c.trim())
    .filter(c => c.length > 0);

  const actions = [];
  let activeCommodity = primaryCommodity;
  let activeQty = null;
  let activePrice = null;

  for (const clause of clauses) {
    // Check if this specific clause names a commodity
    let clauseCommodity = null;
    for (const cc of commonCommodities) {
      if (new RegExp(`\\b${cc}\\b`, 'i').test(clause)) {
        clauseCommodity = cc;
        break;
      }
    }
    if (!clauseCommodity) {
      const clauseMatched = findProductByName(products, clause);
      if (clauseMatched) clauseCommodity = clauseMatched.name;
    }
    if (clauseCommodity) {
      activeCommodity = clauseCommodity;
    }

    // ── 1. RECORD_PURCHASE INTENT (buy, bought, purchase, restock) ──
    const isPurchaseQuestion = /\b(?:what|can|how|should|where|which)\b/i.test(clause) && /\b(?:buy|purchase|stock|order)\b/i.test(clause);
    if (!isPurchaseQuestion && /\b(?:buy|bought|purchased?|record\s*purchase|restock|order)\b/i.test(clause)) {
      const qtyMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:kg|quintal|bags?|litres?|tons?)?/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : (activeQty || 50);
      if (qty) activeQty = qty;

      const isMarketPrice = clause.includes('market price') || clause.includes('mandi') || clause.includes('current rate') || clause.includes('modal rate');
      let cost = null;
      if (!isMarketPrice) {
        const costMatch = clause.match(/(?:at|@|for)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)/i);
        if (costMatch) cost = parseFloat(costMatch[1]);
      }

      actions.push({
        action: 'RECORD_PURCHASE',
        params: {
          commodity: activeCommodity || 'sugar',
          quantity: qty,
          unitCost: cost,
          useMarketPrice: isMarketPrice || (!cost)
        }
      });
      continue;
    }

    // ── 2. UPDATE_PRICE INTENT (set selling at, selling at, update price, change rate) ──
    if (
      /\b(?:set\s*selling|selling\s*at|set\s*price|update\s*price|change\s*price|selling\s*price|price\s*to|price\s*at|rate\s*to|rate\s*at)\b/i.test(clause) ||
      (/\b(?:set|update|change|make)\b/i.test(clause) && /\b(?:selling|price|rate)\b/i.test(clause))
    ) {
      const priceMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:rs|rupees|\/-)?/i);
      if (priceMatch) {
        const newPrice = parseFloat(priceMatch[1]);
        activePrice = newPrice;
        actions.push({
          action: 'UPDATE_PRICE',
          params: {
            commodity: activeCommodity || 'sugar',
            newPrice
          }
        });
        continue;
      }
    }

    // ── 3. CREATE_ALERT INTENT (set alert, sell alert, price alert, alert) ──
    if (/\b(?:alert|notify|alarm)\b/i.test(clause)) {
      const targetMatch = clause.match(/(?:at|when|if|crosses|above|below|reaches|cross|reach|@)?\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:rs|rupees|\/-)?/i);
      let targetVal = targetMatch && targetMatch[1] ? parseFloat(targetMatch[1]) : (activePrice || 50);

      const isDrop = clause.includes('below') || clause.includes('drop') || clause.includes('fall') || clause.includes('buy alert');
      actions.push({
        action: 'CREATE_ALERT',
        params: {
          commodity: activeCommodity || 'sugar',
          condition: isDrop ? 'PRICE_DECREASE' : 'PRICE_INCREASE',
          targetValue: targetVal
        }
      });
      continue;
    }

    // ── 4. RECORD_SALE INTENT (sell, sold, bill) - but NOT if it was "set selling" ──
    if (/\b(?:sell|sold|record\s*sale|billed?)\b/i.test(clause) && !/\b(?:set\s*selling|selling\s*price|selling\s*at)\b/i.test(clause)) {
      const qtyMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:kg|quintal|bags?|litres?|tons?)?/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 10;
      const priceMatch = clause.match(/(?:at|@|for)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)/i);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;

      actions.push({
        action: 'RECORD_SALE',
        params: {
          commodity: activeCommodity || 'sugar',
          quantity: qty,
          unitPrice: price
        }
      });
      continue;
    }

    // ── 5. FETCH MANDI ──
    if (/\b(?:fetch|sync|refresh)\s*(?:mandi|rates|prices)\b/i.test(clause)) {
      actions.push({ action: 'FETCH_PRICES', params: {} });
      continue;
    }
  }

  return actions.length > 0 ? actions : null;
};

/**
 * Execute real database actions on behalf of the user
 */
const executeStoreAction = async (userId, actionType, params = {}, products, suppliers, storeContext = {}) => {
  const normAction = (actionType || 'NONE').toUpperCase().trim();

  // ── TOP CHEAP PRODUCTS QUERY ──
  if (normAction === 'TOP_CHEAP_QUERY') {
    const sorted = [...APMC_MARKET_COMMODITIES].sort((a, b) => a.pricePerKg - b.pricePerKg);
    const limit = params.limit || 10;
    const topList = sorted.slice(0, limit);

    const lines = topList.map((item, idx) => {
      const emoji = COMMODITY_EMOJIS[item.commodity] || '📦';
      return `${idx + 1}. ${emoji} **${item.commodity}**: **₹${item.pricePerKg.toFixed(2)}/kg** (₹${item.modalPrice.toLocaleString('en-IN')}/quintal) — *${item.market}*`;
    }).join('\n');

    return {
      executed: true,
      type: 'TOP_CHEAP_QUERY',
      message: `Here are the **Top ${limit} Cheapest Wholesale Commodities** currently trading in Telangana APMC Mandis:\n\n` +
               `${lines}\n\n` +
               `💡 *Trade Tip*: Potato and Tomato are trading at seasonal wholesale lows! You can stock them in 1 shot:\n` +
               `e.g. Say **"buy 100kg potato at market price and set selling at 25rs"** to stock and list them immediately!`
    };
  }

  // ── AVAILABLE PRODUCTS QUERY ──
  if (normAction === 'AVAILABLE_PRODUCTS_QUERY') {
    let storeSection = '';
    if (products && products.length > 0) {
      const storeLines = products.map(p => `• **${p.name}**: ${p.stockQuantity} ${p.unit} in stock (Selling at ₹${p.sellingPrice}/${p.unit})`).join('\n');
      storeSection = `🏪 **Your Store Catalog**:\n${storeLines}\n\n`;
    } else {
      storeSection = `🏪 **Your Store Catalog**: Your personal inventory is currently empty.\n\n`;
    }

    const mandiOverview = APMC_MARKET_COMMODITIES.slice(0, 10).map((item, idx) => {
      const emoji = COMMODITY_EMOJIS[item.commodity] || '📦';
      return `${idx + 1}. ${emoji} **${item.commodity}**: ₹${item.pricePerKg.toFixed(2)}/kg — *${item.market}*`;
    }).join('\n');

    return {
      executed: true,
      type: 'AVAILABLE_PRODUCTS_QUERY',
      message: `${storeSection}` +
               `🌾 **Available Wholesale Commodities in Telangana APMC Mandis (Ready to Stock)**:\n` +
               `${mandiOverview}\n\n` +
               `💡 To add and stock any commodity instantly, just say: **"buy 50kg rice at market price and set selling at 45rs"**!`
    };
  }

  // ── TOP EXPENSIVE / PREMIUM QUERY ──
  if (normAction === 'TOP_EXPENSIVE_QUERY') {
    const sorted = [...APMC_MARKET_COMMODITIES].sort((a, b) => b.pricePerKg - a.pricePerKg);
    const limit = params.limit || 10;
    const topList = sorted.slice(0, limit);

    const lines = topList.map((item, idx) => {
      const emoji = COMMODITY_EMOJIS[item.commodity] || '📦';
      return `${idx + 1}. ${emoji} **${item.commodity}**: **₹${item.pricePerKg.toFixed(2)}/kg** (₹${item.modalPrice.toLocaleString('en-IN')}/quintal) — *${item.market}*`;
    }).join('\n');

    return {
      executed: true,
      type: 'TOP_EXPENSIVE_QUERY',
      message: `Here are the **Top ${limit} Highest-Value Premium Commodities** in Telangana APMC Mandis:\n\n` +
               `${lines}`
    };
  }

  // ── PRICE QUERY ──
  if (normAction === 'PRICE_QUERY') {
    const comm = (params.commodity || 'sugar').toLowerCase();
    const matched = findProductByName(products, comm);
    const commName = matched ? matched.name : (comm.charAt(0).toUpperCase() + comm.slice(1));

    let mandiRate = matched?.currentReferencePrice;
    let mandiRecord = await MarketPrice.findOne({
      commodity: new RegExp(comm, 'i')
    }).sort({ date: -1 });

    if (mandiRecord && mandiRecord.modalPrice) {
      mandiRate = parseFloat((mandiRecord.modalPrice / 100).toFixed(2));
    }
    if (!mandiRate) {
      const benchmark = APMC_MARKET_COMMODITIES.find(b => b.commodity.toLowerCase().includes(comm));
      mandiRate = benchmark ? benchmark.pricePerKg : 50.35;
    }

    const unit = matched?.unit || 'kg';
    const sellPrice = matched?.sellingPrice ? `₹${matched.sellingPrice}/${unit}` : 'Not set in catalog';
    const costPrice = matched?.purchaseCost ? `₹${matched.purchaseCost}/${unit}` : 'N/A';
    const marketLocation = mandiRecord?.market || 'Hyderabad APMC';

    return {
      executed: true,
      type: 'PRICE_QUERY',
      productName: commName,
      mandiRate,
      unit,
      sellingPrice: sellPrice,
      purchaseCost: costPrice,
      market: marketLocation,
      message: `The latest APMC mandi wholesale rate for **${commName}** is **₹${mandiRate}/${unit}** (₹${(mandiRate * 100).toLocaleString('en-IN')}/quintal) in ${marketLocation}.\n\n` +
               `🏪 **Your Store Status**:\n` +
               `• Selling Price: **${sellPrice}**\n` +
               `• Purchase Cost: **${costPrice}**`
    };
  }

  // ── STOCK QUERY ──
  if (normAction === 'STOCK_QUERY') {
    if (params.commodity) {
      const matched = findProductByName(products, params.commodity);
      if (matched) {
        return {
          executed: true,
          type: 'STOCK_QUERY',
          message: `You currently have **${matched.stockQuantity} ${matched.unit}** of **${matched.name}** in stock.\n` +
                   `• Selling Price: ₹${matched.sellingPrice}/${matched.unit}\n` +
                   `• Stock Value: ₹${(matched.stockQuantity * matched.purchaseCost).toLocaleString('en-IN')}`
        };
      }
    }
    if (!products || products.length === 0) {
      return { executed: true, type: 'STOCK_QUERY', message: 'Your commodity catalog is currently empty. Add products or ask me to restock!' };
    }
    const lines = products.map(p => `• **${p.name}**: ${p.stockQuantity} ${p.unit} (Sell: ₹${p.sellingPrice}/${p.unit})`).join('\n');
    return {
      executed: true,
      type: 'STOCK_QUERY',
      message: `📦 **Current Store Inventory**:\n${lines}`
    };
  }

  // ── LOW STOCK QUERY ──
  if (normAction === 'LOW_STOCK_QUERY') {
    const lowStockItems = (products || []).filter(p => p.stockQuantity <= (p.minStockLevel || 10));
    if (lowStockItems.length === 0) {
      return {
        executed: true,
        type: 'LOW_STOCK_QUERY',
        message: '✅ **Inventory is Healthy!** None of your products are running low on stock right now.'
      };
    }
    const lines = lowStockItems.map(p =>
      `• ⚠️ **${p.name}**: Only **${p.stockQuantity} ${p.unit}** remaining (Reorder threshold: ${p.minStockLevel || 10} ${p.unit})`
    ).join('\n');
    return {
      executed: true,
      type: 'LOW_STOCK_QUERY',
      message: `⚠️ **Low Stock Alert**: The following products need restock soon:\n\n${lines}\n\n💡 Say e.g. **"buy 50kg ${lowStockItems[0].name.toLowerCase()} at market price"** to reorder!`
    };
  }

  // ── UNREAD ALERTS QUERY ──
  if (normAction === 'ALERTS_QUERY' || normAction === 'UNREAD_ALERTS_QUERY') {
    const alerts = await Alert.find({ userId, isRead: false }).sort({ createdAt: -1 }).limit(10);
    if (!alerts || alerts.length === 0) {
      return {
        executed: true,
        type: 'ALERTS_QUERY',
        message: '🔔 **No Unread Alerts**: You are all caught up! Say e.g. **"set alert for Sugar at 55"** to create a new price monitor.'
      };
    }
    const lines = alerts.map((a, idx) => `• ${a.title}: ${a.message}`).join('\n');
    return {
      executed: true,
      type: 'ALERTS_QUERY',
      message: `🔔 **Your Active Unread Price Alerts** (${alerts.length}):\n\n${lines}`
    };
  }

  // ── PROFIT & SALES QUERY ──
  if (normAction === 'PROFIT_QUERY') {
    const todaySales = storeContext?.todaySales || [];
    const todayRevenue = storeContext?.todayRevenue || 0;
    const todayProfit = storeContext?.todayProfit || 0;
    const todayMargin = storeContext?.todayMargin || '0';

    return {
      executed: true,
      type: 'PROFIT_QUERY',
      message: `📊 **Today's Register Summary**:\n` +
               `• Total Sales: **${todaySales.length}**\n` +
               `• Total Revenue: **₹${Number(todayRevenue).toLocaleString('en-IN')}**\n` +
               `• Gross Profit: **₹${Number(todayProfit).toLocaleString('en-IN')}** (${todayMargin}% profit margin)`
    };
  }

  // ── HELP / CAPABILITIES ──
  if (normAction === 'HELP_QUERY') {
    return {
      executed: true,
      type: 'HELP_QUERY',
      message: `👋 **MarketMind Co-Pilot Commands** (1-shot instant execution):\n\n` +
               `• 🛒 **Buy & Restock**: \`buy 50kg sugar at market price\`\n` +
               `• 🏷️ **Update Price**: \`set sugar selling price to 52 rs\`\n` +
               `• 🔔 **Set Alert**: \`alert if sugar crosses 55 rs\`\n` +
               `• ⚡ **Compound**: \`buy 50kg sugar at market price and set selling at 50rs and set alert\`\n` +
               `• 📊 **Mandi Rates**: \`what is market price of sugar\`\n` +
               `• 📉 **Cheap Products**: \`list the top 10 cheap products\`\n` +
               `• 🌾 **Available Products**: \`what are the products available\`\n` +
               `• 📦 **Check Stock**: \`what is my sugar stock\`\n` +
               `• 💰 **Check Register**: \`today's profit\``
    };
  }

  // ── CREATE ALERT ──
  if (normAction === 'CREATE_ALERT' || normAction === 'ADD_ALERT') {
    const commodityQuery = (params.commodity || 'Commodity').trim();
    let matched = findProductByName(products, commodityQuery);
    const commName = matched ? matched.name : commodityQuery.charAt(0).toUpperCase() + commodityQuery.slice(1);
    const unit = matched ? (matched.unit || 'kg') : 'kg';

    const curRef = matched ? (matched.currentReferencePrice || matched.purchaseCost || 40) : 40;
    const cond = params.condition || (params.targetValue && params.targetValue > curRef ? 'PRICE_INCREASE' : 'PRICE_DECREASE');
    let targetVal = parseFloat(params.targetValue);
    if (isNaN(targetVal) || targetVal <= 0) {
      targetVal = matched && matched.sellingPrice > 0
        ? matched.sellingPrice
        : (cond === 'PRICE_INCREASE' ? parseFloat((curRef * 1.05).toFixed(2)) : parseFloat((curRef * 0.95).toFixed(2)));
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
    let matched = findProductByName(products, params.commodity || '');
    const qty = parseFloat(params.quantity);

    if (isNaN(qty) || qty <= 0) {
      return { executed: false, message: 'I need a valid quantity to record a purchase.' };
    }

    let unitCost = parseFloat(params.unitCost);
    if (isNaN(unitCost) || unitCost <= 0 || params.useMarketPrice) {
      if (matched && matched.currentReferencePrice > 0) {
        unitCost = matched.currentReferencePrice;
      } else {
        const commName = matched ? matched.name : (params.commodity || 'sugar');
        const mp = await MarketPrice.findOne({
          commodity: new RegExp(commName, 'i')
        }).sort({ date: -1 });

        if (mp && mp.modalPrice) {
          unitCost = parseFloat((mp.modalPrice / 100).toFixed(2));
        } else if (matched && matched.purchaseCost > 0) {
          unitCost = matched.purchaseCost;
        } else {
          const benchmark = APMC_MARKET_COMMODITIES.find(b => b.commodity.toLowerCase().includes(commName.toLowerCase()));
          unitCost = benchmark ? benchmark.pricePerKg : 50.35;
        }
      }
    }

    if (!matched) {
      const commName = (params.commodity || 'Commodity').trim();
      const capName = commName.charAt(0).toUpperCase() + commName.slice(1).toLowerCase();
      matched = await Product.create({
        userId,
        name: capName,
        category: getCategoryForCommodity(commName),
        variety: 'Standard',
        unit: params.unit || 'kg',
        purchaseCost: unitCost,
        sellingPrice: parseFloat((unitCost * 1.12).toFixed(2)),
        stockQuantity: 0,
        minStockLevel: 10,
        govApiCommodityName: commName,
        isActive: true
      });
      products.push(matched);
    }

    const existingQty = matched.stockQuantity || 0;
    const existingCost = matched.purchaseCost || unitCost;
    const newCost = helpers.calculateWeightedAvgCost(existingQty, existingCost, qty, unitCost);
    const newQty = parseFloat((existingQty + qty).toFixed(2));
    const totalAmount = parseFloat((qty * unitCost).toFixed(2));
    const supplierId = matched.supplier || (suppliers && suppliers.length > 0 ? suppliers[0]._id : null);

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
      unit: matched.unit || 'kg',
      unitCost,
      newCost,
      newStock: newQty,
      totalAmount
    };
  }

  // ── UPDATE SELLING PRICE ──
  if (normAction === 'UPDATE_PRICE' || normAction === 'UPDATE_SELLING_PRICE') {
    let matched = findProductByName(products, params.commodity || '');
    const newPrice = parseFloat(params.newPrice);

    if (isNaN(newPrice) || newPrice <= 0) {
      return { executed: false, message: 'Need a valid price to update.' };
    }

    if (!matched) {
      const commName = (params.commodity || 'Commodity').trim();
      const capName = commName.charAt(0).toUpperCase() + commName.slice(1).toLowerCase();
      matched = await Product.create({
        userId,
        name: capName,
        category: getCategoryForCommodity(commName),
        variety: 'Standard',
        unit: 'kg',
        purchaseCost: 40,
        sellingPrice: newPrice,
        stockQuantity: 0,
        minStockLevel: 10,
        govApiCommodityName: commName,
        isActive: true
      });
      products.push(matched);
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
      unit: matched.unit || 'kg'
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

    const validCategories = ['Rice', 'Wheat', 'Dal & Pulses', 'Cooking Oil', 'Sugar & Sweeteners', 'Spices', 'Flour & Grains', 'Others'];
    const assignedCategory = params.category && validCategories.includes(params.category)
      ? params.category
      : getCategoryForCommodity(name);

    const newProduct = await Product.create({
      userId,
      name,
      category: assignedCategory,
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
 * Build rich, personality-driven system prompt with live store data & full APMC Mandi benchmarks
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
    return `  • ${p.name} — ${p.stockQuantity} ${p.unit} | Cost ₹${p.purchaseCost}/${p.unit} | Sell ₹${p.sellingPrice}/${p.unit} | Mandi ₹${p.currentReferencePrice || '50.35'}/${p.unit} | Margin ~${margin}%`;
  }).join('\n');

  const apmcOverview = APMC_MARKET_COMMODITIES.map(c =>
    `  • ${c.commodity}: ₹${c.pricePerKg.toFixed(2)}/kg (₹${c.modalPrice}/quintal) in ${c.market}`
  ).join('\n');

  return `You are MarketMind AI — the complete, full-powered business partner and trusted munshi (manager) for this grocery/commodity business.

YOUR KNOWLEDGE & PERSONALITY (10/10 Natural Human Intelligence):
- Speak like an experienced, trusted Indian business partner — warm, concise, confident, and direct.
- You have complete visibility over BOTH the owner's store inventory AND the entire Telangana APMC Wholesale Mandi market!
- If the owner asks:
  • "what products are available" or "what can I sell": List available commodities from the APMC Mandi market!
  • "list top 10 cheap products": Immediately provide the top 10 cheapest wholesale commodities from the APMC market below!
  • DO NOT say "our catalog is empty, tell me what to add" when asked about market products or cheap items!
- When an owner gives a command with multiple instructions (e.g. "buy sugar 50kg, set selling 50rs, set alert"), EXECUTE ALL OF THEM in an "actions" array!
- Reference REAL numbers from the inventory & APMC market below. Always use ₹ for currency.

═══════════════════════════════════
LIVE STORE INVENTORY:
═══════════════════════════════════
📦 Catalog: ${products.length} commodities | Stock Value: ₹${totalStockValue.toLocaleString('en-IN')}
📊 Today's Register: ${todaySales.length} sales | Revenue ₹${todayRevenue.toLocaleString('en-IN')} | Profit ₹${todayProfit.toLocaleString('en-IN')} (${todayMargin}% margin)
🔔 Unread Alerts: ${unreadAlerts.length}
⚠️ Low Stock: ${lowStockItems.length > 0 ? lowStockItems.map(p => `${p.name} (${p.stockQuantity} ${p.unit})`).join(', ') : 'Fully stocked up 👍'}

STORE COMMODITIES:
${inventoryLines || '  (Store catalog empty — ready to stock commodities from Mandi)'}
═══════════════════════════════════

TELANGANA APMC WHOLESALE MANDI BENCHMARKS (Full Market Knowledge):
${apmcOverview}
═══════════════════════════════════

AVAILABLE ACTIONS:
- TOP_CHEAP_QUERY: params { limit: 10 }
- AVAILABLE_PRODUCTS_QUERY: params {}
- RECORD_PURCHASE: params { commodity, quantity, unitCost, useMarketPrice: true|false }
- UPDATE_PRICE: params { commodity, newPrice }
- CREATE_ALERT: params { commodity, condition: "PRICE_INCREASE"|"PRICE_DECREASE", targetValue }
- RECORD_SALE: params { commodity, quantity, unitPrice }
- ADD_PRODUCT: params { name, sellingPrice, cost, unit }
- FETCH_MANDI: params {}
- MARK_ALERTS_READ: params {}
- NONE: for general answers

OUTPUT FORMAT — Return ONLY this JSON (supporting single or batch "actions"):
{
  "actions": [
    { "action": "ACTION_NAME", "params": {} }
  ],
  "reply": "Warm, direct, human response with real numbers",
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

    const storeContext = {
      todaySales,
      todayRevenue,
      todayProfit,
      todayMargin,
      totalStockValue,
      lowStockItems
    };

    // ── 2. Fast Deterministic NLP Pre-Check (One-Shot 10/10 Execution) ──
    const directCmds = parseDirectCommands(message, products);
    if (directCmds && directCmds.length > 0) {
      const batchResults = [];
      for (const cmd of directCmds) {
        const result = await executeStoreAction(
          userId,
          cmd.action,
          cmd.params,
          products,
          suppliers,
          storeContext
        );
        if (result.executed) {
          batchResults.push(result);
        }
      }

      if (batchResults.length > 0) {
        let replyLines = [];
        if (batchResults.length > 1) {
          replyLines.push(`All ${batchResults.length} actions locked in and executed right away! 🚀`);
        }

        for (const r of batchResults) {
          switch (r.type) {
            case 'PRICE_QUERY':
            case 'STOCK_QUERY':
            case 'PROFIT_QUERY':
            case 'HELP_QUERY':
            case 'TOP_CHEAP_QUERY':
            case 'AVAILABLE_PRODUCTS_QUERY':
            case 'TOP_EXPENSIVE_QUERY':
            case 'LOW_STOCK_QUERY':
            case 'ALERTS_QUERY':
              replyLines.push(r.message);
              break;
            case 'RECORD_PURCHASE':
              replyLines.push(`✅ **Purchase Recorded**: Restocked ${r.quantity} ${r.unit} ${r.productName} at wholesale rate ₹${r.unitCost}/${r.unit} (Total: ₹${r.totalAmount.toLocaleString('en-IN')}). Total stock now: ${r.newStock} ${r.unit}.`);
              break;
            case 'UPDATE_PRICE':
              replyLines.push(`✅ **Selling Price Updated**: ${r.productName} selling price set to ₹${r.newPrice}/${r.unit}.`);
              break;
            case 'CREATE_ALERT':
              replyLines.push(`✅ **Alert Active**: 🔔 Set price alert for ${r.productName} at target ₹${r.targetValue}/${r.unit}.`);
              break;
            case 'RECORD_SALE':
              replyLines.push(`✅ **Sale Recorded**: Billed ${r.quantity} ${r.unit} ${r.productName} for ₹${r.revenue.toLocaleString('en-IN')}. Stock remaining: ${r.remainingStock} ${r.unit}.`);
              break;
            case 'FETCH_PRICES':
              replyLines.push(`✅ **Mandi Synced**: Fresh APMC wholesale rates polled.`);
              break;
            case 'MARK_ALERTS_READ':
              replyLines.push(`✅ **Alerts Cleared**: Marked all unread notifications as read.`);
              break;
          }
        }

        let suggestions = ['Check inventory', "Today's sales", 'Mandi rates'];
        if (batchResults[0].type === 'TOP_CHEAP_QUERY' || batchResults[0].type === 'AVAILABLE_PRODUCTS_QUERY') {
          suggestions = ['Buy 50kg Potato at market price', 'Buy 50kg Rice at market price', "Today's profit"];
        } else if (batchResults[0].type === 'PRICE_QUERY') {
          suggestions = [`Set alert for ${batchResults[0].productName}`, 'Update price', "Today's profit"];
        }

        return res.status(200).json({
          success: true,
          source: 'DIRECT_NLP_BATCH',
          reply: replyLines.join('\n\n'),
          action: {
            type: batchResults.length === 1 ? batchResults[0].type : 'BATCH_ACTIONS',
            executedCount: batchResults.length,
            actions: batchResults
          },
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
          actions: [],
          reply: responseText.replace(/```json\n?|\n?```/g, '').trim(),
          suggestions: ['Check inventory', "Today's sales", 'Mandi rates']
        };
      }

      let actionsToRun = [];
      if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
        actionsToRun = parsed.actions;
      } else if (parsed.action && parsed.action !== 'NONE') {
        actionsToRun = [{ action: parsed.action, params: parsed.params || {} }];
      }

      const batchResults = [];
      for (const act of actionsToRun) {
        const r = await executeStoreAction(userId, act.action, act.params || {}, products, suppliers, storeContext);
        if (r.executed) batchResults.push(r);
      }

      let finalReply = parsed.reply || "Done!";
      if (batchResults.length > 0) {
        const confirmations = [];
        for (const r of batchResults) {
          switch (r.type) {
            case 'TOP_CHEAP_QUERY':
            case 'AVAILABLE_PRODUCTS_QUERY':
            case 'TOP_EXPENSIVE_QUERY':
            case 'LOW_STOCK_QUERY':
            case 'ALERTS_QUERY':
            case 'PRICE_QUERY':
            case 'STOCK_QUERY':
            case 'PROFIT_QUERY':
            case 'HELP_QUERY':
              confirmations.push(r.message);
              break;
            case 'RECORD_PURCHASE':
              confirmations.push(`✅ **Purchase Recorded**: Restocked ${r.quantity} ${r.unit} ${r.productName} at ₹${r.unitCost}/${r.unit}. Total stock: ${r.newStock} ${r.unit}.`);
              break;
            case 'UPDATE_PRICE':
              confirmations.push(`✅ **Price Updated**: ${r.productName} selling price set to ₹${r.newPrice}/${r.unit}.`);
              break;
            case 'CREATE_ALERT':
              confirmations.push(`✅ **Alert Locked**: ${r.productName} (Trigger: ₹${r.targetValue}/${r.unit}).`);
              break;
            case 'RECORD_SALE':
              confirmations.push(`✅ **Sale Recorded**: Billed ${r.quantity} ${r.unit} ${r.productName} for ₹${r.revenue.toLocaleString('en-IN')}. Stock remaining: ${r.remainingStock} ${r.unit}.`);
              break;
          }
        }
        if (confirmations.length > 0) {
          finalReply = confirmations.join('\n\n');
        }
      }

      return res.status(200).json({
        success: true,
        source: 'GEMINI_AI',
        reply: finalReply,
        action: batchResults.length > 0 ? {
          type: batchResults.length === 1 ? batchResults[0].type : 'BATCH_ACTIONS',
          actions: batchResults
        } : null,
        suggestions: parsed.suggestions || ['Check inventory', "Today's sales", 'Latest mandi rates']
      });

    } catch (geminiError) {
      console.error('[Gemini AI] Chat error:', geminiError.message);

      return res.status(200).json({
        success: true,
        source: 'FALLBACK_MUNSHI',
        reply: `I'm right here! Ask me to list cheap commodities, check mandi rates, set price alerts, update prices, or review profits anytime!`,
        action: null,
        suggestions: ['List top 10 cheap products', 'Check mandi rates', 'What products are available']
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

module.exports = {
  handleChat,
  findProductByName,
  executeStoreAction,
  parseDirectCommands
};
