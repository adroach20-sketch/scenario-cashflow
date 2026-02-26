import { useState } from 'react';
import type { CashStream } from '../engine';
import { CalculatorInput } from './CalculatorInput';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col gap-3">
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
        <p className="text-sm text-muted-foreground text-center py-6">No streams yet. Add them on the Cash Flow page.</p>
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
    <div className="flex flex-col">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground py-1.5 border-b mb-1">
        {label}
      </div>
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

  return (
    <div className={cn("flex items-center gap-3 px-2 py-1.5 rounded transition-colors hover:bg-muted/50", disabled && "opacity-50")}>
      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
        <input
          type="checkbox"
          checked={!disabled}
          onChange={onToggle}
          className="w-4 h-4 flex-shrink-0 cursor-pointer rounded border-input accent-primary"
        />
        <span className={cn("text-sm truncate", disabled && "line-through text-muted-foreground")}>
          {stream.name}
        </span>
      </label>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {editingAmount && !disabled ? (
          <div className="flex items-center">
            <span className="text-[0.8125rem] text-muted-foreground mr-0.5">$</span>
            <CalculatorInput
              value={draftAmount}
              onChange={(val) => {
                setDraftAmount(val);
                if (val !== stream.amount && val > 0) {
                  onOverride(val);
                } else {
                  onOverride(null);
                }
                setEditingAmount(false);
              }}
              className="w-20 px-1.5 py-0.5 border border-primary rounded text-[0.8125rem] outline-none"
              autoFocus
              min={0}
            />
          </div>
        ) : (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums whitespace-nowrap",
              disabled && "line-through text-muted-foreground",
              !disabled && "cursor-pointer px-1.5 py-0.5 rounded transition-colors hover:bg-accent hover:text-primary"
            )}
            onClick={() => { if (!disabled) { setDraftAmount(override?.amount ?? stream.amount); setEditingAmount(true); } }}
          >
            {hasOverride && (
              <span className="line-through text-muted-foreground font-normal mr-1.5 text-[0.8125rem]">{formatCurrency(stream.amount)}</span>
            )}
            {formatCurrency(displayAmount)}
          </span>
        )}
        {hasOverride && !disabled && !editingAmount && (
          <button
            className="text-[0.6875rem] text-muted-foreground bg-transparent border-0 p-0 cursor-pointer underline hover:text-primary"
            onClick={() => onOverride(null)}
          >
            reset
          </button>
        )}
      </div>

      <span className={cn("text-xs text-muted-foreground flex-shrink-0 w-12 text-right tabular-nums", disabled && "line-through")}>
        {FREQUENCY_SHORT[stream.frequency]}
      </span>
    </div>
  );
}
