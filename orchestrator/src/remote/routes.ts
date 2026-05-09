import { Router, Request, Response } from 'express';
import { authMiddleware, issueToken, revokeToken, listTokens } from './auth.js';
import { spawnAgent, getAgentConfig, killMission } from '../spawn.js';
import { db } from '../db.js';
import { openapiSpec } from './openapi.js';
import type { Mission } from '../types.js';

export function createRemoteRouter(): Router {
  const router = Router();

  // Public: issue a token (should only be called locally)
  router.post('/issue-token', (req: Request, res: Response) => {
    const { client_name } = req.body as { client_name: string };
    if (!client_name) {
      res.status(400).json({ error: 'client_name required' });
      return;
    }
    const token = issueToken(client_name);
    res.json({ token, expires_in: 86400 });
  });

  // OpenAPI spec (public)
  router.get('/openapi.json', (_req, res) => {
    res.json(openapiSpec);
  });

  // All following routes require authentication
  router.use(authMiddleware);

  // POST /api/remote/missions — spawn
  router.post('/missions', (req: Request, res: Response) => {
    const { agent, input } = req.body as { agent: string; input: string };
    if (!agent || !input) {
      res.status(400).json({ error: 'agent and input required' });
      return;
    }
    const config = getAgentConfig(agent);
    const missionId = spawnAgent(config, input, 'remote');
    res.json({ missionId });
  });

  // GET /api/remote/missions/:id
  router.get('/missions/:id', (req: Request<{ id: string }>, res: Response) => {
    const mission = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id) as Mission | undefined;
    if (!mission) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(mission);
  });

  // GET /api/remote/missions/:id/output
  router.get('/missions/:id/output', (req: Request<{ id: string }>, res: Response) => {
    const event = db.prepare(
      "SELECT payload FROM events WHERE mission_id = ? AND type IN ('result','stop') ORDER BY timestamp DESC LIMIT 1"
    ).get(req.params.id) as { payload: string } | undefined;
    const parsed = event ? JSON.parse(event.payload) as Record<string, unknown> : null;
    const output = parsed?.result ?? parsed ?? null;
    res.json({ output });
  });

  // DELETE /api/remote/missions/:id
  router.delete('/missions/:id', (req: Request<{ id: string }>, res: Response) => {
    const killed = killMission(req.params.id);
    res.json({ killed });
  });

  // GET /api/remote/tokens (list for UI)
  router.get('/tokens', (_req, res) => {
    res.json(listTokens().map(t => ({ ...t, token: '[redacted]' })));
  });

  // DELETE /api/remote/tokens/:id (revoke)
  router.delete('/tokens/:id', (req: Request<{ id: string }>, res: Response) => {
    revokeToken(req.params.id);
    res.json({ revoked: true });
  });

  return router;
}
