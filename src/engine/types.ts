/**
 * Core type definitions for the cashflow forecasting engine.
 *
 * These types are used everywhere — engine, UI, and eventually the server.
 * The engine itself has NO React or server dependencies.
 */

// How often a cash stream recurs
export type Frequency =
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'one-time';

// Which account a stream affects
export type AccountType = 'checking' | 'savings';

// What kind of financial account this is
export type FinancialAccountType = 'checking' | 'savings' | 'credit-card' | 'loan' | 'investment';

/**
 * A financial account the user tracks.
 *
 * Examples:
 *  - Checking: "Chase Checking" — $5,000 balance
 *  - Savings: "Emergency Fund" — $15,000 balance
 *  - Credit Card: "Visa" — $3,200 balance, 22.9% APR, $85 min payment
 *  - Loan: "Car Loan" — $18,000 balance, 4.5% APR, $650/mo payment
 *  - Investment: "Brokerage" — $42,000 balance
 */
export interface Account {
  id: string;
  name: string;
  accountType: FinancialAccountType;
  balance: number;
  interestRate?: number;
  minimumPayment?: number;
  creditLimit?: number;
}

// Whether money is coming in, going out, or moving between accounts
export type StreamType = 'income' | 'expense' | 'transfer';

// For expenses: fixed (predictable, like mortgage) vs variable (fluctuates, like groceries)
export type ExpenseCategory = 'fixed' | 'variable';

/**
 * A CashStream represents a recurring or one-time money flow.
 *
 * Examples:
 *  - Income: "Andrew's Pay" — $4,350 biweekly into checking
 *  - Expense: "Mortgage" — $2,700 monthly from checking on the 16th
 *  - Transfer: "Savings contribution" — $400 biweekly from checking to savings
 *  - One-time expense: "Car repair" — $2,000 on a specific date
 */
export interface CashStream {
  id: string;
  name: string;
  amount: number; // Always positive. Direction determined by `type`.
  type: StreamType;
  frequency: Frequency;
  account: AccountType; // Which account this hits (source for transfers)
  targetAccount?: AccountType; // For transfers: where money goes
  startDate: string; // ISO date (YYYY-MM-DD) — when this stream begins
  endDate?: string; // Optional — when it stops (e.g., Tesla payoff in Oct 2026)
  dayOfMonth?: number; // For monthly: which day (1-28). Use 28 for end-of-month.
  anchorDate?: string; // For biweekly/weekly: a known occurrence date to count from
  category?: ExpenseCategory; // For expenses: 'fixed' or 'variable'. UI grouping only.
}

/**
 * A complete scenario: starting balances + all cash streams over a time range.
 * This is what the forecast engine takes as input.
 */
export interface ScenarioConfig {
  id: string;
  name: string;
  startDate: string; // ISO date — forecast begins here
  endDate: string; // ISO date — forecast ends here
  checkingBalance: number; // Starting checking account balance
  savingsBalance: number; // Starting savings account balance
  safetyBuffer: number; // The minimum checking balance you're comfortable with
  streams: CashStream[];
  accounts: Account[];
  disabledStreamIds?: string[];
  streamOverrides?: Record<string, { amount?: number }>;
}

/**
 * A decision is NOT a full scenario — it's a set of modifications to a baseline.
 *
 * Example: "Home Addition" decision might:
 *  - Add a $1,500/mo home equity loan payment
 *  - Remove daycare ($1,500/mo) because the kid starts school
 *  - Adjust the starting checking balance by -$10,000 for upfront costs
 */
export interface DecisionConfig {
  id: string;
  name: string;
  baselineId: string; // Which baseline scenario this modifies
  addStreams: CashStream[]; // New streams to add
  removeStreamIds: string[]; // Baseline stream IDs to remove
  modifyStreams: StreamModification[]; // Changes to existing baseline streams
  checkingBalanceAdjustment?: number; // e.g., -10000 for upfront cost
  savingsBalanceAdjustment?: number;
}

/**
 * A modification to a single baseline stream.
 * Only the fields in `changes` are overwritten — everything else stays the same.
 */
export interface StreamModification {
  streamId: string; // Which baseline stream to modify
  changes: Partial<Omit<CashStream, 'id'>>; // What to change about it
}

/**
 * A snapshot of account balances and transactions for a single day.
 * The forecast produces an array of these — one per day.
 */
export interface DailySnapshot {
  date: string; // ISO date
  checking: number;
  savings: number;
  transactions: Transaction[];
}

/** A single transaction that occurred on a given day. */
export interface Transaction {
  streamId: string;
  name: string;
  amount: number; // Positive = money in, negative = money out
  account: AccountType;
}

/** The output of running a forecast on a scenario. */
export interface ForecastResult {
  daily: DailySnapshot[];
  metrics: ForecastMetrics;
}

/**
 * Summary metrics computed from the daily forecast.
 * These are the numbers that tell you "how fragile is this scenario?"
 */
export interface ForecastMetrics {
  minChecking: number; // Lowest checking balance during the forecast
  minCheckingDate: string; // When that low point occurs
  maxChecking: number; // Highest checking balance
  daysCheckingBelowBuffer: number; // Days where checking < safetyBuffer
  daysCheckingBelowZero: number; // Days where checking is negative
  endingChecking: number; // Final checking balance
  endingSavings: number; // Final savings balance
  totalIncome: number; // Sum of all income over the forecast
  totalExpenses: number; // Sum of all expenses (as positive number)
}

/**
 * Comparison between baseline and decision forecasts.
 * Positive deltas mean the decision is BETTER, negative means WORSE.
 */
export interface ComparisonMetrics {
  baseline: ForecastMetrics;
  decision: ForecastMetrics;
  minCheckingDelta: number; // decision.minChecking - baseline.minChecking
  bufferDaysDelta: number; // decision.daysBelow - baseline.daysBelow (positive = worse)
  endingBalanceDelta: number; // decision.endingChecking - baseline.endingChecking
}
