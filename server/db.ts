/**
 * Database initialization and helpers.
 *
 * Creates the SQLite database and all tables on first run.
 * Uses WAL mode for better read performance.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'cashflow.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function initDb(): void {
  // Create the data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create all tables (idempotent)
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      checking_balance REAL NOT NULL,
      savings_balance REAL NOT NULL,
      safety_buffer REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_id TEXT NOT NULL,
      stream_id TEXT NOT NULL,
      changes_json TEXT NOT NULL,
      FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE
    );
  `);

  console.log(`Database initialized at ${DB_PATH}`);
}
