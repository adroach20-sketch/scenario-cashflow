/**
 * API route handlers.
 *
 * Endpoints:
 * - GET    /api/scenarios          — list all scenarios (id, name, updatedAt)
 * - GET    /api/scenarios/:id      — load a full scenario with streams/accounts
 * - PUT    /api/scenarios/:id      — upsert a scenario
 * - DELETE /api/scenarios/:id      — delete a scenario and its children
 * - GET    /api/baseline           — load first scenario (backward compat)
 * - PUT    /api/baseline           — save/upsert single scenario (backward compat)
 * - GET    /api/decisions          — all decisions with child records
 * - GET    /api/decisions/scenario/:scenarioId — decisions for a specific scenario
 * - PUT    /api/decisions/:id      — upsert a single decision
 * - DELETE /api/decisions/:id      — delete a single decision
 * - DELETE /api/data               — clear everything
 */

import type { Express, Request, Response, NextFunction } from 'express';
import type { PoolClient } from 'pg';
import { getPool } from './db.js';

interface ScenarioRow {
  id: string;
  user_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  checking_balance: number;
  savings_balance: number;
  safety_buffer: number;
  disabled_stream_ids: string | null;
  stream_overrides: string | null;
  updated_at: string | null;
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
  category: string | null;
}

interface AccountRow {
  id: string;
  scenario_id: string;
  name: string;
  account_type: string;
  balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  credit_limit: number | null;
}

function rowToAccount(row: AccountRow) {
  return {
    id: row.id,
    name: row.name,
    accountType: row.account_type,
    balance: row.balance,
    ...(row.interest_rate != null && { interestRate: row.interest_rate }),
    ...(row.minimum_payment != null && { minimumPayment: row.minimum_payment }),
    ...(row.credit_limit != null && { creditLimit: row.credit_limit }),
  };
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
    ...(row.category && { category: row.category }),
  };
}

function rowToScenario(row: ScenarioRow, streams: StreamRow[], accounts: AccountRow[]) {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    checkingBalance: row.checking_balance,
    savingsBalance: row.savings_balance,
    safetyBuffer: row.safety_buffer,
    streams: streams.map(rowToStream),
    accounts: accounts.map(rowToAccount),
    ...(row.disabled_stream_ids && { disabledStreamIds: JSON.parse(row.disabled_stream_ids) }),
    ...(row.stream_overrides && { streamOverrides: JSON.parse(row.stream_overrides) }),
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
    ...(row.checking_balance_adjustment != null && {
      checkingBalanceAdjustment: row.checking_balance_adjustment,
    }),
    ...(row.savings_balance_adjustment != null && {
      savingsBalanceAdjustment: row.savings_balance_adjustment,
    }),
  };
}

async function loadDecisionChildren(pool: ReturnType<typeof getPool>, decisionId: string) {
  const { rows: addStreams } = await pool.query<StreamRow>(
    'SELECT * FROM decision_add_streams WHERE decision_id = $1',
    [decisionId]
  );

  const { rows: removeRows } = await pool.query<{ stream_id: string }>(
    'SELECT stream_id FROM decision_remove_streams WHERE decision_id = $1',
    [decisionId]
  );

  const { rows: modifyRows } = await pool.query<{
    stream_id: string;
    changes_json: string;
  }>(
    'SELECT stream_id, changes_json FROM decision_modify_streams WHERE decision_id = $1',
    [decisionId]
  );

  return {
    addStreams,
    removeStreamIds: removeRows.map((r) => r.stream_id),
    modifyRows,
  };
}

