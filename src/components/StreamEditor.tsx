/**
 * Form for adding or editing a single cash stream.
 *
 * Handles income, expense, and transfer streams.
 * Shows/hides fields based on the frequency and type selected.
 */

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { CashStream, Frequency, StreamType, AccountType, ExpenseCategory } from '../engine';
import { calculateMonthlyPayment } from '../engine';
import { CalculatorInput } from './CalculatorInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';

interface StreamEditorProps {
  stream?: CashStream; // If provided, we're editing. If not, we're adding.
  defaultType?: StreamType; // Pre-set when opened from a section's "Add" button
  defaultCategory?: ExpenseCategory; // Pre-set for "Add Fixed Expense" vs "Add Variable Expense"
  lockFrequency?: Frequency; // If set, frequency is fixed and the dropdown is disabled
  hideCategory?: boolean; // Hide the fixed/variable category picker (e.g. in decision workflow)
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

/** Add months to a date string, clamping to end-of-month to avoid overflow
 *  (e.g. Jan 31 + 1 month → Feb 28, not March 3). */
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  // If the day overflowed (e.g. 31 → 3), clamp to last day of target month
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    d.setDate(0); // backs up to last day of previous month
  }
  return d.toISOString().split('T')[0];
}

const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";
const calcInputClass = "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm tabular-nums shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export function StreamEditor({ stream, defaultType, defaultCategory, lockFrequency, hideCategory, onSave, onCancel }: StreamEditorProps) {
  const initialType = stream?.type ?? defaultType ?? 'expense';
  const [name, setName] = useState(stream?.name ?? '');
  const [amount, setAmount] = useState(stream?.amount ?? 0);
  const [type, setType] = useState<StreamType>(initialType);
  const [frequency, setFrequency] = useState<Frequency>(lockFrequency ?? stream?.frequency ?? 'monthly');
  const [account, setAccount] = useState<AccountType>(stream?.account ?? 'checking');
  const [targetAccount, setTargetAccount] = useState<AccountType>(stream?.targetAccount ?? 'savings');
  const [startDate, setStartDate] = useState(stream?.startDate ?? '');
  const [endDate, setEndDate] = useState(stream?.endDate ?? '');
  const [dayOfMonth, setDayOfMonth] = useState(stream?.dayOfMonth ?? 1);
  const [anchorDate, setAnchorDate] = useState(stream?.anchorDate ?? '');
  const [category, setCategory] = useState<ExpenseCategory | undefined>(
    stream?.category ?? defaultCategory ?? (initialType === 'expense' ? 'fixed' : undefined)
  );

  // Financing state
  const [isFinanced, setIsFinanced] = useState(false);
  const [loanPrincipal, setLoanPrincipal] = useState(0);
  const [loanTermMonths, setLoanTermMonths] = useState(36);
  const [loanAnnualRate, setLoanAnnualRate] = useState(0);
  const [useCustomPayment, setUseCustomPayment] = useState(false);

  const calculatedPayment = loanPrincipal > 0 && loanTermMonths > 0
    ? calculateMonthlyPayment(loanPrincipal, loanAnnualRate, loanTermMonths)
    : 0;

  const needsDayOfMonth = frequency === 'monthly';
  const needsAnchorDate = frequency === 'biweekly' || frequency === 'weekly';
  const isTransfer = type === 'transfer';
  const isExpense = type === 'expense';
  const showFinancing = isExpense; // financing checkbox visible for any expense
  const showFinancingDetails = isFinanced && isExpense;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Auto-calculate end date from loan term
    let computedEndDate = endDate;
    if (showFinancingDetails && startDate && loanTermMonths > 0) {
      computedEndDate = addMonths(startDate, loanTermMonths);
    }

    // Use calculated payment when financing is active and not using custom
    const finalAmount = (showFinancingDetails && !useCustomPayment && calculatedPayment > 0)
      ? calculatedPayment
      : amount;

    const cashStream: CashStream = {
      id: stream?.id ?? uuid(),
      name,
      amount: finalAmount,
      type,
      frequency,
      account,
      startDate,
      ...(computedEndDate && { endDate: computedEndDate }),
      ...(needsDayOfMonth && { dayOfMonth }),
      ...(needsAnchorDate && anchorDate && { anchorDate }),
      ...(isTransfer && { targetAccount }),
      ...(isExpense && category && { category }),
    };
    onSave(cashStream);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        <FormField label="Name">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Mortgage, Paycheck"
            required
          />
        </FormField>

        <FormField label="Type">
          <select
            className={selectClass}
            value={type}
            onChange={(e) => {
              const newType = e.target.value as StreamType;
              setType(newType);
              if (newType === 'expense') {
                setCategory('fixed');
              } else {
                setCategory(undefined);
                // Clear financing state when switching away from expense
                setIsFinanced(false);
                setUseCustomPayment(false);
              }
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>

        {isExpense && !hideCategory && (
          <FormField label="Category" hint="Fixed = predictable amount, Variable = fluctuates">
            <select className={selectClass} value={category ?? 'fixed'} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
              <option value="fixed">Fixed</option>
              <option value="variable">Variable</option>
            </select>
          </FormField>
        )}

        {showFinancing && (
          <div className="flex items-center gap-2 col-span-full pt-1">
            <Checkbox
              id="financed"
              checked={isFinanced}
              onCheckedChange={(checked) => {
                const on = checked === true;
                setIsFinanced(on);
                if (on) {
                  // Financed purchases are always monthly
                  setFrequency('monthly');
                }
                if (!on) setUseCustomPayment(false);
              }}
            />
            <label htmlFor="financed" className="text-sm cursor-pointer">
              This is a financed purchase
            </label>
          </div>
        )}

        <FormField label="Frequency">
          <select
            className={selectClass}
            value={frequency}
            disabled={!!lockFrequency || isFinanced}
            onChange={(e) => {
              const newFreq = e.target.value as Frequency;
              setFrequency(newFreq);
              if (newFreq !== 'monthly') setDayOfMonth(1);
              if (newFreq !== 'biweekly' && newFreq !== 'weekly') setAnchorDate('');
            }}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>

        {showFinancingDetails && (
          <div className="col-span-full rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              <FormField label="Total Amount Financed">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <CalculatorInput
                    value={loanPrincipal}
                    onChange={(val) => {
                      setLoanPrincipal(val);
                      if (!useCustomPayment) {
                        const pmt = calculateMonthlyPayment(val, loanAnnualRate, loanTermMonths);
                        setAmount(pmt);
                      }
                    }}
                    min={0}
                    required
                    className={`${calcInputClass} pl-7`}
                  />
                </div>
              </FormField>

              <FormField label="Term (months)">
                <Input
                  type="number"
                  value={loanTermMonths}
                  onChange={(e) => {
                    const term = Number(e.target.value);
                    setLoanTermMonths(term);
                    if (!useCustomPayment && loanPrincipal > 0) {
                      const pmt = calculateMonthlyPayment(loanPrincipal, loanAnnualRate, term);
                      setAmount(pmt);
                    }
                  }}
                  min={1}
                  max={360}
                />
              </FormField>

              <FormField label="Interest Rate (% APR)">
                <Input
                  type="number"
                  value={loanAnnualRate}
                  onChange={(e) => {
                    const rate = Number(e.target.value);
                    setLoanAnnualRate(rate);
                    if (!useCustomPayment && loanPrincipal > 0) {
                      const pmt = calculateMonthlyPayment(loanPrincipal, rate, loanTermMonths);
                      setAmount(pmt);
                    }
                  }}
                  min={0}
                  step={0.1}
                />
              </FormField>
            </div>

            {calculatedPayment > 0 && (
              <p className="text-sm">
                Calculated payment: <strong className="tabular-nums">${calculatedPayment.toLocaleString()}/mo</strong>
                {loanTermMonths > 0 && <span className="text-muted-foreground"> for {loanTermMonths} months</span>}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="custom-payment"
                checked={useCustomPayment}
                onCheckedChange={(checked) => {
                  setUseCustomPayment(checked === true);
                  if (!checked && calculatedPayment > 0) {
                    setAmount(calculatedPayment);
                  }
                }}
              />
              <label htmlFor="custom-payment" className="text-sm cursor-pointer">
                Use custom monthly payment instead
              </label>
            </div>
          </div>
        )}

        <FormField label="Amount">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <CalculatorInput
              value={amount}
              onChange={setAmount}
              min={0}
              required
              className={`${calcInputClass} pl-7`}
            />
          </div>
        </FormField>

        <FormField label="Account">
          <select className={selectClass} value={account} onChange={(e) => setAccount(e.target.value as AccountType)}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
        </FormField>

        {isTransfer && (
          <FormField label="Transfer To">
            <select className={selectClass} value={targetAccount} onChange={(e) => setTargetAccount(e.target.value as AccountType)}>
              <option value="savings">Savings</option>
              <option value="checking">Checking</option>
            </select>
          </FormField>
        )}

        {needsDayOfMonth && (
          <FormField label="Day of Month">
            <Input
              type="number"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
              min={1}
              max={28}
            />
          </FormField>
        )}

        {needsAnchorDate && (
          <FormField label="Reference Date" hint="A date this payment is known to occur">
            <Input
              type="date"
              value={anchorDate}
              onChange={(e) => setAnchorDate(e.target.value)}
            />
          </FormField>
        )}

        <FormField label={frequency === 'one-time' ? 'Date' : 'Start Date'}>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </FormField>

        {frequency !== 'one-time' && !showFinancingDetails && (
          <FormField label="End Date (optional)" hint="Leave blank if ongoing">
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormField>
        )}

        {showFinancingDetails && startDate && loanTermMonths > 0 && (
          <FormField label="Payments End">
            <p className="text-sm tabular-nums py-2">
              {new Date(addMonths(startDate, loanTermMonths) + 'T00:00:00').toLocaleDateString()}
              <span className="text-muted-foreground"> ({loanTermMonths} months from start)</span>
            </p>
          </FormField>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit">
          {stream ? 'Save Changes' : 'Add Stream'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
