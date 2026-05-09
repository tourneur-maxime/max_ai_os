# Prompt — Remote Control (pilotage à distance via Claude.ai mobile)

Comment piloter ton agentic OS local depuis l'extérieur (claude.ai mobile, navigateur depuis un autre device) via un tunnel sécurisé.

## Concept

Ton OS tourne en local (pas exposé à Internet). Pour l'atteindre depuis un autre device :

1. **Tunnel sécurisé** (Tailscale, Cloudflare Tunnel, ngrok)
2. **Endpoint HTTPS auth** sur ton orchestrator
3. **Token de session** côté client mobile

L'objectif : ouvrir Claude.ai sur ton iPhone, lui demander de "lancer une mission", il appelle ton OS via tunnel et te renvoie la réponse.

## Prompt à coller dans Claude Code

```
Implémente un système de "remote control" pour un agentic OS personnel.

Architecture :

1. Tunnel local (par défaut Tailscale) :
- Documenter dans le README comment activer Tailscale (déjà installé, juste \`tailscale up\`)
- L'orchestrator écoute sur 0.0.0.0:9000 (accessible sur le réseau Tailscale uniquement)
- URL d'accès : https://<machine>.tail<XXXX>.ts.net:9000

2. Auth par token court-vie :
- POST /api/remote/issue-token { client_name } → renvoie un token signé (JWT-like)
- Le token est valide 24h, signé avec une clé locale
- Stocké en SQLite dans une table 'remote_tokens'

3. Middleware /api/remote/* :
- Vérifie le token dans header Authorization: Bearer <token>
- Valide la signature
- Logue chaque appel (audit trail)

4. Endpoints exposés via /api/remote :
- POST /api/remote/missions { agent, input } → spawn une mission
- GET /api/remote/missions/:id → status
- GET /api/remote/missions/:id/output → output final (markdown)
- DELETE /api/remote/missions/:id → kill une mission en cours

5. Interface client mobile :
- Pas de webapp custom : juste un endpoint OpenAPI bien documenté
- L'utilisateur ouvre Claude.ai mobile, lui colle le token + l'URL OpenAPI
- Claude.ai génère ses propres calls vers l'orchestrator

6. Génération du fichier OpenAPI :
- Endpoint GET /api/remote/openapi.json qui renvoie la spec OpenAPI 3.1
- Documente les 4 endpoints ci-dessus avec leurs schémas
- Inclut le bearer auth

7. Optionnel — UI sidepanel pour monitor :
- Page /remote/sessions affichant les tokens actifs
- Bouton "Revoke" par token
- Stats : nombre d'appels par token, derniers appels

Sécurité :
- Tokens jamais en clair dans les logs
- Signature avec clé locale (jamais committée)
- Rate limiting basique (10 req/sec par token)
- Endpoint HTTPS uniquement (refuse HTTP)

Stack : Nuxt.js (API routes) + Tailscale (réseau), pas de service tiers payant.
TypeScript strict.
```

## Notes

- **Tailscale** est le moyen le plus simple et gratuit de tunnel sécurisé (mesh privé chiffré).
- Cloudflare Tunnel est une alternative si tu veux un endpoint public propre, mais ça expose à Internet (donc auth obligatoire et plus stricte).
- Le pattern OpenAPI permet à n'importe quel agent (Claude, GPT, autre) de l'utiliser sans build custom.
- Limite intentionnellement les endpoints exposés au remote — n'expose que ce qui est utile en mobilité.
- Pas besoin d'app mobile dédiée : Claude.ai (et autres clients OpenAPI) suffisent.
