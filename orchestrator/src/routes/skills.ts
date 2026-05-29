import { Router } from 'express';
import { db } from '../db.js';
import type { Skill } from '../types.js';

const DEFAULT_SKILLS = [
  { name: 'code_review', description: 'Automated code review with style & logic checks', command: 'Review the following code for logic errors, security vulnerabilities, performance issues and style consistency. Provide actionable suggestions.', agent_name: null, category: 'Dev', source: 'Built-in', active: 1, yaml_def: 'name: code_review\nversion: 1.2.0\ntrigger: on_demand\ntools: [read_file, web_search]\nmodel: claude-sonnet-4-6' },
  { name: 'web_research', description: 'Deep web research with source verification', command: 'Conduct thorough web research on the given topic. Verify sources and synthesize information into a structured report.', agent_name: null, category: 'Research', source: 'Built-in', active: 1, yaml_def: 'name: web_research\nversion: 2.0.1\ntrigger: on_demand\ntools: [web_search, web_fetch]\nmodel: claude-sonnet-4-6\nmax_duration: 15m' },
  { name: 'write_blog', description: 'Write long-form blog posts from outlines', command: 'Write a high-quality long-form blog post on the following topic. Include research, clear structure, and engaging prose. Target 1500-2000 words.', agent_name: null, category: 'Content', source: 'Built-in', active: 1, yaml_def: 'name: write_blog\nversion: 1.0.3\ntrigger: on_demand\ntools: [web_search, write_file]\nmodel: claude-sonnet-4-6\ntarget_words: 1500-2000' },
  { name: 'git_commit', description: 'Smart commit messages from diffs', command: 'Analyze the git diff and generate a conventional commit message following the project conventions. Output only the commit message.', agent_name: null, category: 'Dev', source: 'Built-in', active: 1, yaml_def: 'name: git_commit\nversion: 1.1.0\ntrigger: on_demand\ntools: [run_command, read_file]\nmodel: claude-sonnet-4-6\nformat: conventional' },
  { name: 'daily_brief', description: 'Morning briefing with tasks & news', command: 'Generate a concise daily briefing covering: pending tasks, relevant tech news (search for today\'s top 3 AI/dev stories), and a productivity tip. Format as markdown.', agent_name: null, category: 'Life', source: 'Built-in', active: 1, yaml_def: 'name: daily_brief\nversion: 0.9.1\ntrigger: cron(0 8 * * *)\ntools: [web_search]\nmodel: claude-sonnet-4-6\ndelivery: telegram' },
];

