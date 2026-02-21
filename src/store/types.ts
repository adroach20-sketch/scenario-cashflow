/**
 * Storage abstraction interface.
 *
 * Both localStorage (Phase 1-3) and the API client (Phase 4) implement
 * this same interface. Swapping storage backends is a one-line change.
 */

import type { ScenarioConfig, DecisionConfig } from '../engine';

export interface ScenarioStore {
  getBaseline(): Promise<ScenarioConfig | null>;
  saveBaseline(config: ScenarioConfig): Promise<void>;
  getDecision(): Promise<DecisionConfig | null>;
  saveDecision(config: DecisionConfig): Promise<void>;
  deleteDecision(): Promise<void>;
  clear(): Promise<void>;
}
