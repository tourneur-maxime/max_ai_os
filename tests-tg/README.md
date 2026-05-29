# Tests Telegram — Canal `loyalty-telegram`

Traces de conversations simulées via le canal Telegram du pipeline Support Fidélité.  
Chaque fichier correspond à un cas de test réel envoyé fictivement via l'API Telegram et traité par l'orchestrateur MaxOS.

**Date des tests** : 2026-05-10  
**Modèle agent** : `claude-sonnet-4-6`  
**Pipeline** : Telegram → `loyalty-triage` → spécialiste → réponse Telegram

---

## Index des tests

| Fichier | Thématique | Agent final | Routing | Statut |
|---------|------------|-------------|---------|--------|
| [test-01-b2c-solde-points.md](test-01-b2c-solde-points.md) | Consultation solde & profil membre | `loyalty-b2c` | Triage auto | ✅ done |
| [test-02-b2c-points-manquants.md](test-02-b2c-points-manquants.md) | Points non crédités après achat | `loyalty-b2c` | Triage auto | ✅ done |
| [test-03-b2b-sante-api.md](test-03-b2b-sante-api.md) | Incident API partenaire B2B (erreurs 422) | `loyalty-b2b` | Tag `@b2b` direct | ✅ done |
| [test-04-b2c-recommandations-recompenses.md](test-04-b2c-recommandations-recompenses.md) | Recommandations récompenses personnalisées | `loyalty-b2c` | Triage auto | ✅ done |
| [test-05-b2c-escalade-menace-legale.md](test-05-b2c-escalade-menace-legale.md) | Perte massive de points + menace légale | `loyalty-escalation` | Triage → escalade immédiate | ✅ done |
| [test-06-triage-ambiguite-b2b-vs-b2c.md](test-06-triage-ambiguite-b2b-vs-b2c.md) | Message ambigu — gérant franchise | `loyalty-b2b` | Triage (cas limite) | ✅ done |

---

## Résultats synthétiques

### Routing

| Cas | Attendu | Obtenu | Correct |
|-----|---------|--------|---------|
| Solde membre | loyalty-b2c | loyalty-b2c | ✅ |
| Points manquants | loyalty-b2c | loyalty-b2c | ✅ |
| API B2B (tag @b2b) | loyalty-b2b (direct) | loyalty-b2b (direct) | ✅ |
| Recommandations | loyalty-b2c | loyalty-b2c | ✅ |
| Escalade légale | loyalty-escalation | loyalty-escalation | ✅ |
| Franchise ambiguë | loyalty-b2b | loyalty-b2b | ✅ |

**Taux de routing correct : 6/6 (100%)**

### Coûts (estimés)

| Test | Triage ($) | Spécialiste ($) | Total ($) |
|------|-----------|----------------|-----------|
| 01 | 0.0021 | 0.0089 | 0.0110 |
| 02 | 0.0023 | 0.0094 | 0.0117 |
| 03 | — | 0.0124 | 0.0124 |
| 04 | 0.0025 | 0.0143 | 0.0168 |
| 05 | 0.0028 | 0.0273 | 0.0301 |
| 06 | 0.0029 | 0.0178 | 0.0207 |
| **Total** | **0.0126** | **0.0901** | **$0.1027** |

Coût moyen par conversation : **~$0.017**

---

## Observations transversales

### Ce qui fonctionne bien

1. **Le triage est fiable** pour les cas nets (solde, points manquants, escalade légale évidente).
2. **Le routing par tag** (`@b2b`) est plus rapide (~30% de gain) et bypass correctement le triage quand l'identité B2B est explicite.
3. **`waitForFinalCompletion`** suit correctement la mission enfant après le switch de `parent_mission_id`.
4. **Les system prompts** sont bien calibrés — les agents restent dans leur périmètre et ne font pas de geste commercial non autorisé.

### Points d'amélioration identifiés

1. **Limite 4 096 caractères Telegram** : les cas d'escalade complexes (Test 05) sont tronqués. Implémenter un split multi-messages.
2. **Pas d'accès réel aux données membres** : les agents simulent des réponses réalistes mais ne peuvent pas consulter une vraie BDD. Prévoir des outils `loyalty_db_lookup` et `loyalty_tx_history`.
3. **Notifications proactives manquantes** : le canal est purement réactif. Envisager un cron pour alerter les membres dont les points expirent sous 30 jours.
4. **Cas ambigu** (Test 06) : un mécanisme de clarification interactive (question de retour sur Telegram avant de spawner l'agent) améliorerait la précision du triage.
5. **Email parallèle pour les cas critiques** : un cas critique (Test 05) ne devrait pas reposer uniquement sur Telegram — déclencher un email en parallèle via un skill.
