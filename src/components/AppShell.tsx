import { cn } from "@/lib/utils";

export type Page = 'worksheet' | 'scenarios' | 'forecast';

interface AppShellProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-30 flex items-center gap-8 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14">
        <span className="text-base font-bold tracking-tight text-foreground">
          Scenario Cashflow
        </span>
        <div className="flex items-center gap-1">
          {(['worksheet', 'scenarios', 'forecast'] as const).map((page) => {
            const labels: Record<Page, string> = {
              worksheet: 'Cash Flow',
              scenarios: 'Scenarios',
              forecast: 'Forecast',
            };
            return (
              <button
                key={page}
                className={cn(
                  "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "border-0 shadow-none bg-transparent cursor-pointer",
                  activePage === page
                    ? "text-foreground after:absolute after:bottom-[-13px] after:left-0 after:right-0 after:h-[2px] after:bg-foreground"
                    : "text-muted-foreground"
                )}
                onClick={() => onNavigate(page)}
              >
                {labels[page]}
              </button>
            );
          })}
        </div>
      </nav>
      <main className="mx-auto max-w-[1100px] px-6 py-6">{children}</main>
    </div>
  );
}
