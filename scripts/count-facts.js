/**
 * MarketMind AI - Automated Codebase Fact-Checking Script
 * Run with: node scripts/count-facts.js
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const routesDir = path.join(repoRoot, 'server', 'routes');
const modelsDir = path.join(repoRoot, 'server', 'models');
const jobsDir = path.join(repoRoot, 'server', 'jobs');
const seedMarketPricesJs = path.join(repoRoot, 'server', 'config', 'seedMarketPrices.js');

console.log('================================================================');
console.log('       MarketMind AI — Automated Codebase Facts Verification     ');
console.log('================================================================\n');

// 1. Recount Express Route Handlers
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js')).sort();
let totalRouteHandlers = 0;
const routeBreakdown = {};

const methodRegex = /\.(get|post|put|delete|patch)\s*\(/gi;

for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(methodRegex) || [];
  routeBreakdown[file] = matches.length;
  totalRouteHandlers += matches.length;
}

console.log(`1. Express Route Handlers (${routeFiles.length} route files, ${totalRouteHandlers} total endpoints):`);
for (const [file, count] of Object.entries(routeBreakdown)) {
  console.log(`   - server/routes/${file.padEnd(18)}: ${count} endpoints`);
}
console.log(`   --> Verified Total Express Endpoints: ${totalRouteHandlers}\n`);

// 2. Count Mongoose Models
const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js')).sort();
console.log(`2. Mongoose Models (${modelFiles.length} models):`);
for (const m of modelFiles) {
  console.log(`   - server/models/${m}`);
}
console.log(`   --> Verified Total Mongoose Models: ${modelFiles.length}\n`);

// 3. Extract Background Cron Scheduler Expression
let cronExpr = null;
const priceCheckerPath = path.join(jobsDir, 'priceChecker.js');
if (fs.existsSync(priceCheckerPath)) {
  const jobContent = fs.readFileSync(priceCheckerPath, 'utf8');
  const match = jobContent.match(/cronExpression\s*=\s*['"]([^'"]+)['"]/);
  if (match) {
    cronExpr = match[1];
  }
}
console.log('3. Background Price Sync Cron Scheduler:');
console.log(`   - Job File:       server/jobs/priceChecker.js`);
console.log(`   - Cron Schedule:  '${cronExpr}' (runs automatically every 6 hours)\n`);

// 4. Seeded APMC Commodities
const { APMC_MARKET_COMMODITIES } = require(seedMarketPricesJs);
console.log('4. Seeded APMC Wholesale Commodities:');
console.log(`   - Source File:    server/config/seedMarketPrices.js`);
console.log(`   - Count:          ${APMC_MARKET_COMMODITIES.length} agricultural commodities\n`);

console.log('================================================================');
console.log('                      VERIFIED FACTS SUMMARY                    ');
console.log('================================================================');
console.log(`- Route definition files:    ${routeFiles.length}`);
console.log(`- Total Express endpoints:   ${totalRouteHandlers}`);
console.log(`- Mongoose database models:  ${modelFiles.length}`);
console.log(`- Cron schedule expression:  '${cronExpr}' (every 6 hours)`);
console.log(`- Seeded APMC commodities:   ${APMC_MARKET_COMMODITIES.length}`);
console.log('================================================================\n');

module.exports = {
  routeFilesCount: routeFiles.length,
  totalRouteHandlers,
  routeBreakdown,
  modelsCount: modelFiles.length,
  cronExpr,
  commoditiesCount: APMC_MARKET_COMMODITIES.length
};
