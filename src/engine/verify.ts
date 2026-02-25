/**
 * Engine verification script.
 *
 * Tests the forecast engine with data modeled on Andrew's actual
 * spreadsheet to verify the math is correct. This file is for
 * development only — not part of the production app.
 *
 * Run via: npx tsx src/engine/verify.ts
 */

import { forecast } from './forecast';
import { applyDecision } from './decision';
import { compareScenarios } from './compare';
import type { ScenarioConfig, DecisionConfig } from './types';

// Baseline scenario modeled on Andrew's spreadsheet
const baseline: ScenarioConfig = {
  id: 'baseline-test',
  name: 'Current Baseline',
  startDate: '2026-01-30',
  endDate: '2026-04-30', // 3 months for quick verification
  checkingBalance: 2317.15, // From spreadsheet: Jan 30 starting checking
  savingsBalance: 10006.3, // From spreadsheet: savings balance
  safetyBuffer: 3000, // Comfortable minimum in checking
  accounts: [],
  streams: [
    // === INCOME ===
    {
      id: 'andrew-pay',
      name: "Andrew's Pay",
      amount: 4350,
      type: 'income',
      frequency: 'biweekly',
      account: 'checking',
      startDate: '2026-01-30',
      anchorDate: '2026-02-12', // Known payday from spreadsheet
    },
    {
      id: 'julie-pay',
      name: "Julie's Pay",
      amount: 2300,
      type: 'income',
      frequency: 'biweekly',
      account: 'checking',
      startDate: '2026-01-30',
      anchorDate: '2026-02-05', // Known payday from spreadsheet
    },

    // === FIXED EXPENSES ===
    {
      id: 'mortgage',
      name: 'Mortgage',
      amount: 2700,
      type: 'expense',
      frequency: 'monthly',
      account: 'checking',
      startDate: '2026-01-30',
      dayOfMonth: 16,
    },
    {
      id: 'tesla',
      name: 'Tesla Payment',
      amount: 667,
      type: 'expense',
      frequency: 'monthly',
      account: 'checking',
      startDate: '2026-01-30',
      endDate: '2026-10-08', // Pays off Oct 2026
      dayOfMonth: 9,
    },
    {
      id: 'utilities',
      name: 'Utilities',
      amount: 600,
      type: 'expense',
      frequency: 'monthly',
      account: 'checking',
      startDate: '2026-01-30',
      dayOfMonth: 2,
    },
    {
      id: 'daycare',
      name: 'Daycare',
      amount: 1500,
      type: 'expense',
      frequency: 'monthly',
      account: 'checking',
      startDate: '2026-01-30',
      dayOfMonth: 1,
    },
    {
      id: 'phone',
      name: 'Phone',
      amount: 180,
      type: 'expense',
      frequency: 'monthly',
      account: 'checking',
      startDate: '2026-01-30',
      dayOfMonth: 5,
    },
    {
      id: 'cable',
      name: 'Cable/Internet',
      amount: 275,
      type: 'expense',
      frequency: 'monthly',
      account: 'checking',
      startDate: '2026-01-30',
      dayOfMonth: 10,
    },
    {
      id: 'house-cleaner',
      name: 'House Cleaner',
      amount: 249,
      type: 'expense',
      frequency: 'monthly',
      account: 'checking',
      startDate: '2026-01-30',
      dayOfMonth: 15,
    },

    // === INVESTMENTS (as transfers to savings for now) ===
    {
      id: 'investment',
      name: 'Investment Contribution',
      amount: 400,
      type: 'transfer',
      frequency: 'biweekly',
      account: 'checking',
      targetAccount: 'savings',
      startDate: '2026-01-30',
      anchorDate: '2026-02-05', // Matches Julie's payday cycle
    },
  ],
};

// Decision: What if we add a home equity loan for an addition?
const additionDecision: DecisionConfig = {
  id: 'decision-addition',
  name: 'Home Addition',
  baselineId: baseline.id,
  addStreams: [
    {
      id: 'heloc',
      name: 'Home Equity Loan',
      amount: 1500,
      type: 'expense',
      frequency: 'monthly',
      account: 'checking',
      startDate: '2026-03-01',
      dayOfMonth: 1,
    },
  ],
  removeStreamIds: [], // Not removing anything for this test
  modifyStreams: [],
  checkingBalanceAdjustment: -5000, // Upfront costs
};

// Run the forecasts
console.log('=== RUNNING ENGINE VERIFICATION ===\n');

const baselineResult = forecast(baseline);
const decisionConfig = applyDecision(baseline, additionDecision);
const decisionResult = forecast(decisionConfig);
const comparison = compareScenarios(
  baselineResult.metrics,
  decisionResult.metrics
);

// Print baseline results
console.log('--- BASELINE METRICS ---');
console.log(`Min Checking: $${baselineResult.metrics.minChecking.toLocaleString()} on ${baselineResult.metrics.minCheckingDate}`);
console.log(`Max Checking: $${baselineResult.metrics.maxChecking.toLocaleString()}`);
console.log(`Days Below Buffer ($${baseline.safetyBuffer}): ${baselineResult.metrics.daysCheckingBelowBuffer}`);
console.log(`Days Below Zero: ${baselineResult.metrics.daysCheckingBelowZero}`);
console.log(`Ending Checking: $${baselineResult.metrics.endingChecking.toLocaleString()}`);
console.log(`Ending Savings: $${baselineResult.metrics.endingSavings.toLocaleString()}`);
console.log(`Total Income: $${baselineResult.metrics.totalIncome.toLocaleString()}`);
console.log(`Total Expenses: $${baselineResult.metrics.totalExpenses.toLocaleString()}`);

// Print decision results
console.log('\n--- DECISION METRICS (Home Addition) ---');
console.log(`Min Checking: $${decisionResult.metrics.minChecking.toLocaleString()} on ${decisionResult.metrics.minCheckingDate}`);
console.log(`Days Below Buffer: ${decisionResult.metrics.daysCheckingBelowBuffer}`);
console.log(`Ending Checking: $${decisionResult.metrics.endingChecking.toLocaleString()}`);

// Print comparison
console.log('\n--- COMPARISON ---');
console.log(`Min Checking Delta: $${comparison.minCheckingDelta.toLocaleString()} (${comparison.minCheckingDelta >= 0 ? 'better' : 'worse'})`);
console.log(`Buffer Days Delta: ${comparison.bufferDaysDelta} days (${comparison.bufferDaysDelta > 0 ? 'more risky' : 'less risky'})`);
console.log(`Ending Balance Delta: $${comparison.endingBalanceDelta.toLocaleString()}`);

// Print a sample of daily snapshots to verify the pattern
console.log('\n--- FIRST 14 DAYS (Baseline) ---');
for (const day of baselineResult.daily.slice(0, 14)) {
  const txSummary = day.transactions.length > 0
    ? day.transactions.map(t => `${t.name}: ${t.amount >= 0 ? '+' : ''}$${t.amount.toLocaleString()}`).join(', ')
    : '(no transactions)';
  console.log(`${day.date}  Chk: $${day.checking.toLocaleString().padStart(10)}  Sav: $${day.savings.toLocaleString().padStart(10)}  | ${txSummary}`);
}
