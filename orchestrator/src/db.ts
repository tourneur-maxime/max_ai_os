import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DB_PATH = path.join(os.homedir(), '.mos', 'orchestrator.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS missions (
    id TEXT PRIMARY KEY,
    agent_name TEXT NOT NULL,
    input TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    source_channel TEXT,
    created_at INTEGER NOT NULL,
    finished_at INTEGER,
    cost_usd REAL,
    tokens_in INTEGER,
    tokens_out INTEGER
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    payload TEXT NOT NULL,
    FOREIGN KEY (mission_id) REFERENCES missions(id)
  );

  CREATE TABLE IF NOT EXISTS remote_tokens (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    call_count INTEGER NOT NULL DEFAULT 0,
    last_called_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    agent_name TEXT,
    status TEXT NOT NULL DEFAULT 'backlog',
    mission_id TEXT,
    domain TEXT DEFAULT 'ops',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    command TEXT NOT NULL,
    agent_name TEXT,
    category TEXT DEFAULT 'Dev',
    source TEXT DEFAULT 'Custom',
    active INTEGER NOT NULL DEFAULT 1,
    yaml_def TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    input_template TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    last_run_at INTEGER,
    last_mission_id TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_events_mission ON events(mission_id);
  CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`);

const migrations = [
  'ALTER TABLE missions ADD COLUMN parent_mission_id TEXT',
  'ALTER TABLE missions ADD COLUMN callback_url TEXT',
  'CREATE INDEX IF NOT EXISTS idx_missions_parent ON missions(parent_mission_id)',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* colonne/index déjà existant */ }
}
