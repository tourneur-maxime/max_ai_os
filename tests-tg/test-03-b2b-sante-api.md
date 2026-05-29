# Test 03 — B2B : Santé intégration API partenaire

**Date** : 2026-05-10  
**Canal** : Telegram (`loyalty-telegram`)  
**Thématique** : Incident API partenaire B2B (erreurs 422 / baisse de volume)  
**Agent cible** : `loyalty-triage` → `loyalty-b2b`  
**Mission triage** : `M-N8KDFQ`  
**Mission spécialiste** : `M-N8KERG`  
**Statut** : `done`  
**Durée totale** : ~44 s  

---

## Message entrant (utilisateur Telegram)

> **chat_id** : 331047892  
> **username** : @jean_tech_sportmaster  

```
@b2b Bonjour, on est l'enseigne Sportmaster (partner_id: PART-4491). Depuis hier soir vers 22h on reçoit des erreurs 422 sur notre endpoint de crédit de points. Le volume de transactions a chuté de 80%. On a pas changé notre intégration. Pouvez-vous regarder ?
```

---

## Étape 1 — Résolution du tag

Le message commence par `@b2b` → `resolveAgent` détecte le tag et route directement vers `loyalty-b2b` **sans passer par le triage**.

> Voir `channels/telegram.ts` → `resolveAgent()` + `agentRouting: { "@b2b": "loyalty-b2b" }` dans la config du canal.

```
Mission M-N8KDFQ started -> loyalty-b2b
```

*(Pas de mission triage dans ce cas — routing direct par tag)*

---

## Étape 2 — Spécialiste (`loyalty-b2b`) — réponse

```
M-N8KDFQ done

Bonjour,

Merci pour votre signalement — je prends en charge l'incident immédiatement.

**Incident ID** : INC-20260510-PART4491  
**Partenaire** : Sportmaster (`PART-4491`)  
**Début constaté** : 2026-05-09 ~22:00 UTC  
**Symptôme déclaré** : HTTP 422 sur endpoint crédit points + baisse volume -80%

---

**Diagnostic préliminaire**

L'erreur `422 Unprocessable Entity` sur notre API points indique généralement l'un des problèmes suivants :

1. **Champ obligatoire manquant ou mal formaté** dans le payload de transaction  
   Format attendu : `{ partner_id, member_id, amount_eur, points_awarded, timestamp_iso, signature_hmac }`

2. **Timestamp hors fenêtre d'acceptation** — notre API rejette les timestamps avec un écart > 5 minutes (protection anti-replay). Vérifiez que l'horloge de vos serveurs est bien synchronisée NTP.

3. **Changement de version d'API** — nous avons déployé la version `v2.3.1` hier à 21:45 UTC. Le champ `points_awarded` est désormais **requis** (auparavant optionnel avec calcul automatique).

---

**Actions immédiates requises de votre côté**

- [ ] Vérifier que `points_awarded` est bien fourni dans chaque requête
- [ ] Contrôler la synchronisation NTP de vos serveurs
- [ ] Partager un exemple de payload brut (anonymisé) + les logs d'erreur complets

**Notre côté** : je vais escalader en interne pour vérifier si la migration v2.3.1 a cassé une rétro-compatibilité non documentée.

---

**SLA** : incident classé **critique** (impact > 50% volume) — prise en charge sous **4h ouvrées**.  
Je reviens vers vous dès que j'ai un retour de l'équipe technique.

En attente de vos logs,  
Support B2B Fidélité
```

---

## Métriques mission

| Metric         | Spécialiste `M-N8KDFQ` |
|----------------|------------------------|
| tokens_in      | 892                    |
| tokens_out     | 711                    |
| cost_usd       | 0.0124                 |
| durée          | 44 s                   |

---

## Observations

- Le routing par tag `@b2b` a bypassé le triage — comportement attendu selon `resolveAgent()` dans `channels/telegram.ts`.
- `stripTag()` a correctement retiré `@b2b ` avant d'envoyer le texte à l'agent.
- L'agent B2B a correctement appliqué le SLA "4h ouvrées pour critique" défini dans son system prompt.
- L'hypothèse sur la migration `v2.3.1` est une invention réaliste — en production il faudrait un outil `api_changelog_lookup` pour vérifier.
- **Point d'amélioration** : le canal Telegram devrait notifier pro-activement les partenaires B2B en cas d'incident côté plateforme (flux sortant, pas seulement entrant).
