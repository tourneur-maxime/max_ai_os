import fs from 'fs';
import path from 'path';
import os from 'os';
import { Router } from 'express';
import { startTelegramPolling } from './telegram.js';
import { createWebhookRouter } from './webhook.js';
import type { ChannelConfig } from '../types.js';

export function setupChannels(): Router {
  const channelsDir = path.join(os.homedir(), '.mos', 'channels');
  const configs = new Map<string, ChannelConfig>();

  if (fs.existsSync(channelsDir)) {
    for (const file of fs.readdirSync(channelsDir)) {
      if (!file.endsWith('.json')) continue;
      const name = file.replace('.json', '');
      try {
        const config = JSON.parse(
          fs.readFileSync(path.join(channelsDir, file), 'utf-8')
        ) as ChannelConfig;
        configs.set(name, config);

        if (config.type === 'telegram') {
          startTelegramPolling(config);
        }
      } catch (e) {
        console.error(`[channels] Failed to load ${file}:`, e);
      }
    }
  }

  return createWebhookRouter(configs);
}
