import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { reloadChannel, removeChannel, listChannels } from './index.js';
import type { ChannelConfig } from '../types.js';

const channelsDir = path.join(os.homedir(), '.mos', 'channels');

function ensureChannelsDir() {
  fs.mkdirSync(channelsDir, { recursive: true });
}

export function createChannelApiRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(listChannels());
  });

  router.post('/:name', async (req: Request<{ name: string }>, res: Response) => {
    const { name } = req.params;
    const config = req.body as ChannelConfig;
    if (!config?.type || !config?.defaultAgent) {
      res.status(400).json({ error: 'type and defaultAgent required' });
      return;
    }
    ensureChannelsDir();
    fs.writeFileSync(path.join(channelsDir, `${name}.json`), JSON.stringify(config, null, 2), 'utf-8');
    await reloadChannel(name);
    res.json({ ok: true });
  });

  router.put('/:name', async (req: Request<{ name: string }>, res: Response) => {
    const { name } = req.params;
    const filePath = path.join(channelsDir, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    const config = req.body as ChannelConfig;
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    await reloadChannel(name);
    res.json({ ok: true });
  });

  router.delete('/:name', async (req: Request<{ name: string }>, res: Response) => {
    const { name } = req.params;
    const filePath = path.join(channelsDir, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    await removeChannel(name);
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  });

  router.post('/:name/reload', async (req: Request<{ name: string }>, res: Response) => {
    const { name } = req.params;
    const filePath = path.join(channelsDir, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    await reloadChannel(name);
    res.json({ ok: true });
  });

  return router;
}
