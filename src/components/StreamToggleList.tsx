import { useState } from 'react';
import type { CashStream } from '../engine';

interface StreamToggleListProps {
  streams: CashStream[];
  disabledStreamIds: string[];
  streamOverrides: Record<string, { amount?: number }>;
  onToggle: (streamId: string) => void;
  onOverride: (streamId: string, amount: number | null) => void;
}

const FREQUENCY_SHORT: Record<string, string> = {
  weekly: '/wk',
  biweekly: '/2wk',
  semimonthly: '/2×mo',
  monthly: '/mo',
  'one-time': 'once',
};

function formatCurrency(value: number): string {
  return '$' + Math.round(value).toLocaleString();
}

export function StreamToggleList({
  streams,
  disabledStreamIds,
  streamOverrides,
  onToggle,
  onOverride,
}: StreamToggleListProps) {
  const disabledSet = new Set(disabledStreamIds);

  const incomeStreams = streams.filter((s) => s.type === 'income');
  const expenseStreams = streams.filter((s) => s.type === 'expense');
  const transferStreams = streams.filter((s) => s.type === 'transfer');

  return (
    <div className="stream-toggle-list">
      {incomeStreams.length > 0 && (
        <StreamToggleGroup
          label="Income"
          streams={incomeStreams}
          disabledSet={disabledSet}
          streamOverrides={streamOverrides}
          onToggle={onToggle}
          onOverride={onOverride}
        />
      )}
      {expenseStreams.length > 0 && (
        <StreamToggleGroup
          label="Expenses"
          streams={expenseStreams}
          disabledSet={disabledSet}
          streamOverrides={streamOverrides}
          onToggle={onToggle}
          onOverride={onOverride}
        />
      )}
      {transferStreams.length > 0 && (
        <StreamToggleGroup
          label="Transfers"
          streams={transferStreams}
          disabledSet={disabledSet}
          streamOverrides={streamOverrides}
          onToggle={onToggle}
          onOverride={onOverride}
        />
      )}
      {streams.length === 0 && (
        <p className="stream-list-empty">No streams yet. Add them on the Accounts page.</p>
      )}
    </div>
  );
}

interface StreamToggleGroupProps {
  label: string;
  streams: CashStream[];
  disabledSet: Set<string>;
  streamOverrides: Record<string, { amount?: number }>;
  onToggle: (streamId: string) => void;
  onOverride: (streamId: string, amount: number | null) => void;
}

function StreamToggleGroup({
  label,
  streams,
  disabledSet,
  streamOverrides,
  onToggle,
  onOverride,
}: StreamToggleGroupProps) {
  return (
    <div className="stl-group">
      <div className="stl-group-label">{label}</div>
      {streams.map((stream) => (
        <StreamToggleRow
          key={stream.id}
          stream={stream}
          disabled={disabledSet.has(stream.id)}
          override={streamOverrides[stream.id]}
          onToggle={() => onToggle(stream.id)}
          onOverride={(amount) => onOverride(stream.id, amount)}
        />
      ))}
    </div>
  );
}

interface StreamToggleRowProps {
  stream: CashStream;
  disabled: boolean;
  override?: { amount?: number };
  onToggle: () => void;
  onOverride: (amount: number | null) => void;
}

function StreamToggleRow({ stream, disabled, override, onToggle, onOverride }: StreamToggleRowProps) {
  const [editingAmount, setEditingAmount] = useState(false);
  const [draftAmount, setDraftAmount] = useState(override?.amount ?? stream.amount);

  const hasOverride = override?.amount != null && override.amount !== stream.amount;
  const displayAmount = hasOverride ? override!.amount! : stream.amount;

  function handleAmountSave() {
    if (draftAmount !== stream.amount && draftAmount > 0) {
      onOverride(draftAmount);
    } else {
      onOverride(null);
    }
    setEditingAmount(false);
  }

  function handleAmountKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAmountSave();
    if (e.key === 'Escape') { setDraftAmount(override?.amount ?? stream.amount); setEditingAmount(false); }
  }

  return (
    <div className={`stl-row ${disabled ? 'stl-row-disabled' : ''}`}>
      <label className="stl-checkbox-label">
        <input
          type="checkbox"
          checked={!disabled}
          onChange={onToggle}
          className="stl-checkbox"
        />
        <span className={`stl-name ${disabled ? 'stl-strikethrough' : ''}`}>
          {stream.name}
        </span>
      </label>

      <div className="stl-amount-area">
        {editingAmount && !disabled ? (
          <div className="stl-amount-edit">
            <span className="stl-dollar">$</span>
            <input
              type="number"
              className="stl-amount-input"
              value={draftAmount}
              onChange={(e) => setDraftAmount(Number(e.target.value))}
              onKeyDown={handleAmountKeyDown}
              onBlur={handleAmountSave}
              autoFocus
              min={0}
              step={50}
            />
          </div>
        ) : (
          <span
            className={`stl-amount ${disabled ? 'stl-strikethrough' : ''} ${!disabled ? 'stl-amount-clickable' : ''}`}
            onClick={() => { if (!disabled) { setDraftAmount(override?.amount ?? stream.amount); setEditingAmount(true); } }}
          >
            {hasOverride && (
              <span className="stl-original-amount">{formatCurrency(stream.amount)}</span>
            )}
            {formatCurrency(displayAmount)}
          </span>
        )}
        {hasOverride && !disabled && !editingAmount && (
          <button className="stl-reset" onClick={() => onOverride(null)}>reset</button>
        )}
      </div>

      <span className={`stl-freq ${disabled ? 'stl-strikethrough' : ''}`}>
        {FREQUENCY_SHORT[stream.frequency]}
      </span>
    </div>
  );
}
