import { useState } from 'react';
import type { ScenarioConfig, DecisionConfig, ForecastResult } from '../engine';
import type { DecisionForecast } from '../hooks/useForecaster';
import type { Page } from '../components/AppShell';
import type { ScenarioSummary } from '../store/types';
import { ForecastChart } from '../components/ForecastChart';
import { MetricsPanel } from '../components/MetricsPanel';

const FREQ_LABELS: Record<string, string> = {
  weekly: '/wk',
  biweekly: '/2wk',
  semimonthly: '2x/mo',
  monthly: '/mo',
  'one-time': 'once',
};

interface ForecastPageProps {
  baseline: ScenarioConfig;
  decisions: DecisionConfig[];
  enabledDecisionIds: Set<string>;
  baselineResult: ForecastResult | null;
  decisionForecasts: DecisionForecast[];
  scenarioList: ScenarioSummary[];
  onNavigate: (page: Page) => void;
  onSwitchScenario: (scenarioId: string) => void;
}

export function ForecastPage({
  baseline,
  decisions,
  enabledDecisionIds,
  baselineResult,
  decisionForecasts,
  scenarioList,
  onNavigate,
  onSwitchScenario,
}: ForecastPageProps) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const allDecisionIds = decisions.map((d) => d.id);
  const enabledDecisions = decisions.filter((d) => enabledDecisionIds.has(d.id));

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Forecast</h1>
          <p className="subtitle">See how decisions change your financial future</p>
        </div>
        <div className="header-actions">
          <button onClick={() => onNavigate('scenarios')}>
            Edit Scenario
          </button>
        </div>
      </header>

      <div className="forecast-scenario-bar">
        <div className="forecast-scenario-bar-left">
          <span className="forecast-scenario-label">Viewing:</span>
          <span className="forecast-scenario-name">{baseline.name}</span>
          {enabledDecisions.length > 0 && (
            <span className="forecast-scenario-decisions">
              vs {enabledDecisions.map((d) => d.name).join(', ')}
            </span>
          )}
        </div>
        {scenarioList.length > 1 && (
          <select
            className="scenario-select"
            value=""
            onChange={(e) => {
              if (e.target.value) onSwitchScenario(e.target.value);
            }}
          >
            <option value="">Switch scenario...</option>
            {scenarioList
              .filter((s) => s.id !== baseline.id)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
          </select>
        )}
      </div>

      <button
        className="wizard-summary-toggle"
        onClick={() => setSummaryOpen(!summaryOpen)}
      >
        <span>Scenario Summary</span>
        <span className="wizard-summary-chevron">{summaryOpen ? '\u25BE' : '\u25B8'}</span>
      </button>

      {summaryOpen && (
        <div className="wizard-summary-body">
          <div className="wizard-summary-section">
            <h4>Accounts</h4>
            <div className="wizard-summary-chips">
              {(baseline.accounts || []).map((a) => (
                <span key={a.id} className="wizard-summary-chip">
                  {a.name}: ${a.balance.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
          {decisions.length > 0 && (
            <div className="wizard-summary-section">
              <h4>Decisions</h4>
              {decisions.map((d) => (
                <div key={d.id} className="wizard-summary-decision">
                  <strong>{d.name || 'Untitled'}</strong>
                  {(d.checkingBalanceAdjustment ?? 0) !== 0 && (
                    <span> &middot; Checking {(d.checkingBalanceAdjustment ?? 0) > 0 ? '+' : ''}${(d.checkingBalanceAdjustment ?? 0).toLocaleString()}</span>
                  )}
                  {(d.savingsBalanceAdjustment ?? 0) !== 0 && (
                    <span> &middot; Savings {(d.savingsBalanceAdjustment ?? 0) > 0 ? '+' : ''}${(d.savingsBalanceAdjustment ?? 0).toLocaleString()}</span>
                  )}
                  {d.addStreams.length > 0 && <span> &middot; {d.addStreams.length} new stream{d.addStreams.length > 1 ? 's' : ''}</span>}
                  {d.removeStreamIds.length > 0 && <span> &middot; {d.removeStreamIds.length} removed</span>}
                </div>
              ))}
            </div>
          )}
          {(baseline.disabledStreamIds?.length ?? 0) > 0 && (
            <div className="wizard-summary-section">
              <h4>Disabled Streams</h4>
              <div className="wizard-summary-chips">
                {baseline.streams
                  .filter((s) => baseline.disabledStreamIds?.includes(s.id))
                  .map((s) => (
                    <span key={s.id} className="wizard-summary-chip wizard-summary-chip-disabled">
                      {s.name}
                    </span>
                  ))}
              </div>
            </div>
          )}
          {Object.keys(baseline.streamOverrides ?? {}).length > 0 && (
            <div className="wizard-summary-section">
              <h4>Overridden Streams</h4>
              <div className="wizard-summary-chips">
                {baseline.streams
                  .filter((s) => (baseline.streamOverrides ?? {})[s.id])
                  .map((s) => {
                    const override = (baseline.streamOverrides ?? {})[s.id];
                    return (
                      <span key={s.id} className="wizard-summary-chip wizard-summary-chip-override">
                        {s.name}: ${s.amount.toLocaleString()} &rarr; ${override.amount?.toLocaleString()}{FREQ_LABELS[s.frequency]}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      <section className="section">
        <ForecastChart
          baselineResult={baselineResult}
          decisionForecasts={decisionForecasts}
          safetyBuffer={baseline.safetyBuffer}
          allDecisionIds={allDecisionIds}
        />
      </section>

      <section className="section">
        <MetricsPanel
          baselineMetrics={baselineResult?.metrics ?? null}
          decisionForecasts={decisionForecasts}
          allDecisionIds={allDecisionIds}
        />
      </section>
    </div>
  );
}
