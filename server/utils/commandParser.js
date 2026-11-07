/**
 * Deterministic Natural Language Command Parser for MarketMind Copilot
 * Pure functions: No DB, No Express, No external API calls.
 */

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
const parseDirectCommands = (rawMessage, products = []) => {
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
  if (
    !/\b(?:buy|bought|purchase|restock|order|sell|selling|sold|set|update|change|create|alert|notify)\b/i.test(normalized) &&
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
      !/\b(?:alert|notify|alarm)\b/i.test(clause) &&
      (/\b(?:set\s*selling|selling\s*at|set\s*price|update\s*price|change\s*price|selling\s*price|price\s*to|price\s*at|rate\s*to|rate\s*at)\b/i.test(clause) ||
      (/\b(?:set|update|change|make)\b/i.test(clause) && /\b(?:selling|price|rate)\b/i.test(clause)))
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
    if (/\b(?:sell|sold|record\s*sale|bill(?:ed)?)\b/i.test(clause) && !/\b(?:set\s*selling|selling\s*price|selling\s*at)\b/i.test(clause)) {
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

module.exports = {
  normalizeCommodityText,
  levenshteinDistance,
  escapeRegex,
  findProductByName,
  parseDirectCommands
};
