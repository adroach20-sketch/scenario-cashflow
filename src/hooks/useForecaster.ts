/**
 * React hook that runs the forecasting engine and memoizes results.
 *
 * Recalculates automatically when the baseline or decision changes.
 * The engine runs in the browser — fast enough to update in real-time
 * as the user edits their scenario.
 */

import { useMemo } from 'react';
import {
  forecast,
  applyDecision,
  compareScenarios,
  type ScenarioConfig,
  type DecisionConfig,
  type ForecastResult,
  type ComparisonMetrics,
} from '../engine';

interface ForecasterOutput {
  baselineResult: ForecastResult | null;
  decisionResult: ForecastResult | null;
  comparison: ComparisonMetrics | null;
}

export function useForecaster(
  baseline: ScenarioConfig | null,
  decision: DecisionConfig | null
): ForecasterOutput {
  const baselineResult = useMemo(() => {
    if (!baseline || baseline.streams.length === 0) return null;
    return forecast(baseline);
  }, [baseline]);

  const decisionResult = useMemo(() => {
    if (!baseline || !decision) return null;
    const decisionConfig = applyDecision(baseline, decision);
    return forecast(decisionConfig);
  }, [baseline, decision]);

  const comparison = useMemo(() => {
    if (!baselineResult || !decisionResult) return null;
    return compareScenarios(baselineResult.metrics, decisionResult.metrics);
  }, [baselineResult, decisionResult]);

  return { baselineResult, decisionResult, comparison };
}
