# Scenario Cashflow Forecaster

## Overview

A full-stack daily cashflow forecasting app for families making big financial decisions. Users define a baseline financial scenario (income, expenses, starting balances) and then create "What if?" decision scenarios (like taking out a loan for a home renovation) to see how their financial fragility changes over time. The app renders side-by-side daily balance charts with fragility metrics like lowest balance, days below safety buffer, and days below zero.

The forecasting engine is pure TypeScript that runs entirely in the browser — the server exists only for persistence (save/load scenarios via a REST API backed by PostgreSQL).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)

- **Framework:** React 19 with TypeScript, bundled by Vite 7
- **Styling:** Tailwind CSS 4 + shadcn/ui (Radix UI primitives), class-variance-authority, clsx, tailwind-merge
- **Icons:** lucide-react
- **Charting:** Recharts for the daily balance line chart (baseline vs decision overlay)
- **Date handling:** date-fns throughout
- **State management:** React useState/useMemo hooks — no external state library
- **Component structure:** Focused single-responsibility components in `src/components/`:
  - `SetupPanel` — starting balances, date range, safety buffer
  - `StreamList` — CRUD for cash streams (income/expense/transfer)
  - `StreamEditor` — form for adding/editing a single stream
  - `AccountsSection` — account cards (checking, savings, credit card, loan, investment) with inline editing
  - `DecisionPanel` — define modifications to baseline (add/remove/modify streams, adjust balances)
  - `ForecastChart` — Recharts visualization
  - `MetricsPanel` — summary metric cards with delta indicators
- **Layout:** YNAB-inspired indigo sidebar (`AppShell`) with navigation links and account balances grouped by type (CASH, CREDIT, LOANS, INVESTMENTS)
- **UI components:** `src/components/ui/` — shadcn/ui library (button, card, input, label, table, checkbox, dialog, alert-dialog, badge, form-field)
- **Utilities:** `src/lib/utils.ts` — `cn()` helper for conditional Tailwind class merging
- **Pages:** `src/pages/` — three views via sidebar navigation:
  - `WorksheetPage` (Cash Flow) — accounts management + income/expense/transfer tables with quick-add rows, editable balances and dates
  - `ScenariosPage` (Scenarios) — flat tab-based workflow with `ScenarioTabs` for switching/creating/deleting scenarios, decision list, stream toggle/override, import from previous scenario
  - `ForecastPage` (Forecast) — results-only view: scenario bar showing current scenario + decisions, collapsible summary, chart (ForecastChart), and metrics table (MetricsPanel); "Edit Scenario" button navigates back to Scenarios

### Forecasting Engine (`src/engine/`)

- **Critical rule:** This directory is pure TypeScript — NO React imports, NO server imports, NO side effects
- **Entry point:** `src/engine/index.ts` re-exports everything; consumers should import from `'./engine'` only
- **Core modules:**
  - `types.ts` — All type definitions (CashStream, ScenarioConfig, DecisionConfig, ForecastResult, etc.)
  - `forecast.ts` — Day-by-day simulation: iterates over date range, checks each stream, applies transactions, records snapshots
  - `schedule.ts` — Date math for recurrence patterns (weekly, biweekly, semimonthly, monthly, one-time)
  - `decision.ts` — Applies a DecisionConfig to a baseline (remove streams, modify streams, add streams, adjust balances)
  - `compare.ts` — Computes delta metrics between baseline and decision forecasts
  - `calc.ts` — Safe math expression evaluator (powers `CalculatorInput` for inline math in amount fields)
  - `loan.ts` — Amortization/monthly payment calculator for financing decisions
  - `verify.ts` — Development-only verification script (`npx tsx src/engine/verify.ts`)
- **Key design:** Engine runs in the browser via the `useForecaster` hook, which memoizes results and recalculates on input changes

### Storage Layer

- **Interface:** `ScenarioStore` in `src/store/types.ts` — abstract interface for persistence
- **Active implementation:** `src/store/apiClient.ts` — HTTP client that talks to the Express API
- **Legacy implementation:** `src/store/localStorage.ts` — browser localStorage (kept as fallback, not currently active)
- **Pattern:** All storage access goes through the `ScenarioStore` interface, making backend swaps trivial

### Backend (Express 5 + PostgreSQL)

