import type { Account, FinancialAccountType } from '../engine';
import { cn } from "@/lib/utils";

export type Page = 'worksheet' | 'scenarios' | 'forecast';

interface AppShellProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  accounts?: Account[];
  children: React.ReactNode;
}

const NAV_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'worksheet', label: 'Cash Flow', icon: '💰' },
  { page: 'scenarios', label: 'Scenarios', icon: '⚡' },
  { page: 'forecast', label: 'Forecast', icon: '📈' },
];

type AccountGroup = {
  label: string;
  types: FinancialAccountType[];
  isDebt: boolean;
};

const ACCOUNT_GROUPS: AccountGroup[] = [
  { label: 'CASH', types: ['checking', 'savings'], isDebt: false },
  { label: 'CREDIT', types: ['credit-card'], isDebt: true },
  { label: 'LOANS', types: ['loan'], isDebt: true },
  { label: 'INVESTMENTS', types: ['investment'], isDebt: false },
];

function formatBalance(value: number): string {
  return '$' + Math.round(Math.abs(value)).toLocaleString();
}

export function AppShell({ activePage, onNavigate, accounts = [], children }: AppShellProps) {
  return (
    <div className="grid grid-cols-[240px_1fr] min-h-screen">
      {/* Sidebar */}
      <aside className="bg-sidebar text-sidebar-foreground flex flex-col overflow-hidden">
        {/* App Name */}
        <div className="px-5 py-5">
          <h1 className="text-base font-bold tracking-tight text-white">
            Scenario Cashflow
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 px-3 mb-4">
          {NAV_ITEMS.map(({ page, label, icon }) => (
            <button
              key={page}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                "border-0 cursor-pointer text-left w-full",
                activePage === page
                  ? "bg-sidebar-accent text-white"
                  : "bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              onClick={() => onNavigate(page)}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Account List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-3">
          {ACCOUNT_GROUPS.map((group) => {
            const groupAccounts = accounts.filter((a) =>
              group.types.includes(a.accountType)
            );
            if (groupAccounts.length === 0) return null;

            const groupTotal = groupAccounts.reduce((sum, a) => sum + a.balance, 0);

            return (
              <div key={group.label}>
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[0.6875rem] font-semibold tracking-wider text-sidebar-muted">
                    {group.label}
                  </span>
                  <span className={cn(
                    "text-xs font-semibold tabular-nums",
                    group.isDebt ? "text-expense" : "text-sidebar-foreground"
                  )}>
                    {group.isDebt ? '-' : ''}{formatBalance(groupTotal)}
                  </span>
                </div>
                {groupAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between px-2 py-1 rounded text-sm"
                  >
                    <span className="truncate mr-2 text-sidebar-foreground/80">
                      {account.name}
                    </span>
                    <span className={cn(
                      "tabular-nums text-xs font-medium flex-shrink-0",
                      group.isDebt
                        ? "text-expense bg-expense/15 px-1.5 py-0.5 rounded"
                        : "text-sidebar-foreground"
                    )}>
                      {group.isDebt ? '-' : ''}{formatBalance(account.balance)}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="px-3 py-3 border-t border-sidebar-accent/30">
          <button
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent transition-colors border-0 cursor-pointer"
            onClick={() => onNavigate('worksheet')}
          >
            + Add Account
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="overflow-y-auto bg-background">
        <div className="mx-auto max-w-[1100px] px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
