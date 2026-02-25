/**
 * Forecast page — the main view.
 *
 * Displays the chart, metrics, setup panel, streams, and decision panels.
 * This was extracted from App.tsx so App can focus on state management
 * while pages handle layout and rendering.
 */

import type { ScenarioConfig, DecisionConfig, CashStream, ForecastResult } from '../engine';
import type { DecisionForecast } from '../hooks/useForecaster';
import { SetupPanel } from '../components/SetupPanel';
import { StreamList } from '../components/StreamList';
import { DecisionList } from '../components/DecisionList';
import { ForecastChart } from '../components/ForecastChart';
import { MetricsPanel } from '../components/MetricsPanel';

interface ForecastPageProps {
  baseline: ScenarioConfig;
  decisions: DecisionConfig[];
  enabledDecisionIds: Set<string>;
  baselineResult: ForecastResult | null;
  decisionForecasts: DecisionForecast[];
  isDemo: boolean;
  onSetupChange: (field: string, value: number | string) => void;
  onAddStream: (stream: CashStream) => void;
  onUpdateStream: (updated: CashStream) => void;
  onDeleteStream: (streamId: string) => void;
  onAddDecision: () => void;
  onUpdateDecision: (updated: DecisionConfig) => void;
  onDeleteDecision: (id: string) => void;
  onToggleDecision: (id: string) => void;
  onStartFresh: () => void;
}

export function ForecastPage({
  baseline,
  decisions,
  enabledDecisionIds,
  baselineResult,
  decisionForecasts,
  isDemo,
  onSetupChange,
  onAddStream,
  onUpdateStream,
  onDeleteStream,
  onAddDecision,
  onUpdateDecision,
  onDeleteDecision,
  onToggleDecision,
  onStartFresh,
}: ForecastPageProps) {
  const allDecisionIds = decisions.map((d) => d.id);

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

      {/* Chart — the centerpiece */}
      <section className="section">
        <ForecastChart
          baselineResult={baselineResult}
          decisionForecasts={decisionForecasts}
          safetyBuffer={baseline.safetyBuffer}
          allDecisionIds={allDecisionIds}
        />
      </section>

      {/* Metrics */}
      <section className="section">
        <MetricsPanel
          baselineMetrics={baselineResult?.metrics ?? null}
          decisionForecasts={decisionForecasts}
          allDecisionIds={allDecisionIds}
        />
      </section>

      {/* Setup */}
      <section className="section">
        <SetupPanel
          safetyBuffer={baseline.safetyBuffer}
          startDate={baseline.startDate}
          endDate={baseline.endDate}
          onChange={onSetupChange}
        />
      </section>

      {/* Baseline streams */}
      <section className="section">
        <StreamList
          streams={baseline.streams}
          onAdd={onAddStream}
          onUpdate={onUpdateStream}
          onDelete={onDeleteStream}
        />
      </section>

      {/* Decision scenarios */}
      <section className="section">
        <h2>Decision Scenarios</h2>
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
      </section>
    </div>
  );
}
