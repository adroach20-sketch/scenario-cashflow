/**
 * HTTP implementation of ScenarioStore.
 *
 * Talks to the Express API server. In dev, requests are proxied
 * through Vite (port 5173 → 3001). In production, same origin.
 */

import type { ScenarioConfig, DecisionConfig } from '../engine';
import type { ScenarioStore } from './types';

const API_BASE = '/api';

export const apiStore: ScenarioStore = {
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

  async getDecision(): Promise<DecisionConfig | null> {
    const res = await fetch(`${API_BASE}/decision`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`Failed to load decision: ${res.statusText}`);
    return res.json();
  },

  async saveDecision(config: DecisionConfig): Promise<void> {
    const res = await fetch(`${API_BASE}/decision`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Failed to save decision: ${res.statusText}`);
  },

  async deleteDecision(): Promise<void> {
    const res = await fetch(`${API_BASE}/decision`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to delete decision: ${res.statusText}`);
  },

  async clear(): Promise<void> {
    const res = await fetch(`${API_BASE}/data`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to clear data: ${res.statusText}`);
  },
};
