/**
 * The main chart: daily checking balance for baseline vs N decisions.
 *
 * Uses Recharts to render overlaid lines with a safety buffer line.
 * Each decision gets a distinct color from the palette. The baseline
 * is always blue; decisions cycle through green, amber, purple, etc.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { ForecastResult } from '../engine';
import type { DecisionForecast } from '../hooks/useForecaster';

// Color palette for decision lines (checking solid, savings light/dashed)
export const DECISION_COLORS = [
  { main: '#16a34a', light: '#86efac' },  // green
  { main: '#d97706', light: '#fcd34d' },  // amber
  { main: '#9333ea', light: '#c4b5fd' },  // purple
  { main: '#dc2626', light: '#fca5a5' },  // red
  { main: '#0891b2', light: '#67e8f9' },  // cyan
  { main: '#be185d', light: '#f9a8d4' },  // pink
];

interface ForecastChartProps {
  baselineResult: ForecastResult | null;
  decisionForecasts: DecisionForecast[];
  safetyBuffer: number;
  /** Full decisions array (all, not just enabled) — used for stable color assignment */
  allDecisionIds: string[];
}

export function ForecastChart({
  baselineResult,
  decisionForecasts,
  safetyBuffer,
  allDecisionIds,
}: ForecastChartProps) {
  if (!baselineResult) {
    return (
      <div className="chart-empty">
        <p>Add income and expenses to see your forecast</p>
      </div>
    );
  }

  // Build chart data with dynamic keys per decision
  const data = baselineResult.daily.map((day, i) => {
    const point: Record<string, any> = {
      date: day.date,
      label: format(parseISO(day.date), 'MMM d'),
      baselineChecking: day.checking,
      baselineSavings: day.savings,
    };
    for (const df of decisionForecasts) {
      const snapshot = df.result.daily[i];
      if (snapshot) {
        point[`checking_${df.decision.id}`] = snapshot.checking;
        point[`savings_${df.decision.id}`] = snapshot.savings;
      }
    }
    return point;
  });

  // Stable color index: based on position in the full decisions array
  function colorFor(decisionId: string) {
    const idx = allDecisionIds.indexOf(decisionId);
    return DECISION_COLORS[(idx >= 0 ? idx : 0) % DECISION_COLORS.length];
  }

  const tickInterval = Math.max(1, Math.floor(data.length / 12));

  return (
    <div className="forecast-chart">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            interval={tickInterval}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Safety buffer line */}
          <ReferenceLine
            y={safetyBuffer}
            stroke="#ef4444"
            strokeDasharray="6 4"
            label={{
              value: `Buffer: $${safetyBuffer.toLocaleString()}`,
              position: 'right',
              fill: '#ef4444',
              fontSize: 11,
            }}
          />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />

          {/* Baseline checking */}
          <Line
            type="monotone"
            dataKey="baselineChecking"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            name="Baseline"
          />

          {/* Decision checking lines */}
          {decisionForecasts.map((df) => (
            <Line
              key={`checking_${df.decision.id}`}
              type="monotone"
              dataKey={`checking_${df.decision.id}`}
              stroke={colorFor(df.decision.id).main}
              strokeWidth={2}
              dot={false}
              name={df.decision.name}
            />
          ))}

          {/* Baseline savings (lighter, dashed) */}
          <Line
            type="monotone"
            dataKey="baselineSavings"
            stroke="#93c5fd"
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
            name="Baseline Savings"
          />

          {/* Decision savings lines */}
          {decisionForecasts.map((df) => (
            <Line
              key={`savings_${df.decision.id}`}
              type="monotone"
              dataKey={`savings_${df.decision.id}`}
              stroke={colorFor(df.decision.id).light}
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              name={`${df.decision.name} Savings`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Custom tooltip that shows balance details on hover. */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-date">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: ${entry.value?.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
        </p>
      ))}
    </div>
  );
}
