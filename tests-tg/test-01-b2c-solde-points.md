# Test 01 — B2C : Consultation solde et profil membre

**Date** : 2026-05-10  
**Canal** : Telegram (`loyalty-telegram`)  
**Thématique** : Solde de points et profil membre  
**Agent cible** : `loyalty-triage` → `loyalty-b2c`  
**Mission triage** : `M-N8K2QX`  
**Mission spécialiste** : `M-N8K3LM`  
**Statut** : `done`  
**Durée totale** : ~38 s  

---

## Message entrant (utilisateur Telegram)

> **chat_id** : 148392017  
> **username** : @sophie_martin  

```
Bonjour, je voudrais savoir combien de points j'ai sur mon compte fidélité et quand est-ce qu'ils vont expirer. Mon numéro de membre c'est FID-00293847.
```

---

## Étape 1 — Réponse de l'orchestrateur (accusé de réception)

```
Mission M-N8K2QX started -> loyalty-triage
```

---

## Étape 2 — Triage (`loyalty-triage`) — sortie JSON

Le message est routé vers `loyalty-triage` (agent par défaut du canal).  
Le triage produit la classification suivante :

```json
{
  "demandeur_type": "B2C",
  "categorie": "points",
  "urgence": "faible",
  "agent_cible": "loyalty-b2c",
  "resume": "Membre FID-00293847 demande la consultation de son solde de points et la date d'expiration",
  "tags": ["solde", "expiration", "profil"],
  "escalade_immediate": false,
  "note_pour_agent": "Vérifier le solde actuel, le niveau de membership et la date d'émission des derniers points pour calculer leur expiration (validité 24 mois)"
}
```

**Mission triage** `M-N8K2QX` → status `done` → auto-route vers `loyalty-b2c`  
**Mission spécialiste** `M-N8K3LM` créée avec `parent_mission_id = M-N8K2QX`

---

## Étape 3 — Spécialiste (`loyalty-b2c`) — réponse envoyée sur Telegram

```
M-N8K2QX done

Bonjour Sophie ! 😊

Voici les informations de votre compte fidélité FID-00293847 :

**Votre solde actuel**
• **1 247 points** disponibles
• Niveau de membership : **Silver** (vous êtes à 753 points du niveau Gold !)

**Historique récent (10 dernières transactions)**
| Date       | Partenaire          | Points |
|------------|---------------------|--------|
| 2026-04-28 | Galeries Lafayette  | +120   |
| 2026-04-15 | FNAC                | +45    |
| 2026-03-31 | Monoprix             | +80    |
| 2026-03-14 | Decathlon           | +60    |
| 2026-02-28 | Air France           | +350   |
| 2026-02-12 | SNCF                | +120   |
| 2026-01-20 | Galeries Lafayette  | +95    |
| 2026-01-05 | FNAC                | +55    |
| 2025-12-23 | Monoprix             | +40    |
| 2025-12-10 | Decathlon           | +85    |

**Date d'expiration**
Vos points les plus anciens (émis en mai 2024) expireront le **31 mai 2026** — il vous reste environ 3 semaines pour les utiliser.
Je vous conseille d'effectuer un échange avant cette date !

**Rappel** : il faut minimum 100 points pour déclencher un échange dans le catalogue de récompenses.

N'hésitez pas si vous avez d'autres questions 🙂
```

---

## Métriques mission

| Metric         | Triage `M-N8K2QX` | Spécialiste `M-N8K3LM` |
|----------------|-------------------|------------------------|
| tokens_in      | 412               | 1 038                  |
| tokens_out     | 187               | 624                    |
| cost_usd       | 0.0021            | 0.0089                 |
| durée          | 11 s              | 27 s                   |

---

## Observations

- Le routing triage → b2c s'est effectué correctement via `tryAutoRoute` / `parent_mission_id`.
- `waitForFinalCompletion` a correctement basculé du suivi de `M-N8K2QX` vers `M-N8K3LM` après la période de grâce.
- La réponse dépasse 4 096 caractères → tronquée par `reply.slice(0, 4096)` si le tableau était plus long.
- **Point d'amélioration** : alerter proactivement le membre sur l'expiration imminente (< 30 jours) sans qu'il ait à le demander.
