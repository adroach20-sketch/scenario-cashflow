/**
 * Setup panel: safety buffer and forecast date range.
 * Starting balances are managed on the Accounts page.
 */

interface SetupPanelProps {
  safetyBuffer: number;
  startDate: string;
  endDate: string;
  onChange: (field: string, value: number | string) => void;
}

export function SetupPanel({
  safetyBuffer,
  startDate,
  endDate,
  onChange,
}: SetupPanelProps) {
  return (
    <div className="setup-panel">
      <h2>Forecast Settings</h2>
      <div className="setup-grid">
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
          <span className="field-hint">Minimum checking balance you're comfortable with. Days below this get flagged in the forecast.</span>
        </div>
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
