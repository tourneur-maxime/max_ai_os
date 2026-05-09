# Prompt — Système de spawn avec Claude Code

Comment spawner dynamiquement des sous-agents Claude Code depuis ton orchestrator, en injectant un system prompt personnalisé pour chaque agent.

## Concept

Claude Code expose un flag natif `--append-system-prompt` qui te permet d'ajouter du contexte au prompt système au démarrage. Combiné avec `--output-format stream-json`, tu peux :

1. **Lancer un sous-agent** avec sa propre identité
2. **Capturer ses events en temps réel** via le stream JSON
3. **Stocker chaque event** dans ta DB (SQLite suffit largement)

## Prompt à coller dans Claude Code

```
Implémente un orchestrator Node.js qui spawne des sous-agents Ollama (local) dynamiquement.

Contraintes :
- Utiliser node-pty pour avoir un PTY interactif (pas juste child_process)
- Chaque agent a une identité (nom, system prompt, cwd, modèle, permissions)
- Au démarrage, injecter le system prompt via --append-system-prompt
- Capturer le flux stream-json en temps réel
- Parser chaque event (PreToolUse, PostToolUse, Stop, etc.) et :
  * Le stocker en SQLite (table `events` avec mission_id, type, timestamp, payload JSON)
  * Le broadcast via SSE pour l'UI live
- Permettre d'envoyer des messages au PTY de l'agent (input bidirectionnel)
- Quand l'agent termine → déclencher un hook "mission complete"

Commande de spawn type :
\`\`\`bash
claude \\
  --append-system-prompt "$(cat ~/.mos/agents/<name>/system-prompt.md)" \\
  --model sonnet \\
  --permission-mode auto \\
  --output-format stream-json \\
  --verbose
\`\`\`

Structure de fichiers attendue :
- ~/.mos/agents/<name>/
  ├── system-prompt.md
  ├── config.json (cwd, model, permissions, allowed_tools)
  └── memory/
      ├── decisions.md
      ├── patterns.md
      └── log.jsonl

Exposer une API REST :
- POST /api/agents/spawn { agent_name, mission } → spawn et renvoie mission_id
- GET /api/missions/:id → état + events
- POST /api/agents/:id/send { input } → envoie input dans le PTY

Code propre, TypeScript strict, gestion d'erreurs minimale (pas de try-catch défensif partout).
```

## Notes

- `node-pty` est important : permet un terminal interactif (vs `spawn()` qui est pipe-only).
- Le `stream-json` mode de Claude Code est sous-utilisé mais super puissant pour l'orchestration.
- SQLite (mode WAL) suffit largement pour ce volume — pas besoin de Postgres.
- Pas d'auth nécessaire si l'orchestrator tourne en localhost.
