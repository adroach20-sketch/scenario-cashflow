/**
 * The main chart: daily checking balance for baseline vs decision.
 *
 * Uses Recharts to render two overlaid lines with a safety buffer line.
 * This is the visual centerpiece of the app — the thing that makes
 * fragility obvious at a glance.
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

interface ForecastChartProps {
  baselineResult: ForecastResult | null;
  decisionResult: ForecastResult | null;
  safetyBuffer: number;
}

interface ChartDataPoint {
  date: string;
  label: string;
  baselineChecking?: number;
  baselineSavings?: number;
  decisionChecking?: number;
  decisionSavings?: number;
}

export function ForecastChart({
  baselineResult,
  decisionResult,
  safetyBuffer,
}: ForecastChartProps) {
  if (!baselineResult) {
    return (
      <div className="chart-empty">
        <p>Add income and expenses to see your forecast</p>
      </div>
    );
  }

  // Merge baseline and decision data into a single array for Recharts
  const data: ChartDataPoint[] = baselineResult.daily.map((day, i) => {
    const point: ChartDataPoint = {
      date: day.date,
      label: format(parseISO(day.date), 'MMM d'),
      baselineChecking: day.checking,
      baselineSavings: day.savings,
    };
    if (decisionResult && decisionResult.daily[i]) {
      point.decisionChecking = decisionResult.daily[i].checking;
      point.decisionSavings = decisionResult.daily[i].savings;
    }
    return point;
  });

  // Sample data points for the X axis (show ~12 labels, not 365)
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

          {/* Zero line if balances might go negative */}
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

          {/* Decision checking */}
          {decisionResult && (
            <Line
              type="monotone"
              dataKey="decisionChecking"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
              name="Decision"
            />
          )}

          {/* Savings lines (lighter, secondary) */}
          <Line
            type="monotone"
            dataKey="baselineSavings"
            stroke="#93c5fd"
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
            name="Baseline Savings"
          />

          {decisionResult && (
            <Line
              type="monotone"
              dataKey="decisionSavings"
              stroke="#86efac"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              name="Decision Savings"
            />
          )}
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
