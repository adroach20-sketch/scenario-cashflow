/**
 * Summary metrics displayed below the chart.
 *
 * Shows key fragility indicators in a table format that scales to N decisions.
 */

import type { ForecastMetrics } from '../engine';
import type { DecisionForecast } from '../hooks/useForecaster';
import { DECISION_COLORS } from './ForecastChart';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface MetricsPanelProps {
  baselineMetrics: ForecastMetrics | null;
  decisionForecasts: DecisionForecast[];
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
    <Card className="p-5 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[140px]"></TableHead>
            <TableHead className="whitespace-nowrap">
              <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: 'var(--primary)' }} />
              Baseline
            </TableHead>
            {decisionForecasts.map((df) => (
              <TableHead key={df.decision.id} className="whitespace-nowrap">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                  style={{ background: colorFor(df.decision.id).main }}
                />
                {df.decision.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {METRICS.map((metric) => (
            <TableRow key={metric.label}>
              <TableCell className="font-medium whitespace-nowrap">{metric.label}</TableCell>
              <TableCell>
                <span className="font-semibold tabular-nums">{metric.getValue(baselineMetrics)}</span>
                {metric.getSub && (
                  <span className="block text-xs text-muted-foreground mt-0.5">{metric.getSub(baselineMetrics)}</span>
                )}
              </TableCell>
              {decisionForecasts.map((df) => {
                const decisionMetrics = df.result.metrics;
                const delta = metric.getDelta(baselineMetrics, decisionMetrics);
                const isGood = delta === 0 ? null : (delta > 0) === metric.positiveIsGood;

                return (
                  <TableCell key={df.decision.id}>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      isGood === true && "text-income",
                      isGood === false && "text-expense"
                    )}>
                      {metric.getValue(decisionMetrics)}
                    </span>
                    {delta !== 0 && (
                      <span className={cn(
                        "block text-xs font-semibold mt-0.5 tabular-nums",
                        isGood === true && "text-income",
                        isGood === false && "text-expense"
                      )}>
                        {formatDelta(delta, metric.label.includes('days') || metric.label.includes('Days'))}
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!hasDecisions && (
        <p className="text-center text-muted-foreground text-sm mt-3">Add a decision to compare against your baseline</p>
      )}
    </Card>
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
