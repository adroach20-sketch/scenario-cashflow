/**
 * Storage abstraction interface.
 *
 * Both localStorage and the API client implement this same interface.
 * Swapping storage backends is a one-line change.
 */

import type { ScenarioConfig, DecisionConfig } from '../engine';

export interface ScenarioSummary {
  id: string;
  name: string;
  updatedAt: string;
}

export interface ScenarioStore {
  listScenarios(): Promise<ScenarioSummary[]>;
  getScenario(id: string): Promise<ScenarioConfig | null>;
  saveScenario(config: ScenarioConfig): Promise<void>;
  deleteScenario(id: string): Promise<void>;
  getBaseline(): Promise<ScenarioConfig | null>;
  saveBaseline(config: ScenarioConfig): Promise<void>;
  getDecisions(): Promise<DecisionConfig[]>;
  getDecisionsForScenario(scenarioId: string): Promise<DecisionConfig[]>;
  saveDecision(config: DecisionConfig): Promise<void>;
  deleteDecision(id: string): Promise<void>;
  clear(): Promise<void>;
}
