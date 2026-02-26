import { useState, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import type { ScenarioConfig, CashStream, StreamType, ExpenseCategory, Frequency, Account } from '../engine';
import { StreamEditor } from '../components/StreamEditor';
import { AccountsSection } from '../components/AccountsSection';
import { CalculatorInput } from '../components/CalculatorInput';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
  const [addingStreamConfig, setAddingStreamConfig] = useState<{ type: StreamType; category?: ExpenseCategory } | null>(null);

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

  // Dialog state
  const editingStream = editingId ? baseline.streams.find((s) => s.id === editingId) ?? null : null;
  const isDialogOpen = editingStream !== null || addingStreamConfig !== null;

  function handleDialogClose() {
    setEditingId(null);
    setAddingStreamConfig(null);
  }

  function handleDialogSave(stream: CashStream) {
    if (editingId) {
      onUpdateStream(stream);
    } else {
      onAddStream(stream);
    }
    handleDialogClose();
  }

  function dialogTitle(): string {
    if (editingStream) return `Edit "${editingStream.name}"`;
    if (!addingStreamConfig) return 'Stream';
    const { type, category } = addingStreamConfig;
    if (type === 'income') return 'Add Income';
    if (type === 'transfer') return 'Add Transfer';
    if (category === 'variable') return 'Add Variable Expense';
    return 'Add Fixed Expense';
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Cash Flow</h1>
        <p className="text-sm text-muted-foreground">Your income, expenses, and accounts</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Monthly Income" value={formatCurrency(totals.totalIncome)} colorClass="text-income" />
        <SummaryCard label="Monthly Expenses" value={formatCurrency(totals.totalExpenses)} colorClass="text-expense" />
        <SummaryCard label="Transfers" value={formatCurrency(totals.totalTransfers)} colorClass="text-transfer" />
        <SummaryCard
          label="Net Cashflow"
          value={`${totals.netCashflow >= 0 ? '+' : ''}${formatCurrency(totals.netCashflow)}`}
          colorClass={totals.netCashflow >= 0 ? 'text-income' : 'text-expense'}
          className={cn(
            "border-l-4",
            totals.netCashflow >= 0 ? "border-l-income bg-income/5" : "border-l-expense bg-expense/5"
          )}
        />
      </div>

      {/* Setup Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-lg border bg-muted/50 p-4">
        <EditableBalance label="Safety Buffer" value={baseline.safetyBuffer} field="safetyBuffer" onChange={onSetupChange} />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Forecast Period</span>
          <span className="text-sm tabular-nums">{baseline.startDate} to {baseline.endDate}</span>
        </div>
      </div>

      {/* Accounts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Accounts</h2>
        <AccountsSection
          accounts={baseline.accounts || []}
          onAdd={onAddAccount}
          onUpdate={onUpdateAccount}
          onDelete={onDeleteAccount}
        />
      </section>

      {/* Stream Tables */}
      <WorksheetTable
        title="Income"
        streams={incomeStreams}
        subtotal={totals.totalIncome}
        colorClass="text-income"
        defaultType="income"
        onEdit={setEditingId}
        onDelete={onDeleteStream}
        onAdd={onAddStream}
        onAddFull={() => setAddingStreamConfig({ type: 'income' })}
        startDate={baseline.startDate}
        headerClassName="bg-income/5"
        emptyHint="No income streams yet. Add your paycheck or other income below."
      />

      <WorksheetTable
        title="Fixed Expenses"
        streams={fixedExpenses}
        subtotal={totals.totalFixed}
        colorClass="text-expense"
        defaultType="expense"
        defaultCategory="fixed"
        onEdit={setEditingId}
        onDelete={onDeleteStream}
        onAdd={onAddStream}
        onAddFull={() => setAddingStreamConfig({ type: 'expense', category: 'fixed' })}
        startDate={baseline.startDate}
        headerClassName="bg-expense/5"
        emptyHint="No fixed expenses yet. Add recurring bills like rent or insurance."
      />

      <WorksheetTable
        title="Variable Expenses"
        streams={variableExpenses}
        subtotal={totals.totalVariable}
        colorClass="text-expense"
        defaultType="expense"
        defaultCategory="variable"
        onEdit={setEditingId}
        onDelete={onDeleteStream}
        onAdd={onAddStream}
        onAddFull={() => setAddingStreamConfig({ type: 'expense', category: 'variable' })}
        startDate={baseline.startDate}
        headerClassName="bg-expense/5"
        emptyHint="No variable expenses yet. Add things like groceries or entertainment."
      />

      <WorksheetTable
        title="Transfers"
        streams={transferStreams}
        subtotal={totals.totalTransfers}
        colorClass="text-transfer"
        defaultType="transfer"
        onEdit={setEditingId}
        onDelete={onDeleteStream}
        onAdd={onAddStream}
        onAddFull={() => setAddingStreamConfig({ type: 'transfer' })}
        startDate={baseline.startDate}
        headerClassName="bg-transfer/5"
        emptyHint="No transfers set up. Add savings or investment contributions."
      />

      {/* Stream Editor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle()}</DialogTitle>
            <DialogDescription>
              {editingStream ? 'Update the details for this stream.' : 'Fill in the details for your new stream.'}
            </DialogDescription>
          </DialogHeader>
          {isDialogOpen && (
            <StreamEditor
              stream={editingStream ?? undefined}
              defaultType={addingStreamConfig?.type}
              defaultCategory={addingStreamConfig?.category}
              onSave={handleDialogSave}
              onCancel={handleDialogClose}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Summary Card ---------- */

function SummaryCard({ label, value, colorClass, className }: { label: string; value: string; colorClass: string; className?: string }) {
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="px-4 py-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold tabular-nums", colorClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- Editable Balance ---------- */

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
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Input
          type="number"
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="h-8 w-32 tabular-nums"
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 cursor-pointer group"
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm tabular-nums">
        {formatCurrency(value)}
        <span className="ml-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          click to edit
        </span>
      </span>
    </div>
  );
}

/* ---------- WorksheetTable ---------- */

interface WorksheetTableProps {
  title: string;
  streams: CashStream[];
  subtotal: number;
  colorClass: string;
  defaultType: StreamType;
  defaultCategory?: ExpenseCategory;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (stream: CashStream) => void;
  onAddFull?: () => void;
  startDate: string;
  headerClassName?: string;
  emptyHint?: string;
}

function WorksheetTable({
  title,
  streams,
  subtotal,
  colorClass,
  defaultType,
  defaultCategory,
  onEdit,
  onDelete,
  onAdd,
  onAddFull,
  startDate,
  headerClassName,
  emptyHint,
}: WorksheetTableProps) {
  const [quickName, setQuickName] = useState('');
  const [quickAmount, setQuickAmount] = useState(0);
  const [quickFrequency, setQuickFrequency] = useState<Frequency>('monthly');

  function handleQuickAdd() {
    const name = quickName.trim();
    const amount = quickAmount;
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
    setQuickAmount(0);
    setQuickFrequency('monthly');
  }

  function handleQuickKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  }

  return (
    <Card className="py-0 overflow-hidden">
      <div className={cn("flex items-center justify-between px-4 py-3 border-b bg-muted/30", headerClassName)}>
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="flex items-center gap-3">
          {onAddFull && (
            <Button variant="ghost" size="xs" onClick={onAddFull}>+ Add</Button>
          )}
          <span className={cn("text-sm font-semibold tabular-nums", colorClass)}>
            ~{formatCurrency(subtotal)}/mo
          </span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Monthly Est.</TableHead>
            <TableHead className="text-right w-[140px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {streams.length === 0 && emptyHint && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                {emptyHint}
              </TableCell>
            </TableRow>
          )}
          {streams.map((stream) => (
            <TableRow key={stream.id} className="group">
              <TableCell className="font-medium">{stream.name}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(stream.amount)}</TableCell>
              <TableCell>{FREQUENCY_LABELS[stream.frequency]}</TableCell>
              <TableCell>
                {ACCOUNT_LABELS[stream.account]}
                {stream.targetAccount && ` → ${ACCOUNT_LABELS[stream.targetAccount]}`}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {stream.frequency === 'one-time' ? '—' : formatCurrency(monthlyEquivalent(stream))}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <Button variant="ghost" size="xs" onClick={() => onEdit(stream.id)}>Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete &ldquo;{stream.name}&rdquo;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove this stream from your cash flow. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => onDelete(stream.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {/* Quick-add row */}
          <TableRow className="hover:bg-transparent bg-muted/40 border-t-2 border-dashed">
            <TableCell>
              <Input
                type="text"
                placeholder={`New ${title.toLowerCase()}...`}
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={handleQuickKeyDown}
                className="h-8"
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <CalculatorInput
                  value={quickAmount}
                  onChange={setQuickAmount}
                  min={0}
                  placeholder="0"
                  className="flex h-8 w-full min-w-0 rounded-md border border-input bg-transparent pl-7 pr-3 py-1 text-sm tabular-nums shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                />
              </div>
            </TableCell>
            <TableCell>
              <select
                className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={quickFrequency}
                onChange={(e) => setQuickFrequency(e.target.value as Frequency)}
              >
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                onClick={handleQuickAdd}
                disabled={!quickName.trim() || !quickAmount || quickAmount <= 0}
              >
                Add
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  );
}
