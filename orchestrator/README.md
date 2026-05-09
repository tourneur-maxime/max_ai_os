# Max OS — 1 · Orchestrator

Backend Node.js/TypeScript for the personal agentic OS. Spawns Claude Code sub-agents via node-pty, stores all events in SQLite, and exposes them over SSE. Receives input from Telegram, generic webhooks, and Teams. Offers a JWT-secured remote control API accessible via Tailscale.

## Requirements

- Node.js 20+
- `claude` CLI installed and authenticated (`which claude` must return a path)
- (optional) A Telegram bot token for the Telegram channel

## Quick start

```bash
cd orchestrator
npm install
npm run dev
```

The server starts on port `9000` by default.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `9000` | HTTP port |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin for the Nuxt frontend |
| `MAXOS_JWT_SECRET` | random (ephemeral) | JWT signing secret — **set a stable value in production** |
| `TELEGRAM_BOT_TOKEN` | — | Telegram bot token (or override via `botTokenEnv` in channel config) |

## File structure under `~/.mos/`

```
~/.mos/
├── orchestrator.db          ← SQLite database (auto-created)
├── agents/
│   └── <agent-name>/
│       ├── config.json      ← Agent config (see Agent type)
│       └── system-prompt.md ← Optional custom system prompt
└── channels/
    └── <channel-name>.json  ← Channel config (see ChannelConfig type)
```

### Agent config example (`~/.mos/agents/_main/config.json`)

```json
{
  "name": "_main",
  "cwd": "/Users/you",
  "model": "claude-sonnet-4-6",
  "permissionMode": "acceptEdits",
  "allowedTools": ["bash", "read_file", "write_file", "edit_file", "web_search"],
  "deniedTools": []
}
```

### Telegram channel config (`~/.mos/channels/personal.json`)

```json
{
  "type": "telegram",
  "defaultAgent": "_main",
  "botTokenEnv": "TELEGRAM_BOT_TOKEN",
  "allowedChatIds": [123456789],
  "agentRouting": {
    "@dev ": "dev-agent",
    "@research ": "research-agent"
  }
}
```

## API reference

### Main API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agents/spawn` | Spawn a mission (`{ agent_name, mission }`) |
| `GET` | `/api/missions` | List last 100 missions |
| `GET` | `/api/missions/:id` | Mission details + events |
| `POST` | `/api/agents/:id/send` | Send input to a running mission |
| `DELETE` | `/api/missions/:id` | Kill a running mission |
| `GET` | `/api/missions/:id/stream` | SSE stream of events for a mission |
| `GET` | `/api/agents` | List configured agents |
| `GET` | `/health` | Healthcheck |

### Channels

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/channels/:channelName/inbound` | Inbound webhook (generic / Teams) |

### Remote control (JWT required)

Issue a token first (run locally):

```bash
curl -X POST http://localhost:9000/api/remote/issue-token \
  -H 'Content-Type: application/json' \
  -d '{"client_name": "my-phone"}'
```

Then use the returned token as `Authorization: Bearer <token>` for all remote calls.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/remote/openapi.json` | OpenAPI 3.1 spec |
| `POST` | `/api/remote/missions` | Spawn (`{ agent, input }`) |
| `GET` | `/api/remote/missions/:id` | Mission status |
| `GET` | `/api/remote/missions/:id/output` | Mission final output |
| `DELETE` | `/api/remote/missions/:id` | Kill mission |
| `GET` | `/api/remote/tokens` | List tokens (redacted) |
| `DELETE` | `/api/remote/tokens/:id` | Revoke token |

## Build for production

```bash
npm run build
npm start
```

## Tailscale setup

1. Install Tailscale on your machine and enable HTTPS (`tailscale cert`).
2. Set `MAXOS_JWT_SECRET` to a stable secret in your environment.
3. Issue a token and store it on your remote device.
4. Call the orchestrator via `https://<tailscale-hostname>:9000/api/remote/...`.
