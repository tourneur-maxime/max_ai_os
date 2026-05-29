# Prompt — Catalogue Skills + Dashboard radar

Deux écrans complémentaires : la gestion du catalogue de skills Claude Code (activation/désactivation par agent) et le dashboard de pilotage avec radar des coûts par domaine.

## Prompt à coller dans Claude Design

```
Crée deux pages liées pour un agentic OS personnel.

==========================================
PAGE 1 — Skills Management
==========================================

Layout en grille :

Header :
- Titre "SKILLS CATALOG"
- Compteur : "24 skills disponibles · 12 actifs sur _main"
- Search bar
- Filtres : catégorie (Dev / Content / Ops / Life), source (built-in / custom)

Grille de cards (3 colonnes) :
- Chaque card = 1 skill
- Contenu :
  * Titre du skill (ex: "/pr-create")
  * Description courte (1 ligne)
  * Catégorie (chip)
  * Toggle "Activate" en haut à droite
  * Liste des agents qui l'utilisent (avatars empilés)
- État activé : bordure saumon
- État désactivé : bordure grise

Clic sur une card → modale détail :
- Description complète
- Code du skill (preview, scrollable)
- Liste détaillée d'activation par agent (toggles)
- Stats d'usage (combien d'invocations sur les 30 derniers jours)

==========================================
PAGE 2 — Dashboard
==========================================

Layout en grille (4 zones) :

Zone 1 (haut-gauche, 60% largeur) — Radar des coûts par domaine :
- Radar chart (5-6 axes : DEV, CONTENT, PRODUCT, OPS, LIFE, etc.)
- Période : toggle "7j / 30j / 90j"
- Valeurs en USD sur chaque axe
- Couleur de la zone : dégradé saumon transparent

Zone 2 (haut-droite, 40% largeur) — Top stats :
- Big number : Total coût période (avec variation vs période précédente)
- Big number : Tokens cumulés (en M)
- Big number : Missions terminées
- Big number : Agents actifs

Zone 3 (bas-gauche, 60% largeur) — Graphique tokens par jour :
- Bar chart empilé : tokens in (saumon clair) + tokens out (saumon foncé) par jour
- Période : 30 jours

Zone 4 (bas-droite, 40% largeur) — Breakdown par agent :
- Liste verticale des 5 agents les plus coûteux
- Chaque ligne : avatar + nom + barre de progression + coût USD

Style général :
- Dark mode (#0a0a0a, #1a1a1a)
- Accent : saumon (#E07A5F)
- Charts : utiliser des couleurs cohérentes (saumon + dérivés gris)
- Cards : bordure subtile, hover state léger

Stack : Nuxt.js + Tailwind + Recharts.
```

## Notes

- Le radar est le visuel signature du dashboard : montre l'équilibre/déséquilibre entre domaines.
- Le toggle d'activation par skill est important : pas tout activé partout (sinon ça pollue l'agent).
- Les stats de coût rendent **visible** ce qui est habituellement opaque (combien tu dépenses par domaine).
