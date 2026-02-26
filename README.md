# Scenario Cashflow Forecaster

A decision simulator for families making big financial decisions. Forecasts daily cash flow, compares scenarios, and visualizes financial fragility.

## What It Does

Enter your income, expenses, and starting balances to create a baseline forecast. Then create a "What if?" decision (like adding a home equity loan for a renovation) and instantly see how your cash flow changes over time.

**Key features:**
- Daily cash flow forecasting (not monthly averages)
- Multiple scenarios with create/switch/delete
- Tab-based scenario builder with decision management
- Side-by-side decision comparison with multi-line chart
- Cash flow worksheet with spreadsheet-style stream management
- Multiple account types: checking, savings, credit cards, loans, investments
- Inline calculator in amount fields (e.g., type `1200+350`)
- Loan/financing calculator — enter principal, rate, and term to auto-calculate payments
- Import decisions from previous scenarios
- Fragility metrics: lowest balance, days below safety buffer
- Real-time chart updates as you edit
- YNAB-inspired sidebar with account balance overview

## Running Locally

```bash
npm install
npm run dev
```

This starts both the Vite dev server (http://localhost:5173) and the Express API server (port 3001). The Vite proxy forwards `/api` requests to Express automatically.

## Production Build

```bash
npm run build
npm start
```

Builds the React frontend to `dist/` and compiles the server to `dist-server/`. The `start` command runs Express on port 3001, serving both the API and the built frontend.

## Tech Stack

- **Frontend:** React 19 + TypeScript (Vite), Tailwind CSS 4, shadcn/ui, Recharts, date-fns
- **Backend:** Express.js 5, PostgreSQL (pg)
- **Engine:** Pure TypeScript forecasting engine (runs in browser, no server dependency)
