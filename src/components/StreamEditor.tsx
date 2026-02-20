/**
 * Form for adding or editing a single cash stream.
 *
 * Handles income, expense, and transfer streams.
 * Shows/hides fields based on the frequency and type selected.
 */

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { CashStream, Frequency, StreamType, AccountType } from '../engine';

interface StreamEditorProps {
  stream?: CashStream; // If provided, we're editing. If not, we're adding.
  onSave: (stream: CashStream) => void;
  onCancel: () => void;
}

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'semimonthly', label: '1st & 15th' },
  { value: 'one-time', label: 'One-time' },
];

const TYPE_OPTIONS: { value: StreamType; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
];

export function StreamEditor({ stream, onSave, onCancel }: StreamEditorProps) {
  const [name, setName] = useState(stream?.name ?? '');
  const [amount, setAmount] = useState(stream?.amount ?? 0);
  const [type, setType] = useState<StreamType>(stream?.type ?? 'expense');
  const [frequency, setFrequency] = useState<Frequency>(stream?.frequency ?? 'monthly');
  const [account, setAccount] = useState<AccountType>(stream?.account ?? 'checking');
  const [targetAccount, setTargetAccount] = useState<AccountType>(stream?.targetAccount ?? 'savings');
  const [startDate, setStartDate] = useState(stream?.startDate ?? '');
  const [endDate, setEndDate] = useState(stream?.endDate ?? '');
  const [dayOfMonth, setDayOfMonth] = useState(stream?.dayOfMonth ?? 1);
  const [anchorDate, setAnchorDate] = useState(stream?.anchorDate ?? '');

  const needsDayOfMonth = frequency === 'monthly';
  const needsAnchorDate = frequency === 'biweekly' || frequency === 'weekly';
  const isTransfer = type === 'transfer';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cashStream: CashStream = {
      id: stream?.id ?? uuid(),
      name,
      amount,
      type,
      frequency,
      account,
      startDate,
      ...(endDate && { endDate }),
      ...(needsDayOfMonth && { dayOfMonth }),
      ...(needsAnchorDate && anchorDate && { anchorDate }),
      ...(isTransfer && { targetAccount }),
    };
    onSave(cashStream);
  }

  return (
    <form className="stream-editor" onSubmit={handleSubmit}>
      <div className="stream-editor-grid">
        <div className="setup-field">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Mortgage, Paycheck"
            required
          />
        </div>

        <div className="setup-field">
          <label>Amount</label>
          <div className="input-with-prefix">
            <span className="input-prefix">$</span>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              step={50}
              required
            />
          </div>
        </div>

        <div className="setup-field">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as StreamType)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="setup-field">
          <label>Frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="setup-field">
          <label>Account</label>
          <select value={account} onChange={(e) => setAccount(e.target.value as AccountType)}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
        </div>

        {isTransfer && (
          <div className="setup-field">
            <label>Transfer To</label>
            <select value={targetAccount} onChange={(e) => setTargetAccount(e.target.value as AccountType)}>
              <option value="savings">Savings</option>
              <option value="checking">Checking</option>
            </select>
          </div>
        )}

        {needsDayOfMonth && (
          <div className="setup-field">
            <label>Day of Month</label>
            <input
              type="number"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              min={1}
              max={28}
            />
          </div>
        )}

        {needsAnchorDate && (
          <div className="setup-field">
            <label>Reference Date</label>
            <input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
            />
            <span className="field-hint">A date this payment is known to occur</span>
          </div>
        )}

        <div className="setup-field">
          <label>{frequency === 'one-time' ? 'Date' : 'Start Date'}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        {frequency !== 'one-time' && (
          <div className="setup-field">
            <label>End Date (optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <span className="field-hint">Leave blank if ongoing</span>
          </div>
        )}
      </div>

      <div className="stream-editor-actions">
        <button type="submit" className="primary">
          {stream ? 'Save Changes' : 'Add Stream'}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
