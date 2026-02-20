/**
 * Setup panel: starting balances, safety buffer, and forecast date range.
 * This is the first thing the user configures.
 */

interface SetupPanelProps {
  checkingBalance: number;
  savingsBalance: number;
  safetyBuffer: number;
  startDate: string;
  endDate: string;
  onChange: (field: string, value: number | string) => void;
}

export function SetupPanel({
  checkingBalance,
  savingsBalance,
  safetyBuffer,
  startDate,
  endDate,
  onChange,
}: SetupPanelProps) {
  return (
    <div className="setup-panel">
      <h2>Starting Balances</h2>
      <div className="setup-grid">
        <div className="setup-field">
          <label htmlFor="checking">Checking Account</label>
          <div className="input-with-prefix">
            <span className="input-prefix">$</span>
            <input
              id="checking"
              type="number"
              value={checkingBalance}
              onChange={(e) => onChange('checkingBalance', Number(e.target.value))}
              step={100}
            />
          </div>
        </div>
        <div className="setup-field">
          <label htmlFor="savings">Savings Account</label>
          <div className="input-with-prefix">
            <span className="input-prefix">$</span>
            <input
              id="savings"
              type="number"
              value={savingsBalance}
              onChange={(e) => onChange('savingsBalance', Number(e.target.value))}
              step={100}
            />
          </div>
        </div>
        <div className="setup-field">
          <label htmlFor="buffer">Safety Buffer</label>
          <div className="input-with-prefix">
            <span className="input-prefix">$</span>
            <input
              id="buffer"
              type="number"
              value={safetyBuffer}
              onChange={(e) => onChange('safetyBuffer', Number(e.target.value))}
              step={500}
            />
          </div>
          <span className="field-hint">Minimum comfortable checking balance</span>
        </div>
      </div>

      <h2>Forecast Range</h2>
      <div className="setup-grid">
        <div className="setup-field">
          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onChange('startDate', e.target.value)}
          />
        </div>
        <div className="setup-field">
          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => onChange('endDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
