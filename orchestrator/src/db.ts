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

  CREATE INDEX IF NOT EXISTS idx_events_mission ON events(mission_id);
  CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
`);
