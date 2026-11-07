/**
 * Copilot Benchmark Suite: 10,000 Prompts Evaluation
 * Measures throughput, latency (mean & p95), accuracy, and parser coverage.
 * Run with: node server/tests/benchmarkCopilot.js
 */

const { performance } = require('perf_hooks');
const { parseDirectCommands } = require('../utils/commandParser');
const { APMC_MARKET_COMMODITIES } = require('../config/seedMarketPrices');

// Seeded pseudorandom generator (Mulberry32) for reproducible synthetic prompts
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(42);

function pick(arr) {
  return arr[Math.floor(random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

// Generate products catalog from seed commodities
const products = APMC_MARKET_COMMODITIES.map((c, i) => ({
  _id: 'prod_' + (i + 1),
  name: c.commodity,
  category: 'Commodities',
  unit: 'kg',
  purchaseCost: c.pricePerKg,
  sellingPrice: Math.round(c.pricePerKg * 1.15)
}));

const commodities = APMC_MARKET_COMMODITIES.map(c => c.commodity);

// Commodity typos for category 4
const typoMap = {
  'Sugar': 'suger',
  'Rice': 'rise',
  'Wheat': 'weat',
  'Potato': 'aloo',
  'Onion': 'pyaz'
};

function generatePrompts(totalCount = 10000) {
  const perCategory = Math.floor(totalCount / 10);
  const benchmark = [];

  // 1. Numeric Purchases
  for (let i = 0; i < perCategory; i++) {
    const c = pick(commodities);
    const qty = randInt(5, 500);
    const price = randInt(10, 200);
    const template = pick([
      `buy ${qty}kg ${c} at ${price}rs`,
      `restock ${qty}kg ${c} at ${price}`,
      `purchase ${qty}kg ${c} for ${price}rs`,
      `order ${qty}kg ${c} at ${price} rupees`,
      `buy ${qty} quintal ${c} at ${price}`
    ]);
    benchmark.push({
      category: 'numeric_purchases',
      prompt: template,
      expected: ['RECORD_PURCHASE']
    });
  }

  // 2. APMC Market-Price Purchases
  for (let i = 0; i < perCategory; i++) {
    const c = pick(commodities);
    const qty = randInt(5, 500);
    const template = pick([
      `buy ${qty}kg ${c} at market price`,
      `restock ${qty}kg ${c} at mandi rate`,
      `purchase ${qty}kg ${c} at current rate`,
      `order ${qty}kg ${c} at modal rate`,
      `buy ${qty}kg ${c} at market rate`
    ]);
    benchmark.push({
      category: 'market_price_purchases',
      prompt: template,
      expected: ['RECORD_PURCHASE']
    });
  }

  // 3. Direct Retail Sales
  for (let i = 0; i < perCategory; i++) {
    const c = pick(commodities);
    const qty = randInt(1, 100);
    const price = randInt(15, 300);
    const template = pick([
      `sell ${qty}kg ${c} at ${price}rs`,
      `sold ${qty}kg ${c} for ${price}`,
      `bill ${qty}kg ${c} at ${price}rs`,
      `record sale of ${qty}kg ${c} at ${price}`,
      `sell ${qty}kg ${c} for ${price} rupees`
    ]);
    benchmark.push({
      category: 'direct_retail_sales',
      prompt: template,
      expected: ['RECORD_SALE']
    });
  }

  // 4. Price Updates (including typos)
  for (let i = 0; i < perCategory; i++) {
    const baseC = pick(commodities);
    const c = (typoMap[baseC] && random() > 0.5) ? typoMap[baseC] : baseC;
    const price = randInt(20, 400);
    const template = pick([
      `set selling price of ${c} to ${price}rs`,
      `update price for ${c} to ${price}`,
      `change rate of ${c} to ${price}rs`,
      `selling price of ${c} is ${price}rs`,
      `set selling at ${price}rs for ${c}`,
      `update selling price of ${c} to ${price}`
    ]);
    benchmark.push({
      category: 'price_updates',
      prompt: template,
      expected: ['UPDATE_PRICE']
    });
  }

  // 5. Volatility Alerts
  for (let i = 0; i < perCategory; i++) {
    const c = pick(commodities);
    const price = randInt(20, 300);
    const template = pick([
      `set alert for ${c} when price crosses ${price}rs`,
      `alert if ${c} drops below ${price}`,
      `create alert for ${c} at ${price}rs`,
      `set price alert for ${c} at ${price}`,
      `notify when ${c} crosses ${price}rs`,
      `set alert for ${c} at ${price}rs`
    ]);
    benchmark.push({
      category: 'volatility_alerts',
      prompt: template,
      expected: ['CREATE_ALERT']
    });
  }

  // 6. Compound 3-Clause Sentences
  for (let i = 0; i < perCategory; i++) {
    const c = pick(commodities);
    const qty = randInt(10, 200);
    const sellPrice = randInt(30, 250);
    const alertPrice = randInt(25, 240);
    const template = pick([
      `buy ${qty}kg ${c} at market price and set selling at ${sellPrice}rs and set alert at ${alertPrice}rs`,
      `restock ${qty}kg ${c} at mandi rate and update price to ${sellPrice}rs and set alert at ${alertPrice}rs`,
      `purchase ${qty}kg ${c} at market price and set selling at ${sellPrice} and alert when crosses ${alertPrice}rs`,
      `buy ${qty}kg ${c} at market price, set selling at ${sellPrice}rs, and set alert at ${alertPrice}rs`
    ]);
    benchmark.push({
      category: 'compound_3_clause',
      prompt: template,
      expected: ['RECORD_PURCHASE', 'UPDATE_PRICE', 'CREATE_ALERT']
    });
  }

  // 7. Wholesale Price Queries
  for (let i = 0; i < perCategory; i++) {
    const c = pick(commodities);
    const template = pick([
      `what is market price of ${c}`,
      `mandi rate of ${c}`,
      `current price of ${c}`,
      `what is the market price of ${c}`,
      `how much is ${c}`,
      `price of ${c}`,
      `rate of ${c}`,
      `current market price of ${c}`
    ]);
    benchmark.push({
      category: 'wholesale_price_queries',
      prompt: template,
      expected: ['PRICE_QUERY']
    });
  }

  // 8. Stock Checks
  for (let i = 0; i < perCategory; i++) {
    const c = pick(commodities);
    const template = pick([
      `check stock of ${c}`,
      `how much ${c} in stock`,
      `how much ${c} left`,
      `how much ${c} do i have`,
      `inventory of ${c}`,
      `stock of ${c}`
    ]);
    benchmark.push({
      category: 'stock_checks',
      prompt: template,
      expected: ['STOCK_QUERY']
    });
  }

  // 9. "List Available Products"
  for (let i = 0; i < perCategory; i++) {
    const template = pick([
      'what are the products available',
      'what products are available',
      'what can i buy',
      'list all products',
      'show catalog',
      'what do we have',
      'what do you sell',
      'what commodities available',
      'view catalog',
      'list products'
    ]);
    benchmark.push({
      category: 'list_available_products',
      prompt: template,
      expected: ['AVAILABLE_PRODUCTS_QUERY']
    });
  }

  // 10. Cheapest Products Queries
  for (let i = 0; i < perCategory; i++) {
    const limit = pick([5, 10, 15, 20]);
    const template = pick([
      `list the top ${limit} cheap products`,
      `top ${limit} cheap products`,
      'cheapest products',
      'saste products',
      'lowest price commodities',
      'cheap items',
      `show top ${limit} cheapest products`
    ]);
    benchmark.push({
      category: 'cheapest_products_queries',
      prompt: template,
      expected: ['TOP_CHEAP_QUERY']
    });
  }

  return benchmark;
}

async function runGeminiSample(apiKey) {
  if (!apiKey) {
    return null;
  }
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const sampleCommands = [
      'buy 50kg sugar at market price and set selling at 55rs',
      'what is the market price of potato',
      'check stock of rice',
      'sell 10kg wheat at 35rs',
      'set alert for onion at 40rs'
    ];

    const latencies = [];
    console.log('\n[Gemini Benchmark] Timing 20 real Gemini calls for latency comparison...');
    for (let i = 0; i < 20; i++) {
      const cmd = sampleCommands[i % sampleCommands.length];
      const start = performance.now();
      await model.generateContent(`Parse this merchant command: "${cmd}"`);
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
    }

    latencies.sort((a, b) => a - b);
    const median = latencies[Math.floor(latencies.length / 2)];
    return {
      count: 20,
      medianMs: median,
      minMs: latencies[0],
      maxMs: latencies[latencies.length - 1]
    };
  } catch (err) {
    console.warn('[Gemini Benchmark] API timing failed:', err.message);
    return null;
  }
}

async function runBenchmark() {
  console.log('================================================================');
  console.log('      MarketMind AI Copilot Benchmark — 10,000 Prompts Evaluation ');
  console.log('================================================================\n');

  const dataset = generatePrompts(10000);
  const totalPrompts = dataset.length;

  const latencies = new Float64Array(totalPrompts);
  const categoryStats = {};
  const failuresByCategory = {};

  let passCount = 0;
  const benchmarkStart = performance.now();

  for (let i = 0; i < totalPrompts; i++) {
    const item = dataset[i];
    const cat = item.category;
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, passed: 0 };
    }
    categoryStats[cat].total++;

    const t0 = performance.now();
    const result = parseDirectCommands(item.prompt, products);
    const t1 = performance.now();
    latencies[i] = t1 - t0;

    // Check pass condition
    let passed = false;
    if (result && Array.isArray(result) && result.length === item.expected.length) {
      passed = item.expected.every((exp, idx) => result[idx] && result[idx].action === exp);
    }

    if (passed) {
      passCount++;
      categoryStats[cat].passed++;
    } else {
      if (!failuresByCategory[cat]) failuresByCategory[cat] = [];
      if (failuresByCategory[cat].length < 3) {
        failuresByCategory[cat].push({
          prompt: item.prompt,
          expected: item.expected,
          actual: result ? result.map(r => r.action) : null
        });
      }
    }
  }

  const benchmarkEnd = performance.now();
  const totalMs = benchmarkEnd - benchmarkStart;
  const passRate = ((passCount / totalPrompts) * 100).toFixed(2);
  const meanMs = (totalMs / totalPrompts).toFixed(4);

  // Compute p95 latency
  const sortedLatencies = Array.from(latencies).sort((a, b) => a - b);
  const p95Index = Math.floor(totalPrompts * 0.95);
  const p95Ms = sortedLatencies[p95Index].toFixed(4);

  console.log('----------------------------------------------------------------');
  console.log(`Total Prompts:      ${totalPrompts.toLocaleString()}`);
  console.log(`Passed:             ${passCount.toLocaleString()} / ${totalPrompts.toLocaleString()} (${passRate}%)`);
  console.log(`Total Execution:    ${totalMs.toFixed(2)} ms (${(totalMs / 1000).toFixed(3)} s)`);
  console.log(`Mean Latency:       ${meanMs} ms/prompt (~${(parseFloat(meanMs) * 1000).toFixed(1)} µs)`);
  console.log(`P95 Latency:        ${p95Ms} ms/prompt`);
  console.log('----------------------------------------------------------------\n');

  console.log('Category Breakdown:');
  for (const [cat, stats] of Object.entries(categoryStats)) {
    const rate = ((stats.passed / stats.total) * 100).toFixed(1);
    console.log(`  - ${cat.padEnd(28)}: ${stats.passed}/${stats.total} passed (${rate}%)`);
  }

  const failedCategories = Object.keys(failuresByCategory);
  if (failedCategories.length > 0) {
    console.log('\nFailure Samples (up to 3 per category):');
    for (const cat of failedCategories) {
      console.log(`  Category [${cat}]:`);
      for (const f of failuresByCategory[cat]) {
        console.log(`    Prompt:   "${f.prompt}"`);
        console.log(`    Expected: [${f.expected.join(', ')}]`);
        console.log(`    Actual:   ${f.actual ? '[' + f.actual.join(', ') + ']' : 'null'}`);
      }
    }
  } else {
    console.log('\nZero failures across all 10,000 synthetic test prompts (100% Pass Rate).');
  }

  // Gemini Latency Check
  const geminiResult = await runGeminiSample(process.env.GEMINI_API_KEY);
  if (geminiResult) {
    const speedup = Math.round(geminiResult.medianMs / parseFloat(meanMs));
    console.log(`\nGemini Median Latency: ${geminiResult.medianMs.toFixed(1)} ms (over 20 calls)`);
    console.log(`Deterministic Parser Speedup: ~${speedup.toLocaleString()}x faster than Gemini API`);
  } else {
    console.log('\nGemini latency: not measured (GEMINI_API_KEY unset or not provided)');
  }

  console.log('\n================================================================');

  return {
    totalPrompts,
    passCount,
    passRate: parseFloat(passRate),
    totalMs,
    meanMs: parseFloat(meanMs),
    p95Ms: parseFloat(p95Ms),
    categoryStats,
    failuresByCategory,
    geminiResult
  };
}

if (require.main === module) {
  runBenchmark()
    .then(stats => {
      process.exit(stats.passRate >= 99.0 ? 0 : 1);
    })
    .catch(err => {
      console.error('Benchmark execution failed:', err);
      process.exit(1);
    });
}

module.exports = { runBenchmark, generatePrompts };
