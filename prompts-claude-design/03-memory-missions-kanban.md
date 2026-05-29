# Prompt — Mémoire éditable + Missions tracking + Vue Kanban

Trois écrans liés autour de la persistance et du suivi : la mémoire d'un agent (fichiers vivants), l'historique des missions avec coûts/tokens, et la vue Kanban globale.

## Prompt à coller dans Claude Design

```
Crée trois pages liées pour un agentic OS personnel.

==========================================
PAGE 1 — Memory Editor
==========================================

Layout en 2 colonnes :

Colonne gauche (30%) — Tree view :
- Liste des agents en haut
- Pour chaque agent sélectionné, arborescence de ses fichiers mémoire :
  * decisions.md
  * patterns.md
  * log.jsonl
  * (autres .md custom)
- Compteur de tokens mémoire en bas par agent

Colonne droite (70%) — Éditeur :
- Header avec breadcrumb (agent / fichier)
- Éditeur markdown WYSIWYG (split view : preview + raw)
- Toolbar : bold, italic, link, code, list
- Auto-save toutes les 5s (badge "saved 2s ago")
- Diff visible des dernières modifications (toggle "show changes")

Footer :
- Compteur de mots / tokens du fichier courant
- Bouton "Compact" (résumer la mémoire pour réduire les tokens)

==========================================
PAGE 2 — Missions
==========================================

Vue tableau d'historique :

Header :
- Filters : agent, statut (running/done/failed), domaine, date range
- Stats globales : missions du mois, coût total, tokens cumulés

Tableau :
- Colonnes : ID, Title, Agent, Started at, Duration, Cost USD, Tokens (in/out), Status
- Tri par défaut : date desc
- Status avec badges colorés

Clic sur une row → détail mission :
- Header : title, agent, status, dates
- Stats : cost, tokens in, tokens out, events count
- Timeline scrollable des events (PreToolUse, PostToolUse, Stop) avec timestamps
- Tab "Output" : sortie finale de l'agent (markdown rendu)
- Tab "Logs" : logs bruts JSON

==========================================
PAGE 3 — Kanban Board
==========================================

Vue Kanban des missions :

Header :
- Filtres : agent, domaine
- Switcher de vue : Kanban / Liste / Calendrier

Colonnes (4) :
- BACKLOG (gris)
- À FAIRE (bleu)
- EN COURS (saumon, avec halo pulsant)
- TERMINÉ (vert)

Cards :
- Titre court de la mission
- Badge agent attribué
- Coût estimé (si dispo)
- Drag & drop entre colonnes
- Quick actions : start, pause, stop, archive

Style général (3 pages) :
- Dark mode (#0a0a0a, #1a1a1a, #2a2a2a)
- Accent : saumon (#E07A5F)
- Police : Inter pour UI, JetBrains Mono pour code et timestamps
- Tableau : zebra rows, hover state

Stack : Nuxt.js + Tailwind + shadcn/ui + dnd-kit (pour Kanban).
```

## Notes

- L'éditeur mémoire est le cœur de la **continuité** entre sessions.
- Les missions tracking rend les coûts **visibles** — pas de boîte noire.
- Le Kanban donne la **vue globale** : utile quand tu lances 5+ missions par jour.
