/**
 * API route handlers.
 *
 * Simple endpoints matching the ScenarioStore interface:
 * - GET/PUT /api/baseline  — single baseline scenario with embedded streams
 * - GET/PUT/DELETE /api/decision — single decision with child records
 * - DELETE /api/data — clear everything
 */

import type { Express, Request, Response, NextFunction } from 'express';
import { getDb } from './db.js';

// ─── camelCase ↔ snake_case helpers ─────────────────────────────

interface ScenarioRow {
  id: string;
  user_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  checking_balance: number;
  savings_balance: number;
  safety_buffer: number;
}

interface StreamRow {
  id: string;
  scenario_id: string;
  name: string;
  amount: number;
  type: string;
  frequency: string;
  account: string;
  target_account: string | null;
  start_date: string;
  end_date: string | null;
  day_of_month: number | null;
  anchor_date: string | null;
}

interface DecisionRow {
  id: string;
  user_id: string | null;
  name: string;
  baseline_id: string;
  checking_balance_adjustment: number | null;
  savings_balance_adjustment: number | null;
}

function rowToStream(row: StreamRow) {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    type: row.type,
    frequency: row.frequency,
    account: row.account,
    ...(row.target_account && { targetAccount: row.target_account }),
    startDate: row.start_date,
    ...(row.end_date && { endDate: row.end_date }),
    ...(row.day_of_month != null && { dayOfMonth: row.day_of_month }),
    ...(row.anchor_date && { anchorDate: row.anchor_date }),
  };
}

function rowToScenario(row: ScenarioRow, streams: StreamRow[]) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    checkingBalance: row.checking_balance,
    savingsBalance: row.savings_balance,
    safetyBuffer: row.safety_buffer,
    streams: streams.map(rowToStream),
  };
}

function rowToDecision(
  row: DecisionRow,
  addStreams: StreamRow[],
  removeStreamIds: string[],
  modifyStreams: Array<{ stream_id: string; changes_json: string }>
) {
  return {
    id: row.id,
    name: row.name,
    baselineId: row.baseline_id,
    addStreams: addStreams.map(rowToStream),
    removeStreamIds,
    modifyStreams: modifyStreams.map((m) => ({
      streamId: m.stream_id,
      changes: JSON.parse(m.changes_json),
    })),
    ...(row.checking_balance_adjustment && {
      checkingBalanceAdjustment: row.checking_balance_adjustment,
    }),
    ...(row.savings_balance_adjustment && {
      savingsBalanceAdjustment: row.savings_balance_adjustment,
    }),
  };
}

// ─── Route registration ─────────────────────────────────────────

