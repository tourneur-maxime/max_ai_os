import cron, { type ScheduledTask } from 'node-cron';
import { db } from './db.js';
import { spawnAgent, getAgentConfig } from './spawn.js';
import type { Schedule } from './types.js';

const activeTasks = new Map<string, ScheduledTask>();

function runSchedule(schedule: Schedule): void {
  const agentConfig = getAgentConfig(schedule.agent_name);
  const missionId = spawnAgent(agentConfig, schedule.input_template, 'scheduler');
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE schedules SET last_run_at = ?, last_mission_id = ? WHERE id = ?')
    .run(now, missionId, schedule.id);
}

function registerSchedule(schedule: Schedule): void {
  if (!cron.validate(schedule.cron_expr)) {
    console.warn(`[scheduler] Invalid cron expression for "${schedule.name}": ${schedule.cron_expr}`);
    return;
  }
  const task = cron.schedule(schedule.cron_expr, () => {
    const current = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule.id) as Schedule | undefined;
    if (current?.active) runSchedule(current);
  });
  activeTasks.set(schedule.id, task);
}

function unregisterSchedule(id: string): void {
  const task = activeTasks.get(id);
  if (task) { task.stop(); activeTasks.delete(id); }
}

export function startScheduler(): void {
  const schedules = db.prepare('SELECT * FROM schedules WHERE active = 1').all() as Schedule[];
  for (const s of schedules) registerSchedule(s);
  console.log(`[scheduler] started — ${schedules.length} schedule(s) active`);
}

export function addScheduleTask(id: string): void {
  const s = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule | undefined;
  if (s) registerSchedule(s);
}

export function removeScheduleTask(id: string): void {
  unregisterSchedule(id);
}

export function reloadScheduleTask(id: string): void {
  unregisterSchedule(id);
  const s = db.prepare('SELECT * FROM schedules WHERE id = ? AND active = 1').get(id) as Schedule | undefined;
  if (s) registerSchedule(s);
}

export function runNow(id: string): string | null {
  const s = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule | undefined;
  if (!s) return null;
  const agentConfig = getAgentConfig(s.agent_name);
  const missionId = spawnAgent(agentConfig, s.input_template, 'scheduler');
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE schedules SET last_run_at = ?, last_mission_id = ? WHERE id = ?')
    .run(now, missionId, s.id);
  return missionId;
}

