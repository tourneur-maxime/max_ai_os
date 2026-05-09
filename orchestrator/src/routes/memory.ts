import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';

function safeFilename(name: string): string | null {
  if (!/^[\w.-]+$/.test(name)) return null;
  return name;
}

function memoryDir(agent: string): string {
  return path.join(os.homedir(), '.mos', 'agents', agent, 'memory');
}

export function createMemoryRouter(): Router {
  const router = Router();

  router.get('/:agent/files', (req, res) => {
    const dir = memoryDir(req.params.agent);
    if (!fs.existsSync(dir)) {
      res.json([]);
      return;
    }
    const files = fs.readdirSync(dir).map(name => {
      const stat = fs.statSync(path.join(dir, name));
      return { name, size: stat.size, modified_at: stat.mtimeMs };
    });
    res.json(files);
  });

  router.get('/:agent/files/:filename', (req, res) => {
    const safe = safeFilename(req.params.filename);
    if (!safe) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    const filePath = path.join(memoryDir(req.params.agent), safe);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  });

  router.put('/:agent/files/:filename', (req, res) => {
    const safe = safeFilename(req.params.filename);
    if (!safe) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    const { content } = req.body as { content: string };
    if (content === undefined) {
      res.status(400).json({ error: 'content required' });
      return;
    }
    const dir = memoryDir(req.params.agent);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, safe), content, 'utf-8');
    res.json({ ok: true });
  });

  router.delete('/:agent/files/:filename', (req, res) => {
    const safe = safeFilename(req.params.filename);
    if (!safe) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }
    const filePath = path.join(memoryDir(req.params.agent), safe);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  });

  return router;
}
