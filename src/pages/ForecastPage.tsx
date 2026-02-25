import { useState } from 'react';
import type { ScenarioConfig, DecisionConfig, ForecastResult } from '../engine';
import type { DecisionForecast } from '../hooks/useForecaster';
import type { Page } from '../components/AppShell';
import { SetupPanel } from '../components/SetupPanel';
import { StreamToggleList } from '../components/StreamToggleList';
import { DecisionList } from '../components/DecisionList';
import { ForecastChart } from '../components/ForecastChart';
import { MetricsPanel } from '../components/MetricsPanel';

type Step = 'decision' | 'accounts' | 'streams' | 'results';

const STEPS: { key: Step; label: string; number: number }[] = [
  { key: 'decision', label: 'Decision', number: 1 },
  { key: 'accounts', label: 'Accounts & Settings', number: 2 },
  { key: 'streams', label: 'Adjust Streams', number: 3 },
  { key: 'results', label: 'Results', number: 4 },
];

interface ForecastPageProps {
  baseline: ScenarioConfig;
  decisions: DecisionConfig[];
  enabledDecisionIds: Set<string>;
  baselineResult: ForecastResult | null;
  decisionForecasts: DecisionForecast[];
  isDemo: boolean;
  onSetupChange: (field: string, value: number | string) => void;
  onToggleStream: (streamId: string) => void;
  onOverrideStream: (streamId: string, amount: number | null) => void;
  onAddDecision: () => void;
  onUpdateDecision: (updated: DecisionConfig) => void;
  onDeleteDecision: (id: string) => void;
  onToggleDecision: (id: string) => void;
  onStartFresh: () => void;
  onNavigate: (page: Page) => void;
}

