import TelegramBot from 'node-telegram-bot-api';
import { spawnAgent, getAgentConfig } from '../spawn.js';
import type { ChannelConfig } from '../types.js';
import { db } from '../db.js';

let bot: TelegramBot | null = null;

export function startTelegramPolling(config: ChannelConfig): void {
  const token = process.env[config.botTokenEnv ?? 'TELEGRAM_BOT_TOKEN'];
  if (!token) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN not set — skipping');
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    // Allowlist check
    if (config.allowedChatIds?.length && !config.allowedChatIds.includes(chatId)) {
      await bot!.sendMessage(chatId, 'Unauthorized.');
      return;
    }

    const text = msg.text ?? '';
    const agentName = resolveAgent(text, config);
    const input = stripTag(text);

    const agentConfig = getAgentConfig(agentName);
    const missionId = spawnAgent(agentConfig, input, 'telegram');

    await bot!.sendMessage(chatId, `Mission ${missionId} started -> ${agentName}`);

    // Reply when mission is complete (polling DB)
    waitForCompletion(missionId, async (status, output) => {
      const reply = status === 'done'
        ? `${missionId} done\n\n${output ?? '(no output)'}`
        : `${missionId} failed`;
      await bot!.sendMessage(chatId, reply.slice(0, 4096));
    });
  });

  console.log('[telegram] polling started');
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

function waitForCompletion(
  missionId: string,
  cb: (status: string, output?: string) => void
): void {
  const interval = setInterval(() => {
    const mission = db.prepare('SELECT status FROM missions WHERE id = ?').get(missionId) as { status: string } | undefined;
    if (mission && mission.status !== 'running') {
      clearInterval(interval);
      const event = db.prepare(
        "SELECT payload FROM events WHERE mission_id = ? AND type = 'result' ORDER BY timestamp DESC LIMIT 1"
      ).get(missionId) as { payload: string } | undefined;
      const output = event ? (JSON.parse(event.payload) as Record<string, unknown>)?.result as string | undefined : undefined;
      cb(mission.status, output);
    }
  }, 2000);

  // Timeout after 30 minutes
  setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
}
