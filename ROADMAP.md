# Scenario Cashflow — Roadmap & Decision Log

## Current Version: v1.4
Accounts worksheet page with spreadsheet-style stream management. Deployed to Replit.

---

## v1.3: Multi-Scenario + Navigation (COMPLETE)

### What was built
- **Navigation shell** — top nav bar with "Forecast" active and "Worksheet" placeholder
- **N decisions per baseline** — create, edit, delete multiple decision scenarios
- **Toggle decisions on/off** — checkbox to show/hide each decision on the chart
- **Multi-line chart** — each decision gets its own color; colors stable across toggles
- **Comparison table** — metrics table with one column per enabled decision, color-coded deltas
- **Collapsible decision cards** — expand/collapse to edit, color dot matching chart line
- **RESTful API** — `GET/PUT/DELETE /api/decisions/:id` endpoints replacing single-decision routes

### Architecture changes
- `App.tsx` manages `decisions: DecisionConfig[]` + `enabledDecisionIds: Set<string>`
- `useForecaster` returns `DecisionForecast[]` (one per enabled decision)
- Page extraction: `ForecastPage` handles layout, `App.tsx` handles state
- New components: `AppShell`, `ForecastPage`, `DecisionList`
- Updated components: `ForecastChart`, `MetricsPanel`, `DecisionPanel`
- DB schema: unchanged (already supported N decisions)
- Engine: unchanged (already scenario-agnostic)

---

## v1.4: Accounts Worksheet (COMPLETE)

### What was built
- **Accounts page** — spreadsheet-style view of all baseline streams, accessible via nav tab
- **Four categorized tables** — Income, Fixed Expenses, Variable Expenses, Transfers with column headers
- **Monthly normalization** — every stream shows a monthly equivalent regardless of actual frequency
- **Summary cards** — monthly income, expenses, transfers, and net cashflow at a glance
- **Quick-add rows** — inline name/amount/frequency entry at the bottom of each table for fast stream creation
- **Inline editing** — click Edit to expand StreamEditor within the table row
- **Click-to-edit balances** — starting checking, savings, and safety buffer are editable inline
- **Shared state** — uses the same baseline streams and handlers as Forecast page; edits auto-save and affect forecasts immediately

### Architecture changes
- New page: `WorksheetPage` with `EditableBalance` and `WorksheetTable` sub-components
- `AppShell` "Accounts" tab now active (was disabled placeholder)
- `App.tsx` renders `WorksheetPage` when `activePage === 'worksheet'`, passing baseline + stream handlers
- No new data model — reuses existing `CashStream` and `ScenarioConfig`
- No backend changes — streams already persisted via existing baseline API
- Built in Replit directly by Andrew

---

## Future Phases (not yet planned in detail)

### Phase 2: Balance Tracking
- Record actual account balances over time (separate from forecast streams)
- Separate data model from forecasting
- Possible: overlay actuals vs forecast on the chart

### Phase 3: Transaction Importing
- Import transactions from bank/CSV
- Auto-categorize against existing streams
- Reconcile actuals vs forecast

---

## Decision Log

| Date       | Decision | Reasoning |
|------------|----------|-----------|
| 2026-02-23 | Multi-scenario before balance tracking | Forecasting is the core value; tracking needs its own data model |
| 2026-02-23 | Add navigation shell now | Makes the app extensible without rearchitecting later |
| 2026-02-23 | Skip tests for now | Personal informational tool; not making critical decisions off it |
| 2026-02-23 | Keep engine in browser | No reason to move computation server-side; keeps backend simple |
| 2026-02-23 | No React Router — state-based page switcher | Only 2-3 pages; avoids new dependency |
| 2026-02-23 | Toggle visibility is client-only (not persisted) | Ephemeral UI preference; simpler, no DB change needed |
| 2026-02-23 | Colors assigned by position in full decisions array | Stable colors when toggling — decision X always same color |
| 2026-02-23 | RESTful per-decision endpoints | Clean break from destructive "delete all" pattern; safer for N decisions |
| 2026-02-23 | Accounts page reuses CashStream model | No new data model needed — streams are streams whether viewed as a list or spreadsheet |
| 2026-02-23 | Quick-add rows for fast entry | Reduces friction vs opening a full stream editor for simple items |
| 2026-02-23 | Local dev with PostgreSQL + process.loadEnvFile() | Node 22 built-in; no dotenv dependency needed |
