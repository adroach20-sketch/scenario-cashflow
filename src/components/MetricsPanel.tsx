/**
 * Summary metric cards displayed below the chart.
 *
 * Shows the key fragility indicators: lowest balance, days below buffer,
 * ending balance. When a decision exists, shows baseline vs decision
 * with color coding (green = better, red = worse).
 */

import type { ComparisonMetrics, ForecastMetrics } from '../engine';

interface MetricsPanelProps {
  baselineMetrics: ForecastMetrics | null;
  comparison: ComparisonMetrics | null;
}

export function MetricsPanel({ baselineMetrics, comparison }: MetricsPanelProps) {
  if (!baselineMetrics) return null;

  const hasDecision = comparison !== null;

  return (
    <div className="metrics-panel">
      <MetricCard
        label="Lowest Checking Balance"
        baselineValue={formatCurrency(baselineMetrics.minChecking)}
        baselineSub={baselineMetrics.minCheckingDate}
        decisionValue={hasDecision ? formatCurrency(comparison!.decision.minChecking) : undefined}
        decisionSub={hasDecision ? comparison!.decision.minCheckingDate : undefined}
        delta={hasDecision ? comparison!.minCheckingDelta : undefined}
        positiveIsGood={true}
      />
      <MetricCard
        label="Days Below Buffer"
        baselineValue={`${baselineMetrics.daysCheckingBelowBuffer} days`}
        decisionValue={hasDecision ? `${comparison!.decision.daysCheckingBelowBuffer} days` : undefined}
        delta={hasDecision ? comparison!.bufferDaysDelta : undefined}
        positiveIsGood={false}
      />
      <MetricCard
        label="Ending Checking Balance"
        baselineValue={formatCurrency(baselineMetrics.endingChecking)}
        decisionValue={hasDecision ? formatCurrency(comparison!.decision.endingChecking) : undefined}
        delta={hasDecision ? comparison!.endingBalanceDelta : undefined}
        positiveIsGood={true}
      />
      <MetricCard
        label="Days Below Zero"
        baselineValue={`${baselineMetrics.daysCheckingBelowZero} days`}
        decisionValue={hasDecision ? `${comparison!.decision.daysCheckingBelowZero} days` : undefined}
        delta={hasDecision ? (comparison!.decision.daysCheckingBelowZero - baselineMetrics.daysCheckingBelowZero) : undefined}
        positiveIsGood={false}
      />
    </div>
  );
}

interface MetricCardProps {
  label: string;
  baselineValue: string;
  baselineSub?: string;
  decisionValue?: string;
  decisionSub?: string;
  delta?: number;
  positiveIsGood: boolean; // true = positive delta is green, false = positive is red
}

function MetricCard({
  label,
  baselineValue,
  baselineSub,
  decisionValue,
  decisionSub,
  delta,
  positiveIsGood,
}: MetricCardProps) {
  const deltaClass =
    delta === undefined || delta === 0
      ? ''
      : (delta > 0) === positiveIsGood
        ? 'metric-good'
        : 'metric-bad';

  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-values">
        <div className="metric-baseline">
          <span className="metric-tag">Baseline</span>
          <span className="metric-value">{baselineValue}</span>
          {baselineSub && <span className="metric-sub">{baselineSub}</span>}
        </div>
        {decisionValue !== undefined && (
          <div className="metric-decision">
            <span className="metric-tag">Decision</span>
            <span className={`metric-value ${deltaClass}`}>{decisionValue}</span>
            {decisionSub && <span className="metric-sub">{decisionSub}</span>}
          </div>
        )}
      </div>
      {delta !== undefined && delta !== 0 && (
        <div className={`metric-delta ${deltaClass}`}>
          {delta > 0 ? '+' : ''}{typeof delta === 'number' && Math.abs(delta) > 1 ? formatDelta(delta) : delta}
        </div>
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

function formatDelta(value: number): string {
  const prefix = value > 0 ? '+' : '';
  // If it looks like currency (large number), format as currency
  if (Math.abs(value) >= 10) {
    return `${prefix}$${value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  return `${prefix}${value}`;
}
