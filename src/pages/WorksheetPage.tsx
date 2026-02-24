import { useMemo } from 'react';
import type { ScenarioConfig, CashStream } from '../engine';

interface WorksheetPageProps {
  baseline: ScenarioConfig;
  onUpdateStream: (updated: CashStream) => void;
  onDeleteStream: (streamId: string) => void;
  onAddStream: (stream: CashStream) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  semimonthly: '1st & 15th',
  monthly: 'Monthly',
  'one-time': 'One-time',
};

const ACCOUNT_LABELS: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
};

function monthlyEquivalent(stream: CashStream): number {
  switch (stream.frequency) {
    case 'weekly': return stream.amount * 52 / 12;
    case 'biweekly': return stream.amount * 26 / 12;
    case 'semimonthly': return stream.amount * 2;
    case 'monthly': return stream.amount;
    case 'one-time': return 0;
  }
}

function formatCurrency(value: number): string {
  return '$' + Math.round(value).toLocaleString();
}

export function WorksheetPage({ baseline }: WorksheetPageProps) {
  const { incomeStreams, fixedExpenses, variableExpenses, transferStreams } = useMemo(() => {
    const streams = baseline.streams;
    return {
      incomeStreams: streams.filter((s) => s.type === 'income'),
      fixedExpenses: streams.filter((s) => s.type === 'expense' && s.category !== 'variable'),
      variableExpenses: streams.filter((s) => s.type === 'expense' && s.category === 'variable'),
      transferStreams: streams.filter((s) => s.type === 'transfer'),
    };
  }, [baseline.streams]);

  const totals = useMemo(() => {
    const totalIncome = incomeStreams.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
    const totalFixed = fixedExpenses.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
    const totalVariable = variableExpenses.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
    const totalTransfers = transferStreams.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
    const totalExpenses = totalFixed + totalVariable;
    const netCashflow = totalIncome - totalExpenses - totalTransfers;
    return { totalIncome, totalFixed, totalVariable, totalTransfers, totalExpenses, netCashflow };
  }, [incomeStreams, fixedExpenses, variableExpenses, transferStreams]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Worksheet</h1>
          <p className="subtitle">Your complete financial picture at a glance</p>
        </div>
      </header>

      <div className="worksheet-summary">
        <div className="worksheet-summary-card">
          <span className="worksheet-summary-label">Monthly Income</span>
          <span className="worksheet-summary-value ws-income">{formatCurrency(totals.totalIncome)}</span>
        </div>
        <div className="worksheet-summary-card">
          <span className="worksheet-summary-label">Monthly Expenses</span>
          <span className="worksheet-summary-value ws-expense">{formatCurrency(totals.totalExpenses)}</span>
        </div>
        <div className="worksheet-summary-card">
          <span className="worksheet-summary-label">Transfers</span>
          <span className="worksheet-summary-value ws-transfer">{formatCurrency(totals.totalTransfers)}</span>
        </div>
        <div className="worksheet-summary-card">
          <span className="worksheet-summary-label">Net Cashflow</span>
          <span className={`worksheet-summary-value ${totals.netCashflow >= 0 ? 'ws-positive' : 'ws-negative'}`}>
            {totals.netCashflow >= 0 ? '+' : ''}{formatCurrency(totals.netCashflow)}
          </span>
        </div>
      </div>

      <div className="worksheet-balances">
        <div className="worksheet-balance-item">
          <span className="worksheet-balance-label">Starting Checking</span>
          <span className="worksheet-balance-value">{formatCurrency(baseline.checkingBalance)}</span>
        </div>
        <div className="worksheet-balance-item">
          <span className="worksheet-balance-label">Starting Savings</span>
          <span className="worksheet-balance-value">{formatCurrency(baseline.savingsBalance)}</span>
        </div>
        <div className="worksheet-balance-item">
          <span className="worksheet-balance-label">Safety Buffer</span>
          <span className="worksheet-balance-value">{formatCurrency(baseline.safetyBuffer)}</span>
        </div>
        <div className="worksheet-balance-item">
          <span className="worksheet-balance-label">Forecast Period</span>
          <span className="worksheet-balance-value ws-date">{baseline.startDate} to {baseline.endDate}</span>
        </div>
      </div>

      <section className="section">
        <WorksheetTable
          title="Income"
          streams={incomeStreams}
          subtotal={totals.totalIncome}
          colorClass="ws-income"
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Fixed Expenses"
          streams={fixedExpenses}
          subtotal={totals.totalFixed}
          colorClass="ws-expense"
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Variable Expenses"
          streams={variableExpenses}
          subtotal={totals.totalVariable}
          colorClass="ws-expense"
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Transfers"
          streams={transferStreams}
          subtotal={totals.totalTransfers}
          colorClass="ws-transfer"
        />
      </section>
    </div>
  );
}

interface WorksheetTableProps {
  title: string;
  streams: CashStream[];
  subtotal: number;
  colorClass: string;
}

function WorksheetTable({ title, streams, subtotal, colorClass }: WorksheetTableProps) {
  return (
    <div className="worksheet-table-container">
      <div className="worksheet-table-header">
        <h2>{title}</h2>
        <span className={`worksheet-table-subtotal ${colorClass}`}>
          ~{formatCurrency(subtotal)}/mo
        </span>
      </div>
      {streams.length === 0 ? (
        <p className="stream-list-empty">No {title.toLowerCase()} streams</p>
      ) : (
        <table className="worksheet-table">
          <thead>
            <tr>
              <th className="ws-th">Name</th>
              <th className="ws-th ws-th-right">Amount</th>
              <th className="ws-th">Frequency</th>
              <th className="ws-th">Account</th>
              <th className="ws-th ws-th-right">Monthly Est.</th>
              <th className="ws-th">Dates</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) => (
              <tr key={stream.id} className="ws-tr">
                <td className="ws-td ws-td-name">{stream.name}</td>
                <td className="ws-td ws-td-right">{formatCurrency(stream.amount)}</td>
                <td className="ws-td">{FREQUENCY_LABELS[stream.frequency]}</td>
                <td className="ws-td">
                  {ACCOUNT_LABELS[stream.account]}
                  {stream.targetAccount && ` → ${ACCOUNT_LABELS[stream.targetAccount]}`}
                </td>
                <td className="ws-td ws-td-right">
                  {stream.frequency === 'one-time' ? '—' : formatCurrency(monthlyEquivalent(stream))}
                </td>
                <td className="ws-td ws-td-dates">
                  {stream.startDate}
                  {stream.endDate && ` → ${stream.endDate}`}
                  {stream.dayOfMonth && ` (day ${stream.dayOfMonth})`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