const LOYALTY_SKILLS = [
  {
    name: 'loyalty_member_lookup',
    description: 'Fiche complète d\'un membre : solde, tier, historique, incidents',
    command: 'Recherche le profil complet du membre du programme fidélité dont les informations sont fournies (numéro de membre, email ou nom+prénom). Synthétise : solde de points actuel, niveau de membership (tier), historique des 10 dernières transactions, date d\'inscription, date d\'expiration des points, et tout incident ou réclamation récente. Présente le résultat sous forme de fiche structurée prête à lire par un agent support.',
    agent_name: 'loyalty-b2c',
    category: 'Support',
    source: 'Loyalty',
    active: 1,
    yaml_def: 'name: loyalty_member_lookup\nversion: 1.0.0\ntrigger: on_demand\ntools: [web_search]\nmodel: claude-sonnet-4-6\nchannel: any',
  },
  {
    name: 'points_audit',
    description: 'Audit des écarts de points entre transactions et solde déclaré',
    command: 'Effectue un audit des écarts de points pour le membre dont les informations sont fournies (identifiant, période concernée, montant déclaré manquant). Analyse l\'historique des transactions disponible, vérifie la cohérence des calculs (taux de conversion, règles d\'expiration, bonus partenaires), identifie la cause probable de l\'écart. Produis un rapport d\'audit structuré avec : résumé de l\'écart, cause probable, recommandation de résolution.',
    agent_name: 'loyalty-b2c',
    category: 'Support',
    source: 'Loyalty',
    active: 1,
    yaml_def: 'name: points_audit\nversion: 1.0.0\ntrigger: on_demand\ntools: [web_search]\nmodel: claude-sonnet-4-6\nchannel: any',
  },
  {
    name: 'partner_health_check',
    description: 'Bilan de santé de l\'intégration API d\'un partenaire B2B',
    command: 'Vérifie la santé de l\'intégration d\'un partenaire B2B dans le programme fidélité. À partir du nom ou ID partenaire fourni, analyse : statut de l\'API (codes d\'erreur récents, taux d\'échec), volume de transactions sur les 30 derniers jours vs mois précédent, tickets ouverts non résolus, date de la dernière synchronisation réussie. Produis un rapport de santé avec score de criticité (vert/orange/rouge) et liste priorisée des actions correctives recommandées.',
    agent_name: 'loyalty-b2b',
    category: 'Support B2B',
    source: 'Loyalty',
    active: 1,
    yaml_def: 'name: partner_health_check\nversion: 1.0.0\ntrigger: on_demand\ntools: [web_search]\nmodel: claude-sonnet-4-6\nchannel: b2b',
  },
  {
    name: 'reward_recommendation',
    description: 'Recommandations de récompenses personnalisées pour un membre',
    command: 'Génère des recommandations de récompenses personnalisées pour le membre dont le profil est fourni (solde de points, niveau de membership, préférences connues). Sélectionne 3 à 5 récompenses adaptées dans le catalogue standard du programme (bons d\'achat, expériences, produits, voyages). Pour chaque récompense : explique pourquoi elle correspond au profil, indique le coût en points et le délai d\'obtention. Présente de façon attrayante et conversationnelle, prête à être envoyée au membre.',
    agent_name: 'loyalty-b2c',
    category: 'Support',
    source: 'Loyalty',
    active: 1,
    yaml_def: 'name: reward_recommendation\nversion: 1.0.0\ntrigger: on_demand\ntools: [web_search]\nmodel: claude-sonnet-4-6\nchannel: any',
  },
  {
    name: 'escalation_report',
    description: 'Rapport d\'escalade structuré pour un cas complexe ou sensible',
    command: 'Génère un rapport d\'escalade complet pour le cas de support décrit. Synthétise : les faits clés et chronologie, l\'analyse de la cause racine, l\'impact client ou partenaire, la solution proposée avec compensation si applicable, et le niveau de supervision requis. Utilise le format rapport standard (RAPPORT D\'ESCALADE #ID, criticité, chronologie, analyse, solution proposée, supervision requise, prochaines actions). Conclut avec une recommandation claire sur la prochaine action et l\'urgence.',
    agent_name: 'loyalty-escalation',
    category: 'Support',
    source: 'Loyalty',
    active: 1,
    yaml_def: 'name: escalation_report\nversion: 1.0.0\ntrigger: on_demand\ntools: []\nmodel: claude-sonnet-4-6\nchannel: any',
  },
  {
    name: 'b2b_partner_onboard',
    description: 'Plan d\'onboarding complet pour un nouveau partenaire B2B',
    command: 'Guide l\'onboarding complet d\'un nouveau partenaire B2B dans le programme fidélité. À partir du type de partenaire fourni (enseigne retail, banque, e-commerce, autre) et de ses informations, produis un plan d\'intégration en 6 étapes : (1) checklist des prérequis contractuels et techniques, (2) configuration API côté partenaire (credentials, webhooks, format transaction), (3) paramétrage des règles de points (taux de base, catégories, bonus événementiels), (4) protocole de tests d\'intégration avec critères de validation, (5) formation équipe partenaire, (6) critères de go-live et KPIs de suivi J+30. Adapte le niveau de détail technique au type de partenaire.',
    agent_name: 'loyalty-b2b',
    category: 'Support B2B',
    source: 'Loyalty',
    active: 1,
    yaml_def: 'name: b2b_partner_onboard\nversion: 1.0.0\ntrigger: on_demand\ntools: [write_file]\nmodel: claude-sonnet-4-6\nchannel: b2b',
  },
  {
    name: 'complaint_response_draft',
    description: 'Rédaction d\'une réponse empathique à une réclamation B2B ou B2C',
    command: 'Rédige une réponse professionnelle et empathique à la réclamation décrite. La réponse doit comporter 3 parties : (1) accusé de réception empathique validant l\'émotion du demandeur, (2) explication claire et honnête de la situation ou de l\'erreur, (3) solution concrète proposée avec délai de résolution réaliste. Adapte le registre au type de demandeur : chaleureux et simple pour B2C, professionnel et précis pour B2B. La réponse doit être prête à envoyer, sans placeholder ni variable à remplir.',
    agent_name: null,
    category: 'Support',
    source: 'Loyalty',
    active: 1,
    yaml_def: 'name: complaint_response_draft\nversion: 1.0.0\ntrigger: on_demand\ntools: []\nmodel: claude-sonnet-4-6\nchannel: any',
  },
];

