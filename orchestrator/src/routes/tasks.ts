import { Router } from 'express';
import { db } from '../db.js';
import type { Task } from '../types.js';

export function createTasksRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC').all() as Task[];
    res.json(tasks);
  });

  router.post('/', (req, res) => {
    const { title, description, agent_name, status, domain } = req.body as Partial<Task>;
    if (!title) {
      res.status(400).json({ error: 'title required' });
      return;
    }
    const id = `T-${Date.now().toString(36).toUpperCase()}`;
    const now = Date.now();
    db.prepare(`
      INSERT INTO tasks (id, title, description, agent_name, status, domain, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description ?? null, agent_name ?? null, status ?? 'backlog', domain ?? 'ops', now, now);
    res.json({ id });
  });

  router.patch('/:id', (req, res) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task | undefined;
    if (!task) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { title, description, agent_name, status, mission_id, domain } = req.body as Partial<Task>;
    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, agent_name = ?, status = ?, mission_id = ?, domain = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title ?? task.title,
      description ?? task.description ?? null,
      agent_name ?? task.agent_name ?? null,
      status ?? task.status,
      mission_id ?? task.mission_id ?? null,
      domain ?? task.domain ?? null,
      Date.now(),
      req.params.id,
    );
    res.json({ ok: true });
  });

  router.delete('/:id', (req, res) => {
    const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ ok: true });
  });

  return router;
}
