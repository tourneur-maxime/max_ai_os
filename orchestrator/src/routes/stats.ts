import { Router } from 'express';
import { db } from '../db.js';

export function createStatsRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const total = db.prepare(`
      SELECT
        COUNT(*) as missions,
        COALESCE(SUM(cost_usd), 0) as cost_usd,
        COALESCE(SUM(tokens_in), 0) as tokens_in,
        COALESCE(SUM(tokens_out), 0) as tokens_out
      FROM missions
    `).get() as Record<string, number>;

    const byAgent = db.prepare(`
      SELECT
        agent_name as name,
        COUNT(*) as missions,
        COALESCE(SUM(cost_usd), 0) as cost_usd,
        COALESCE(SUM(tokens_in), 0) as tokens_in,
        COALESCE(SUM(tokens_out), 0) as tokens_out
      FROM missions
      GROUP BY agent_name
      ORDER BY missions DESC
    `).all();

    const daily = db.prepare(`
      SELECT
        date(created_at / 1000, 'unixepoch') as date,
        COUNT(*) as missions,
        COALESCE(SUM(cost_usd), 0) as cost_usd,
        COALESCE(SUM(tokens_in), 0) as tokens_in,
        COALESCE(SUM(tokens_out), 0) as tokens_out
      FROM missions
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `).all();

    res.json({ total, by_agent: byAgent, daily });
  });

  return router;
}