export function registerRoutes(app: Express): void {
  // ── GET /api/baseline ──────────────────────────────────────
  app.get('/api/baseline', (_req: Request, res: Response) => {
    const db = getDb();
    const scenario = db.prepare('SELECT * FROM scenarios LIMIT 1').get() as ScenarioRow | undefined;

    if (!scenario) {
      res.status(204).end();
      return;
    }

    const streams = db
      .prepare('SELECT * FROM streams WHERE scenario_id = ?')
      .all(scenario.id) as StreamRow[];

    res.json(rowToScenario(scenario, streams));
  });

  // ── PUT /api/baseline ──────────────────────────────────────
  app.put('/api/baseline', (req: Request, res: Response) => {
    const db = getDb();
    const config = req.body;

    const upsert = db.transaction(() => {
      // Delete existing scenario(s) — CASCADE removes streams
      db.prepare('DELETE FROM scenarios').run();

      // Insert the scenario
      db.prepare(`
        INSERT INTO scenarios (id, name, start_date, end_date, checking_balance, savings_balance, safety_buffer)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        config.id,
        config.name,
        config.startDate,
        config.endDate,
        config.checkingBalance,
        config.savingsBalance,
        config.safetyBuffer
      );

      // Insert all streams
      const insertStream = db.prepare(`
        INSERT INTO streams (id, scenario_id, name, amount, type, frequency, account, target_account, start_date, end_date, day_of_month, anchor_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const stream of config.streams || []) {
        insertStream.run(
          stream.id,
          config.id,
          stream.name,
          stream.amount,
          stream.type,
          stream.frequency,
          stream.account,
          stream.targetAccount || null,
          stream.startDate,
          stream.endDate || null,
          stream.dayOfMonth ?? null,
          stream.anchorDate || null
        );
      }
    });

    upsert();
    res.json({ ok: true });
  });

  // ── GET /api/decision ──────────────────────────────────────
  app.get('/api/decision', (_req: Request, res: Response) => {
    const db = getDb();
    const decision = db.prepare('SELECT * FROM decisions LIMIT 1').get() as DecisionRow | undefined;

    if (!decision) {
      res.status(204).end();
      return;
    }

    const addStreams = db
      .prepare('SELECT * FROM decision_add_streams WHERE decision_id = ?')
      .all(decision.id) as StreamRow[];

    const removeRows = db
      .prepare('SELECT stream_id FROM decision_remove_streams WHERE decision_id = ?')
      .all(decision.id) as Array<{ stream_id: string }>;
    const removeStreamIds = removeRows.map((r) => r.stream_id);

    const modifyRows = db
      .prepare('SELECT stream_id, changes_json FROM decision_modify_streams WHERE decision_id = ?')
      .all(decision.id) as Array<{ stream_id: string; changes_json: string }>;

    res.json(rowToDecision(decision, addStreams, removeStreamIds, modifyRows));
  });

  // ── PUT /api/decision ──────────────────────────────────────
  app.put('/api/decision', (req: Request, res: Response) => {
    const db = getDb();
    const config = req.body;

    const upsert = db.transaction(() => {
      // Delete existing decision(s) — CASCADE removes children
      db.prepare('DELETE FROM decisions').run();

      // Insert the decision
      db.prepare(`
        INSERT INTO decisions (id, name, baseline_id, checking_balance_adjustment, savings_balance_adjustment)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        config.id,
        config.name,
        config.baselineId,
        config.checkingBalanceAdjustment ?? 0,
        config.savingsBalanceAdjustment ?? 0
      );

      // Insert add-streams
      const insertStream = db.prepare(`
        INSERT INTO decision_add_streams (id, decision_id, name, amount, type, frequency, account, target_account, start_date, end_date, day_of_month, anchor_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const stream of config.addStreams || []) {
        insertStream.run(
          stream.id,
          config.id,
          stream.name,
          stream.amount,
          stream.type,
          stream.frequency,
          stream.account,
          stream.targetAccount || null,
          stream.startDate,
          stream.endDate || null,
          stream.dayOfMonth ?? null,
          stream.anchorDate || null
        );
      }

      // Insert remove-stream-ids
      const insertRemove = db.prepare(`
        INSERT INTO decision_remove_streams (decision_id, stream_id) VALUES (?, ?)
      `);

      for (const streamId of config.removeStreamIds || []) {
        insertRemove.run(config.id, streamId);
      }

      // Insert modify-streams
      const insertModify = db.prepare(`
        INSERT INTO decision_modify_streams (decision_id, stream_id, changes_json) VALUES (?, ?, ?)
      `);

      for (const mod of config.modifyStreams || []) {
        insertModify.run(config.id, mod.streamId, JSON.stringify(mod.changes));
      }
    });

    upsert();
    res.json({ ok: true });
  });

  // ── DELETE /api/decision ───────────────────────────────────
  app.delete('/api/decision', (_req: Request, res: Response) => {
    const db = getDb();
    db.prepare('DELETE FROM decisions').run();
    res.json({ ok: true });
  });

  // ── DELETE /api/data ───────────────────────────────────────
  app.delete('/api/data', (_req: Request, res: Response) => {
    const db = getDb();
    // Delete decisions first (foreign key on baseline_id → scenarios)
    db.prepare('DELETE FROM decisions').run();
    db.prepare('DELETE FROM scenarios').run();
    res.json({ ok: true });
  });

  // ── 404 catch-all for unknown API routes ───────────────────
  app.all('/api/{*splat}', (req: Request, res: Response) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
  });

  // ── Error handling middleware ──────────────────────────────
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[API Error] ${req.method} ${req.path}:`, err.message);
    res.status(500).json({ error: err.message });
  });
}
