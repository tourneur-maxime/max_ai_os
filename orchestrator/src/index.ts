import express from 'express';
import { json } from 'express';
import fs from 'fs';
import path from 'path';

import os from 'os';
import { db } from './db.js';
import { spawnAgent, sendInput, killMission, getAgentConfig } from './spawn.js';
import { addClient, addGlobalClient } from './sse.js';
import { setupChannels } from './channels/index.js';
import { createChannelApiRouter } from './channels/api.js';
import { createRemoteRouter } from './remote/routes.js';
import { createStatsRouter } from './routes/stats.js';
import { createTasksRouter } from './routes/tasks.js';
import { createSkillsRouter } from './routes/skills.js';
import { createMemoryRouter } from './routes/memory.js';
import { createSchedulesRouter } from './routes/schedules.js';
import { seedLoyaltyAgents } from './seed-loyalty.js';
import { autoSetup } from './setup.js';
import { startScheduler } from './scheduler.js';
import type { Mission } from './types.js';

autoSetup();
seedLoyaltyAgents();

const app = express();
const PORT = parseInt(process.env.PORT ?? '9000', 10);

app.use(json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL ?? 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// ====== MISSIONS ======

app.post('/api/agents/spawn', (req, res) => {
  const { agent_name, mission, withHistory } = req.body as { agent_name: string; mission: string; withHistory?: boolean };
  if (!agent_name || !mission) {
    res.status(400).json({ error: 'agent_name and mission required' });
    return;
  }
  const config = getAgentConfig(agent_name);

  let missionInput = mission;
  if (withHistory) {
    const rows = db.prepare(`
      SELECT m.input, e.payload
      FROM missions m
      JOIN events e ON e.mission_id = m.id
      WHERE m.agent_name = ? AND e.type = 'result' AND m.status = 'done'
      ORDER BY m.created_at DESC LIMIT 10
    `).all(agent_name) as { input: string; payload: string }[];

    if (rows.length > 0) {
      const history = rows.reverse().map((r) => {
        let result = '';
        try { result = (JSON.parse(r.payload) as { result?: string }).result ?? ''; } catch { /* ignore */ }
        return `**User:** ${r.input.slice(0, 200)}\n**Agent:** ${result.slice(0, 400)}`;
      }).join('\n\n---\n\n');
      missionInput = `## Conversations récentes\n\n${history}\n\n---\n\n${mission}`;
    }
  }

  const missionId = spawnAgent(config, missionInput);
  res.json({ missionId });
});

app.get('/api/missions/:id', (req, res) => {
  const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id) as Mission | undefined;
  if (!mission) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const events = db.prepare('SELECT * FROM events WHERE mission_id = ? ORDER BY timestamp ASC').all(req.params.id);
  res.json({ mission, events });
});

app.get('/api/missions', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const missions = db.prepare('SELECT * FROM missions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as Mission[];
  res.json(missions);
});

app.post('/api/agents/:id/send', (req, res) => {
  const { input } = req.body as { input: string };
  const sent = sendInput(req.params.id, input);
  res.json({ sent });
});

app.get('/api/missions/:id/output', (req, res) => {
  const row = db.prepare(
    "SELECT payload FROM events WHERE mission_id = ? AND type = 'result' ORDER BY timestamp DESC LIMIT 1"
  ).get(req.params.id) as { payload: string } | undefined;
  const parsed = row ? JSON.parse(row.payload) as Record<string, unknown> : null;
  res.json({ output: parsed?.result ?? null });
});

app.delete('/api/missions/:id', (req, res) => {
  const killed = killMission(req.params.id);
  res.json({ killed });
});

app.get('/api/missions/:id/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  addClient(req.params.id, res);
});

// ====== GLOBAL SSE ======

app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  addGlobalClient(res);
});

// ====== AGENTS ======

app.get('/api/agents', (_req, res) => {
  const agentsDir = path.join(os.homedir(), '.mos', 'agents');
  if (!fs.existsSync(agentsDir)) {
    res.json([]);
    return;
  }
  const agents = fs.readdirSync(agentsDir)
    .filter((f: string) => fs.existsSync(path.join(agentsDir, f, 'config.json')))
    .map((name: string) => getAgentConfig(name));
  res.json(agents);
});

app.put('/api/agents/:name/config', (req, res) => {
  const { name } = req.params;
  const { config, systemPrompt } = req.body as { config?: Record<string, unknown>; systemPrompt?: string };
  const agentDir = path.join(os.homedir(), '.mos', 'agents', name);
  fs.mkdirSync(path.join(agentDir, 'memory'), { recursive: true });
  if (config) {
    fs.writeFileSync(path.join(agentDir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
  }
  if (systemPrompt !== undefined) {
    fs.writeFileSync(path.join(agentDir, 'system-prompt.md'), systemPrompt, 'utf-8');
  }
  res.json({ ok: true });
});

app.delete('/api/agents/:name', (req, res) => {
  const agentDir = path.join(os.homedir(), '.mos', 'agents', req.params.name);
  if (!fs.existsSync(agentDir)) {
    res.status(404).json({ error: 'Agent not found' });
    return;
  }
  fs.rmSync(agentDir, { recursive: true, force: true });
  res.json({ ok: true });
});

app.get('/api/agents/:name/system-prompt', (req, res) => {
  const spPath = path.join(os.homedir(), '.mos', 'agents', req.params.name, 'system-prompt.md');
  const content = fs.existsSync(spPath) ? fs.readFileSync(spPath, 'utf-8') : '';
  res.json({ content });
});

// ====== CHANNELS ======
const channelRouter = setupChannels();
app.use('/api/channels', channelRouter);
app.use('/api/channels/config', createChannelApiRouter());

// ====== REMOTE CONTROL ======
const remoteRouter = createRemoteRouter();
app.use('/api/remote', remoteRouter);

// ====== STATS ======
app.use('/api/stats', createStatsRouter());

// ====== TASKS ======
app.use('/api/tasks', createTasksRouter());

// ====== SKILLS ======
app.use('/api/skills', createSkillsRouter());

// ====== MEMORY ======
app.use('/api/memory', createMemoryRouter());

// ====== SCHEDULES ======
app.use('/api/schedules', createSchedulesRouter());

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Max OS — 1 orchestrator running on :${PORT}`);
  startScheduler();
});
