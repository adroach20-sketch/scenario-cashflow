/**
 * React hook that runs the forecasting engine and memoizes results.
 *
 * Computes baseline forecast once, then runs each enabled decision
 * through the engine and compares against baseline. Results update
 * in real-time as the user edits their scenario.
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

export interface DecisionForecast {
  decision: DecisionConfig;
  result: ForecastResult;
  comparison: ComparisonMetrics;
}

export interface ForecasterOutput {
  baselineResult: ForecastResult | null;
  decisionForecasts: DecisionForecast[];
}

export function useForecaster(
  baseline: ScenarioConfig | null,
  decisions: DecisionConfig[],
  enabledDecisionIds: Set<string>
): ForecasterOutput {
  const baselineResult = useMemo(() => {
    if (!baseline || baseline.streams.length === 0) return null;
    return forecast(baseline);
  }, [baseline]);

  const decisionForecasts = useMemo(() => {
    if (!baseline || !baselineResult) return [];

    return decisions
      .filter((d) => enabledDecisionIds.has(d.id))
      .map((decision) => {
        const decisionConfig = applyDecision(baseline, decision);
        const result = forecast(decisionConfig);
        const comparison = compareScenarios(baselineResult.metrics, result.metrics);
        return { decision, result, comparison };
      });
  }, [baseline, baselineResult, decisions, enabledDecisionIds]);

  return { baselineResult, decisionForecasts };
}
