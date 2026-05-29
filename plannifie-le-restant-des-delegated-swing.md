# Plan — Rendre Max OS — 1 pleinement opérationnel

## Contexte

Le SLICES.md marque S3-S8 comme non faits, mais le code sur `feat/backend` les implémente tous (confirmé par exploration). Le commit `bbbeec40 feat: wire all 8 pages to real backend — zero fake data` a câblé les 8 pages en une fois sans mettre à jour le tracker. Le vrai travail restant est le **système d'orchestration multi-agents** pour le support loyalty — le seul mécanisme absent qui empêche le système d'être opérationnel de bout en bout.

---

## État réel vs SLICES.md

| Slice | SLICES.md | Réalité code feat/backend |
|-------|-----------|--------------------------|
| S1 Foundation | ✅ | ✅ |
| S2 Missions | ✅ | ✅ |
| S3 Agents & Chat | ❌ (non coché) | ✅ — PUT/DELETE /api/agents/:name/config, DELETE, GET system-prompt, agents/index.vue + chat.vue complets |
| S4 Visualiseur | ❌ | ✅ — D3 + SSE global + données réelles |
| S5 Dashboard | ❌ | ✅ — /api/stats + dashboard.vue radar/bar |
| S6 Kanban | ❌ | ✅ — /api/tasks CRUD + kanban.vue drag-drop |
| S7 Memory | ❌ | ✅ — /api/memory CRUD + memory.vue éditeur |
| S8 Skills | ❌ | ✅ — /api/skills CRUD + skills.vue + seed loyalty |

**Action 0 (avant tout)** : mettre à jour SLICES.md pour cocher S3-S8 et ajouter une section S9 pour le travail ci-dessous.

---

## Ce qui manque (les 4 gaps bloquants)

### Gap 1 — Auto-routing post-triage *(critique)*
`loyalty-triage` produit un JSON `{ agent_cible, resume, note_pour_agent, ... }` mais rien ne le lit. Il n'y a pas de spawn automatique du spécialiste.

### Gap 2 — Telegram suit la mauvaise mission
`waitForCompletion(triageMissionId)` renvoie le JSON de classification au client. Il faut suivre la mission *enfant* (spécialiste) et renvoyer sa réponse.

### Gap 3 — Aucun fichier de config canal créé
`channels/index.ts` lit `~/.mos/channels/*.json`. Sans fichier, aucun canal ne démarre. `seed-loyalty.ts` crée les agents mais pas les configs canaux.

### Gap 4 — Webhook sans réponse sortante
`webhook.ts` retourne HTTP 200 immédiatement. Il n'y a aucun mécanisme pour rappeler la source avec le résultat final.

---

## Plan d'implémentation — 7 étapes ordonnées

### Étape 0 — Mettre SLICES.md à jour
Cocher toutes les cases S3-S8, ajouter une section :
```markdown
## Slice 9 — Orchestration multi-agents (Support Loyalty) 🚧
```
avec les items des étapes 1-7 ci-dessous.

---

### Étape 1 — Migration DB : `orchestrator/src/db.ts`
Après le bloc `db.exec(...)` existant, ajouter un bloc de migration incrémentale :

```typescript
const migrations = [
  'ALTER TABLE missions ADD COLUMN parent_mission_id TEXT',
  'ALTER TABLE missions ADD COLUMN callback_url TEXT',
  'CREATE INDEX IF NOT EXISTS idx_missions_parent ON missions(parent_mission_id)',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch { /* colonne déjà existante */ }
}
```

**Pourquoi try/catch par ligne** : `db.exec()` s'arrête à la première erreur — séparer les instructions permet d'ignorer les colonnes déjà présentes sans bloquer les autres.

---

### Étape 2 — Étendre les types : `orchestrator/src/types.ts`
Ajouter deux champs optionnels à `Mission` :
```typescript
parent_mission_id?: string;
callback_url?: string;
```

---

### Étape 3 — Auto-routing : `orchestrator/src/spawn.ts` *(étape principale)*

**3a. Signature de `spawnAgent`** — ajouter deux paramètres optionnels :
```typescript
export function spawnAgent(
  agent: Agent,
  missionInput: string,
  sourceChannel?: string,
  parentMissionId?: string,  // NOUVEAU
  callbackUrl?: string,       // NOUVEAU
): string
```
Mettre à jour le INSERT dans la DB pour inclure ces deux colonnes.

