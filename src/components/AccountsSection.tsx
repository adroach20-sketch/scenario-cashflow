import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { Account, FinancialAccountType } from '../engine';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/lib/utils';

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
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex gap-6 rounded-lg border bg-muted/50 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Assets</span>
          <span className="text-sm font-semibold tabular-nums text-income">{formatCurrency(totalAssets)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Debts</span>
          <span className="text-sm font-semibold tabular-nums text-expense">{formatCurrency(totalDebts)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net Worth</span>
          <span className={cn("text-sm font-semibold tabular-nums", netWorth >= 0 ? "text-income" : "text-expense")}>
            {netWorth >= 0 ? '' : '-'}{formatCurrency(netWorth)}
          </span>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
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

        {/* Add Account Card */}
        <Card className="border-dashed py-4">
          <CardContent className="px-4 py-0 space-y-2">
            <Input
              type="text"
              placeholder="Account name..."
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              className="h-8"
            />
            <select
              className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={quickType}
              onChange={(e) => setQuickType(e.target.value as FinancialAccountType)}
            >
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                placeholder="0"
                value={quickBalance}
                onChange={(e) => setQuickBalance(e.target.value)}
                onKeyDown={handleQuickKeyDown}
                min={0}
                step={100}
                className="h-8 pl-7 tabular-nums"
              />
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={handleQuickAdd}
              disabled={!quickName.trim() || !quickBalance || isNaN(parseFloat(quickBalance))}
            >
              Add Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Account Card ---------- */

interface AccountCardProps {
  account: Account;
  onEdit: () => void;
}

function AccountCard({ account, onEdit }: AccountCardProps) {
  const debt = isDebt(account.accountType);
  return (
    <Card
      className={cn(
        "cursor-pointer py-4 transition-all hover:shadow-md group",
        debt ? "border-l-2 border-l-expense" : "border-l-2 border-l-income"
      )}
      onClick={onEdit}
    >
      <CardContent className="px-4 py-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{account.name}</span>
          <Badge variant={debt ? "debt" : "asset"}>
            {ACCOUNT_TYPE_LABELS[account.accountType]}
          </Badge>
        </div>
        <p className={cn("text-xl font-bold tabular-nums", debt ? "text-expense" : "text-income")}>
          {debt ? '-' : ''}{formatCurrency(account.balance)}
        </p>
        {debt && (account.interestRate || account.minimumPayment) && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {account.interestRate != null && (
              <span>{account.interestRate}% APR</span>
            )}
            {account.minimumPayment != null && (
              <span>{formatCurrency(account.minimumPayment)}/mo min</span>
            )}
          </div>
        )}
        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          click to edit
        </span>
      </CardContent>
    </Card>
  );
}

/* ---------- Account Editor ---------- */

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
    <Card className="py-4 ring-2 ring-ring">
      <CardContent className="px-4 py-0 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} autoFocus className="h-8" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Type</Label>
          <select
            className="h-8 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as FinancialAccountType)}
          >
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Balance</Label>
          <Input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} onKeyDown={handleKeyDown} min={0} step={100} className="h-8 tabular-nums" />
        </div>
        {debt && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Interest Rate (%)</Label>
              <Input type="number" value={interestRate || ''} onChange={(e) => setInterestRate(Number(e.target.value))} onKeyDown={handleKeyDown} min={0} step={0.1} placeholder="e.g. 22.9" className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min. Payment</Label>
              <Input type="number" value={minimumPayment || ''} onChange={(e) => setMinimumPayment(Number(e.target.value))} onKeyDown={handleKeyDown} min={0} step={10} placeholder="e.g. 85" className="h-8 tabular-nums" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Credit Limit</Label>
              <Input type="number" value={creditLimit || ''} onChange={(e) => setCreditLimit(Number(e.target.value))} onKeyDown={handleKeyDown} min={0} step={100} placeholder="e.g. 10000" className="h-8 tabular-nums" />
            </div>
          </>
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={handleSave}>Save</Button>
          <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete &ldquo;{account.name}&rdquo;?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove this account and its balance from your financial picture. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
