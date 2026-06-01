# MaxOS

OS agentique **local-first** : une interface Nuxt pilote un orchestrateur Node.js qui spawn des sous-agents `claude` CLI via PTY. Missions tracées, mémoire persistante par agent, skills, kanban, stats, et pilotage distant signé JWT.

## Architecture

Monorepo (npm workspaces) :

| Workspace | Stack | Port |
|---|---|---|
| `app/` | Nuxt 3 SPA (SSR off), Tailwind, D3 | `3000` |
| `orchestrator/` | Express + TypeScript, SQLite (WAL), node-pty | `9000` |

Le frontend parle à l'orchestrateur en REST + SSE (flux d'événements temps réel). L'orchestrateur persiste tout dans SQLite et lance les agents en parsant leur sortie `--output-format stream-json`.

## Prérequis

- **Node.js ≥ 18** + npm
- **Claude CLI** (`claude`) installé, authentifié et accessible dans le `PATH` — l'orchestrateur le spawn via PTY pour exécuter les agents.

## Installation

```bash
git clone https://github.com/tourneur-maxime/max_ai_os.git
cd max_ai_os
npm run install:all   # installe la racine + les deux workspaces
```

## Démarrer en développement

```bash
npm run dev           # lance frontend + orchestrateur en parallèle
```

- Frontend → http://localhost:3000
- Orchestrateur → http://localhost:9000

Au **premier démarrage**, le dossier de données `~/.mos/` et la base SQLite `~/.mos/orchestrator.db` sont créés automatiquement.

## Données locales (`~/.mos/`)

Tout l'état vit sur ta machine, hors du repo :

```
~/.mos/
├── orchestrator.db            # SQLite : missions, events, tasks, skills, remote_tokens
├── agents/<nom>/
│   ├── config.json            # { name, model, permissionMode, cwd? }
│   ├── system-prompt.md       # injecté via --append-system-prompt (optionnel)
│   └── memory/                # fichiers mémoire de l'agent
└── channels/<nom>.json        # config d'un canal d'entrée (Telegram, webhook)
```

## Créer ton premier agent

Aucun agent n'existe par défaut. Crée-en un, puis recharge la page **Agents** de l'interface :

```bash
mkdir -p ~/.mos/agents/assistant
cat > ~/.mos/agents/assistant/config.json <<'JSON'
{
  "name": "assistant",
  "model": "sonnet",
  "permissionMode": "acceptEdits",
  "cwd": "/chemin/vers/ton/projet"
}
JSON
```

Champs lus par l'orchestrateur :

| Champ | Rôle |
|---|---|
| `name` | Identifiant de l'agent (= nom du dossier) |
| `model` | Modèle passé à `claude --model` (ex. `sonnet`, `opus`) |
| `permissionMode` | `claude --permission-mode` (ex. `acceptEdits`, `plan`, `default`) |
| `cwd` | Répertoire de travail de l'agent (défaut : home) |

Optionnel : `~/.mos/agents/assistant/system-prompt.md` pour personnaliser le prompt système (sinon un prompt par défaut est utilisé).

## Variables d'environnement (orchestrateur)

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `9000` | Port HTTP de l'orchestrateur |
| `FRONTEND_URL` | `http://localhost:3000` | Origine CORS autorisée |
| `MAXOS_JWT_SECRET` | aléatoire (éphémère) | Signe les tokens du pilotage distant — **à fixer en production** |

## Build production

```bash
# Orchestrateur
cd orchestrator && npm run build && npm start

# Frontend
cd app && npm run build
```

## Pack pédagogique

Ce repo embarque aussi le pack qui a servi à concevoir le projet :

- `diagrammes/` — visuels d'architecture (primitives, modèle mental, roadmap)
- `prompts-claude-design/` — prompts UI prêts à coller dans Claude Design
- `prompts-claude-code/` — prompts back prêts à coller dans Claude Code