**3b. Ajouter `extractTriageDecision(resultText: string)`** — parser robuste qui gère les fences markdown ````json ... ``` que Claude ajoute parfois autour de son JSON :
```typescript
function extractTriageDecision(resultText: string): { agent_cible: string; resume?: string; note_pour_agent?: string } | null {
  const fenceMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/);
  for (const candidate of fenceMatch ? [fenceMatch[1], resultText] : [resultText]) {
    try {
      const parsed = JSON.parse(candidate.trim());
      if (parsed?.agent_cible) return parsed;
    } catch { /* continue */ }
  }
  return null;
}
```

**3c. Ajouter `tryAutoRoute(missionId, resultText)`** — appelée dans `storeAndBroadcast` quand `type === 'result'` :
- Lire la mission depuis DB (agent_name, source_channel, callback_url, parent_mission_id)
- Garde anti-boucle : si `agent_name` n'est pas dans `TRIAGE_AGENTS` (`Set<string>`) **ou** si `parent_mission_id !== null` → return immédiatement
- Appeler `extractTriageDecision(resultText)`
- Si `decision.agent_cible` existe, vérifier que `~/.mos/agents/<agent_cible>/` existe sur le FS — sinon fallback sur `loyalty-escalation`
- Construire l'input enrichi pour le spécialiste :
  ```
  <message original du demandeur>
  
  --- Contexte triage ---
  Note : <note_pour_agent>
  Résumé : <resume>
  ```
- Appeler `spawnAgent(agentConfig, enrichedInput, sourceChannel, missionId, callbackUrl)`
- Utiliser `setImmediate(() => tryAutoRoute(...))` pour ne pas bloquer le callback PTY `onData`

**3d. Exporter `waitForFinalCompletion`** — remplace `waitForCompletion` (qui reste privée pour la compatibilité interne) :
```typescript
export function waitForFinalCompletion(
  rootMissionId: string,
  cb: (status: string, output?: string) => void,
  timeoutMs = 30 * 60 * 1000,
): void
```
Logique :
- Poll DB toutes les 2s sur `currentMissionId` (commence à `rootMissionId`)
- Si la mission courante est `done` et qu'il n'y a pas encore eu de switch : chercher `SELECT id FROM missions WHERE parent_mission_id = ? ORDER BY created_at ASC LIMIT 1` → si enfant trouvé, `currentMissionId = child.id` et continuer
- Si la mission courante est `done` et déjà switch (ou pas d'enfant) : extraire `payload.result` depuis `events WHERE type = 'result'` et appeler `cb('done', output)`
- Si `failed` ou timeout : `cb('failed')` / `cb('timeout')`

---

### Étape 4 — Telegram suit l'enfant : `orchestrator/src/channels/telegram.ts`

Remplacer `waitForCompletion` (local, privé) par l'import de `waitForFinalCompletion` depuis `spawn.js` :
```typescript
import { spawnAgent, getAgentConfig, waitForFinalCompletion } from '../spawn.js';
```
Utiliser `waitForFinalCompletion(missionId, callback)` dans le handler `bot.on('message')`.
Supprimer la fonction `waitForCompletion` locale.

---

### Étape 5 — Callback webhook : `orchestrator/src/channels/webhook.ts`

Ajouter import de `waitForFinalCompletion` depuis `spawn.js`.

Dans `setImmediate(...)`, extraire `callback_url` du body :
```typescript
const callbackUrl = typeof body.callback_url === 'string' ? body.callback_url : undefined;
const missionId = spawnAgent(agentConfig, text, channelName, undefined, callbackUrl);
if (callbackUrl) {
  waitForFinalCompletion(missionId, (status, output) => {
    postCallback(callbackUrl, { missionId, status, output: output ?? null });
  });
}
```

Ajouter `postCallback(url, payload)` : POST HTTP/HTTPS natif (modules `http`/`https` node), une seule tentative, erreur loggée et ignorée (pas de retry au MVP).

---

### Étape 6 — Config canal : `orchestrator/src/seed-loyalty.ts`

À la fin de `seedLoyaltyAgents()`, créer deux fichiers si absents :

**`~/.mos/channels/loyalty-webhook.json`** (actif immédiatement) :
```json
{
  "type": "webhook",
  "defaultAgent": "loyalty-triage",
  "agentRouting": {}
}
```

**`~/.mos/channels/loyalty-telegram.json.example`** (inactif — extension `.json.example` ignorée par `channels/index.ts` qui filtre sur `.endsWith('.json')`) :
```json
{
  "type": "telegram",
  "defaultAgent": "loyalty-triage",
  "botTokenEnv": "TELEGRAM_BOT_TOKEN",
  "allowedChatIds": []
}
```
L'opérateur renomme ce fichier en `.json` après avoir configuré `TELEGRAM_BOT_TOKEN`.

---

### Étape 7 — Frontend : 2 fichiers

**`app/pages/kanban.vue`** (~ligne 87) — ajouter `loyalty` à la liste des domaines dans le `<select>` du modal "New task" :
```html
<option>loyalty</option>
```

**`app/pages/skills.vue`** (~ligne 161) — ajouter les catégories loyalty au tableau :
```typescript
const categories = ['All', 'Dev', 'Content', 'Ops', 'Life', 'Research', 'Support', 'Support B2B']
```
Optionnel : ajouter dans le CSS global `.domain-tag.support` et `.domain-tag.support-b2b` pour les couleurs.

---

## Fichiers modifiés

| Fichier | Type |
|---------|------|
| `SLICES.md` | Mise à jour tracker |
| `orchestrator/src/db.ts` | Migration ALTER TABLE |
| `orchestrator/src/types.ts` | Extension interface Mission |
| `orchestrator/src/spawn.ts` | Auto-routing + waitForFinalCompletion |
| `orchestrator/src/channels/telegram.ts` | Import waitForFinalCompletion |
| `orchestrator/src/channels/webhook.ts` | callback_url + postCallback |
| `orchestrator/src/seed-loyalty.ts` | Création configs canaux |
| `app/pages/kanban.vue` | Ajout domaine loyalty |
| `app/pages/skills.vue` | Ajout catégories Support |

---

## Vérification end-to-end

1. **Redémarrer le serveur** → vérifier `.schema missions` dans SQLite : colonnes `parent_mission_id` et `callback_url` présentes
2. **Vérifier les agents** → `GET /api/agents` retourne les 4 agents loyalty (seeded au démarrage)
3. **Vérifier le canal** → `~/.mos/channels/loyalty-webhook.json` existe
4. **Test auto-routing** :
   ```bash
   curl -X POST http://localhost:9000/api/channels/loyalty-webhook/inbound \
     -H "Content-Type: application/json" \
     -d '{"text": "Bonjour, mon solde de points a disparu depuis hier"}'
   ```
   → Vérifier dans `GET /api/missions` : 2 missions créées — une `loyalty-triage` + une `loyalty-b2c` avec `parent_mission_id` = ID de la première
5. **Test callback webhook** :
   ```bash
   # Terminal 1 : serveur d'écoute
   python3 -m http.server 4444
   # Terminal 2 : envoi
   curl -X POST http://localhost:9000/api/channels/loyalty-webhook/inbound \
     -H "Content-Type: application/json" \
     -d '{"text": "Points manquants", "callback_url": "http://localhost:4444/result"}'
   ```
   → Le serveur d'écoute reçoit un POST avec `{ missionId, status: "done", output: "..." }`
6. **Test Telegram** (si bot configuré) : envoyer un message → vérifier que la réponse reçue est celle du spécialiste (ton chaleureux B2C ou professionnel B2B), pas le JSON du triage
7. **Frontend** : ouvrir `/kanban` → "loyalty" présent dans le select domaine ; ouvrir `/skills` → filtres "Support" et "Support B2B" présents et fonctionnels

---

## Risques et edge cases

| Risque | Mitigation |
|--------|-----------|
| Claude enveloppe le JSON dans des fences markdown | `extractTriageDecision` essaie d'abord le contenu de la fence, puis le texte brut |
| Agent cible inexistant dans `~/.mos/agents/` | Vérification `fs.existsSync` avant spawn — fallback sur `loyalty-escalation` |
| Mission enfant plus rapide que le premier tick de poll (2s) | `waitForFinalCompletion` gère ce cas : elle détecte l'enfant même si déjà `done` |
| `storeAndBroadcast` appelé dans le callback PTY `onData` | `setImmediate` évite de blocker le flush PTY lors du spawn de l'enfant |
| Migration SQL sur DB existante | try/catch par instruction — ignoré si colonne déjà présente |
| Pas de retry sur callback webhook | Documenté comme limite MVP — une seule tentative, erreur loggée |
