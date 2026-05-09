import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { spawnAgent, getAgentConfig } from '../spawn.js';
import type { ChannelConfig } from '../types.js';

export function createWebhookRouter(configs: Map<string, ChannelConfig>): Router {
  const router = Router();

  router.post('/:channelName/inbound', (req: Request<{ channelName: string }>, res: Response) => {
    const channelName = req.params.channelName;
    const config = configs.get(channelName);

    if (!config) {
      res.status(404).json({ error: 'Unknown channel' });
      return;
    }

    // HMAC verification for generic webhooks
    if (config.type === 'webhook' && config.webhookSecret) {
      const signature = req.headers['x-signature'] as string;
      if (!verifyHMAC(req.body, config.webhookSecret, signature)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    res.status(200).json({ ok: true });

    // Async processing
    setImmediate(() => {
      const body = req.body as Record<string, unknown>;
      const text = extractText(body, config.type);
      const agentName = resolveAgent(text, config);
      const agentConfig = getAgentConfig(agentName);
      spawnAgent(agentConfig, text, channelName);
    });
  });

  return router;
}

function verifyHMAC(body: unknown, secret: string, signature: string): boolean {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(body));
  const expected = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function extractText(body: Record<string, unknown>, type: ChannelConfig['type']): string {
  if (type === 'telegram') {
    return ((body?.message as Record<string, unknown>)?.text as string) ?? '';
  }
  return (body?.text as string) ?? (body?.content as string) ?? JSON.stringify(body);
}

function resolveAgent(text: string, config: ChannelConfig): string {
  for (const [tag, agentName] of Object.entries(config.agentRouting ?? {})) {
    if (text.startsWith(tag)) return agentName;
  }
  return config.defaultAgent;
}
