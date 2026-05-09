import express from 'express';
import { json } from 'express';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { db } from './db.js';
import { spawnAgent, sendInput, killMission, getAgentConfig } from './spawn.js';
import { addClient } from './sse.js';
import { setupChannels } from './channels/index.js';
import { createRemoteRouter } from './remote/routes.js';
import type { Mission } from './types.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '9000', 10);

app.use(json());

// CORS for Nuxt frontend (dev)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL ?? 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// ====== MAIN API ======

// POST /api/agents/spawn
app.post('/api/agents/spawn', (req, res) => {
  const { agent_name, mission } = req.body as { agent_name: string; mission: string };
  if (!agent_name || !mission) {
    res.status(400).json({ error: 'agent_name and mission required' });
    return;
  }
  const config = getAgentConfig(agent_name);
  const missionId = spawnAgent(config, mission);
  res.json({ missionId });
});

// GET /api/missions/:id
app.get('/api/missions/:id', (req, res) => {
  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id) as Mission | undefined;
  if (!mission) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const events = db.prepare('SELECT * FROM events WHERE mission_id = ? ORDER BY timestamp ASC').all(req.params.id);
  res.json({ mission, events });
});

// GET /api/missions — list
app.get('/api/missions', (_req, res) => {
  const missions = db.prepare('SELECT * FROM missions ORDER BY created_at DESC LIMIT 100').all() as Mission[];
  res.json(missions);
});

// POST /api/agents/:id/send
app.post('/api/agents/:id/send', (req, res) => {
  const { input } = req.body as { input: string };
  const sent = sendInput(req.params.id, input);
  res.json({ sent });
});

// GET /api/missions/:id/output — final result text
app.get('/api/missions/:id/output', (req, res) => {
  const row = db.prepare(
    "SELECT payload FROM events WHERE mission_id = ? AND type = 'result' ORDER BY timestamp DESC LIMIT 1"
  ).get(req.params.id) as { payload: string } | undefined;
  const parsed = row ? JSON.parse(row.payload) as Record<string, unknown> : null;
  res.json({ output: parsed?.result ?? null });
});

// DELETE /api/missions/:id
app.delete('/api/missions/:id', (req, res) => {
  const killed = killMission(req.params.id);
  res.json({ killed });
});

// SSE stream per mission
app.get('/api/missions/:id/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  addClient(req.params.id, res);
});

// GET /api/agents — list from ~/.mos/agents directory
app.get('/api/agents', (_req, res) => {
  const agentsDir = join(homedir(), '.mos', 'agents');
  if (!existsSync(agentsDir)) {
    res.json([]);
    return;
  }
  const agents = readdirSync(agentsDir)
    .filter((f: string) => existsSync(join(agentsDir, f, 'config.json')))
    .map((name: string) => getAgentConfig(name));
  res.json(agents);
});

// ====== CHANNELS ======
const channelRouter = setupChannels();
app.use('/api/channels', channelRouter);

// ====== REMOTE CONTROL ======
const remoteRouter = createRemoteRouter();
app.use('/api/remote', remoteRouter);

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Max OS — 1 orchestrator running on :${PORT}`);
});
