import { spawn as cpSpawn, type ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync } from 'child_process';
import { db } from './db.js';
import { broadcast } from './sse.js';
import type { Agent } from './types.js';

const activeProcesses = new Map<string, ChildProcess>();

function resolveBin(name: string): string {
  try {
    return execSync(`which ${name}`, { encoding: 'utf8' }).trim();
  } catch {
    return name;
  }
}

const CLAUDE_BIN = resolveBin('claude');

const TRIAGE_AGENTS = new Set(['loyalty-triage']);

export function spawnAgent(
  agent: Agent,
  missionInput: string,
  sourceChannel?: string,
  parentMissionId?: string,
  callbackUrl?: string,
): string {
  const missionId = `M-${Date.now().toString(36).toUpperCase()}`;

  db.prepare(`
    INSERT INTO missions (id, agent_name, input, status, source_channel, parent_mission_id, callback_url, created_at)
    VALUES (?, ?, ?, 'running', ?, ?, ?, ?)
  `).run(missionId, agent.name, missionInput, sourceChannel ?? null, parentMissionId ?? null, callbackUrl ?? null, Date.now());

  const systemPromptPath = path.join(os.homedir(), '.mos', 'agents', agent.name, 'system-prompt.md');
  const systemPrompt = fs.existsSync(systemPromptPath)
    ? fs.readFileSync(systemPromptPath, 'utf-8')
    : `You are ${agent.name}, an AI agent in Max OS — 1.`;

  const args = [
    '--append-system-prompt', systemPrompt,
    '--model', agent.model,
    '--permission-mode', agent.permissionMode,
    '--output-format', 'stream-json',
    '--verbose',
    '-p', missionInput,
  ];

  const child = cpSpawn(CLAUDE_BIN, args, {
    cwd: agent.cwd || os.homedir(),
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  activeProcesses.set(missionId, child);

  let buffer = '';

  const handleChunk = (chunk: Buffer | string) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed);
        storeAndBroadcast(missionId, event);
      } catch {
        // Non-JSON line (verbose logs), ignore
      }
    }
  };

  child.stdout.on('data', handleChunk);
  child.stderr.on('data', handleChunk);

  child.on('close', (exitCode) => {
    activeProcesses.delete(missionId);
    const status = exitCode === 0 ? 'done' : 'failed';
    db.prepare(`
      UPDATE missions SET status = ?, finished_at = ? WHERE id = ?
    `).run(status, Date.now(), missionId);
    broadcast(missionId, { type: 'mission_complete', missionId, status });
  });

  child.on('error', (err) => {
    console.error(`[spawn] error for mission ${missionId}:`, err);
    activeProcesses.delete(missionId);
    db.prepare(`UPDATE missions SET status = 'failed', finished_at = ? WHERE id = ?`)
      .run(Date.now(), missionId);
    broadcast(missionId, { type: 'mission_complete', missionId, status: 'failed' });
  });

  return missionId;
}

function extractTriageDecision(resultText: string): { agent_cible: string; resume?: string; note_pour_agent?: string } | null {
  const fenceMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/);
  for (const candidate of fenceMatch ? [fenceMatch[1], resultText] : [resultText]) {
    try {
      const parsed = JSON.parse(candidate.trim());
      if (parsed?.agent_cible) return parsed;
    } catch { /* continue */ }
  }
  return null;
}

function tryAutoRoute(missionId: string, resultText: string): void {
  const mission = db.prepare(
    'SELECT agent_name, input, source_channel, callback_url, parent_mission_id FROM missions WHERE id = ?',
  ).get(missionId) as {
    agent_name: string;
    input: string;
    source_channel: string | null;
    callback_url: string | null;
    parent_mission_id: string | null;
  } | undefined;

  if (!mission) return;
  // Anti-boucle : ne router que depuis un agent triage racine
  if (!TRIAGE_AGENTS.has(mission.agent_name) || mission.parent_mission_id != null) return;

  const decision = extractTriageDecision(resultText);
  if (!decision?.agent_cible) return;

  const agentDir = path.join(os.homedir(), '.mos', 'agents', decision.agent_cible);
  const targetAgent = fs.existsSync(agentDir) ? decision.agent_cible : 'loyalty-escalation';
  const agentConfig = getAgentConfig(targetAgent);

  const parts = [mission.input];
  if (decision.note_pour_agent || decision.resume) {
    parts.push('\n--- Contexte triage ---');
    if (decision.note_pour_agent) parts.push(`Note : ${decision.note_pour_agent}`);
    if (decision.resume) parts.push(`Résumé : ${decision.resume}`);
  }

  spawnAgent(
    agentConfig,
    parts.join('\n'),
    mission.source_channel ?? undefined,
    missionId,
    mission.callback_url ?? undefined,
  );
}

