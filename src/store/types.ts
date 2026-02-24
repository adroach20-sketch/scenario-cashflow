/**
 * Storage abstraction interface.
 *
 * Both localStorage and the API client implement this same interface.
 * Swapping storage backends is a one-line change.
 */

import type { ScenarioConfig, DecisionConfig } from '../engine';

export interface ScenarioStore {
  getBaseline(): Promise<ScenarioConfig | null>;
  saveBaseline(config: ScenarioConfig): Promise<void>;
  getDecisions(): Promise<DecisionConfig[]>;
  saveDecision(config: DecisionConfig): Promise<void>;
  deleteDecision(id: string): Promise<void>;
  clear(): Promise<void>;
}
