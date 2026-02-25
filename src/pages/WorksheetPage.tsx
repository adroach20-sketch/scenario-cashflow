import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import type { ScenarioConfig, CashStream, StreamType, ExpenseCategory, Frequency, Account } from '../engine';
import { StreamEditor } from '../components/StreamEditor';
import { AccountsSection } from '../components/AccountsSection';

interface WorksheetPageProps {
  baseline: ScenarioConfig;
  onUpdateStream: (updated: CashStream) => void;
  onDeleteStream: (streamId: string) => void;
  onAddStream: (stream: CashStream) => void;
  onSetupChange: (field: string, value: number | string) => void;
  onAddAccount: (account: Account) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  semimonthly: '1st & 15th',
  monthly: 'Monthly',
  'one-time': 'One-time',
};

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'semimonthly', label: '1st & 15th' },
  { value: 'one-time', label: 'One-time' },
];

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

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function WorksheetPage({ baseline, onUpdateStream, onDeleteStream, onAddStream, onSetupChange, onAddAccount, onUpdateAccount, onDeleteAccount }: WorksheetPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

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

  function handleSaveEdit(stream: CashStream) {
    onUpdateStream(stream);
    setEditingId(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Accounts</h1>
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

      <section className="section">
        <h2>Accounts</h2>
        <AccountsSection
          accounts={baseline.accounts || []}
          onAdd={onAddAccount}
          onUpdate={onUpdateAccount}
          onDelete={onDeleteAccount}
        />
      </section>

      <div className="worksheet-balances">
        <EditableBalance label="Safety Buffer" value={baseline.safetyBuffer} field="safetyBuffer" onChange={onSetupChange} />
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
          defaultType="income"
          editingId={editingId}
          onEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDeleteStream}
          onAdd={onAddStream}
          startDate={baseline.startDate}
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Fixed Expenses"
          streams={fixedExpenses}
          subtotal={totals.totalFixed}
          colorClass="ws-expense"
          defaultType="expense"
          defaultCategory="fixed"
          editingId={editingId}
          onEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDeleteStream}
          onAdd={onAddStream}
          startDate={baseline.startDate}
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Variable Expenses"
          streams={variableExpenses}
          subtotal={totals.totalVariable}
          colorClass="ws-expense"
          defaultType="expense"
          defaultCategory="variable"
          editingId={editingId}
          onEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDeleteStream}
          onAdd={onAddStream}
          startDate={baseline.startDate}
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Transfers"
          streams={transferStreams}
          subtotal={totals.totalTransfers}
          colorClass="ws-transfer"
          defaultType="transfer"
          editingId={editingId}
          onEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDeleteStream}
          onAdd={onAddStream}
          startDate={baseline.startDate}
        />
      </section>
    </div>
  );
}

interface EditableBalanceProps {
  label: string;
  value: number;
  field: string;
  onChange: (field: string, value: number | string) => void;
}

function EditableBalance({ label, value, field, onChange }: EditableBalanceProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function handleSave() {
    onChange(field, draft);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="worksheet-balance-item">
        <span className="worksheet-balance-label">{label}</span>
        <div className="ws-inline-edit">
          <input
            type="number"
            value={draft}
            onChange={(e) => setDraft(Number(e.target.value))}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            className="ws-inline-input"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="worksheet-balance-item ws-clickable" onClick={() => { setDraft(value); setEditing(true); }}>
      <span className="worksheet-balance-label">{label}</span>
      <span className="worksheet-balance-value">
        {formatCurrency(value)}
        <span className="ws-edit-hint">click to edit</span>
      </span>
    </div>
  );
}

interface WorksheetTableProps {
  title: string;
  streams: CashStream[];
  subtotal: number;
  colorClass: string;
  defaultType: StreamType;
  defaultCategory?: ExpenseCategory;
  editingId: string | null;
  onEdit: (id: string) => void;
  onSaveEdit: (stream: CashStream) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onAdd: (stream: CashStream) => void;
  startDate: string;
}

function WorksheetTable({
  title,
  streams,
  subtotal,
  colorClass,
  defaultType,
  defaultCategory,
  editingId,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onAdd,
  startDate,
}: WorksheetTableProps) {
  const [quickName, setQuickName] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickFrequency, setQuickFrequency] = useState<Frequency>('monthly');

  function handleQuickAdd() {
    const name = quickName.trim();
    const amount = parseFloat(quickAmount);
    if (!name || !amount || amount <= 0) return;

    const today = todayISO();
    const effectiveStart = startDate || today;
    const stream: CashStream = {
      id: uuid(),
      name,
      amount,
      type: defaultType,
      frequency: quickFrequency,
      account: 'checking',
      startDate: effectiveStart,
      ...(quickFrequency === 'monthly' && { dayOfMonth: 1 }),
      ...(quickFrequency === 'semimonthly' && { dayOfMonth: 1 }),
      ...((quickFrequency === 'biweekly' || quickFrequency === 'weekly') && { anchorDate: effectiveStart }),
      ...(defaultType === 'transfer' && { targetAccount: 'savings' as const }),
      ...(defaultCategory && { category: defaultCategory }),
    };
    onAdd(stream);
    setQuickName('');
    setQuickAmount('');
    setQuickFrequency('monthly');
  }

  function handleQuickKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  }

  return (
    <div className="worksheet-table-container">
      <div className="worksheet-table-header">
        <h2>{title}</h2>
        <span className={`worksheet-table-subtotal ${colorClass}`}>
          ~{formatCurrency(subtotal)}/mo
        </span>
      </div>

      <table className="worksheet-table">
        <thead>
          <tr>
            <th className="ws-th">Name</th>
            <th className="ws-th ws-th-right">Amount</th>
            <th className="ws-th">Frequency</th>
            <th className="ws-th">Account</th>
            <th className="ws-th ws-th-right">Monthly Est.</th>
            <th className="ws-th ws-th-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {streams.map((stream) =>
            editingId === stream.id ? (
              <tr key={stream.id}>
                <td colSpan={6} className="ws-td-editor">
                  <StreamEditor
                    stream={stream}
                    onSave={onSaveEdit}
                    onCancel={onCancelEdit}
                  />
                </td>
              </tr>
            ) : (
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
                <td className="ws-td ws-td-actions-cell">
                  <button onClick={() => onEdit(stream.id)}>Edit</button>
                  <button className="danger" onClick={() => onDelete(stream.id)}>Delete</button>
                </td>
              </tr>
            )
          )}
          <tr className="ws-quick-add-row">
            <td className="ws-td">
              <input
                type="text"
                className="ws-quick-input"
                placeholder={`New ${title.toLowerCase()}...`}
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={handleQuickKeyDown}
              />
            </td>
            <td className="ws-td ws-td-right">
              <div className="ws-quick-amount">
                <span className="ws-quick-dollar">$</span>
                <input
                  type="number"
                  className="ws-quick-input ws-quick-input-amount"
                  placeholder="0"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  min={0}
                  step={50}
                />
              </div>
            </td>
            <td className="ws-td">
              <select
                className="ws-quick-select"
                value={quickFrequency}
                onChange={(e) => setQuickFrequency(e.target.value as Frequency)}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </td>
            <td className="ws-td"></td>
            <td className="ws-td"></td>
            <td className="ws-td ws-td-actions-cell">
              <button
                className="primary ws-quick-add-btn"
                onClick={handleQuickAdd}
                disabled={!quickName.trim() || !quickAmount || parseFloat(quickAmount) <= 0}
              >
                Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
