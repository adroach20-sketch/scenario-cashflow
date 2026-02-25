import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { Account, FinancialAccountType } from '../engine';

interface AccountsSectionProps {
  accounts: Account[];
  onAdd: (account: Account) => void;
  onUpdate: (account: Account) => void;
  onDelete: (id: string) => void;
}

const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  'credit-card': 'Credit Card',
  loan: 'Loan',
  investment: 'Investment',
};

const ACCOUNT_TYPE_OPTIONS: { value: FinancialAccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit-card', label: 'Credit Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'investment', label: 'Investment' },
];

function isDebt(type: FinancialAccountType): boolean {
  return type === 'credit-card' || type === 'loan';
}

function formatCurrency(value: number): string {
  return '$' + Math.round(Math.abs(value)).toLocaleString();
}

export function AccountsSection({ accounts, onAdd, onUpdate, onDelete }: AccountsSectionProps) {
  const [quickName, setQuickName] = useState('');
  const [quickType, setQuickType] = useState<FinancialAccountType>('checking');
  const [quickBalance, setQuickBalance] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const assetAccounts = accounts.filter((a) => !isDebt(a.accountType));
  const debtAccounts = accounts.filter((a) => isDebt(a.accountType));

  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalDebts = debtAccounts.reduce((sum, a) => sum + a.balance, 0);
  const netWorth = totalAssets - totalDebts;

  function handleQuickAdd() {
    const name = quickName.trim();
    const balance = parseFloat(quickBalance);
    if (!name || isNaN(balance)) return;

    const account: Account = {
      id: uuid(),
      name,
      accountType: quickType,
      balance: Math.abs(balance),
    };
    onAdd(account);
    setQuickName('');
    setQuickType('checking');
    setQuickBalance('');
  }

  function handleQuickKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  }

  return (
    <div className="accounts-section">
      <div className="accounts-summary-bar">
        <div className="accounts-summary-item">
          <span className="accounts-summary-label">Total Assets</span>
          <span className="accounts-summary-value ws-income">{formatCurrency(totalAssets)}</span>
        </div>
        <div className="accounts-summary-item">
          <span className="accounts-summary-label">Total Debts</span>
          <span className="accounts-summary-value ws-expense">{formatCurrency(totalDebts)}</span>
        </div>
        <div className="accounts-summary-item">
          <span className="accounts-summary-label">Net Worth</span>
          <span className={`accounts-summary-value ${netWorth >= 0 ? 'ws-positive' : 'ws-negative'}`}>
            {netWorth >= 0 ? '' : '-'}{formatCurrency(netWorth)}
          </span>
        </div>
      </div>

      <div className="accounts-grid">
        {accounts.map((account) =>
          editingId === account.id ? (
            <AccountEditor
              key={account.id}
              account={account}
              onSave={(updated) => { onUpdate(updated); setEditingId(null); }}
              onCancel={() => setEditingId(null)}
              onDelete={() => { onDelete(account.id); setEditingId(null); }}
            />
          ) : (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => setEditingId(account.id)}
            />
          )
        )}

        <div className="account-card account-card-add">
          <div className="account-add-form">
            <input
              type="text"
              className="ws-quick-input"
              placeholder="Account name..."
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              onKeyDown={handleQuickKeyDown}
            />
            <select
              className="ws-quick-select"
              value={quickType}
              onChange={(e) => setQuickType(e.target.value as FinancialAccountType)}
            >
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="ws-quick-amount">
              <span className="ws-quick-dollar">$</span>
              <input
                type="number"
                className="ws-quick-input ws-quick-input-amount"
                placeholder="0"
                value={quickBalance}
                onChange={(e) => setQuickBalance(e.target.value)}
                onKeyDown={handleQuickKeyDown}
                min={0}
                step={100}
              />
            </div>
            <button
              className="primary ws-quick-add-btn"
              onClick={handleQuickAdd}
              disabled={!quickName.trim() || !quickBalance || isNaN(parseFloat(quickBalance))}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AccountCardProps {
  account: Account;
  onEdit: () => void;
}

function AccountCard({ account, onEdit }: AccountCardProps) {
  const debt = isDebt(account.accountType);
  return (
    <div className={`account-card ${debt ? 'account-card-debt' : 'account-card-asset'}`} onClick={onEdit}>
      <div className="account-card-header">
        <span className="account-card-name">{account.name}</span>
        <span className={`account-card-type-badge ${debt ? 'badge-debt' : 'badge-asset'}`}>
          {ACCOUNT_TYPE_LABELS[account.accountType]}
        </span>
      </div>
      <div className="account-card-balance">
        <span className={debt ? 'ws-expense' : 'ws-income'}>
          {debt ? '-' : ''}{formatCurrency(account.balance)}
        </span>
      </div>
      {debt && (account.interestRate || account.minimumPayment) && (
        <div className="account-card-debt-details">
          {account.interestRate != null && (
            <span className="account-card-detail">{account.interestRate}% APR</span>
          )}
          {account.minimumPayment != null && (
            <span className="account-card-detail">{formatCurrency(account.minimumPayment)}/mo min</span>
          )}
        </div>
      )}
      <span className="account-card-edit-hint">click to edit</span>
    </div>
  );
}

interface AccountEditorProps {
  account: Account;
  onSave: (account: Account) => void;
  onCancel: () => void;
  onDelete: () => void;
}

function AccountEditor({ account, onSave, onCancel, onDelete }: AccountEditorProps) {
  const [name, setName] = useState(account.name);
  const [accountType, setAccountType] = useState(account.accountType);
  const [balance, setBalance] = useState(account.balance);
  const [interestRate, setInterestRate] = useState(account.interestRate ?? 0);
  const [minimumPayment, setMinimumPayment] = useState(account.minimumPayment ?? 0);
  const [creditLimit, setCreditLimit] = useState(account.creditLimit ?? 0);

  const debt = isDebt(accountType);

  function handleSave() {
    onSave({
      id: account.id,
      name: name.trim() || account.name,
      accountType,
      balance,
      ...(debt && interestRate > 0 && { interestRate }),
      ...(debt && minimumPayment > 0 && { minimumPayment }),
      ...(debt && creditLimit > 0 && { creditLimit }),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div className="account-card account-card-editing">
      <div className="account-edit-field">
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} autoFocus />
      </div>
      <div className="account-edit-field">
        <label>Type</label>
        <select value={accountType} onChange={(e) => setAccountType(e.target.value as FinancialAccountType)}>
          {ACCOUNT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="account-edit-field">
        <label>Balance</label>
        <input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} onKeyDown={handleKeyDown} min={0} step={100} />
      </div>
      {debt && (
        <>
          <div className="account-edit-field">
            <label>Interest Rate (%)</label>
            <input type="number" value={interestRate || ''} onChange={(e) => setInterestRate(Number(e.target.value))} onKeyDown={handleKeyDown} min={0} step={0.1} placeholder="e.g. 22.9" />
          </div>
          <div className="account-edit-field">
            <label>Min. Payment</label>
            <input type="number" value={minimumPayment || ''} onChange={(e) => setMinimumPayment(Number(e.target.value))} onKeyDown={handleKeyDown} min={0} step={10} placeholder="e.g. 85" />
          </div>
          <div className="account-edit-field">
            <label>Credit Limit</label>
            <input type="number" value={creditLimit || ''} onChange={(e) => setCreditLimit(Number(e.target.value))} onKeyDown={handleKeyDown} min={0} step={100} placeholder="e.g. 10000" />
          </div>
        </>
      )}
      <div className="account-edit-actions">
        <button className="primary" onClick={handleSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
        <button className="danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
