import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { spawnAgent, getAgentConfig, waitForFinalCompletion } from '../spawn.js';
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
      const callbackUrl = typeof body.callback_url === 'string' ? body.callback_url : undefined;
      const missionId = spawnAgent(agentConfig, text, channelName, undefined, callbackUrl);
      if (callbackUrl) {
        waitForFinalCompletion(missionId, (status, output) => {
          postCallback(callbackUrl, { missionId, status, output: output ?? null });
        });
      }
    });
  });

  return router;
}

function postCallback(url: string, payload: Record<string, unknown>): void {
  try {
    const parsed = new URL(url);
    const body = JSON.stringify(payload);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(options, (res) => { res.resume(); });
    req.on('error', (err) => console.error('[webhook] callback error:', err.message));
    req.write(body);
    req.end();
  } catch (err) {
    console.error('[webhook] postCallback failed:', err);
  }
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
