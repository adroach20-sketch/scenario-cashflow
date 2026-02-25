/**
 * Demo data for first-load experience.
 *
 * A realistic dual-income family scenario so the app shows a chart
 * immediately, before the user enters their own numbers.
 * Based on typical patterns (not Andrew's actual data).
 */

import { v4 as uuid } from 'uuid';
import { format, addYears } from 'date-fns';
import type { ScenarioConfig, DecisionConfig, Account } from '../engine';

function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function oneYearFromNow(): string {
  return format(addYears(new Date(), 1), 'yyyy-MM-dd');
}

export function createDemoBaseline(): ScenarioConfig {
  return {
    id: uuid(),
    name: 'Demo Baseline',
    startDate: today(),
    endDate: oneYearFromNow(),
    checkingBalance: 5000,
    savingsBalance: 15000,
    safetyBuffer: 3000,
    accounts: [
      {
        id: uuid(),
        name: 'Primary Checking',
        accountType: 'checking',
        balance: 5000,
      } as Account,
      {
        id: uuid(),
        name: 'Emergency Fund',
        accountType: 'savings',
        balance: 15000,
      } as Account,
      {
        id: uuid(),
        name: 'Visa Credit Card',
        accountType: 'credit-card',
        balance: 3200,
        interestRate: 22.9,
        minimumPayment: 85,
        creditLimit: 10000,
      } as Account,
    ],
    streams: [
      {
        id: uuid(),
        name: 'Paycheck (Partner 1)',
        amount: 4200,
        type: 'income',
        frequency: 'biweekly',
        account: 'checking',
        startDate: today(),
        anchorDate: today(),
      },
      {
        id: uuid(),
        name: 'Paycheck (Partner 2)',
        amount: 2400,
        type: 'income',
        frequency: 'biweekly',
        account: 'checking',
        startDate: today(),
        anchorDate: today(),
      },
      {
        id: uuid(),
        name: 'Mortgage',
        amount: 2700,
        type: 'expense',
        frequency: 'monthly',
        account: 'checking',
        startDate: today(),
        dayOfMonth: 15,
        category: 'fixed',
      },
      {
        id: uuid(),
        name: 'Car Payment',
        amount: 650,
        type: 'expense',
        frequency: 'monthly',
        account: 'checking',
        startDate: today(),
        dayOfMonth: 8,
        category: 'fixed',
      },
      {
        id: uuid(),
        name: 'Daycare',
        amount: 1500,
        type: 'expense',
        frequency: 'monthly',
        account: 'checking',
        startDate: today(),
        dayOfMonth: 1,
        category: 'fixed',
      },
      {
        id: uuid(),
        name: 'Utilities',
        amount: 500,
        type: 'expense',
        frequency: 'monthly',
        account: 'checking',
        startDate: today(),
        dayOfMonth: 3,
        category: 'fixed',
      },
      {
        id: uuid(),
        name: 'Groceries & Household',
        amount: 500,
        type: 'expense',
        frequency: 'biweekly',
        account: 'checking',
        startDate: today(),
        anchorDate: today(),
        category: 'variable',
      },
      {
        id: uuid(),
        name: 'Savings Transfer',
        amount: 400,
        type: 'transfer',
        frequency: 'biweekly',
        account: 'checking',
        targetAccount: 'savings',
        startDate: today(),
        anchorDate: today(),
      },
    ],
  };
}

export function createDemoDecision(baselineId: string): DecisionConfig {
  return {
    id: uuid(),
    name: 'Home Renovation',
    baselineId,
    addStreams: [
      {
        id: uuid(),
        name: 'Home Equity Loan',
        amount: 1200,
        type: 'expense',
        frequency: 'monthly',
        account: 'checking',
        startDate: today(),
        dayOfMonth: 1,
        category: 'fixed',
      },
    ],
    removeStreamIds: [],
    modifyStreams: [],
    checkingBalanceAdjustment: -8000,
  };
}
