/**
 * Public API for the cashflow forecasting engine.
 *
 * Import from here — don't reach into individual files.
 * Example: import { forecast, applyDecision } from './engine';
 */

// Core functions
export { forecast } from './forecast';
export { applyDecision } from './decision';
export { compareScenarios } from './compare';
export { doesStreamFireOnDate } from './schedule';

// All types
export type {
  Frequency,
  AccountType,
  StreamType,
  ExpenseCategory,
  CashStream,
  ScenarioConfig,
  DecisionConfig,
  StreamModification,
  DailySnapshot,
  Transaction,
  ForecastResult,
  ForecastMetrics,
  ComparisonMetrics,
} from './types';
