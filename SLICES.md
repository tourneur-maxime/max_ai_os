# Max OS — 1 · Suivi développement vertical-slice

> Branche de travail : `feat/backend`  
> Convention : chaque slice = 1 commit atomique backend + frontend.

---

## Slice 1 — Foundation ✅ (partiel) / 🔲 à compléter
**Objectif** : Socle commun dont toutes les autres slices dépendent.

- [x] Orchestrateur Express + PTY (prompts 01-03)
- [x] SQLite WAL, tables `missions`, `events`, `remote_tokens`
- [x] SSE par mission (`/api/missions/:id/stream`)
- [x] Canaux Telegram + Webhook + Remote JWT
- [ ] **`GET /api/events/stream`** — SSE global (expose `broadcastAll`)
- [ ] **`PUT /api/agents/:name/config`** — écriture config.json + system-prompt.md
- [ ] **`GET /api/stats`** — agrégats coûts/tokens/missions par agent et par jour
- [ ] **Composable `useApi.ts`** — fetch wrapper + SSE helper
- [ ] **`nuxt.config.ts`** runtimeConfig `apiBase` (défaut `http://localhost:9000`)

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
- [ ] Remplacer tableau statique → fetch `GET /api/missions`
- [ ] Bouton Kill → `DELETE /api/missions/:id`
- [ ] Détail mission : SSE stream → log temps-réel dans panneau latéral
- [ ] Afficher `cost_usd`, `tokens_in`, `tokens_out`

---

## Slice 3 — Agents & Chat
**Objectif** : Gestion agents live + chat réel via spawn.

**Backend** :
- `GET /api/agents` ✅
- [ ] `PUT /api/agents/:name/config` — écriture fichiers `~/.mos/agents/<name>/`
- [ ] `DELETE /api/agents/:name` — supprime dossier `~/.mos/agents/<name>/`

**Frontend** :
- [ ] `agents/index.vue` : liste depuis `GET /api/agents`
- [ ] Formulaire config → `PUT /api/agents/:name/config`
- [ ] Créer / supprimer agent
- [ ] `agents/[name]/chat.vue` : spawn réel via `POST /api/agents/spawn`, affiche SSE stream en temps-réel, sendInput via `POST /api/agents/:id/send`

---

## Slice 4 — Visualiseur (index.vue)
**Objectif** : Mesh D3 animé sur données réelles.

**Backend** :
- `GET /api/agents` ✅
- `GET /api/events/stream` (global SSE) ← Slice 1

**Frontend** :
- [ ] Noeuds D3 depuis `GET /api/agents` + mission courante
- [ ] Événements live depuis SSE global (nouveaux messages, statuts)
- [ ] Supprimer `setInterval` simulé

---

## Slice 5 — Dashboard & Stats
**Objectif** : Dashboard chiffré sur vraies données.

**Backend** :
- [ ] `GET /api/stats` — retourne :
  ```json
  {
    "total": { "missions": N, "cost_usd": X, "tokens_in": Y, "tokens_out": Z },
    "by_agent": [{ "name": "…", "missions": N, "cost_usd": X }],
    "daily": [{ "date": "YYYY-MM-DD", "missions": N, "cost_usd": X, "tokens_in": Y }]
  }
  ```

**Frontend** :
- [ ] `dashboard.vue` : radar + bar charts depuis `GET /api/stats`
- [ ] Suppression données statiques D3

---

## Slice 6 — Kanban
**Objectif** : Kanban branché sur missions réelles + backlog planifié.

**Backend** :
- [ ] Nouvelle table `tasks` : `id, title, description, agent_name, status (backlog|todo|doing|done), mission_id?, created_at, updated_at`
- [ ] `GET /api/tasks` — liste toutes les tâches
- [ ] `POST /api/tasks` — créer une tâche (backlog/todo)
- [ ] `PATCH /api/tasks/:id` — déplacer colonne, lier `mission_id`
- [ ] `DELETE /api/tasks/:id`
- Missions `running` → colonne *doing* automatiquement (vue calculée)

**Frontend** :
- [ ] `kanban.vue` : fetch `GET /api/tasks`
- [ ] Drag-and-drop → `PATCH /api/tasks/:id` (status)
- [ ] "Spawn" depuis colonne todo → `POST /api/agents/spawn` + lier task
- [ ] Création tâche inline

---

## Slice 7 — Memory
**Objectif** : Lecteur/éditeur de fichiers mémoire live.

**Backend** :
- [ ] `GET /api/memory/:agent/files` — liste fichiers `~/.mos/agents/:agent/memory/`
- [ ] `GET /api/memory/:agent/files/:filename` — lire contenu
- [ ] `PUT /api/memory/:agent/files/:filename` — écrire contenu
- [ ] `DELETE /api/memory/:agent/files/:filename` — supprimer fichier

**Frontend** :
- [ ] `memory.vue` : arbre de fichiers depuis API
- [ ] Éditeur textarea → save via `PUT`
- [ ] Sélecteur d'agent

---

## Slice 8 — Skills
**Objectif** : Catalogue de skills persisté et gérable.

**Backend** :
- [ ] Nouvelle table `skills` : `id, name, description, command, agent_name, tags, created_at`
- [ ] `GET /api/skills` — liste
- [ ] `POST /api/skills` — créer
- [ ] `PUT /api/skills/:id` — modifier
- [ ] `DELETE /api/skills/:id` — supprimer
- [ ] Seed initial avec ~5 skills par défaut (au démarrage si table vide)

**Frontend** :
- [ ] `skills.vue` : liste depuis `GET /api/skills`
- [ ] Formulaire création/édition inline
- [ ] "Run" skill → `POST /api/agents/spawn` avec le command du skill

---

## Ordre d'exécution recommandé
```
S1 foundation → S2 missions → S3 agents+chat → S4 visualiseur
             → S5 stats     → S6 kanban      → S7 memory → S8 skills
```

S1 est le prérequis de tout. S2 et S3 sont indépendants entre eux une fois S1 fait.
