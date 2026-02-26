# Scenario Cashflow Forecaster

## Project Overview
A full-stack daily cashflow forecaster that compares a baseline scenario against decision scenarios, showing how financial fragility changes over time.

## Status & Roadmap
See `ROADMAP.md` for current version, planned phases, and decision log.
- **Current:** v1.6 (UI redesign + calculator features)
- **Next:** balance tracking (Phase 2)
- **Future:** transaction importing (Phase 3)

## Tech Stack
- **Frontend:** React 19 + TypeScript, Vite, Tailwind CSS 4, shadcn/ui (Radix UI primitives), Recharts, date-fns, lucide-react
- **UI utilities:** clsx, tailwind-merge, class-variance-authority
- **Backend:** Express.js 5 + PostgreSQL (pg)
- **Deployment:** Replit (imported from GitHub)

## Architecture Rules
- `src/engine/` is **pure TypeScript** — NO React imports, NO server imports, NO side effects
- The forecasting engine runs in the **browser**, not on the server
- Server is only for storage (save/load scenarios)
- All storage goes through the `ScenarioStore` interface in `src/store/types.ts`
- Express 5 uses `{*splat}` syntax for catch-all routes (not `*`)
- UI components use shadcn/ui patterns — `src/components/ui/` contains Radix-based primitives
- Use the `cn()` utility from `src/lib/utils.ts` for conditional class merging

## Server Structure
- `server/index.ts` — Express entry point, serves API + static files in prod
- `server/db.ts` — PostgreSQL database init, schema creation (connects via DATABASE_URL)
- `server/routes.ts` — API route handlers (scenarios CRUD, per-scenario decisions, legacy baseline endpoints)
- Database: PostgreSQL via `DATABASE_URL` env var (provided by Replit)

## Code Style
- TypeScript strict mode
- Functional components with hooks (no class components)
- Keep components focused — one responsibility per file
- Comments only for non-obvious logic

## Key Concepts
- **CashStream**: A recurring or one-time money flow (income, expense, or transfer)
- **ScenarioConfig**: Starting balances + streams = a complete scenario
- **DecisionConfig**: Modifications to a baseline (add/remove/change streams)
- **ForecastResult**: Daily snapshots + summary metrics
- **ScenarioSummary**: Lightweight scenario metadata (id, name, updatedAt) for listing/switching
- **Account**: A financial account with a `FinancialAccountType` (checking, savings, credit-card, loan, investment) and balance
- **AccountType**: Stream-level account reference (checking or savings — where money flows)
- **FinancialAccountType**: Broader account classification for sidebar grouping (CASH, CREDIT, LOANS, INVESTMENTS)

## App Layout
- **Sidebar** (`AppShell`) — YNAB-inspired indigo sidebar with navigation links and account balances grouped by type (CASH, CREDIT, LOANS, INVESTMENTS)
- Pages are selected via sidebar nav, not top tabs

## Pages (Three Views)
- **Cash Flow** (`WorksheetPage`) — spreadsheet-style stream management, account cards with `AccountsSection`, quick-add rows, editable balances and dates
- **Scenarios** (`ScenariosPage`) — flat tab-based workflow with `ScenarioTabs` for switching/creating/deleting scenarios, decision list, stream toggle/override, import from other scenarios
- **Forecast** (`ForecastPage`) — chart + metrics + decision toggles

## Engine Modules (`src/engine/`)
- `forecast.ts` — core daily forecasting loop
- `decision.ts` — decision application logic
- `compare.ts` — scenario comparison metrics
- `schedule.ts` — stream scheduling (frequency handling)
- `calc.ts` — safe math expression evaluator (powers `CalculatorInput`)
- `loan.ts` — amortization/monthly payment calculator
- `types.ts` — all shared type definitions
- `verify.ts` — data validation utilities

## Notable Components
- `src/components/ui/` — shadcn/ui component library (button, card, input, label, table, checkbox, dialog, alert-dialog, badge, form-field)
- `src/components/CalculatorInput.tsx` — amount field with inline math expression support
- `src/components/AccountsSection.tsx` — account management with type-aware grouping
- `src/components/StreamToggleList.tsx` — stream on/off toggles with amount overrides
- `src/components/DecisionList.tsx` — decision cards with expand/collapse editing

## ScenarioStore Interface
All storage goes through `ScenarioStore` in `src/store/types.ts`:
- `listScenarios()` / `getScenario(id)` / `saveScenario()` / `deleteScenario()` — full scenario CRUD
- `getDecisionsForScenario(scenarioId)` — decisions scoped to a scenario
- `getBaseline()` / `saveBaseline()` — legacy single-scenario endpoints (backward compat)
- `getDecisions()` / `saveDecision()` / `deleteDecision()` — decision management
- `clear()` — wipe all data

## Testing
- Engine can be tested independently of UI
- Use Andrew's real financial data patterns for verification:
  - Biweekly pay: $4,350 (Andrew) and $2,300 (Julie)
  - Monthly mortgage: $2,700 on the 16th
  - Tesla: $667/mo, ends Oct 2026
