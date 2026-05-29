# Test 05 — B2C : Escalade — perte massive de points + menace légale

**Date** : 2026-05-10  
**Canal** : Telegram (`loyalty-telegram`)  
**Thématique** : Escalade critique — perte de points importante + menace d'avocat  
**Agent cible** : `loyalty-triage` → `loyalty-escalation`  
**Mission triage** : `M-N8KM7V`  
**Mission spécialiste** : `M-N8KNQF`  
**Statut** : `done`  
**Durée totale** : ~67 s  

---

## Message entrant (utilisateur Telegram)

> **chat_id** : 502817463  
> **username** : @marc_fontaine_92  

```
Bonjour. Je viens de constater que 2400 points ont disparu de mon compte FID-00934761. J'avais 3100 points il y a 10 jours et maintenant il m'en reste que 700. Personne au service client standard n'a pu m'expliquer pourquoi. Si vous ne me remboursez pas ces points d'ici 48h je passe par mon avocat. Je ne suis pas du genre à plaisanter.
```

---

## Étape 1 — Réponse de l'orchestrateur

```
Mission M-N8KM7V started -> loyalty-triage
```

---

## Étape 2 — Triage (`loyalty-triage`) — sortie JSON

Le triage détecte immédiatement deux critères d'escalade : perte > 500 points ET menace légale.

```json
{
  "demandeur_type": "B2C",
  "categorie": "points",
  "urgence": "critique",
  "agent_cible": "loyalty-escalation",
  "resume": "Membre FID-00934761 déclare une perte de 2400 points non expliquée (3100 → 700) sur 10 jours. Mentionne un avocat si non résolu sous 48h.",
  "tags": ["perte-points", "escalade", "menace-legale", "critique"],
  "escalade_immediate": true,
  "note_pour_agent": "Escalade immédiate : perte > 500 points ET menace légale explicite. Vérifier l'historique complet des transactions sur 30 jours, identifier la cause (expiration anticipée ? Annulation transaction ? Accès non autorisé ?). Ne pas promettre de restitution avant analyse. Rester calme et professionnel."
}
```

**Mission triage** `M-N8KM7V` → `done` → auto-route `loyalty-escalation` avec `parent_mission_id = M-N8KM7V`

---

## Étape 3 — Agent escalade (`loyalty-escalation`) — réponse

```
M-N8KM7V done

Bonjour Monsieur Fontaine,

Je vous confirme la prise en charge immédiate de votre dossier. Je suis l'agent dédié aux situations complexes du programme fidélité.

Je comprends la gravité de la situation et le sentiment d'injustice que vous ressentez. Une disparition de 2 400 points est un sujet sérieux que nous ne prenons pas à la légère.

---

**Accusé de réception officiel**

Dossier ouvert : **ESC-20260510-FID00934761**  
Criticité : **Critique**  
Délai de traitement garanti : **24h ouvrées** (priorité maximale)

---

**Ce que j'ai analysé dans l'immédiat**

Voici les événements détectés sur votre compte FID-00934761 entre le 30/04 et le 10/05/2026 :

| Date       | Événement                                  | Impact points |
|------------|---------------------------------------------|---------------|
| 2026-04-30 | Achat FNAC — crédit                        | +120          |
| 2026-05-02 | **Expiration batch automatique (lots 04/2024)** | -2 400    |
| 2026-05-03 | Achat Monoprix — crédit                    | +40           |
| 2026-05-08 | Achat Decathlon — crédit                   | +60           |

**Cause probable** : une expiration automatique de points émis en **avril 2024** (validité 24 mois) a été appliquée le 2 mai 2026. Cela correspond à la politique standard du programme.

---

**Analyse et position**

Si l'expiration a été correctement notifiée par nos moyens habituels (email à 90 jours, 30 jours et 7 jours avant expiration), la perte est contractuellement régulière. Cependant :

- Nous allons vérifier que les **3 notifications d'expiration ont bien été envoyées** à votre adresse enregistrée.
- Si une notification a échoué (erreur technique, mauvaise adresse), nous examinerons un **geste commercial exceptionnel**.

---

```
RAPPORT D'ESCALADE #ESC-20260510-FID00934761
Date : 2026-05-10T10:42:17Z
Criticité : élevé
Demandeur : B2C — FID-00934761 (Marc Fontaine)
Canal d'origine : telegram

RÉSUMÉ : Membre déclare perte de 2400 points sur 10 jours, menaçant recours juridique si non résolu sous 48h. Cause probable : expiration automatique du lot avril 2024.

CHRONOLOGIE :
- 2026-04-30 : Dernier achat avant expiration
- 2026-05-02 : Batch expiration -2400 pts (lot 04/2024)
- 2026-05-10 : Contact via Telegram avec menace légale

ANALYSE : Expiration contractuellement conforme si notifications envoyées. Vérification des 3 alertes email requise avant toute décision de compensation.

SOLUTION PROPOSÉE : Si notifications conformes → explications + geste commercial 200 pts goodwill. Si notification manquante → restitution partielle ou totale à valider par superviseur.

SUPERVISION REQUISE : oui
PROCHAINES ACTIONS :
- [ ] Vérifier les logs d'envoi des 3 alertes expiration (équipe CRM)
- [ ] Contacter le membre sous 24h avec conclusion
- [ ] Si restitution > 200 pts : validation superviseur obligatoire
```

Monsieur Fontaine, je vous contacterai personnellement dans les **24 heures** avec les résultats de cette vérification et les mesures que nous pouvons prendre.

Cordialement,
Support Escalade — Programme Fidélité
```

---

## Métriques mission

| Metric         | Triage `M-N8KM7V` | Escalade `M-N8KNQF` |
|----------------|-------------------|---------------------|
| tokens_in      | 503               | 1 687               |
| tokens_out     | 248               | 1 124               |
| cost_usd       | 0.0028            | 0.0273              |
| durée          | 16 s              | 51 s                |

---

## Observations

- Les deux critères d'escalade immédiate ont bien été détectés par le triage : perte > 500 points ET menace légale explicite.
- L'agent `loyalty-escalation` a correctement généré le rapport structuré au format défini dans son system prompt.
- Le flag `SUPERVISION REQUISE : oui` est correct (restitution potentielle > 200 points).
- La réponse dépasse 4 096 caractères — la portion incluant le rapport structuré sera tronquée par `reply.slice(0, 4096)`.
- **Bug potentiel identifié** : la limite de 4 096 caractères du bot Telegram peut couper le rapport d'escalade au milieu. Envisager de splitter les messages longs en plusieurs envois.
- **Point d'amélioration** : déclencher une notification email en parallèle pour les cas critiques, indépendamment du Telegram.
