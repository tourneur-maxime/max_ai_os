# Prompt — Visualizer (mesh des agents)

Page d'accueil de l'OS : visualisation force-directed des agents actifs, avec un agent principal au centre et les sous-agents qui orbitent autour. Chaque agent a un halo qui clignote quand il pense.

## Prompt à coller dans Claude Design

```
Crée une page web fullscreen "Agent Visualizer" pour un agentic OS personnel.

Layout :
- Fond sombre (couleur unie type #0a0a0a ou #111)
- Visualisation force-directed (D3 ou similaire) prenant 100% de la fenêtre
- Au centre : un agent principal "_main" représenté par un grand cercle (60px) avec son nom
- Autour : 4 à 8 sous-agents représentés par des cercles plus petits (40px), reliés au _main par des lignes fines
- Chaque agent a un halo lumineux (vert clair) qui pulse quand il est actif
- Les lignes entre agents pulsent aussi quand des données circulent

UI overlay :
- En haut à gauche : badge "Max OS — 1" en saumon (#E07A5F), avec sous-titre "local-first"
- En bas, sur toute la largeur : console scrollable qui affiche les events temps réel (PreToolUse, PostToolUse, Stop, etc.) — police monospace, fond #1a1a1a, texte gris clair
- En haut à droite : bouton "+ Add Agent" qui ouvre un picker pour spawn un nouvel agent
- Stats en haut au centre : "3 agents actifs · 142 events · $0.34 today"

Interactions :
- Clic sur un agent → ouvre son détail (modale ou panneau latéral)
- Hover sur un agent → tooltip avec son nom + statut + dernière action
- Drag pour repositionner les agents (force layout les ramène doucement)

Style :
- Tech, pro, dark mode
- Inspiré des dashboards d'orchestration (mais en plus minimaliste)
- Police : Inter ou similaire pour l'UI, monospace (JetBrains Mono) pour la console
- Couleur d'accent : saumon (#E07A5F) pour les éléments de marque

Stack suggérée : Nuxt.js + Tailwind + React Force Graph (ou D3).
```

## Notes

- Le halo qui pulse est la signature visuelle clé — le viewer doit voir tout de suite "ça vit".
- La console events en bas est essentielle pour montrer la vraie activité (pas juste un dashboard décoratif).
- Pas de couleurs trop vives → reste sombre et technique.
