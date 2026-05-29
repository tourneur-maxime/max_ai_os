# Max OS — 1 · Suivi développement vertical-slice

> Branche de travail : `feat/backend`  
> Convention : chaque slice = 1 commit atomique backend + frontend.

---

## Slice 1 — Foundation ✅ complet
**Objectif** : Socle commun dont toutes les autres slices dépendent.

- [x] Orchestrateur Express + PTY (prompts 01-03)
- [x] SQLite WAL, tables `missions`, `events`, `remote_tokens`
- [x] SSE par mission (`/api/missions/:id/stream`)
- [x] Canaux Telegram + Webhook + Remote JWT
- [x] **`GET /api/events/stream`** — SSE global
- [x] **`PUT /api/agents/:name/config`** — écriture config.json + system-prompt.md
- [x] **`GET /api/stats`** — agrégats coûts/tokens/missions par agent et par jour
- [x] **Composable `useApi.ts`** — fetch wrapper + SSE helper
- [x] **`nuxt.config.ts`** runtimeConfig `apiBase`

---

## Slice 2 — Missions
**Objectif** : `missions.vue` entièrement live.

**Backend** :
- `GET /api/missions` ✅ (déjà implémenté)
- `GET /api/missions/:id` ✅
- `GET /api/missions/:id/output` ✅
- `DELETE /api/missions/:id` ✅
- `GET /api/missions/:id/stream` ✅

**Frontend** :
- [x] Remplacer tableau statique → fetch `GET /api/missions`
- [x] Bouton Kill → `DELETE /api/missions/:id`
- [x] Détail mission : SSE stream → log temps-réel dans panneau latéral
- [x] Afficher `cost_usd`, `tokens_in`, `tokens_out`

---

## Slice 3 — Agents & Chat ✅ complet
**Objectif** : Gestion agents live + chat réel via spawn.

**Backend** :
- [x] `GET /api/agents`
- [x] `PUT /api/agents/:name/config` — écriture fichiers `~/.mos/agents/<name>/`
- [x] `DELETE /api/agents/:name` — supprime dossier `~/.mos/agents/<name>/`

**Frontend** :
- [x] `agents/index.vue` : liste depuis `GET /api/agents`
- [x] Formulaire config → `PUT /api/agents/:name/config`
- [x] Créer / supprimer agent
- [x] `agents/[name]/chat.vue` : spawn réel via `POST /api/agents/spawn`, affiche SSE stream en temps-réel, sendInput via `POST /api/agents/:id/send`

---

## Slice 4 — Visualiseur (index.vue) ✅ complet
**Objectif** : Mesh D3 animé sur données réelles.

**Backend** :
- [x] `GET /api/agents`
- [x] `GET /api/events/stream` (global SSE)

**Frontend** :
- [x] Noeuds D3 depuis `GET /api/agents` + mission courante
- [x] Événements live depuis SSE global (nouveaux messages, statuts)
- [x] `setInterval` simulé supprimé

---

## Slice 5 — Dashboard & Stats ✅ complet
**Objectif** : Dashboard chiffré sur vraies données.

**Backend** :
- [x] `GET /api/stats` — retourne :
  ```json
  {
    "total": { "missions": N, "cost_usd": X, "tokens_in": Y, "tokens_out": Z },
    "by_agent": [{ "name": "…", "missions": N, "cost_usd": X }],
    "daily": [{ "date": "YYYY-MM-DD", "missions": N, "cost_usd": X, "tokens_in": Y }]
  }
  ```

**Frontend** :
- [x] `dashboard.vue` : radar + bar charts depuis `GET /api/stats`
- [x] Données statiques D3 supprimées

---

## Slice 6 — Kanban ✅ complet
**Objectif** : Kanban branché sur missions réelles + backlog planifié.

**Backend** :
- [x] Nouvelle table `tasks` : `id, title, description, agent_name, status (backlog|todo|doing|done), mission_id?, created_at, updated_at`
- [x] `GET /api/tasks` — liste toutes les tâches
- [x] `POST /api/tasks` — créer une tâche (backlog/todo)
- [x] `PATCH /api/tasks/:id` — déplacer colonne, lier `mission_id`
- [x] `DELETE /api/tasks/:id`

**Frontend** :
- [x] `kanban.vue` : fetch `GET /api/tasks`
- [x] Drag-and-drop → `PATCH /api/tasks/:id` (status)
- [x] "Spawn" depuis colonne todo → `POST /api/agents/spawn` + lier task
- [x] Création tâche inline

---

## Slice 7 — Memory ✅ complet
**Objectif** : Lecteur/éditeur de fichiers mémoire live.

**Backend** :
- [x] `GET /api/memory/:agent/files` — liste fichiers `~/.mos/agents/:agent/memory/`
- [x] `GET /api/memory/:agent/files/:filename` — lire contenu
- [x] `PUT /api/memory/:agent/files/:filename` — écrire contenu
- [x] `DELETE /api/memory/:agent/files/:filename` — supprimer fichier

**Frontend** :
- [x] `memory.vue` : arbre de fichiers depuis API
- [x] Éditeur textarea → save via `PUT`
- [x] Sélecteur d'agent

---

## Slice 8 — Skills ✅ complet
**Objectif** : Catalogue de skills persisté et gérable.

**Backend** :
- [x] Nouvelle table `skills` : `id, name, description, command, agent_name, category, source, active, yaml_def, created_at`
- [x] `GET /api/skills` — liste
- [x] `POST /api/skills` — créer
- [x] `PUT /api/skills/:id` — modifier
- [x] `DELETE /api/skills/:id` — supprimer
- [x] Seed initial avec skills par défaut + loyalty skills (au démarrage)

**Frontend** :
- [x] `skills.vue` : liste depuis `GET /api/skills`
- [x] Formulaire création/édition inline
- [x] "Run" skill → `POST /api/agents/spawn` avec le command du skill

---

## Slice 9 — Orchestration multi-agents (Support Loyalty) 🚧
**Objectif** : Pipeline bout-en-bout : Telegram/webhook → triage → spécialiste → réponse.

- [x] Migration DB : colonnes `parent_mission_id`, `callback_url` sur table `missions`
- [x] Extension interface `Mission` (types.ts)
- [x] `spawnAgent` : signature étendue (`parentMissionId`, `callbackUrl`)
- [x] `extractTriageDecision` : parser JSON robuste (gère fences markdown)
- [x] `tryAutoRoute` : auto-spawn du spécialiste depuis résultat triage
- [x] `waitForFinalCompletion` : poll qui suit la mission enfant + période de grâce
- [x] Telegram : utilise `waitForFinalCompletion` → réponse du spécialiste au client
- [x] Webhook : support `callback_url` + `postCallback` HTTP/HTTPS natif
- [x] `seed-loyalty.ts` : création `loyalty-webhook.json` + `loyalty-telegram.json.example`
- [x] Kanban : domaine `loyalty` dans le select
- [x] Skills : filtres `Support` et `Support B2B`

---

## Ordre d'exécution recommandé
```
S1 foundation → S2 missions → S3 agents+chat → S4 visualiseur
             → S5 stats     → S6 kanban      → S7 memory → S8 skills → S9 orchestration
```

S1 est le prérequis de tout. S2 et S3 sont indépendants entre eux une fois S1 fait.
