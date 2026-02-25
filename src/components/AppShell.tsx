export type Page = 'worksheet' | 'scenarios' | 'forecast';

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
            className={`nav-link ${activePage === 'worksheet' ? 'nav-active' : ''}`}
            onClick={() => onNavigate('worksheet')}
          >
            Accounts
          </button>
          <button
            className={`nav-link ${activePage === 'scenarios' ? 'nav-active' : ''}`}
            onClick={() => onNavigate('scenarios')}
          >
            Scenarios
          </button>
          <button
            className={`nav-link ${activePage === 'forecast' ? 'nav-active' : ''}`}
            onClick={() => onNavigate('forecast')}
          >
            Forecast
          </button>
        </div>
      </nav>
      <main className="app-main">{children}</main>
    </div>
  );
}
