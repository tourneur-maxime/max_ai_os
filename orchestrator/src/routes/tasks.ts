import { Router } from 'express';
import { db } from '../db.js';
import type { Task } from '../types.js';

const LOYALTY_WORKFLOW: Array<Omit<Task, 'id' | 'mission_id' | 'created_at' | 'updated_at'>> = [
  // Backlog — tâches récurrentes et de fond
  {
    title: 'Rédiger la FAQ expiration des points',
    description: 'Créer une base de connaissance claire sur les règles d\'expiration : délai 24 mois, remise à zéro, exceptions par partenaire. Format markdown prêt à intégrer dans le centre d\'aide.',
    agent_name: 'loyalty-b2c',
    status: 'backlog',
    domain: 'loyalty',
  },
  {
    title: 'Audit des partenaires B2B inactifs',
    description: 'Identifier les partenaires sans transaction depuis > 60 jours. Produire un rapport avec cause probable (technique, commercial) et recommandations de réactivation.',
    agent_name: 'loyalty-b2b',
    status: 'backlog',
    domain: 'loyalty',
  },
  {
    title: 'Rapport mensuel KPIs programme fidélité',
    description: 'Générer le rapport mensuel : nouveaux membres, points émis/échangés, taux de rédemption, top 5 partenaires, réclamations et taux de résolution au premier contact.',
    agent_name: 'loyalty-b2b',
    status: 'backlog',
    domain: 'loyalty',
  },
  {
    title: 'Optimiser les templates de réponse réclamation',
    description: 'Réviser et améliorer les 10 templates de réponse les plus utilisés pour les réclamations B2C courantes (points manquants, récompense non reçue, expiration contestée).',
    agent_name: 'loyalty-b2c',
    status: 'backlog',
    domain: 'loyalty',
  },
  // Todo — actions immédiates pour mettre en place le système support
  {
    title: 'Tester le routing triage → b2b/b2c',
    description: 'Valider que loyalty-triage classifie correctement 10 cas de test représentatifs (5 B2B, 5 B2C). Corriger les prompts si le taux de précision est < 90 %.',
    agent_name: 'loyalty-triage',
    status: 'todo',
    domain: 'loyalty',
  },
  {
    title: 'Configurer les seuils d\'escalade automatique',
    description: 'Définir et documenter les règles de déclenchement pour loyalty-escalation : montants (> 500 pts), fréquence (≥ 3 contacts), mots-clés (avocat, fraude, juridique).',
    agent_name: 'loyalty-escalation',
    status: 'todo',
    domain: 'loyalty',
  },
  {
    title: 'Rédiger la charte de compensation',
    description: 'Documenter les niveaux de compensation autorisés par tier de membre et type d\'incident. Limite autonome agent : 200 pts. Au-delà : supervision humaine obligatoire.',
    agent_name: 'loyalty-escalation',
    status: 'todo',
    domain: 'loyalty',
  },
];

function seedLoyaltyWorkflow(): void {
  const insert = db.prepare(`
    INSERT INTO tasks (id, title, description, agent_name, status, domain, created_at, updated_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title = ?)
  `);
  const insertAll = db.transaction(() => {
    for (const t of LOYALTY_WORKFLOW) {
      const now = Date.now();
      insert.run(
        `T-LY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5)}`,
        t.title, t.description ?? null, t.agent_name ?? null,
        t.status, t.domain ?? 'loyalty', now, now,
        t.title,
      );
    }
  });
  insertAll();
}

export function createTasksRouter(): Router {
  seedLoyaltyWorkflow();
  const router = Router();

  router.get('/', (_req, res) => {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC').all() as Task[];
    res.json(tasks);
  });

  router.post('/', (req, res) => {
    const { title, description, agent_name, status, domain } = req.body as Partial<Task>;
    if (!title) {
      res.status(400).json({ error: 'title required' });
      return;
    }
    const id = `T-${Date.now().toString(36).toUpperCase()}`;
    const now = Date.now();
    db.prepare(`
      INSERT INTO tasks (id, title, description, agent_name, status, domain, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description ?? null, agent_name ?? null, status ?? 'backlog', domain ?? 'ops', now, now);
    res.json({ id });
  });

  router.patch('/:id', (req, res) => {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as Task | undefined;
    if (!task) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { title, description, agent_name, status, mission_id, domain } = req.body as Partial<Task>;
    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, agent_name = ?, status = ?, mission_id = ?, domain = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title ?? task.title,
      description ?? task.description ?? null,
      agent_name ?? task.agent_name ?? null,
      status ?? task.status,
      mission_id ?? task.mission_id ?? null,
      domain ?? task.domain ?? null,
      Date.now(),
      req.params.id,
    );
    res.json({ ok: true });
  });

  router.delete('/:id', (req, res) => {
    const info = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ ok: true });
  });

  return router;
}
