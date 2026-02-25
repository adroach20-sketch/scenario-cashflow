/**
 * Core forecasting engine.
 *
 * Takes a ScenarioConfig and produces a day-by-day simulation of account
 * balances, plus summary metrics. This is the heart of the app.
 *
 * Pure function: no side effects, no UI dependencies, no server dependencies.
 */

import { parseISO, addDays, differenceInCalendarDays } from 'date-fns';
import type {
  ScenarioConfig,
  ForecastResult,
  ForecastMetrics,
  DailySnapshot,
  Transaction,
  CashStream,
} from './types';
import { doesStreamFireOnDate } from './schedule';

/**
 * Run a daily cashflow forecast for a scenario.
 *
 * Algorithm:
 * 1. Start with the configured checking and savings balances
 * 2. For each day in the range, check every stream
 * 3. If a stream fires, apply the transaction to the right account
 * 4. Record the day's ending balances and transactions
 * 5. Compute summary metrics from the full daily array
 */
export function forecast(config: ScenarioConfig): ForecastResult {
  const startDate = parseISO(config.startDate);
  const endDate = parseISO(config.endDate);
  const totalDays = differenceInCalendarDays(endDate, startDate) + 1;

  const disabledSet = new Set(config.disabledStreamIds ?? []);
  const overrides = config.streamOverrides ?? {};
  const activeStreams = config.streams
    .filter((s) => !disabledSet.has(s.id))
    .map((s) => (overrides[s.id] ? { ...s, ...overrides[s.id] } : s));

  let checking = config.checkingBalance;
  let savings = config.savingsBalance;
  const daily: DailySnapshot[] = [];

  for (let i = 0; i < totalDays; i++) {
    const currentDate = addDays(startDate, i);
    const transactions = getTransactionsForDate(activeStreams, currentDate);

    // Apply each transaction to the appropriate account
    for (const tx of transactions) {
      if (tx.account === 'checking') {
        checking += tx.amount;
      } else {
        savings += tx.amount;
      }
    }

    daily.push({
      date: toISODate(currentDate),
      checking: round2(checking),
      savings: round2(savings),
      transactions,
    });
  }

  const metrics = computeMetrics(daily, config.safetyBuffer);

  return { daily, metrics };
}

/**
 * Get all transactions that fire on a given date.
 *
 * For each stream, check if it fires today. If so, create
 * the appropriate transaction(s):
 * - Income: positive amount to the stream's account
 * - Expense: negative amount from the stream's account
 * - Transfer: negative from source account, positive to target account
 */
function getTransactionsForDate(
  streams: CashStream[],
  date: Date
): Transaction[] {
  const transactions: Transaction[] = [];

  for (const stream of streams) {
    if (!doesStreamFireOnDate(stream, date)) continue;

    if (stream.type === 'transfer') {
      // Transfer creates two transactions: debit from source, credit to target
      transactions.push({
        streamId: stream.id,
        name: stream.name,
        amount: -stream.amount,
        account: stream.account,
      });
      transactions.push({
        streamId: stream.id,
        name: stream.name,
        amount: stream.amount,
        account: stream.targetAccount ?? 'savings',
      });
    } else {
      // Income is positive, expense is negative
      const sign = stream.type === 'income' ? 1 : -1;
      transactions.push({
        streamId: stream.id,
        name: stream.name,
        amount: sign * stream.amount,
        account: stream.account,
      });
    }
  }

  return transactions;
}

/**
 * Compute summary metrics from the daily forecast.
 *
 * These metrics answer the fragility questions:
 * - How low does checking go? When?
 * - How many days are we below the safety buffer?
 * - Where do we end up?
 */
function computeMetrics(
  daily: DailySnapshot[],
  safetyBuffer: number
): ForecastMetrics {
  if (daily.length === 0) {
    return {
      minChecking: 0,
      minCheckingDate: '',
      maxChecking: 0,
      daysCheckingBelowBuffer: 0,
      daysCheckingBelowZero: 0,
      endingChecking: 0,
      endingSavings: 0,
      totalIncome: 0,
      totalExpenses: 0,
    };
  }

  let minChecking = Infinity;
  let minCheckingDate = '';
  let maxChecking = -Infinity;
  let daysCheckingBelowBuffer = 0;
  let daysCheckingBelowZero = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const day of daily) {
    if (day.checking < minChecking) {
      minChecking = day.checking;
      minCheckingDate = day.date;
    }
    if (day.checking > maxChecking) {
      maxChecking = day.checking;
    }
    if (day.checking < safetyBuffer) {
      daysCheckingBelowBuffer++;
    }
    if (day.checking < 0) {
      daysCheckingBelowZero++;
    }

    for (const tx of day.transactions) {
      if (tx.amount > 0) {
        totalIncome += tx.amount;
      } else {
        totalExpenses += Math.abs(tx.amount);
      }
    }
  }

  const lastDay = daily[daily.length - 1];

  return {
    minChecking: round2(minChecking),
    minCheckingDate,
    maxChecking: round2(maxChecking),
    daysCheckingBelowBuffer,
    daysCheckingBelowZero,
    endingChecking: round2(lastDay.checking),
    endingSavings: round2(lastDay.savings),
    totalIncome: round2(totalIncome),
    totalExpenses: round2(totalExpenses),
  };
}

/** Round to 2 decimal places (avoid floating point drift). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Format a Date as YYYY-MM-DD. */
function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