export function ForecastPage({
  baseline,
  decisions,
  enabledDecisionIds,
  baselineResult,
  decisionForecasts,
  isDemo,
  onSetupChange,
  onToggleStream,
  onOverrideStream,
  onAddDecision,
  onUpdateDecision,
  onDeleteDecision,
  onToggleDecision,
  onStartFresh,
  onNavigate,
}: ForecastPageProps) {
  const [step, setStep] = useState<Step>('decision');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const allDecisionIds = decisions.map((d) => d.id);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1].key);
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      setStep(STEPS[stepIndex - 1].key);
    }
  }

  const FREQ_LABELS: Record<string, string> = {
    weekly: '/wk',
    biweekly: '/2wk',
    semimonthly: '2x/mo',
    monthly: '/mo',
    'one-time': 'once',
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Forecast</h1>
          <p className="subtitle">See how decisions change your financial future</p>
        </div>
        {isDemo && (
          <button className="primary" onClick={onStartFresh}>
            Use My Numbers
          </button>
        )}
        {!isDemo && (
          <button onClick={onStartFresh}>
            Start Over
          </button>
        )}
      </header>

      {isDemo && (
        <div className="demo-banner">
          This is demo data. Click "Use My Numbers" to enter your own scenario.
        </div>
      )}

      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            className={`wizard-step ${s.key === step ? 'wizard-step-active' : ''} ${i < stepIndex ? 'wizard-step-done' : ''}`}
            onClick={() => setStep(s.key)}
          >
            <span className="wizard-step-number">{s.key === 'results' ? '✓' : s.number}</span>
            <span className="wizard-step-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="wizard-content">
        {step === 'decision' && (
          <div className="wizard-panel">
            <h2>What are you considering?</h2>
            <p className="subtitle">Describe the financial decision — a purchase, investment, or life change</p>
            <div className="wizard-panel-body">
              <DecisionList
                decisions={decisions}
                enabledDecisionIds={enabledDecisionIds}
                baselineStreams={baseline.streams}
                baselineId={baseline.id}
                allDecisionIds={allDecisionIds}
                onAdd={onAddDecision}
                onUpdate={onUpdateDecision}
                onDelete={onDeleteDecision}
                onToggle={onToggleDecision}
              />
            </div>
            <div className="wizard-nav">
              <div />
              <button className="primary" onClick={goNext}>
                Next: Review Accounts →
              </button>
            </div>
          </div>
        )}

        {step === 'accounts' && (
          <div className="wizard-panel">
            <h2>Your Accounts & Settings</h2>
            <p className="subtitle">Confirm your starting balances and forecast settings</p>
            <div className="wizard-panel-body">
              <div className="wizard-accounts-grid">
                {(baseline.accounts || []).map((account) => (
                  <div key={account.id} className="wizard-account-card">
                    <div className="wizard-account-name">{account.name}</div>
                    <div className="wizard-account-type">{account.accountType}</div>
                    <div className={`wizard-account-balance ${(account.accountType === 'credit-card' || account.accountType === 'loan') ? 'negative' : ''}`}>
                      ${Math.abs(account.balance).toLocaleString()}
                    </div>
                    {account.accountType === 'credit-card' && account.creditLimit && (
                      <div className="wizard-account-detail">Limit: ${account.creditLimit.toLocaleString()}</div>
                    )}
                    {(account.accountType === 'credit-card' || account.accountType === 'loan') && account.interestRate && (
                      <div className="wizard-account-detail">{account.interestRate}% APR</div>
                    )}
                  </div>
                ))}
              </div>
              {(baseline.accounts || []).length === 0 && (
                <p className="wizard-empty">No accounts set up yet.</p>
              )}
              <button
                className="wizard-edit-link"
                onClick={() => onNavigate('worksheet')}
              >
                Edit accounts on the Accounts page →
              </button>

              <div className="wizard-divider" />

              <SetupPanel
                safetyBuffer={baseline.safetyBuffer}
                startDate={baseline.startDate}
                endDate={baseline.endDate}
                onChange={onSetupChange}
              />
            </div>
            <div className="wizard-nav">
              <button onClick={goBack}>← Back</button>
              <button className="primary" onClick={goNext}>
                Next: Adjust Streams →
              </button>
            </div>
          </div>
        )}

        {step === 'streams' && (
          <div className="wizard-panel">
            <h2>Adjust Streams</h2>
            <p className="subtitle">Toggle streams on/off or click an amount to override it for this forecast</p>
            <div className="wizard-panel-body">
              {baseline.streams.length > 0 ? (
                <StreamToggleList
                  streams={baseline.streams}
                  disabledStreamIds={baseline.disabledStreamIds ?? []}
                  streamOverrides={baseline.streamOverrides ?? {}}
                  onToggle={onToggleStream}
                  onOverride={onOverrideStream}
                />
              ) : (
                <div className="wizard-empty">
                  <p>No income or expense streams yet.</p>
                  <button
                    className="wizard-edit-link"
                    onClick={() => onNavigate('worksheet')}
                  >
                    Add streams on the Accounts page →
                  </button>
                </div>
              )}
            </div>
            <div className="wizard-nav">
              <button onClick={goBack}>← Back</button>
              <button className="primary wizard-run-btn" onClick={goNext}>
                Run Forecast
              </button>
            </div>
          </div>
        )}

        {step === 'results' && (
          <div className="wizard-panel">
            <div className="wizard-results-header">
              <h2>Forecast Results</h2>
              <button onClick={() => setStep('decision')}>
                ← Modify Scenario
              </button>
            </div>

            <button
              className="wizard-summary-toggle"
              onClick={() => setSummaryOpen(!summaryOpen)}
            >
              <span>Scenario Summary</span>
              <span className="wizard-summary-chevron">{summaryOpen ? '▾' : '▸'}</span>
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
                          <span> · Checking {(d.checkingBalanceAdjustment ?? 0) > 0 ? '+' : ''}${(d.checkingBalanceAdjustment ?? 0).toLocaleString()}</span>
                        )}
                        {(d.savingsBalanceAdjustment ?? 0) !== 0 && (
                          <span> · Savings {(d.savingsBalanceAdjustment ?? 0) > 0 ? '+' : ''}${(d.savingsBalanceAdjustment ?? 0).toLocaleString()}</span>
                        )}
                        {d.addStreams.length > 0 && <span> · {d.addStreams.length} new stream{d.addStreams.length > 1 ? 's' : ''}</span>}
                        {d.removeStreamIds.length > 0 && <span> · {d.removeStreamIds.length} removed</span>}
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
                              {s.name}: ${s.amount.toLocaleString()} → ${override.amount?.toLocaleString()}{FREQ_LABELS[s.frequency]}
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
        )}
      </div>
    </div>
  );
}
