# Scenario Cashflow Forecaster

## Project Overview
A full-stack daily cashflow forecaster that compares a baseline scenario against decision scenarios, showing how financial fragility changes over time.

## Status & Roadmap
See `ROADMAP.md` for current version, planned phases, and decision log.
- **Current:** v1.5 (scenarios wizard + multi-scenario management)
- **Next:** balance tracking (Phase 2)
- **Future:** transaction importing (Phase 3)

## Tech Stack
- **Frontend:** React 18 + TypeScript, Vite, Recharts, date-fns
- **Backend:** Express.js 5 + PostgreSQL (pg)
- **Deployment:** Replit (imported from GitHub)

## Architecture Rules
- `src/engine/` is **pure TypeScript** — NO React imports, NO server imports, NO side effects
- The forecasting engine runs in the **browser**, not on the server
- Server is only for storage (save/load scenarios)
- All storage goes through the `ScenarioStore` interface in `src/store/types.ts`
- Express 5 uses `{*splat}` syntax for catch-all routes (not `*`)

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

## App Structure (Three Tabs)
- **Accounts** (`WorksheetPage`) — spreadsheet-style stream management, account cards, quick-add
- **Scenarios** (`ScenariosPage`) — 3-step wizard (Decision → Accounts & Settings → Adjust Streams), scenario picker/switcher, import decisions from other scenarios
- **Forecast** (`ForecastPage`) — chart + metrics + decision toggles

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
