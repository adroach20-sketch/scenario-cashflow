import { useState, useMemo } from 'react';
import type { ScenarioConfig, CashStream, StreamType, ExpenseCategory } from '../engine';
import { StreamEditor } from '../components/StreamEditor';

interface WorksheetPageProps {
  baseline: ScenarioConfig;
  onUpdateStream: (updated: CashStream) => void;
  onDeleteStream: (streamId: string) => void;
  onAddStream: (stream: CashStream) => void;
  onSetupChange: (field: string, value: number | string) => void;
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

export function WorksheetPage({ baseline, onUpdateStream, onDeleteStream, onAddStream, onSetupChange }: WorksheetPageProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState<string | null>(null);

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

  function handleSaveNew(stream: CashStream) {
    onAddStream(stream);
    setAddingSection(null);
  }

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

      <div className="worksheet-balances">
        <EditableBalance
          label="Starting Checking"
          value={baseline.checkingBalance}
          field="checkingBalance"
          onChange={onSetupChange}
        />
        <EditableBalance
          label="Starting Savings"
          value={baseline.savingsBalance}
          field="savingsBalance"
          onChange={onSetupChange}
        />
        <EditableBalance
          label="Safety Buffer"
          value={baseline.safetyBuffer}
          field="safetyBuffer"
          onChange={onSetupChange}
        />
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
          sectionKey="income"
          defaultType="income"
          editingId={editingId}
          addingSection={addingSection}
          onEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDeleteStream}
          onStartAdd={setAddingSection}
          onSaveNew={handleSaveNew}
          onCancelAdd={() => setAddingSection(null)}
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Fixed Expenses"
          streams={fixedExpenses}
          subtotal={totals.totalFixed}
          colorClass="ws-expense"
          sectionKey="fixed"
          defaultType="expense"
          defaultCategory="fixed"
          editingId={editingId}
          addingSection={addingSection}
          onEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDeleteStream}
          onStartAdd={setAddingSection}
          onSaveNew={handleSaveNew}
          onCancelAdd={() => setAddingSection(null)}
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Variable Expenses"
          streams={variableExpenses}
          subtotal={totals.totalVariable}
          colorClass="ws-expense"
          sectionKey="variable"
          defaultType="expense"
          defaultCategory="variable"
          editingId={editingId}
          addingSection={addingSection}
          onEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDeleteStream}
          onStartAdd={setAddingSection}
          onSaveNew={handleSaveNew}
          onCancelAdd={() => setAddingSection(null)}
        />
      </section>

      <section className="section">
        <WorksheetTable
          title="Transfers"
          streams={transferStreams}
          subtotal={totals.totalTransfers}
          colorClass="ws-transfer"
          sectionKey="transfer"
          defaultType="transfer"
          editingId={editingId}
          addingSection={addingSection}
          onEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={onDeleteStream}
          onStartAdd={setAddingSection}
          onSaveNew={handleSaveNew}
          onCancelAdd={() => setAddingSection(null)}
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
  sectionKey: string;
  defaultType: StreamType;
  defaultCategory?: ExpenseCategory;
  editingId: string | null;
  addingSection: string | null;
  onEdit: (id: string) => void;
  onSaveEdit: (stream: CashStream) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onStartAdd: (section: string) => void;
  onSaveNew: (stream: CashStream) => void;
  onCancelAdd: () => void;
}

function WorksheetTable({
  title,
  streams,
  subtotal,
  colorClass,
  sectionKey,
  defaultType,
  defaultCategory,
  editingId,
  addingSection,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onStartAdd,
  onSaveNew,
  onCancelAdd,
}: WorksheetTableProps) {
  return (
    <div className="worksheet-table-container">
      <div className="worksheet-table-header">
        <h2>{title}</h2>
        <div className="worksheet-table-header-right">
          <span className={`worksheet-table-subtotal ${colorClass}`}>
            ~{formatCurrency(subtotal)}/mo
          </span>
          <button className="stream-group-add" onClick={() => onStartAdd(sectionKey)}>
            + Add
          </button>
        </div>
      </div>

      {addingSection === sectionKey && (
        <div className="stream-editor-container">
          <StreamEditor
            defaultType={defaultType}
            defaultCategory={defaultCategory}
            onSave={onSaveNew}
            onCancel={onCancelAdd}
          />
        </div>
      )}

      {streams.length === 0 && addingSection !== sectionKey ? (
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
              <th className="ws-th ws-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) =>
              editingId === stream.id ? (
                <tr key={stream.id}>
                  <td colSpan={7} className="ws-td-editor">
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
                  <td className="ws-td ws-td-dates">
                    {stream.startDate}
                    {stream.endDate && ` → ${stream.endDate}`}
                    {stream.dayOfMonth && ` (day ${stream.dayOfMonth})`}
                  </td>
                  <td className="ws-td ws-td-actions-cell">
                    <button onClick={() => onEdit(stream.id)}>Edit</button>
                    <button className="danger" onClick={() => onDelete(stream.id)}>Delete</button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
