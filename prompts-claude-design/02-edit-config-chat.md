# Prompt — Édition de config + Chat agent

Deux écrans liés : édition de la config d'un agent (system prompt, modèle, permissions, channels) + chat direct avec cet agent.

## Prompt à coller dans Claude Design

```
Crée deux pages liées pour un agentic OS personnel : "Edit Agent Config" et "Chat Agent".

==========================================
PAGE 1 — Edit Agent Config
==========================================

Layout en 2 colonnes :

Colonne gauche (35%) — Liste des agents :
- Search bar en haut
- Liste verticale d'agents avec : nom, modèle utilisé, statut (badge vert/gris), nombre de missions
- Item sélectionné mis en évidence

Colonne droite (65%) — Formulaire d'édition :

Section IDENTITY :
- Champ "Name" (input texte)
- Champ "System prompt" (textarea grande, monospace, 200px de haut min)
- Champ "Working directory" (input texte avec picker)

Section MODEL :
- Select : sonnet / opus / haiku / sonnet-thinking
- Toggle : "Use plan max" (par défaut activé) — texte info "exploite ton abonnement Claude Code Max"

Section PERMISSIONS :
- Radio : "auto / acceptEdits / plan / bypassPermissions"
- Liste éditable d'allowed_tools (chips ajoutables)
- Liste éditable de denied_tools

Section CHANNELS :
- Toggle "Telegram" + champ chat_id (visible si activé)
- Toggle "Discord" + champ webhook_url
- Toggle "WhatsApp" + champ numéro
- Toggle "Webhook" + champ URL

Section REMOTE CONTROL :
- Toggle "Enable remote control"
- Si activé : tunnel URL (read-only, copyable) + bouton "Regenerate token"
- Note : "permet de piloter cet agent depuis Claude.ai mobile via tunnel sécurisé"

Footer fixe en bas :
- Bouton "Save" (saumon plein)
- Bouton "Test prompt" (outline)
- Lien "Open chat with this agent" → page Chat

==========================================
PAGE 2 — Chat Agent
==========================================

Layout en 3 zones :

Header (60px) :
- Avatar agent + nom
- Badge modèle utilisé
- Bouton "Edit config" qui ramène à la page 1
- Stats : derniers tokens utilisés, coût session

Zone messages (centre, scrollable) :
- Bulles de chat : utilisateur à droite (saumon clair), agent à gauche (gris foncé)
- Support du markdown + code blocks dans les réponses
- Timestamps en gris clair sous chaque message
- Indicateur "agent thinking..." avec animation quand l'agent réfléchit

Zone input (bas, sticky) :
- Textarea multiligne avec auto-resize
- Bouton attach (upload file)
- Bouton send (saumon plein, arrow icon)
- Sélecteur de mode rapide : "Question / Mission / Routine"

Style général :
- Dark mode (#0a0a0a, #1a1a1a, #2a2a2a)
- Couleur d'accent : saumon (#E07A5F)
- Police : Inter pour UI, JetBrains Mono pour code

Stack : Next.js + Tailwind + shadcn/ui.
```

## Notes

- La section CHANNELS est la patte unique de ce système : pouvoir notifier/recevoir depuis plusieurs canaux.
- La section REMOTE CONTROL prépare l'usage mobile via Claude.ai (super utile en déplacement).
- Le bouton "Open chat with this agent" est un raccord important — édite puis teste.
