/**
 * Summary metrics displayed below the chart.
 *
 * Shows key fragility indicators in a table format that scales to N decisions.
 * Columns: Metric | Baseline | Decision A | Decision B | ...
 * Color-coded deltas show whether each decision helps or hurts.
 */

import type { ForecastMetrics } from '../engine';
import type { DecisionForecast } from '../hooks/useForecaster';
import { DECISION_COLORS } from './ForecastChart';

interface MetricsPanelProps {
  baselineMetrics: ForecastMetrics | null;
  decisionForecasts: DecisionForecast[];
  /** Full decisions ID list for stable color mapping */
  allDecisionIds: string[];
}

interface MetricDef {
  label: string;
  getValue: (m: ForecastMetrics) => string;
  getSub?: (m: ForecastMetrics) => string | undefined;
  getDelta: (baseline: ForecastMetrics, decision: ForecastMetrics) => number;
  positiveIsGood: boolean;
}

const METRICS: MetricDef[] = [
  {
    label: 'Lowest Checking',
    getValue: (m) => formatCurrency(m.minChecking),
    getSub: (m) => m.minCheckingDate,
    getDelta: (b, d) => d.minChecking - b.minChecking,
    positiveIsGood: true,
  },
  {
    label: 'Days Below Buffer',
    getValue: (m) => `${m.daysCheckingBelowBuffer} days`,
    getDelta: (b, d) => d.daysCheckingBelowBuffer - b.daysCheckingBelowBuffer,
    positiveIsGood: false,
  },
  {
    label: 'Ending Balance',
    getValue: (m) => formatCurrency(m.endingChecking),
    getDelta: (b, d) => d.endingChecking - b.endingChecking,
    positiveIsGood: true,
  },
  {
    label: 'Days Below Zero',
    getValue: (m) => `${m.daysCheckingBelowZero} days`,
    getDelta: (b, d) => d.daysCheckingBelowZero - b.daysCheckingBelowZero,
    positiveIsGood: false,
  },
];

export function MetricsPanel({
  baselineMetrics,
  decisionForecasts,
  allDecisionIds,
}: MetricsPanelProps) {
  if (!baselineMetrics) return null;

  const hasDecisions = decisionForecasts.length > 0;

  function colorFor(decisionId: string) {
    const idx = allDecisionIds.indexOf(decisionId);
    return DECISION_COLORS[(idx >= 0 ? idx : 0) % DECISION_COLORS.length];
  }

  return (
    <div className="metrics-table-container">
      <table className="metrics-table">
        <thead>
          <tr>
            <th className="metrics-th metrics-th-label"></th>
            <th className="metrics-th">
              <span className="metrics-col-dot" style={{ background: '#2563eb' }} />
              Baseline
            </th>
            {decisionForecasts.map((df) => (
              <th key={df.decision.id} className="metrics-th">
                <span
                  className="metrics-col-dot"
                  style={{ background: colorFor(df.decision.id).main }}
                />
                {df.decision.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {METRICS.map((metric) => (
            <tr key={metric.label}>
              <td className="metrics-td metrics-td-label">{metric.label}</td>
              <td className="metrics-td">
                <span className="metrics-value">{metric.getValue(baselineMetrics)}</span>
                {metric.getSub && (
                  <span className="metrics-sub">{metric.getSub(baselineMetrics)}</span>
                )}
              </td>
              {decisionForecasts.map((df) => {
                const decisionMetrics = df.result.metrics;
                const delta = metric.getDelta(baselineMetrics, decisionMetrics);
                const deltaClass =
                  delta === 0
                    ? ''
                    : (delta > 0) === metric.positiveIsGood
                      ? 'metric-good'
                      : 'metric-bad';

                return (
                  <td key={df.decision.id} className="metrics-td">
                    <span className={`metrics-value ${deltaClass}`}>
                      {metric.getValue(decisionMetrics)}
                    </span>
                    {delta !== 0 && (
                      <span className={`metrics-delta ${deltaClass}`}>
                        {formatDelta(delta, metric.label.includes('days') || metric.label.includes('Days'))}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {!hasDecisions && (
        <p className="metrics-hint">Add a decision to compare against your baseline</p>
      )}
    </div>
  );
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDelta(value: number, isDays: boolean): string {
  const prefix = value > 0 ? '+' : '';
  if (isDays) return `${prefix}${value}`;
  return `${prefix}$${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
