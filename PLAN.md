# Plan — Max OS — 1 · Tâches restantes

## État actuel (S1–S9 complètes)

Les 9 slices sont implémentées et câblées. Le système est fonctionnel de bout en bout pour le cas d'usage loyalty. Ce qui reste concerne **l'opérabilité** (gérer l'OS depuis l'OS lui-même), **la persistance conversationnelle**, et **la robustesse** pour un usage quotidien.

---

## Gaps identifiés

| # | Gap | Impact |
|---|-----|--------|
| G1 | Aucune page UI pour les canaux — impossible de les gérer sans editer des fichiers | Bloquant pour les non-dev |
| G2 | Les canaux sont chargés au démarrage seulement — ajouter un canal exige un redémarrage | Opérationnel |
| G3 | Chat sans mémoire inter-sessions — l'agent repart de zéro à chaque conversation | UX dégradée |
| G4 | `npm run setup` doit être lancé manuellement — l'OS démarre vide sinon | Expérience d'installation |
| G5 | Pas de scheduler dans l'UI — planifier un agent = cron système externe | Fonctionnalité manquante |
| G6 | Remote control sans UI — les tokens JWT ne sont gérables que via API | Opérationnel |
| G7 | `MAXOS_JWT_SECRET` éphémère — les tokens meurent à chaque redémarrage | Sécurité/stabilité |

---

## Slice 10 — Canaux UI + reload à chaud *(priorité 1)*

### Backend — 4 endpoints nouveaux dans `orchestrator/src/channels/api.ts`

```
GET    /api/channels            → liste { name, config, active } depuis ~/.mos/channels/*.json
POST   /api/channels/:name      → crée ~/.mos/channels/:name.json + rechargement à chaud
PUT    /api/channels/:name      → met à jour le fichier + rechargement à chaud
DELETE /api/channels/:name      → supprime le fichier, arrête le polling Telegram si actif
POST   /api/channels/:name/reload → rechargement manuel d'un canal
```

**Rechargement à chaud** — extraire un `ChannelRegistry` depuis `channels/index.ts` :
- Garder la `Map<string, ChannelConfig>` et le `WebhookRouter` en mémoire
- Exposer `reloadChannel(name)` : lit le fichier, met à jour la Map, redémarre le polling Telegram si nécessaire

**Arrêt propre Telegram** — `startTelegramPolling` doit retourner un objet `{ stop() }` pour permettre le rechargement sans fuites.

### Frontend — `app/pages/channels.vue` (nouvelle page)

- Liste des canaux avec badge type (`webhook` / `telegram`), statut actif/inactif
- Bouton "Add channel" → modal avec `type`, `defaultAgent`, `botTokenEnv`, `allowedChatIds`, `webhookSecret`
- Bouton "Edit" → même modal pré-rempli
- Bouton "Delete" avec confirmation
- Pour Telegram : warning si `TELEGRAM_BOT_TOKEN` non défini dans l'env

Ajouter le lien "Channels" dans le layout de navigation.

### Fichiers modifiés

| Fichier | Type |
|---------|------|
| `orchestrator/src/channels/api.ts` | Nouveau — routeur CRUD + rechargement |
| `orchestrator/src/channels/index.ts` | Refacto — exposer `ChannelRegistry` |
| `orchestrator/src/channels/telegram.ts` | Retourner `{ stop() }` depuis `startTelegramPolling` |
| `orchestrator/src/index.ts` | Monter `channelApiRouter` sur `/api/channels/config` |
| `app/pages/channels.vue` | Nouvelle page |
| `app/layouts/default.vue` | Ajouter lien Channels dans nav |

---

## Slice 11 — Chat persistant (historique inter-sessions) *(priorité 2)*

### Problème

Chaque conversation spawn une mission isolée. L'agent ne "souvient" pas des échanges précédents.

### Solution : injection d'historique via system prompt

Pas de nouvelle table — on réutilise les events existants. À chaque nouveau spawn depuis le chat :
1. Requête SQLite : `SELECT input, payload FROM missions JOIN events WHERE agent_name = ? AND type = 'result' ORDER BY created_at DESC LIMIT 10`
2. Construire un bloc `## Conversations récentes` injecté en tête du `missionInput`
3. Optionnel : toggle "Fresh start" dans l'UI pour désactiver

### Backend — modifier `POST /api/agents/spawn`

Ajouter un paramètre optionnel `withHistory?: boolean`. Si `true` :
- Charger les 10 derniers échanges (input + result) de cet agent
- Préfixer `missionInput` avec le contexte formaté

### Frontend — `app/pages/agents/[name]/index.vue`

- Afficher l'historique des conversations passées (missions `done` de cet agent, triées par date)
- Bouton "Reprendre" sur une mission passée → pré-remplit l'input avec son contexte
- Toggle "Fresh start" (désactive l'injection d'historique)

### Fichiers modifiés

| Fichier | Type |
|---------|------|
| `orchestrator/src/index.ts` | Modifier `POST /api/agents/spawn` — paramètre `withHistory` |
| `app/pages/agents/[name]/index.vue` | Historique + toggle Fresh start |

---

## Slice 12 — Scheduler *(priorité 3)*

### Backend

**Nouvelle table `schedules`** dans `db.ts` :
```sql
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  input_template TEXT NOT NULL,
  cron_expr TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  last_run_at INTEGER,
  last_mission_id TEXT,
  created_at INTEGER NOT NULL
)
```

