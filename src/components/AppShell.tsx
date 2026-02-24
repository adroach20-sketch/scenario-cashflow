/**
 * Top-level navigation shell.
 *
 * Wraps the entire app with a nav bar and main content area.
 * Pages are switched via a simple state variable — no router needed
 * since we only have 2-3 pages.
 */

export type Page = 'forecast' | 'worksheet';

interface AppShellProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

export function AppShell({ activePage, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <nav className="app-nav">
        <span className="app-nav-brand">Scenario Cashflow</span>
        <div className="app-nav-links">
          <button
            className={`nav-link ${activePage === 'forecast' ? 'nav-active' : ''}`}
            onClick={() => onNavigate('forecast')}
          >
            Forecast
          </button>
          <button
            className="nav-link nav-disabled"
            disabled
            title="Coming soon"
          >
            Worksheet
          </button>
        </div>
      </nav>
      <main className="app-main">{children}</main>
    </div>
  );
}
