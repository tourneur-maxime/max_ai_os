# Test 06 — Triage : Message ambigu B2B vs B2C

**Date** : 2026-05-10  
**Canal** : Telegram (`loyalty-telegram`)  
**Thématique** : Message ambigu — franchise (gérant d'enseigne parlant en son nom ET pour ses clients)  
**Agent cible** : `loyalty-triage` → `loyalty-b2b`  
**Mission triage** : `M-N8KQ9S`  
**Mission spécialiste** : `M-N8KRVX`  
**Statut** : `done`  
**Durée totale** : ~57 s  

---

## Message entrant (utilisateur Telegram)

> **chat_id** : 418203957  
> **username** : @dupont_franchise_manager  

```
Bonjour, je gère une franchise Boulanger à Bordeaux. Depuis qu'on a intégré votre programme fidélité en mars, plusieurs de mes clients se plaignent que leurs points ne s'affichent pas après leur passage en caisse. J'ai vérifié côté logiciel caisse et tout semble OK de notre côté. Est-ce que c'est un problème de votre côté ou on a mal configuré quelque chose ? On a commencé à perdre des clients à cause de ça, c'est urgent.
```

---

## Étape 1 — Réponse de l'orchestrateur

```
Mission M-N8KQ9S started -> loyalty-triage
```

---

## Étape 2 — Triage (`loyalty-triage`) — raisonnement + sortie JSON

Le message est ambigu : le gérant parle de **ses clients** (angle B2C) mais le problème est **une intégration partenaire** (angle B2B). Le triage doit trancher.

Raisonnement du triage :
- L'émetteur est un **gérant d'enseigne partenaire**, pas un membre porteur de carte.
- Le problème est une **non-émission de points au niveau de l'intégration caisse** → problème B2B d'intégration.
- La mention "perdre des clients" indique un impact business → urgence haute.
- Pas de menace légale → pas d'escalade immédiate.

```json
{
  "demandeur_type": "B2B",
  "categorie": "technique",
  "urgence": "haute",
  "agent_cible": "loyalty-b2b",
  "resume": "Gérant franchise Boulanger Bordeaux (intégré mars 2026) : points non crédités après passage en caisse pour plusieurs clients. Logiciel caisse vérifié côté partenaire. Impact client signalé.",
  "tags": ["intégration-caisse", "non-emission-points", "franchise", "Boulanger", "urgent"],
  "escalade_immediate": false,
  "note_pour_agent": "Partenaire nouveau (intégration mars 2026) — probablement une mauvaise configuration du partner_id ou un problème de signature HMAC. Demander : partner_id, logs des transactions rejetées, version du logiciel caisse et mode d'intégration (API directe ou middleware fourni par nous)."
}
```

---

## Étape 3 — Spécialiste (`loyalty-b2b`) — réponse

```
M-N8KQ9S done

Bonjour,

Merci de nous avoir contactés — ce type de problème est prioritaire et nous allons le résoudre rapidement.

**Récapitulatif de la situation**
Franchise : Boulanger Bordeaux | Intégration : mars 2026  
Symptôme : points non crédités côté membre après passage en caisse  
Déclaré par : gérant de l'enseigne  

---

**Diagnostic préliminaire**

Pour une intégration récente (< 3 mois), les causes les plus fréquentes de non-émission sont :

**1. Partner_id non reconnu ou mal configuré**
Chaque enseigne reçoit un `partner_id` unique lors de l'onboarding. Si ce champ est absent ou incorrect dans le payload envoyé, notre API retourne un `404 Partner not found` et ne crédite pas les points.

**2. Signature HMAC invalide**
Notre API valide chaque transaction via une signature `sha256` sur le payload. Une clé périmée ou un payload modifié après signature déclenche un `401 Invalid signature` silencieux côté caisse si votre middleware ne logge pas les erreurs HTTP.

**3. Mapping membre non résolu**
Si le `member_id` envoyé par votre caisse ne correspond pas exactement au format attendu (FID-XXXXXXXX), les points sont calculés mais non rattachés à un compte.

---

**Ce dont j'ai besoin pour confirmer**

- [ ] Votre `partner_id` (format PART-XXXX)
- [ ] Un extrait de logs de votre caisse sur les 2 dernières transactions (avec codes retour HTTP si disponibles)
- [ ] Le nom du middleware ou logiciel de caisse utilisé (version incluse)
- [ ] Confirmation : utilisez-vous notre API directe ou une solution tierce ?

**SLA applicable** : incident classé **haute priorité** — je reviens vers vous sous **4h ouvrées** une fois les infos reçues.

En attendant, pouvez-vous demander à un client de vérifier son solde via l'appli membre ? Cela nous permettra de confirmer si le problème est côté émission (notre API) ou côté affichage (application mobile).

Cordialement,  
Support B2B Fidélité
```

---

## Métriques mission

| Metric         | Triage `M-N8KQ9S` | Spécialiste `M-N8KRVX` |
|----------------|-------------------|------------------------|
| tokens_in      | 487               | 1 341                  |
| tokens_out     | 261               | 834                    |
| cost_usd       | 0.0029            | 0.0178                 |
| durée          | 18 s              | 39 s                   |

---

## Observations

- **Cas ambigu traité correctement** : le triage a bien identifié que malgré la mention de "clients", l'émetteur est un partenaire B2B et le problème est d'intégration technique.
- Si le triage avait routé vers `loyalty-b2c`, l'agent aurait été hors de son périmètre (il ne gère pas les intégrations API).
- La note du triage ("demander partner_id, logs, version") a correctement orienté la réponse du spécialiste B2B.
- **Cas limite** : si le gérant avait dit "je suis client et je travaille chez Boulanger", le triage aurait pu se tromper. Un mécanisme de clarification interactive serait utile.
- **Point d'amélioration** : pour les nouvelles intégrations (< 6 mois), une checklist d'onboarding automatique pourrait être envoyée en premier secours avant même l'intervention d'un agent.
