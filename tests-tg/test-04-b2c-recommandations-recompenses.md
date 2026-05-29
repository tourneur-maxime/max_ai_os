# Test 04 — B2C : Recommandations de récompenses personnalisées

**Date** : 2026-05-10  
**Canal** : Telegram (`loyalty-telegram`)  
**Thématique** : Demande de recommandations de récompenses  
**Agent cible** : `loyalty-triage` → `loyalty-b2c`  
**Mission triage** : `M-N8KHRZ`  
**Mission spécialiste** : `M-N8KJ2W`  
**Statut** : `done`  
**Durée totale** : ~42 s  

---

## Message entrant (utilisateur Telegram)

> **chat_id** : 074829361  
> **username** : @camille_d  

```
Salut ! J'ai 1 800 points sur mon compte et je sais pas trop quoi en faire. Je suis plutôt fan de sport, je voyage souvent pour le boulot, et j'adore les bons restos. Qu'est-ce que vous me conseillez comme récompenses ? Mon compte c'est FID-00612095.
```

---

## Étape 1 — Réponse de l'orchestrateur

```
Mission M-N8KHRZ started -> loyalty-triage
```

---

## Étape 2 — Triage (`loyalty-triage`) — sortie JSON

```json
{
  "demandeur_type": "B2C",
  "categorie": "récompenses",
  "urgence": "faible",
  "agent_cible": "loyalty-b2c",
  "resume": "Membre FID-00612095 (1800 points, niveau Silver proche Gold) recherche des recommandations personnalisées de récompenses — profil : sport, voyages pro, gastronomie",
  "tags": ["recommandations", "catalogue", "échange", "profil-sport", "voyages", "gastronomie"],
  "escalade_immediate": false,
  "note_pour_agent": "Profil riche. Proposer des récompenses dans les 3 catégories identifiées. Mettre en avant que 200 points supplémentaires = passage Gold avec avantages élargis."
}
```

---

## Étape 3 — Spécialiste (`loyalty-b2c`) — réponse

```
M-N8KHRZ done

Bonjour Camille ! Avec 1 800 points et un profil comme le vôtre, vous avez de belles options 🎉

Voici mes 5 recommandations personnalisées :

---

🏃 **Sport**

**1. Bon d'achat Decathlon — 500 points**
Un bon de 15 € utilisable en magasin ou en ligne sur l'ensemble du catalogue. Parfait pour renouveler vos équipements sans se poser de question.

**2. Abonnement Premium Nike Training Club — 3 mois — 400 points**
Accès à des programmes d'entraînement personnalisés avec des coachs Nike. Idéal si vous cherchez à varier vos routines sportives.

---

✈️ **Voyages**

**3. Surclassement Business Lounge SNCF — 1 trajet — 350 points**
Accès Salon Grand Voyageur pour votre prochain déplacement pro. Très apprécié pour travailler dans le calme avant un train.

**4. Nuit d'hôtel Marriott Bonvoy (catégorie 1-3) — 800 points**
Échangeable sur des hôtels Marriott en Europe — une bonne façon de compenser une nuit de déplacement sans frais.

---

🍽️ **Gastronomie**

**5. Bon repas TheFork Premium — 2 couverts — 600 points**
Réservation dans un restaurant sélectionné avec réduction de 30 % sur l'addition. Valable dans +1 200 restaurants partenaires.

---

💡 **Mon conseil**

Vous êtes à **200 points du niveau Gold** (2 000 points/an). Si vous optez pour les récompenses sport + salon SNCF (850 pts), votre solde passe à 950 points et vous serez Gold dès votre prochain achat significatif chez un partenaire.

Le niveau Gold vous ouvre : points doublés chez 3 partenaires, accès prioritaire aux ventes privées et invitations aux événements partenaires.

Vous souhaitez que je lance un échange ? 🙂
```

---

## Métriques mission

| Metric         | Triage `M-N8KHRZ` | Spécialiste `M-N8KJ2W` |
|----------------|-------------------|------------------------|
| tokens_in      | 451               | 1 203                  |
| tokens_out     | 214               | 792                    |
| cost_usd       | 0.0025            | 0.0143                 |
| durée          | 13 s              | 29 s                   |

---

## Observations

- Le skill `reward_recommendation` du catalogue skills correspond exactement à ce cas — il aurait pu être invoqué directement via le Kanban.
- La note du triage ("mettre en avant le passage Gold") a bien été prise en compte par l'agent B2C.
- L'agent ne peut pas déclencher un échange réel → il propose mais renvoie l'action à l'utilisateur.
- **Point d'amélioration** : intégrer un deep link Telegram vers l'interface d'échange du programme pour faciliter le passage à l'acte.
