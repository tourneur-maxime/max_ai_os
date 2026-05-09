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

export function createSkillsRouter(): Router {
  seedIfEmpty();
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
