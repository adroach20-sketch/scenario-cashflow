/**
 * Database initialization and helpers.
 *
 * Connects to PostgreSQL via DATABASE_URL and creates all tables on first run.
 */

import pg from 'pg';
const { Pool } = pg;

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return pool;
}

export async function initDb(): Promise<void> {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
  });

  // Create all tables (idempotent)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      checking_balance REAL NOT NULL,
      savings_balance REAL NOT NULL,
      safety_buffer REAL NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS streams (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      account TEXT NOT NULL,
      target_account TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      day_of_month INTEGER,
      anchor_date TEXT,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      baseline_id TEXT NOT NULL,
      checking_balance_adjustment REAL DEFAULT 0,
      savings_balance_adjustment REAL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (baseline_id) REFERENCES scenarios(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS decision_add_streams (
      id TEXT PRIMARY KEY,
      decision_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      account TEXT NOT NULL,
      target_account TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      day_of_month INTEGER,
      anchor_date TEXT,
      FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS decision_remove_streams (
      decision_id TEXT NOT NULL,
      stream_id TEXT NOT NULL,
      PRIMARY KEY (decision_id, stream_id),
      FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS decision_modify_streams (
      id SERIAL PRIMARY KEY,
      decision_id TEXT NOT NULL,
      stream_id TEXT NOT NULL,
      changes_json TEXT NOT NULL,
      FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE
    );
  `);

  // v1.2: Add category column for expense grouping (fixed vs variable)
  await pool.query(`ALTER TABLE streams ADD COLUMN IF NOT EXISTS category TEXT`);
  await pool.query(`ALTER TABLE decision_add_streams ADD COLUMN IF NOT EXISTS category TEXT`);

  // v1.3: Add accounts table for tracking financial accounts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      scenario_id TEXT NOT NULL,
      name TEXT NOT NULL,
      account_type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      interest_rate REAL,
      minimum_payment REAL,
      credit_limit REAL,
      FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
    )
  `);

  // v1.4: Add scenario-level stream toggle/override columns
  await pool.query(`ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS disabled_stream_ids TEXT`);
  await pool.query(`ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS stream_overrides TEXT`);

  console.log('Database initialized (PostgreSQL)');
}
