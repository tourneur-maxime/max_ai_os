import fs from 'fs';
import path from 'path';
import os from 'os';
import { Router } from 'express';
import { startTelegramPolling, type TelegramHandle } from './telegram.js';
import { createWebhookRouter } from './webhook.js';
import type { ChannelConfig } from '../types.js';

const channelsDir = path.join(os.homedir(), '.mos', 'channels');

const configs = new Map<string, ChannelConfig>();
const telegramHandles = new Map<string, TelegramHandle>();

let webhookRouter = createWebhookRouter(configs);

function loadChannel(name: string): void {
  const filePath = path.join(channelsDir, `${name}.json`);
  try {
    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ChannelConfig;
    configs.set(name, config);
    if (config.type === 'telegram') {
      const handle = startTelegramPolling(config);
      if (handle) telegramHandles.set(name, handle);
    }
  } catch (e) {
    console.error(`[channels] Failed to load ${name}:`, e);
  }
}

async function stopChannel(name: string): Promise<void> {
  const handle = telegramHandles.get(name);
  if (handle) {
    await handle.stop();
    telegramHandles.delete(name);
  }
  configs.delete(name);
}

export async function reloadChannel(name: string): Promise<void> {
  await stopChannel(name);
  loadChannel(name);
}

export async function removeChannel(name: string): Promise<void> {
  await stopChannel(name);
}

export function listChannels(): { name: string; config: ChannelConfig }[] {
  return Array.from(configs.entries()).map(([name, config]) => ({ name, config }));
}

export function getWebhookRouter(): Router {
  return webhookRouter;
}

export function setupChannels(): Router {
  if (fs.existsSync(channelsDir)) {
    for (const file of fs.readdirSync(channelsDir)) {
      if (!file.endsWith('.json')) continue;
      loadChannel(file.replace('.json', ''));
    }
  }
  return webhookRouter;
}
