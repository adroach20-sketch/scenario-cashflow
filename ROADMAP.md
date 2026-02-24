# Scenario Cashflow — Roadmap & Decision Log

## Current Version: v1.3
Multi-scenario support with navigation shell. Deployed to Replit.

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

## Future Phases (not yet planned in detail)

### Phase 2: Balance Tracking Worksheet
- YNAB-style page to record actual account balances over time
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