function storeAndBroadcast(missionId: string, event: Record<string, unknown>): void {
  const type = (event.type as string) ?? 'unknown';
  const timestamp = Date.now();

  db.prepare(`
    INSERT INTO events (mission_id, type, timestamp, payload)
    VALUES (?, ?, ?, ?)
  `).run(missionId, type, timestamp, JSON.stringify(event));

  broadcast(missionId, { ...event, missionId, timestamp });

  if (type === 'result') {
    const usage = event.usage as Record<string, number> | undefined;
    db.prepare(`
      UPDATE missions SET tokens_in = ?, tokens_out = ?, cost_usd = ? WHERE id = ?
    `).run(
      usage?.input_tokens ?? 0,
      usage?.output_tokens ?? 0,
      (event.cost_usd as number) ?? null,
      missionId,
    );
    const resultText = (event.result as string) ?? '';
    setImmediate(() => tryAutoRoute(missionId, resultText));
  }
}

export function sendInput(missionId: string, input: string): boolean {
  const child = activeProcesses.get(missionId);
  if (!child || !child.stdin) return false;
  child.stdin.write(input + '\n');
  return true;
}

export function killMission(missionId: string): boolean {
  const child = activeProcesses.get(missionId);
  if (!child) return false;
  child.kill();
  activeProcesses.delete(missionId);
  db.prepare(`UPDATE missions SET status = 'failed', finished_at = ? WHERE id = ?`)
    .run(Date.now(), missionId);
  return true;
}

export function getAgentConfig(agentName: string): Agent {
  const configPath = path.join(os.homedir(), '.mos', 'agents', agentName, 'config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Agent;
  }
  return {
    name: agentName,
    cwd: path.join(os.homedir(), 'agents', agentName),
    model: 'claude-sonnet-4-6',
    permissionMode: 'acceptEdits',
    allowedTools: ['bash', 'read_file', 'write_file', 'edit_file', 'web_search'],
    deniedTools: [],
  };
}

export function waitForFinalCompletion(
  rootMissionId: string,
  cb: (status: string, output?: string) => void,
  timeoutMs = 30 * 60 * 1000,
): void {
  let currentMissionId = rootMissionId;
  let switched = false;
  let doneSeenAt: number | null = null;

  const interval = setInterval(() => {
    const mission = db.prepare('SELECT status FROM missions WHERE id = ?').get(currentMissionId) as { status: string } | undefined;
    if (!mission) return;

    if (mission.status !== 'running') {
      if (mission.status === 'done' && !switched) {
        const child = db.prepare(
          'SELECT id FROM missions WHERE parent_mission_id = ? ORDER BY created_at ASC LIMIT 1',
        ).get(currentMissionId) as { id: string } | undefined;

        if (child) {
          currentMissionId = child.id;
          switched = true;
          doneSeenAt = null;
          return;
        }

        // Période de grâce : laisser tryAutoRoute (setImmediate) un cycle pour insérer l'enfant
        if (doneSeenAt === null) {
          doneSeenAt = Date.now();
          return;
        }
      }

      clearInterval(interval);
      if (mission.status === 'done') {
        const event = db.prepare(
          "SELECT payload FROM events WHERE mission_id = ? AND type = 'result' ORDER BY timestamp DESC LIMIT 1",
        ).get(currentMissionId) as { payload: string } | undefined;
        const output = event
          ? (JSON.parse(event.payload) as Record<string, unknown>)?.result as string | undefined
          : undefined;
        cb('done', output);
      } else {
        cb(mission.status);
      }
    }
  }, 2000);

  setTimeout(() => {
    clearInterval(interval);
    cb('timeout');
  }, timeoutMs);
}
