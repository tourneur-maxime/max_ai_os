import * as pty from 'node-pty';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { db } from './db.js';
import { broadcast } from './sse.js';
import type { Agent } from './types.js';

const activePtys = new Map<string, ReturnType<typeof pty.spawn>>();

export function spawnAgent(agent: Agent, missionInput: string, sourceChannel?: string): string {
  const missionId = `M-${Date.now().toString(36).toUpperCase()}`;

  // Insert mission into DB
  db.prepare(`
    INSERT INTO missions (id, agent_name, input, status, source_channel, created_at)
    VALUES (?, ?, ?, 'running', ?, ?)
  `).run(missionId, agent.name, missionInput, sourceChannel ?? null, Date.now());

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

  const ptyProcess = pty.spawn('claude', args, {
    name: 'xterm-color',
    cols: 120,
    rows: 40,
    cwd: agent.cwd || os.homedir(),
    env: process.env as Record<string, string>,
  });

  activePtys.set(missionId, ptyProcess);

  let buffer = '';

  ptyProcess.onData((chunk: string) => {
    buffer += chunk;
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
  });

  ptyProcess.onExit(({ exitCode }) => {
    activePtys.delete(missionId);
    const status = exitCode === 0 ? 'done' : 'failed';
    db.prepare(`
      UPDATE missions SET status = ?, finished_at = ? WHERE id = ?
    `).run(status, Date.now(), missionId);
    broadcast(missionId, { type: 'mission_complete', missionId, status });
  });

  return missionId;
}

function storeAndBroadcast(missionId: string, event: Record<string, unknown>): void {
  const type = (event.type as string) ?? 'unknown';
  const timestamp = Date.now();

  db.prepare(`
    INSERT INTO events (mission_id, type, timestamp, payload)
    VALUES (?, ?, ?, ?)
  `).run(missionId, type, timestamp, JSON.stringify(event));

  broadcast(missionId, { ...event, missionId, timestamp });

  // Update costs if available in the event
  if (type === 'usage' || event.usage) {
    const usage = event.usage as Record<string, number> | undefined;
    if (usage) {
      db.prepare(`
        UPDATE missions SET tokens_in = ?, tokens_out = ? WHERE id = ?
      `).run(usage.input_tokens ?? 0, usage.output_tokens ?? 0, missionId);
    }
  }
}

export function sendInput(missionId: string, input: string): boolean {
  const ptyProcess = activePtys.get(missionId);
  if (!ptyProcess) return false;
  ptyProcess.write(input + '\r');
  return true;
}

export function killMission(missionId: string): boolean {
  const ptyProcess = activePtys.get(missionId);
  if (!ptyProcess) return false;
  ptyProcess.kill();
  activePtys.delete(missionId);
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
