# Construis ton Agentic OS personnel — Pack complet

Pack pour reproduire à ta manière l'OS agentique présenté dans la vidéo : un système local-first qui orchestre tes agents Claude Code, garde leur mémoire, trace tes missions et tes coûts.

## Contenu du pack

### `/diagrammes` — Les 4 visuels de la vidéo (PNG haute qualité)
- `01-briques-agentic-os.png` — Les 6 primitives (agents, mémoire, missions, hooks, orchestration, UI)
- `02-modele-mental.png` — Le flux d'un événement à travers le système
- `03-roadmap.png` — La progression Phase 1 → 3+
- `04-3-etapes.png` — La méthode en 3 étapes (Design → Code → Câblage)

### `/prompts-claude-design` — Maquettes UI
Prompts prêts à coller dans **Claude Design** (claude.ai) pour générer les écrans :
- `01-visualizer-mesh.md` — Le mesh live des agents (page d'accueil)
- `02-edit-config-chat.md` — L'éditeur de config + le chat avec un agent
- `03-memory-missions-kanban.md` — Mémoire éditable + missions tracking + vue Kanban
- `04-skills-dashboard.md` — Catalogue de skills + dashboard radar

### `/prompts-claude-code` — Logique back
Prompts prêts à coller dans **Claude Code** pour câbler la mécanique :
- `01-spawn-system.md` — Spawner un sous-agent avec `--append-system-prompt`
- `02-channel-input.md` — Canaux d'entrée externes (Telegram, webhook)
- `03-remote-control.md` — Pilotage distant via tunnel sécurisé

## Comment l'utiliser

**Étape 1** — Maquettes : ouvre Claude Design, colle un prompt `claude-design`, génère.
**Étape 2** — MVP : ouvre Claude Code, colle le prompt design exporté, demande l'implémentation.
**Étape 3** — Câblage : colle les prompts `claude-code` dans ton projet, l'agent câble la mécanique.

> **Important** : ces prompts sont des **points de départ**. Adapte-les à ton workflow, ton stack, tes besoins. C'est l'idée même d'un OS perso — il colle à toi, pas à un standard.

## Liens

- Newsletter : https://mkc.sh/the-agentic-dev
- Vidéo dédiée mémoire : https://mkc.sh/agentic-os-memory

Bon build.