- **Server entry:** `server/index.ts` — Express app, initializes DB, registers routes, serves static files in production
- **Database:** `server/db.ts` — PostgreSQL connection via `pg` Pool, connects using `DATABASE_URL` environment variable, creates tables on startup (idempotent)
- **Routes:** `server/routes.ts` — REST API:
  - `GET /api/scenarios` — list all scenarios (id, name, updatedAt)
  - `GET /api/scenarios/:id` — load a full scenario with streams/accounts
  - `PUT /api/scenarios/:id` — upsert a scenario (ON CONFLICT, preserves decisions)
  - `DELETE /api/scenarios/:id` — delete a scenario and its decisions
  - `GET /api/baseline` — load most recent scenario (backward compat)
  - `PUT /api/baseline` — upsert scenario (backward compat)
  - `GET /api/decisions` — all decisions
  - `GET /api/decisions/scenario/:scenarioId` — decisions for a specific scenario
  - `PUT /api/decisions/:id` — upsert a decision
  - `DELETE /api/decisions/:id` — delete a decision
  - `DELETE /api/data` — clear all data
- **Express 5 note:** Uses `{*splat}` syntax for catch-all routes (not `*`)
- **Database schema:** Tables include `scenarios`, `streams`, `accounts`, `decisions`, `decision_add_streams`, `decision_remove_streams`, `decision_modify_streams`

### Build & Dev

- **Dev mode:** `npm run dev` runs Vite (port 5173) and Express (port 3001) concurrently via `concurrently`; Vite proxies `/api` to Express
- **Production build:** `npm run build` compiles frontend to `dist/` and server to `dist-server/`; `npm start` runs Express serving both API and static files
- **TypeScript configs:** Three separate tsconfig files — `tsconfig.app.json` (frontend), `tsconfig.node.json` (Vite config), `tsconfig.server.json` (Express server compiles to `dist-server/`)

### Key Concepts / Domain Model

- **Account:** A financial account (checking, savings, credit card, loan, investment) with balance and optional debt fields (interestRate, minimumPayment, creditLimit)
- **CashStream:** A recurring or one-time money flow (income, expense, or transfer between accounts)
- **ScenarioConfig:** Starting balances + accounts + array of streams + date range = complete scenario input. Checking/savings balances on ScenarioConfig are synced from the accounts array for backward compatibility with the forecast engine. Includes `disabledStreamIds` (streams toggled off) and `streamOverrides` (temporary amount overrides for what-if modeling).
- **DecisionConfig:** Modifications to a baseline — add streams, remove streams, modify streams, adjust balances
- **ForecastResult:** Array of DailySnapshots + ForecastMetrics summary
- **ComparisonMetrics:** Deltas between baseline and decision (min balance delta, buffer days delta, ending balance delta)
- **Multi-scenario:** Users can save multiple named scenarios and switch between them via a dropdown on the Forecast page. Each scenario has its own accounts, streams, and decisions.
- **Import as stream:** Users can import a decision from a previous scenario as a net monthly impact stream (calculates the combined monthly effect of added/removed streams and creates a single income or expense stream)

## External Dependencies

### Database
- **PostgreSQL** via the `pg` npm package, connected through the `DATABASE_URL` environment variable (provided by Replit)
- Tables are auto-created on server startup if they don't exist
- Note: The `dist-server/` directory contains stale compiled code that references `better-sqlite3` (an older SQLite implementation). The active server source in `server/` uses PostgreSQL. If the dist-server files cause issues, rebuild with `npm run build`.

### NPM Packages (Runtime)
- `express` (v5) — HTTP server
- `pg` (v8) — PostgreSQL client
- `react` / `react-dom` (v19) — UI framework
- `tailwindcss` (v4) — utility-first CSS framework
- `@radix-ui/*` — accessible UI primitives (via shadcn/ui)
- `class-variance-authority`, `clsx`, `tailwind-merge` — variant/class utilities for shadcn components
- `lucide-react` — icon library
- `recharts` (v3) — charting library
- `date-fns` (v4) — date manipulation
- `uuid` (v13) — unique ID generation

### NPM Packages (Dev)
- `vite` (v7) + `@vitejs/plugin-react` — frontend bundler
- `tsx` — TypeScript execution for server in dev
- `concurrently` — run multiple dev processes
- `typescript` (~5.9) — type checking
- `eslint` + plugins — linting

### No Other External Services
- No authentication system
- No third-party APIs
- No email/notification services
- Single-user app (no multi-tenancy)