**`orchestrator/src/scheduler.ts`** — moteur cron :
- Dépendance : `node-cron` (déjà dans l'écosystème ou à ajouter)
- Au démarrage : charger toutes les schedules actives et les enregistrer
- À chaque tick : `spawnAgent(getAgentConfig(agent_name), input_template, 'scheduler')`
- Mise à jour `last_run_at` et `last_mission_id` après spawn

**Nouveau routeur `orchestrator/src/routes/schedules.ts`** :
```
GET    /api/schedules
POST   /api/schedules
PUT    /api/schedules/:id
DELETE /api/schedules/:id
POST   /api/schedules/:id/run  → déclenche manuellement
```

### Frontend — `app/pages/scheduler.vue` (nouvelle page)

- Liste des schedules avec `cron_expr`, agent, dernière exécution, lien vers mission
- Formulaire création : nom, agent (select), input, expression cron (avec helper visuel)
- Toggle actif/inactif
- Bouton "Run now"

### Fichiers modifiés

| Fichier | Type |
|---------|------|
| `orchestrator/src/db.ts` | Migration — table `schedules` |
| `orchestrator/src/scheduler.ts` | Nouveau — moteur cron |
| `orchestrator/src/routes/schedules.ts` | Nouveau — routeur CRUD |
| `orchestrator/src/index.ts` | Monter le routeur + démarrer le scheduler |
| `app/pages/scheduler.vue` | Nouvelle page |
| `app/layouts/default.vue` | Ajouter lien Scheduler dans nav |

---

## Slice 13 — Remote control UI *(priorité 4)*

Le backend est complet (`/api/remote/tokens` CRUD + auth JWT). Il manque juste l'interface.

### Frontend — `app/pages/remote.vue` (nouvelle page)

- Liste des tokens actifs (`GET /api/remote/tokens`) : nom client, date création, expiration, nb appels
- Bouton "Issue token" → modal avec `client_name` → afficher le token généré **une seule fois**
- Bouton "Revoke" par token
- Lien "OpenAPI spec" → ouvre `GET /api/remote/openapi.json` dans un nouvel onglet
- Section "Endpoint" : afficher l'URL de base de l'orchestrateur

### Backend — `MAXOS_JWT_SECRET` persistant

Dans `orchestrator/src/remote/auth.ts`, si `process.env.MAXOS_JWT_SECRET` n'est pas défini :
1. Chercher `~/.mos/.jwt_secret`
2. Si absent : générer un secret aléatoire, l'écrire dans ce fichier (chmod 600)
3. Utiliser ce fichier comme secret stable

### Fichiers modifiés

| Fichier | Type |
|---------|------|
| `orchestrator/src/remote/auth.ts` | Secret persistant via `~/.mos/.jwt_secret` |
| `app/pages/remote.vue` | Nouvelle page |
| `app/layouts/default.vue` | Ajouter lien Remote dans nav |

---

## Slice 14 — Setup automatique + robustesse *(priorité 5)*

### Auto-setup au démarrage

Dans `orchestrator/src/index.ts`, avant `app.listen` :
```typescript
import { autoSetup } from './setup.js';
autoSetup(); // no-op si ~/.mos/agents/_main/ existe déjà
```

Extraire la logique de `setup.ts` en fonction `autoSetup()` exportable.

### Pagination des missions

`GET /api/missions` retourne 100 missions hardcodé. Ajouter `?limit=N&offset=M` :
```typescript
const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
const offset = parseInt(req.query.offset as string) || 0;
```

### Erreurs visibles dans l'UI

Ajouter une route `GET /api/logs/recent` : retourne les 50 dernières lignes du process stdout/stderr via un ring buffer en mémoire (pas de fichier log).

Dans `missions.vue` : afficher un badge d'erreur sur les missions `failed`, avec le dernier event `error` disponible.

### Fichiers modifiés

| Fichier | Type |
|---------|------|
| `orchestrator/src/setup.ts` | Exporter `autoSetup()` |
| `orchestrator/src/index.ts` | Appeler `autoSetup()` + pagination missions |
| `app/pages/missions.vue` | Badge erreur sur missions failed |

---

## Ordre d'exécution recommandé

```
S10 Canaux UI      → S11 Chat persistant → S12 Scheduler
S13 Remote UI      → S14 Robustesse
```

S10 et S13 sont indépendants et parallélisables. S12 peut attendre S10 (les schedules utilisent potentiellement des canaux). S14 peut se faire en parallèle de tout.

---

## Récapitulatif des nouvelles pages frontend

| Page | Route |
|------|-------|
| Canaux | `/channels` |
| Scheduler | `/scheduler` |
| Remote control | `/remote` |

Ces 3 pages + les améliorations du chat constituent l'essentiel du travail restant.

---

## Vérification end-to-end finale (après S10–S14)

1. Démarrer l'orchestrateur → `~/.mos/` créé automatiquement, agent `_main` visible
2. Aller sur `/channels` → créer un canal webhook, le voir actif sans redémarrage
3. Aller sur `/agents/_main/chat` → envoyer 2 messages, recharger la page → historique visible
4. Aller sur `/scheduler` → créer une schedule cron, déclencher "Run now" → mission apparaît dans `/missions`
5. Aller sur `/remote` → émettre un token, redémarrer l'orchestrateur → token toujours valide
6. Tester `POST /api/channels/loyalty-webhook/inbound` → 2 missions créées (triage + spécialiste)
