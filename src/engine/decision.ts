/**
 * Decision logic: apply modifications to a baseline scenario.
 *
 * A decision doesn't store a full copy of the baseline — it stores
 * only what changes. This function takes a baseline + decision config
 * and produces a complete ScenarioConfig ready for the forecast engine.
 */

import type { ScenarioConfig, DecisionConfig, CashStream } from './types';

/**
 * Apply a decision's modifications to a baseline scenario.
 *
 * Steps:
 * 1. Deep-copy the baseline (so we don't mutate the original)
 * 2. Remove any streams the decision wants to drop
 * 3. Apply modifications to existing streams
 * 4. Add new streams from the decision
 * 5. Adjust starting balances if the decision has upfront costs
 *
 * Returns a complete ScenarioConfig that can be passed to forecast().
 */
export function applyDecision(
  baseline: ScenarioConfig,
  decision: DecisionConfig
): ScenarioConfig {
  // Deep-copy baseline streams so we don't mutate the original
  let streams: CashStream[] = baseline.streams.map((s) => ({ ...s }));

  // Remove streams
  const removeSet = new Set(decision.removeStreamIds);
  streams = streams.filter((s) => !removeSet.has(s.id));

  // Modify existing streams
  for (const mod of decision.modifyStreams) {
    const idx = streams.findIndex((s) => s.id === mod.streamId);
    if (idx !== -1) {
      streams[idx] = { ...streams[idx], ...mod.changes };
    }
  }

  // Add new streams
  streams = [...streams, ...decision.addStreams];

  // Build the decision scenario config
  return {
    id: decision.id,
    name: decision.name,
    startDate: baseline.startDate,
    endDate: baseline.endDate,
    checkingBalance:
      baseline.checkingBalance + (decision.checkingBalanceAdjustment ?? 0),
    savingsBalance:
      baseline.savingsBalance + (decision.savingsBalanceAdjustment ?? 0),
    safetyBuffer: baseline.safetyBuffer,
    streams,
    accounts: baseline.accounts || [],
  };
}
