import { Response } from 'express';

const clients = new Map<string, Set<Response>>();

export function addClient(missionId: string, res: Response): void {
  if (!clients.has(missionId)) clients.set(missionId, new Set());
  clients.get(missionId)!.add(res);
  res.on('close', () => removeClient(missionId, res));
}

export function removeClient(missionId: string, res: Response): void {
  clients.get(missionId)?.delete(res);
  if (clients.get(missionId)?.size === 0) clients.delete(missionId);
}

export function broadcast(missionId: string, event: object): void {
  const data = JSON.stringify(event);
  clients.get(missionId)?.forEach(res => {
    res.write(`data: ${data}\n\n`);
  });
}

export function broadcastAll(event: object): void {
  const data = JSON.stringify(event);
  clients.forEach(set => set.forEach(res => res.write(`data: ${data}\n\n`)));
}
