/**
 * localStorage implementation of ScenarioStore.
 *
 * Simple key-value storage in the browser. Data persists across page
 * reloads but is lost if the user clears their browser data.
 * Kept as a fallback reference — the API client is the active store.
 */

import type { ScenarioConfig, DecisionConfig } from '../engine';
import type { ScenarioStore, ScenarioSummary } from './types';

const BASELINE_KEY = 'scenario-cashflow:baseline';
const DECISIONS_KEY = 'scenario-cashflow:decisions';

export const localStorageStore: ScenarioStore = {
  async listScenarios(): Promise<ScenarioSummary[]> {
    const baseline = await this.getBaseline();
    if (!baseline) return [];
    return [{ id: baseline.id, name: baseline.name, updatedAt: new Date().toISOString() }];
  },

  async getScenario(id: string): Promise<ScenarioConfig | null> {
    const baseline = await this.getBaseline();
    return baseline && baseline.id === id ? baseline : null;
  },

  async saveScenario(config: ScenarioConfig): Promise<void> {
    await this.saveBaseline(config);
  },

  async deleteScenario(_id: string): Promise<void> {
    localStorage.removeItem(BASELINE_KEY);
  },

  async getBaseline(): Promise<ScenarioConfig | null> {
    const raw = localStorage.getItem(BASELINE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async saveBaseline(config: ScenarioConfig): Promise<void> {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(config));
  },

  async getDecisions(): Promise<DecisionConfig[]> {
    const raw = localStorage.getItem(DECISIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async getDecisionsForScenario(_scenarioId: string): Promise<DecisionConfig[]> {
    return this.getDecisions();
  },

  async saveDecision(config: DecisionConfig): Promise<void> {
    const existing = await this.getDecisions();
    const idx = existing.findIndex((d) => d.id === config.id);
    if (idx >= 0) {
      existing[idx] = config;
    } else {
      existing.push(config);
    }
    localStorage.setItem(DECISIONS_KEY, JSON.stringify(existing));
  },

  async deleteDecision(id: string): Promise<void> {
    const existing = await this.getDecisions();
    localStorage.setItem(
      DECISIONS_KEY,
      JSON.stringify(existing.filter((d) => d.id !== id))
    );
  },

  async clear(): Promise<void> {
    localStorage.removeItem(BASELINE_KEY);
    localStorage.removeItem(DECISIONS_KEY);
  },
};
