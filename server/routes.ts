/**
 * API route handlers.
 *
 * Simple endpoints matching the ScenarioStore interface:
 * - GET/PUT /api/baseline  — single baseline scenario with embedded streams
 * - GET/PUT/DELETE /api/decision — single decision with child records
 * - DELETE /api/data — clear everything
 */

import type { Express, Request, Response, NextFunction } from 'express';
import { getPool } from './db.js';

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
  app.get('/api/baseline', async (_req: Request, res: Response) => {
    const pool = getPool();
    const { rows: scenarios } = await pool.query<ScenarioRow>(
      'SELECT * FROM scenarios LIMIT 1'
    );

    if (scenarios.length === 0) {
      res.status(204).end();
      return;
    }

    const scenario = scenarios[0];
    const { rows: streams } = await pool.query<StreamRow>(
      'SELECT * FROM streams WHERE scenario_id = $1',
      [scenario.id]
    );

    res.json(rowToScenario(scenario, streams));
  });

  // ── PUT /api/baseline ──────────────────────────────────────
  app.put('/api/baseline', async (req: Request, res: Response) => {
    const pool = getPool();
    const config = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing scenario(s) — CASCADE removes streams
      await client.query('DELETE FROM scenarios');

      // Insert the scenario
      await client.query(
        `INSERT INTO scenarios (id, name, start_date, end_date, checking_balance, savings_balance, safety_buffer)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          config.id,
          config.name,
          config.startDate,
          config.endDate,
          config.checkingBalance,
          config.savingsBalance,
          config.safetyBuffer,
        ]
      );

      // Insert all streams
      for (const stream of config.streams || []) {
        await client.query(
          `INSERT INTO streams (id, scenario_id, name, amount, type, frequency, account, target_account, start_date, end_date, day_of_month, anchor_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
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
            stream.anchorDate || null,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  });

  // ── GET /api/decision ──────────────────────────────────────
  app.get('/api/decision', async (_req: Request, res: Response) => {
    const pool = getPool();
    const { rows: decisions } = await pool.query<DecisionRow>(
      'SELECT * FROM decisions LIMIT 1'
    );

    if (decisions.length === 0) {
      res.status(204).end();
      return;
    }

    const decision = decisions[0];

    const { rows: addStreams } = await pool.query<StreamRow>(
      'SELECT * FROM decision_add_streams WHERE decision_id = $1',
      [decision.id]
    );

    const { rows: removeRows } = await pool.query<{ stream_id: string }>(
      'SELECT stream_id FROM decision_remove_streams WHERE decision_id = $1',
      [decision.id]
    );
    const removeStreamIds = removeRows.map((r) => r.stream_id);

    const { rows: modifyRows } = await pool.query<{
      stream_id: string;
      changes_json: string;
    }>(
      'SELECT stream_id, changes_json FROM decision_modify_streams WHERE decision_id = $1',
      [decision.id]
    );

    res.json(rowToDecision(decision, addStreams, removeStreamIds, modifyRows));
  });

  // ── PUT /api/decision ──────────────────────────────────────
  app.put('/api/decision', async (req: Request, res: Response) => {
    const pool = getPool();
    const config = req.body;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing decision(s) — CASCADE removes children
      await client.query('DELETE FROM decisions');

      // Insert the decision
      await client.query(
        `INSERT INTO decisions (id, name, baseline_id, checking_balance_adjustment, savings_balance_adjustment)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          config.id,
          config.name,
          config.baselineId,
          config.checkingBalanceAdjustment ?? 0,
          config.savingsBalanceAdjustment ?? 0,
        ]
      );

      // Insert add-streams
      for (const stream of config.addStreams || []) {
        await client.query(
          `INSERT INTO decision_add_streams (id, decision_id, name, amount, type, frequency, account, target_account, start_date, end_date, day_of_month, anchor_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
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
            stream.anchorDate || null,
          ]
        );
      }

      // Insert remove-stream-ids
      for (const streamId of config.removeStreamIds || []) {
        await client.query(
          'INSERT INTO decision_remove_streams (decision_id, stream_id) VALUES ($1, $2)',
          [config.id, streamId]
        );
      }

      // Insert modify-streams
      for (const mod of config.modifyStreams || []) {
        await client.query(
          'INSERT INTO decision_modify_streams (decision_id, stream_id, changes_json) VALUES ($1, $2, $3)',
          [config.id, mod.streamId, JSON.stringify(mod.changes)]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  });

  // ── DELETE /api/decision ───────────────────────────────────
  app.delete('/api/decision', async (_req: Request, res: Response) => {
    const pool = getPool();
    await pool.query('DELETE FROM decisions');
    res.json({ ok: true });
  });

  // ── DELETE /api/data ───────────────────────────────────────
  app.delete('/api/data', async (_req: Request, res: Response) => {
    const pool = getPool();
    // Delete decisions first (foreign key on baseline_id → scenarios)
    await pool.query('DELETE FROM decisions');
    await pool.query('DELETE FROM scenarios');
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
