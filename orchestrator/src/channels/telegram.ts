import TelegramBot from 'node-telegram-bot-api';
import { spawnAgent, getAgentConfig, waitForFinalCompletion } from '../spawn.js';
import type { ChannelConfig } from '../types.js';

export interface TelegramHandle {
  stop(): Promise<void>;
}

export function startTelegramPolling(config: ChannelConfig): TelegramHandle | null {
  const token = process.env[config.botTokenEnv ?? 'TELEGRAM_BOT_TOKEN'];
  if (!token) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN not set — skipping');
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (config.allowedChatIds?.length && !config.allowedChatIds.includes(chatId)) {
      await bot.sendMessage(chatId, 'Unauthorized.');
      return;
    }

    const text = msg.text ?? '';
    const agentName = resolveAgent(text, config);
    const input = stripTag(text);

    const agentConfig = getAgentConfig(agentName);
    const missionId = spawnAgent(agentConfig, input, 'telegram');

    await bot.sendMessage(chatId, `Mission ${missionId} started -> ${agentName}`);

    waitForFinalCompletion(missionId, async (status, output) => {
      const reply = status === 'done'
        ? `${missionId} done\n\n${output ?? '(no output)'}`
        : `${missionId} ${status}`;
      await bot.sendMessage(chatId, reply.slice(0, 4096));
    });
  });

  console.log('[telegram] polling started');
  return { stop: () => bot.stopPolling() };
}

function resolveAgent(text: string, config: ChannelConfig): string {
  for (const [tag, agentName] of Object.entries(config.agentRouting ?? {})) {
    if (text.startsWith(tag)) return agentName;
  }
  return config.defaultAgent;
}

function stripTag(text: string): string {
  return text.replace(/^@\w+\s*/, '').trim();
}

