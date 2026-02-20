/**
 * localStorage implementation of ScenarioStore.
 *
 * Simple key-value storage in the browser. Data persists across page
 * reloads but is lost if the user clears their browser data.
 * Will be swapped for API client in Phase 4.
 */

import type { ScenarioConfig, DecisionConfig } from '../engine';
import type { ScenarioStore } from './types';

const BASELINE_KEY = 'scenario-cashflow:baseline';
const DECISION_KEY = 'scenario-cashflow:decision';

export const localStorageStore: ScenarioStore = {
  async getBaseline(): Promise<ScenarioConfig | null> {
    const raw = localStorage.getItem(BASELINE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async saveBaseline(config: ScenarioConfig): Promise<void> {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(config));
  },

  async getDecision(): Promise<DecisionConfig | null> {
    const raw = localStorage.getItem(DECISION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  async saveDecision(config: DecisionConfig): Promise<void> {
    localStorage.setItem(DECISION_KEY, JSON.stringify(config));
  },

  async clear(): Promise<void> {
    localStorage.removeItem(BASELINE_KEY);
    localStorage.removeItem(DECISION_KEY);
  },
};
