import { useState, useEffect } from 'react';
import type { ScenarioConfig, DecisionConfig, ForecastResult } from '../engine';
import type { DecisionForecast } from '../hooks/useForecaster';
import type { Page } from '../components/AppShell';
import type { ScenarioSummary } from '../store/types';
import { apiStore } from '../store/apiClient';
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
  scenarioList: ScenarioSummary[];
  onSetupChange: (field: string, value: number | string) => void;
  onToggleStream: (streamId: string) => void;
  onOverrideStream: (streamId: string, amount: number | null) => void;
  onAddDecision: () => void;
  onUpdateDecision: (updated: DecisionConfig) => void;
  onDeleteDecision: (id: string) => void;
  onToggleDecision: (id: string) => void;
  onStartFresh: () => void;
  onNavigate: (page: Page) => void;
  onSwitchScenario: (scenarioId: string) => void;
  onNewScenario: () => void;
  onDeleteScenario: (scenarioId: string) => void;
  onImportDecisionAsStream: (scenarioId: string, decisionId: string) => void;
  onScenarioNameChange: (name: string) => void;
}

export function ForecastPage({
  baseline,
  decisions,
  enabledDecisionIds,
  baselineResult,
  decisionForecasts,
  isDemo,
  scenarioList,
  onSetupChange,
  onToggleStream,
  onOverrideStream,
  onAddDecision,
  onUpdateDecision,
  onDeleteDecision,
  onToggleDecision,
  onStartFresh,
  onNavigate,
  onSwitchScenario,
  onNewScenario,
  onDeleteScenario,
  onImportDecisionAsStream,
  onScenarioNameChange,
}: ForecastPageProps) {
  const [step, setStep] = useState<Step>('decision');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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

  const otherScenarios = scenarioList.filter((s) => s.id !== baseline.id);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Forecast</h1>
          <p className="subtitle">See how decisions change your financial future</p>
        </div>
        <div className="header-actions">
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
        </div>
      </header>

      {isDemo && (
        <div className="demo-banner">
          This is demo data. Click "Use My Numbers" to enter your own scenario.
        </div>
      )}

      <div className="scenario-picker">
        <div className="scenario-picker-left">
          <label className="scenario-picker-label">Scenario:</label>
          <input
            className="scenario-name-input"
            type="text"
            value={baseline.name}
            onChange={(e) => onScenarioNameChange(e.target.value)}
          />
        </div>
        <div className="scenario-picker-right">
          {otherScenarios.length > 0 && (
            <select
              className="scenario-select"
              value=""
              onChange={(e) => {
                if (e.target.value) onSwitchScenario(e.target.value);
              }}
            >
              <option value="">Switch scenario...</option>
              {otherScenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button className="scenario-new-btn" onClick={onNewScenario}>+ New</button>
          {scenarioList.length > 1 && (
            <button
              className="scenario-delete-btn"
              onClick={() => {
                if (confirm(`Delete "${baseline.name}"?`)) {
                  onDeleteScenario(baseline.id);
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            className={`wizard-step ${s.key === step ? 'wizard-step-active' : ''} ${i < stepIndex ? 'wizard-step-done' : ''}`}
            onClick={() => setStep(s.key)}
          >
            <span className="wizard-step-number">{i < stepIndex ? '\u2713' : s.number}</span>
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

              {otherScenarios.length > 0 && (
                <div className="import-section">
                  <button
                    className="import-btn"
                    onClick={() => setShowImportModal(true)}
                  >
                    Import from previous forecast
                  </button>
                  <span className="import-hint">Add a previous decision's net monthly impact as a stream</span>
                </div>
              )}

              {showImportModal && (
                <ImportModal
                  scenarios={otherScenarios}
                  onImport={(scenarioId, decisionId) => {
                    onImportDecisionAsStream(scenarioId, decisionId);
                    setShowImportModal(false);
                  }}
                  onClose={() => setShowImportModal(false)}
                />
              )}
            </div>
            <div className="wizard-nav">
              <div />
              <button className="primary" onClick={goNext}>
                Next: Review Accounts &rarr;
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
                Edit accounts on the Accounts page &rarr;
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
              <button onClick={goBack}>&larr; Back</button>
              <button className="primary" onClick={goNext}>
                Next: Adjust Streams &rarr;
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
                    Add streams on the Accounts page &rarr;
                  </button>
                </div>
              )}
            </div>
            <div className="wizard-nav">
              <button onClick={goBack}>&larr; Back</button>
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
                &larr; Modify Scenario
              </button>
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
        )}
      </div>
    </div>
  );
}

interface ImportModalProps {
  scenarios: ScenarioSummary[];
  onImport: (scenarioId: string, decisionId: string) => void;
  onClose: () => void;
}

function ImportModal({ scenarios, onImport, onClose }: ImportModalProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [availableDecisions, setAvailableDecisions] = useState<DecisionConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedScenarioId) {
      setAvailableDecisions([]);
      return;
    }
    setLoading(true);
    apiStore.getDecisionsForScenario(selectedScenarioId).then((decisions) => {
      setAvailableDecisions(decisions);
      setLoading(false);
    });
  }, [selectedScenarioId]);

  return (
    <div className="import-modal-backdrop" onClick={onClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="import-modal-header">
          <h3>Import from Previous Forecast</h3>
          <button className="import-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="import-modal-body">
          <p className="import-modal-desc">
            Select a scenario and decision. Its net monthly impact will be added as a new stream in your current scenario.
          </p>
          <div className="setup-field">
            <label>Scenario</label>
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
            >
              <option value="">Select a scenario...</option>
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {loading && <p className="import-modal-loading">Loading decisions...</p>}

          {selectedScenarioId && !loading && availableDecisions.length === 0 && (
            <p className="import-modal-empty">No decisions in this scenario</p>
          )}

          {availableDecisions.length > 0 && (
            <div className="import-decision-list">
              {availableDecisions.map((d) => (
                <button
                  key={d.id}
                  className="import-decision-item"
                  onClick={() => onImport(selectedScenarioId, d.id)}
                >
                  <span className="import-decision-name">{d.name || 'Untitled'}</span>
                  <span className="import-decision-detail">
                    {d.addStreams.length > 0 && `${d.addStreams.length} stream${d.addStreams.length > 1 ? 's' : ''}`}
                    {d.addStreams.length > 0 && d.removeStreamIds.length > 0 && ' · '}
                    {d.removeStreamIds.length > 0 && `${d.removeStreamIds.length} removed`}
                  </span>
                  <span className="import-decision-arrow">&rarr;</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
