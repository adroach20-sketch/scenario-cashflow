/**
 * Scenario comparison: compute delta metrics between baseline and decision.
 *
 * This answers the key question: "How does the decision change my
 * financial fragility compared to doing nothing?"
 */

import type { ForecastMetrics, ComparisonMetrics } from './types';

/**
 * Compare two forecast results and compute the deltas.
 *
 * Convention:
 * - minCheckingDelta: positive = decision has a HIGHER low point (better)
 * - bufferDaysDelta: positive = decision has MORE days below buffer (worse)
 * - endingBalanceDelta: positive = decision ends with MORE money (better)
 */
export function compareScenarios(
  baseline: ForecastMetrics,
  decision: ForecastMetrics
): ComparisonMetrics {
  return {
    baseline,
    decision,
    minCheckingDelta: round2(decision.minChecking - baseline.minChecking),
    bufferDaysDelta:
      decision.daysCheckingBelowBuffer - baseline.daysCheckingBelowBuffer,
    endingBalanceDelta: round2(
      decision.endingChecking - baseline.endingChecking
    ),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
