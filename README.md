# Scenario Cashflow Forecaster

A decision simulator for families making big financial decisions. Forecasts daily cash flow, compares scenarios, and visualizes financial fragility.

## What It Does

Enter your income, expenses, and starting balances to create a baseline forecast. Then create a "What if?" decision (like adding a home equity loan for a renovation) and instantly see how your cash flow changes over time.

**Key features:**
- Daily cash flow forecasting (not monthly averages)
- Side-by-side scenario comparison
- Fragility metrics: lowest balance, days below safety buffer
- Real-time chart updates as you edit

## Running Locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Tech Stack

- React + TypeScript (Vite)
- Recharts for charts
- date-fns for date math
- Pure TypeScript forecasting engine (no UI dependencies)