async function insertDecisionChildren(
  client: PoolClient,
  config: { id: string; addStreams?: any[]; removeStreamIds?: string[]; modifyStreams?: any[] }
) {
  for (const stream of config.addStreams || []) {
    await client.query(
      `INSERT INTO decision_add_streams (id, decision_id, name, amount, type, frequency, account, target_account, start_date, end_date, day_of_month, anchor_date, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
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
        stream.category || null,
      ]
    );
  }

  for (const streamId of config.removeStreamIds || []) {
    await client.query(
      'INSERT INTO decision_remove_streams (decision_id, stream_id) VALUES ($1, $2)',
      [config.id, streamId]
    );
  }

  for (const mod of config.modifyStreams || []) {
    await client.query(
      'INSERT INTO decision_modify_streams (decision_id, stream_id, changes_json) VALUES ($1, $2, $3)',
      [config.id, mod.streamId, JSON.stringify(mod.changes)]
    );
  }
}

async function upsertScenario(client: PoolClient, config: any) {
  await client.query(
    `INSERT INTO scenarios (id, name, start_date, end_date, checking_balance, savings_balance, safety_buffer, disabled_stream_ids, stream_overrides, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       start_date = EXCLUDED.start_date,
       end_date = EXCLUDED.end_date,
       checking_balance = EXCLUDED.checking_balance,
       savings_balance = EXCLUDED.savings_balance,
       safety_buffer = EXCLUDED.safety_buffer,
       disabled_stream_ids = EXCLUDED.disabled_stream_ids,
       stream_overrides = EXCLUDED.stream_overrides,
       updated_at = NOW()`,
    [
      config.id,
      config.name,
      config.startDate,
      config.endDate,
      config.checkingBalance,
      config.savingsBalance,
      config.safetyBuffer,
      config.disabledStreamIds ? JSON.stringify(config.disabledStreamIds) : null,
      config.streamOverrides ? JSON.stringify(config.streamOverrides) : null,
    ]
  );

  await client.query('DELETE FROM streams WHERE scenario_id = $1', [config.id]);
  await client.query('DELETE FROM accounts WHERE scenario_id = $1', [config.id]);

  for (const stream of config.streams || []) {
    await client.query(
      `INSERT INTO streams (id, scenario_id, name, amount, type, frequency, account, target_account, start_date, end_date, day_of_month, anchor_date, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
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
        stream.category || null,
      ]
    );
  }

  for (const acct of config.accounts || []) {
    await client.query(
      `INSERT INTO accounts (id, scenario_id, name, account_type, balance, interest_rate, minimum_payment, credit_limit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        acct.id,
        config.id,
        acct.name,
        acct.accountType,
        acct.balance,
        acct.interestRate ?? null,
        acct.minimumPayment ?? null,
        acct.creditLimit ?? null,
      ]
    );
  }
}

export function registerRoutes(app: Express): void {
  // ── GET /api/scenarios ───────────────────────────────────
  app.get('/api/scenarios', async (_req: Request, res: Response) => {
    const pool = getPool();
    const { rows } = await pool.query<{ id: string; name: string; updated_at: string }>(
      'SELECT id, name, updated_at FROM scenarios ORDER BY updated_at DESC'
    );
    res.json(rows.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updated_at })));
  });

  // ── GET /api/scenarios/:id ───────────────────────────────
  app.get('/api/scenarios/:id', async (req: Request, res: Response) => {
    const pool = getPool();
    const { rows: scenarios } = await pool.query<ScenarioRow>(
      'SELECT * FROM scenarios WHERE id = $1',
      [req.params.id]
    );

    if (scenarios.length === 0) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }

    const scenario = scenarios[0];
    const { rows: streams } = await pool.query<StreamRow>(
      'SELECT * FROM streams WHERE scenario_id = $1',
      [scenario.id]
    );
    const { rows: accounts } = await pool.query<AccountRow>(
      'SELECT * FROM accounts WHERE scenario_id = $1',
      [scenario.id]
    );

    res.json(rowToScenario(scenario, streams, accounts));
  });

  // ── PUT /api/scenarios/:id ───────────────────────────────
  app.put('/api/scenarios/:id', async (req: Request, res: Response) => {
    const pool = getPool();
    const config = req.body;
    config.id = req.params.id;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await upsertScenario(client, config);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  });

  // ── DELETE /api/scenarios/:id ────────────────────────────
  app.delete('/api/scenarios/:id', async (req: Request, res: Response) => {
    const pool = getPool();
    await pool.query('DELETE FROM decisions WHERE baseline_id = $1', [req.params.id]);
    await pool.query('DELETE FROM scenarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  // ── GET /api/baseline (backward compat) ──────────────────
  app.get('/api/baseline', async (_req: Request, res: Response) => {
    const pool = getPool();
    const { rows: scenarios } = await pool.query<ScenarioRow>(
      'SELECT * FROM scenarios ORDER BY updated_at DESC LIMIT 1'
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
    const { rows: accounts } = await pool.query<AccountRow>(
      'SELECT * FROM accounts WHERE scenario_id = $1',
      [scenario.id]
    );

    res.json(rowToScenario(scenario, streams, accounts));
  });

  // ── PUT /api/baseline (backward compat — upserts by ID) ──
  app.put('/api/baseline', async (req: Request, res: Response) => {
    const config = req.body;

    // Validate required fields
    const missing = ['id', 'name', 'startDate', 'endDate'].filter((f) => typeof config[f] !== 'string');
    const badNums = ['checkingBalance', 'savingsBalance', 'safetyBuffer'].filter((f) => typeof config[f] !== 'number');
    if (missing.length || badNums.length || !Array.isArray(config.streams)) {
      res.status(400).json({ error: `Missing or invalid fields: ${[...missing, ...badNums, ...(!Array.isArray(config.streams) ? ['streams'] : [])].join(', ')}` });
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await upsertScenario(client, config);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  });

  // ── GET /api/decisions ───────────────────────────────────
  app.get('/api/decisions', async (_req: Request, res: Response) => {
    const pool = getPool();
    const { rows: decisions } = await pool.query<DecisionRow>(
      'SELECT * FROM decisions ORDER BY created_at'
    );

    if (decisions.length === 0) {
      res.json([]);
      return;
    }

    const result = [];
    for (const decision of decisions) {
      const children = await loadDecisionChildren(pool, decision.id);
      result.push(
        rowToDecision(decision, children.addStreams, children.removeStreamIds, children.modifyRows)
      );
    }

    res.json(result);
  });

  // ── GET /api/decisions/scenario/:scenarioId ──────────────
  app.get('/api/decisions/scenario/:scenarioId', async (req: Request, res: Response) => {
    const pool = getPool();
    const { rows: decisions } = await pool.query<DecisionRow>(
      'SELECT * FROM decisions WHERE baseline_id = $1 ORDER BY created_at',
      [req.params.scenarioId]
    );

    if (decisions.length === 0) {
      res.json([]);
      return;
    }

    const result = [];
    for (const decision of decisions) {
      const children = await loadDecisionChildren(pool, decision.id);
      result.push(
        rowToDecision(decision, children.addStreams, children.removeStreamIds, children.modifyRows)
      );
    }

    res.json(result);
  });

  // ── PUT /api/decisions/:id ───────────────────────────────
  app.put('/api/decisions/:id', async (req: Request, res: Response) => {
    const config = req.body;
    const decisionId = req.params.id;

    // Validate required fields
    const missing = ['id', 'name', 'baselineId'].filter((f) => typeof config[f] !== 'string');
    if (missing.length) {
      res.status(400).json({ error: `Missing or invalid fields: ${missing.join(', ')}` });
      return;
    }
    if (config.id !== decisionId) {
      res.status(400).json({ error: `Body id "${config.id}" does not match URL id "${decisionId}"` });
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM decisions WHERE id = $1', [decisionId]);
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
      await insertDecisionChildren(client, config);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  });

  // ── DELETE /api/decisions/:id ────────────────────────────
  app.delete('/api/decisions/:id', async (req: Request, res: Response) => {
    const pool = getPool();
    await pool.query('DELETE FROM decisions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  // ── DELETE /api/data ─────────────────────────────────────
  app.delete('/api/data', async (_req: Request, res: Response) => {
    const pool = getPool();
    await pool.query('DELETE FROM decisions');
    await pool.query('DELETE FROM scenarios');
    res.json({ ok: true });
  });

  // ── 404 catch-all for unknown API routes ─────────────────
  app.all('/api/{*splat}', (req: Request, res: Response) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
  });

  // ── Error handling middleware ────────────────────────────
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[API Error] ${req.method} ${req.path}:`, err.message);
    res.status(500).json({ error: err.message });
  });
}
