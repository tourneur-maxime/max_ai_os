import jwt from 'jsonwebtoken';
import crypto, { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { db } from '../db.js';
import { Request, Response, NextFunction } from 'express';
import type { RemoteToken } from '../types.js';

function loadOrCreateSecret(): string {
  if (process.env.MAXOS_JWT_SECRET) return process.env.MAXOS_JWT_SECRET;
  const secretPath = path.join(os.homedir(), '.mos', '.jwt_secret');
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf-8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(secretPath), { recursive: true });
  fs.writeFileSync(secretPath, secret, { encoding: 'utf-8', mode: 0o600 });
  return secret;
}

const SECRET_KEY = loadOrCreateSecret();
const TOKEN_TTL = 24 * 60 * 60; // 24h in seconds
const RATE_LIMIT_RPS = 10;

const rateLimitCounters = new Map<string, { count: number; resetAt: number }>();

export function issueToken(clientName: string): string {
  const id = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TOKEN_TTL;

  const token = jwt.sign({ id, clientName }, SECRET_KEY, { expiresIn: TOKEN_TTL });

  db.prepare(`
    INSERT INTO remote_tokens (id, client_name, token, created_at, expires_at, call_count)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(id, clientName, token, now, expiresAt);

  return token;
}

export function revokeToken(id: string): void {
  db.prepare('DELETE FROM remote_tokens WHERE id = ?').run(id);
}

export function listTokens(): RemoteToken[] {
  return db.prepare('SELECT * FROM remote_tokens ORDER BY created_at DESC').all() as RemoteToken[];
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // HTTPS only (except localhost)
  const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  if (!isLocalhost && req.protocol !== 'https') {
    res.status(403).json({ error: 'HTTPS required' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  const token = authHeader.slice(7);

  let payload: { id: string; clientName: string };
  try {
    payload = jwt.verify(token, SECRET_KEY) as { id: string; clientName: string };
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Verify in DB (enables revocation)
  const record = db.prepare('SELECT * FROM remote_tokens WHERE id = ?').get(payload.id) as RemoteToken | undefined;
  if (!record) {
    res.status(401).json({ error: 'Token revoked' });
    return;
  }

  // Rate limiting (10 req/s per token)
  const now = Date.now();
  const counter = rateLimitCounters.get(payload.id);
  if (counter) {
    if (now < counter.resetAt) {
      if (counter.count >= RATE_LIMIT_RPS) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }
      counter.count++;
    } else {
      rateLimitCounters.set(payload.id, { count: 1, resetAt: now + 1000 });
    }
  } else {
    rateLimitCounters.set(payload.id, { count: 1, resetAt: now + 1000 });
  }

  // Update call count
  db.prepare('UPDATE remote_tokens SET call_count = call_count + 1, last_called_at = ? WHERE id = ?')
    .run(Math.floor(now / 1000), payload.id);

  (req as Request & { tokenId: string }).tokenId = payload.id;
  next();
}
