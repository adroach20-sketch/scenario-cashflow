# Scenario Cashflow — Roadmap & Decision Log

## Current Version: v1.6
UI redesign (Tailwind + shadcn/ui + sidebar) with calculator features. Deployed to Replit.

---

## v1.5: Scenarios Wizard + Multi-Scenario Management (COMPLETE)

### What was built
- **Scenarios page** — dedicated tab with a 3-step wizard flow (Decision → Accounts & Settings → Adjust Streams)
- **Scenario picker** — switch between scenarios, rename inline, create new, delete
- **Import from previous scenario** — modal to browse other scenarios' decisions and import their net impact as a stream in the current scenario
- **Stream toggle/override in wizard** — toggle streams on/off and override amounts directly from the wizard's step 3
- **Save error banner** — visible error state when auto-save fails
- **Bug fixes** — scenario validation, safe JSON parsing, zero-value input bug, input validation hardening

### Architecture changes
- New page: `ScenariosPage` with wizard steps and `ImportModal` sub-component
- New component: `StreamToggleList` for stream toggling/overriding in the wizard
- `App.tsx` manages `scenarioList: ScenarioSummary[]` state, `loadScenario()` and `refreshScenarioList()` helpers
- `ScenarioStore` interface expanded: `listScenarios()`, `getScenario(id)`, `saveScenario()`, `deleteScenario()`, `getDecisionsForScenario(scenarioId)`
- Auto-save now calls `saveScenario()` (not `saveBaseline()`), refreshes scenario list after save
- Three-tab navigation: Accounts → Scenarios → Forecast
- `server/routes.ts` expanded with full scenarios CRUD and per-scenario decision filtering
- Built in Replit by Andrew

---

## v1.6: UI Redesign + Calculator Features (COMPLETE)

### What was built
- **Tailwind CSS 4 + shadcn/ui migration** — replaced 1,800+ lines of custom CSS (`App.css`) with Tailwind utility classes and Radix-based component primitives
- **YNAB-inspired sidebar layout** — indigo sidebar with navigation links and account balances grouped by type (CASH, CREDIT, LOANS, INVESTMENTS), replacing the top navigation bar
- **Tab rename** — "Accounts" → "Cash Flow" with emoji icons in nav
- **Flattened scenario workflow** — replaced 3-step wizard with a simpler tab-based interface using `ScenarioTabs`; new scenarios auto-create a first decision so users can start editing immediately
- **Expanded account types** — `FinancialAccountType` now includes checking, savings, credit-card, loan, and investment
- **Inline calculator** — amount fields support math expressions (e.g., `1200+350`), evaluated on blur via `CalculatorInput` component
- **Loan/amortization calculator** — `loan.ts` engine module calculates monthly payments from principal, rate, and term
- **shadcn component library** — 10 reusable UI components in `src/components/ui/` (button, card, input, label, table, checkbox, dialog, alert-dialog, badge, form-field)

### Architecture changes
- New engine modules: `calc.ts` (safe expression evaluator), `loan.ts` (amortization calculator)
- New components: `CalculatorInput`, `AccountsSection`, `ScenarioTabs`
- New UI library: `src/components/ui/` with shadcn/Radix primitives
- New utility: `src/lib/utils.ts` with `cn()` class merging helper
- `AppShell` switched from top-nav to sidebar grid layout (`grid-cols-[240px_1fr]`)
- Dependencies added: tailwindcss, @radix-ui/*, class-variance-authority, clsx, tailwind-merge, lucide-react, tw-animate-css
- React upgraded from 18 to 19.2

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
- No new data model — reuses existing `CashStream` and `ScenarioConfig`
- No backend changes — streams already persisted via existing baseline API

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
| 2026-02-24 | Scenarios page as a wizard | Guided flow reduces overwhelm for new users; wizard steps match mental model of building a scenario |
| 2026-02-24 | Import decisions from other scenarios | Lets users carry forward past decisions without re-entering; calculates net impact as a stream |
| 2026-02-24 | Scenario picker with inline rename | Switch/create/delete scenarios without leaving the page; rename in place for quick iteration |
| 2026-02-25 | Migrate to Tailwind CSS 4 + shadcn/ui | Design consistency via component primitives; faster iteration than custom CSS; Radix handles accessibility |
| 2026-02-25 | Sidebar navigation over top-nav | YNAB-like familiarity; sidebar has room for account balances and grouping; scales better than tabs |
| 2026-02-25 | Flatten wizard into tab-based workflow | Reduces clicks; simpler mental model; new scenarios auto-create a decision so users start editing immediately |
| 2026-02-25 | Expand account types beyond checking/savings | Real-world financial planning needs credit cards, loans, investments; sidebar groups them visually |
| 2026-02-25 | Add inline calculator and loan calculator | Reduces context-switching (no more external calculator app); loan calc makes financing decisions easier to model |
