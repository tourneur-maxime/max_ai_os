# Prompt — Channels d'entrée (Telegram, Webhook, Discord)

Comment recevoir des inputs externes (messages Telegram, webhooks Stripe/GitHub/CI, mentions Discord) et les router vers le bon agent.

## Concept

Un **channel** est une porte d'entrée externe vers ton agentic OS. Chaque message reçu :

1. **Identifie le channel** (qui envoie ?)
2. **Identifie l'agent destinataire** (selon mapping channel → agent ou tag dans le message)
3. **Crée une mission** avec le contenu en input
4. **L'agent traite** la mission et peut répondre via le même channel

## Prompt à coller dans Claude Code

```
Implémente un système de "channels" pour un agentic OS personnel.

Channels supportés :
1. Telegram (bot)
2. Webhook générique (HTTP POST signé)
3. Microsoft Teams (SSO et login Microsoft)

Architecture :

1. Configuration par channel (~/.mos/channels/<name>.json) :
\`\`\`json
{
  "type": "telegram",
  "bot_token_env": "TELEGRAM_BOT_TOKEN",
  "default_agent": "_main",
  "agent_routing": {
    "@dev": "dev",
    "@yt": "content-creator"
  }
}
\`\`\`

2. Endpoint d'entrée /api/channels/<name>/inbound :
- Reçoit le message (POST avec body JSON)
- Authentifie via signature HMAC ou token (selon le type)
- Parse le contenu, extrait l'éventuel tag d'agent (@dev, @yt, etc.)
- Détermine l'agent cible (default si pas de tag)
- Crée une mission via POST /api/missions { agent, input, source_channel }
- Renvoie 200 OK rapidement (traitement async)

3. Telegram polling worker :
- Long-polling sur l'API Telegram bot
- Pour chaque message reçu, POST vers /api/channels/telegram/inbound
- Gère les fichiers attachés (download → /tmp → passe le path à l'agent)

4. Réponse de l'agent vers le channel :
- Quand l'agent termine sa mission, hook "mission complete"
- Récupère le source_channel
- POST sa réponse vers ce channel (Telegram sendMessage, webhook callback, etc.)

5. Sécurité :
- Toutes les clés API en env vars (jamais en dur)
- Allowlist d'utilisateurs Telegram autorisés (chat_id whitelist dans la config)
- HMAC signature obligatoire pour les webhooks génériques

Stack : Next.js (API routes) + node-fetch.
TypeScript strict.

Cas d'usage à supporter :
- "@dev fais une PR pour ce bug" → message Telegram → agent dev → mission GitHub
- Webhook Stripe (paiement reçu) → mission création client
- Webhook GitHub (push sur main) → mission notification + tests CI
```

## Notes

- Pour Telegram, préférer le long-polling pour le local-first (pas besoin d'exposer un endpoint public).
- L'allowlist Telegram est **critique** — sans ça n'importe qui te DM peut spawner des missions sur ton OS.
- Les webhooks publics doivent toujours être signés (HMAC SHA256 + secret partagé).
- Le routing par tag (@dev) est une convention simple qui évite les configs lourdes.
