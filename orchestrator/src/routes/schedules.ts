import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { addScheduleTask, removeScheduleTask, reloadScheduleTask, runNow } from '../scheduler.js';
import type { Schedule } from '../types.js';

export function createSchedulesRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const schedules = db.prepare('SELECT * FROM schedules ORDER BY created_at DESC').all();
    res.json(schedules);
  });

  router.post('/', (req: Request, res: Response) => {
    const { name, agent_name, input_template, cron_expr } = req.body as Partial<Schedule>;
    if (!name || !agent_name || !input_template || !cron_expr) {
      res.status(400).json({ error: 'name, agent_name, input_template, cron_expr required' });
      return;
    }
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO schedules (id, name, agent_name, input_template, cron_expr, active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(id, name, agent_name, input_template, cron_expr, now);
    addScheduleTask(id);
    res.json({ id });
  });

  router.put('/:id', async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const s = db.prepare('SELECT id FROM schedules WHERE id = ?').get(id);
    if (!s) { res.status(404).json({ error: 'Not found' }); return; }
    const { name, agent_name, input_template, cron_expr, active } = req.body as Partial<Schedule>;
    if (name !== undefined) db.prepare('UPDATE schedules SET name = ? WHERE id = ?').run(name, id);
    if (agent_name !== undefined) db.prepare('UPDATE schedules SET agent_name = ? WHERE id = ?').run(agent_name, id);
    if (input_template !== undefined) db.prepare('UPDATE schedules SET input_template = ? WHERE id = ?').run(input_template, id);
    if (cron_expr !== undefined) db.prepare('UPDATE schedules SET cron_expr = ? WHERE id = ?').run(cron_expr, id);
    if (active !== undefined) db.prepare('UPDATE schedules SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
    reloadScheduleTask(id);
    res.json({ ok: true });
  });

  router.delete('/:id', (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    removeScheduleTask(id);
    db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  router.post('/:id/run', (req: Request<{ id: string }>, res: Response) => {
    const missionId = runNow(req.params.id);
    if (!missionId) { res.status(404).json({ error: 'Schedule not found' }); return; }
    res.json({ missionId });
  });

  return router;
}
