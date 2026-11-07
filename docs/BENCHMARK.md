# MarketMind AI Copilot Benchmark

## Overview
This benchmark evaluates the deterministic command parsing engine (`server/utils/commandParser.js`) of the MarketMind AI Copilot. The deterministic parser processes merchant operations—including purchase orders, pricing adjustments, inventory inquiries, Mandi rate lookups, and price alerts—without requiring network round-trips to an external LLM.

> **Honest Evaluation Note:** The prompts in this benchmark are synthetically generated from parameterized templates across 10 distinct operational categories using a fixed pseudorandom seed (Mulberry32). This measures parser coverage and throughput across known syntax and typo variations, not open-ended real-user conversational accuracy.

---

## Test Environment
- **Date:** November 7, 2026
- **Operating System:** Windows 11 (x64)
- **Node.js Runtime:** v26.3.0
- **Benchmark Script:** `server/tests/benchmarkCopilot.js`
- **Execution Command:** `npm run test:benchmark --prefix server`

---

## Measured Performance Numbers

| Metric | Measured Value |
|---|---|
| **Total Test Prompts** | **10,000** |
| **Pass Count** | **10,000 / 10,000** |
| **Pass Rate** | **100.00%** |
| **Total Benchmark Time** | **921.81 ms** (0.922 seconds) |
| **Mean Latency per Prompt** | **0.0922 ms** (~92.2 µs) |
| **P95 Latency** | **0.3709 ms** (~370.9 µs) |
| **Gemini API Latency** | *Not measured* (GEMINI_API_KEY not configured in test environment) |

---

## Category Breakdown (1,000 prompts each)

| Category | Passed / Total | Pass Rate | Primary Action |
|---|---|---|---|
| Numeric Purchases | 1,000 / 1,000 | 100.0% | `RECORD_PURCHASE` (Fixed Cost) |
| APMC Market-Price Purchases | 1,000 / 1,000 | 100.0% | `RECORD_PURCHASE` (Mandi Rate) |
| Direct Retail Sales | 1,000 / 1,000 | 100.0% | `RECORD_SALE` |
| Price Updates (incl. Typos) | 1,000 / 1,000 | 100.0% | `UPDATE_PRICE` |
| Volatility Alerts | 1,000 / 1,000 | 100.0% | `CREATE_ALERT` |
| Compound 3-Clause Sentences | 1,000 / 1,000 | 100.0% | `[PURCHASE, UPDATE, ALERT]` |
| Wholesale Price Queries | 1,000 / 1,000 | 100.0% | `PRICE_QUERY` |
| Stock Inquiries | 1,000 / 1,000 | 100.0% | `STOCK_QUERY` |
| Catalog / Available Products | 1,000 / 1,000 | 100.0% | `AVAILABLE_PRODUCTS_QUERY` |
| Cheapest Products Queries | 1,000 / 1,000 | 100.0% | `TOP_CHEAP_QUERY` |

---

## Reproducibility
To reproduce these benchmark measurements independently on any system:

### Bash
```bash
cd server
npm run test:benchmark
```

### PowerShell
```powershell
Set-Location server
npm run test:benchmark
```