function seedIfEmpty(): void {
  const count = (db.prepare('SELECT COUNT(*) as n FROM skills').get() as { n: number }).n;
  if (count > 0) return;
  const insert = db.prepare(`
    INSERT INTO skills (id, name, description, command, agent_name, category, source, active, yaml_def, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAll = db.transaction(() => {
    for (const s of DEFAULT_SKILLS) {
      insert.run(
        `SK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`,
        s.name, s.description, s.command, s.agent_name,
        s.category, s.source, s.active, s.yaml_def, Date.now(),
      );
    }
  });
  insertAll();
}

function seedLoyaltySkills(): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO skills (id, name, description, command, agent_name, category, source, active, yaml_def, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAll = db.transaction(() => {
    for (const s of LOYALTY_SKILLS) {
      insert.run(
        `SK-LY-${s.name.toUpperCase().replace(/_/g, '-')}`,
        s.name, s.description, s.command, s.agent_name,
        s.category, s.source, s.active, s.yaml_def, Date.now(),
      );
    }
  });
  insertAll();
}

export function createSkillsRouter(): Router {
  seedIfEmpty();
  seedLoyaltySkills();
  const router = Router();

  router.get('/', (_req, res) => {
    const skills = db.prepare('SELECT * FROM skills ORDER BY category, name').all() as Skill[];
    res.json(skills);
  });

  router.post('/', (req, res) => {
    const { name, description, command, agent_name, category, source, active, yaml_def } = req.body as Partial<Skill>;
    if (!name || !command) {
      res.status(400).json({ error: 'name and command required' });
      return;
    }
    const id = `SK-${Date.now().toString(36).toUpperCase()}`;
    db.prepare(`
      INSERT INTO skills (id, name, description, command, agent_name, category, source, active, yaml_def, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, description ?? null, command, agent_name ?? null, category ?? 'Dev', source ?? 'Custom', active ?? 1, yaml_def ?? null, Date.now());
    res.json({ id });
  });

  router.put('/:id', (req, res) => {
    const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id) as Skill | undefined;
    if (!skill) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const { name, description, command, agent_name, category, source, active, yaml_def } = req.body as Partial<Skill>;
    db.prepare(`
      UPDATE skills SET name = ?, description = ?, command = ?, agent_name = ?,
        category = ?, source = ?, active = ?, yaml_def = ? WHERE id = ?
    `).run(
      name ?? skill.name,
      description ?? skill.description ?? null,
      command ?? skill.command,
      agent_name ?? skill.agent_name ?? null,
      category ?? skill.category,
      source ?? skill.source,
      active ?? skill.active,
      yaml_def ?? skill.yaml_def ?? null,
      req.params.id,
    );
    res.json({ ok: true });
  });

  router.delete('/:id', (req, res) => {
    const info = db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ ok: true });
  });

  return router;
}
