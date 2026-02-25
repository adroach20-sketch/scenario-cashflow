/**
 * HTTP implementation of ScenarioStore.
 *
 * Talks to the Express API server. In dev, requests are proxied
 * through Vite (port 5173 → 3001). In production, same origin.
 */

import type { ScenarioConfig, DecisionConfig } from '../engine';
import type { ScenarioStore, ScenarioSummary } from './types';

const API_BASE = '/api';

export const apiStore: ScenarioStore = {
  async listScenarios(): Promise<ScenarioSummary[]> {
    const res = await fetch(`${API_BASE}/scenarios`);
    if (!res.ok) throw new Error(`Failed to list scenarios: ${res.statusText}`);
    return res.json();
  },

  async getScenario(id: string): Promise<ScenarioConfig | null> {
    const res = await fetch(`${API_BASE}/scenarios/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load scenario: ${res.statusText}`);
    return res.json();
  },

  async saveScenario(config: ScenarioConfig): Promise<void> {
    const res = await fetch(`${API_BASE}/scenarios/${config.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to save scenario: ${res.statusText}`);
  },

  async deleteScenario(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/scenarios/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete scenario: ${res.statusText}`);
  },

  async getBaseline(): Promise<ScenarioConfig | null> {
    const res = await fetch(`${API_BASE}/baseline`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`Failed to load baseline: ${res.statusText}`);
    return res.json();
  },

  async saveBaseline(config: ScenarioConfig): Promise<void> {
    const res = await fetch(`${API_BASE}/baseline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to save baseline: ${res.statusText}`);
  },

  async getDecisions(): Promise<DecisionConfig[]> {
    const res = await fetch(`${API_BASE}/decisions`);
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`Failed to load decisions: ${res.statusText}`);
    return res.json();
  },

  async getDecisionsForScenario(scenarioId: string): Promise<DecisionConfig[]> {
    const res = await fetch(`${API_BASE}/decisions/scenario/${scenarioId}`);
    if (res.status === 204) return [];
    if (!res.ok) throw new Error(`Failed to load decisions: ${res.statusText}`);
    return res.json();
  },

  async saveDecision(config: DecisionConfig): Promise<void> {
    const res = await fetch(`${API_BASE}/decisions/${config.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to save decision: ${res.statusText}`);
  },

  async deleteDecision(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/decisions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete decision: ${res.statusText}`);
  },

  async clear(): Promise<void> {
    const res = await fetch(`${API_BASE}/data`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to clear data: ${res.statusText}`);
  },
};
