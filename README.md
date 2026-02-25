# Congruity

Congruity is a Discord-like chat client focused on:
- native desktop UX via Tauri
- self-hosting (Docker) or cloud-backed usage
- Supabase for auth/data and Socket.IO signaling for WebRTC

## Alpha Scope (Current)

Implemented/working for alpha testing:
- Auth (Supabase)
- Servers/channels/DMs (core flows)
- Voice channels (WebRTC signaling + media controls)
- Tauri desktop dev/build workflow
- Self-hosted Docker setup script (`docker/setup.sh`)
- Direct self-host join by signaling URL (no cloud registry required)

Known gaps:
- UI polish/theme consistency (functional but still rough)
- broader WebRTC edge-case coverage and cross-network hardening (TURN/WSS docs + config)
- mobile packaging/signing polish

## Quick Start

### Client (Web)

```bash
cd client
npm install
npm run dev
```

### Client (Tauri Desktop)

```bash
cd client
npm install
npm run tauri:dev
```

### Signaling Server (standalone dev)

```bash
cd server
npm install
npm start
```

### Self-Hosted (Docker)

```bash
cd docker
./setup.sh
docker compose up -d
```

## Direct Self-Host Join (Alpha)

For quick self-host testing, the client can now join a signaling server directly from the normal server join input.

Accepted inputs:
- `ws://localhost:3001`
- `http://localhost:3001` (auto-normalized to `ws://`)
- `congruity://join?signal=ws://localhost:3001&name=Local%20Alpha`

This creates a local pseudo-server entry (for example `Direct (localhost:3001)`) and bypasses cloud server registry lookup.

Notes:
- No invite code is required for direct-connect mode.
- Invite codes still apply to the registry-backed Supabase server flow.

## Self-Hosting Modes

- Hybrid (recommended for quick alpha): Cloud Supabase + self-hosted signaling/MinIO
- Full self-hosted: local Supabase stack + signaling/MinIO

The setup script generates:
- `docker/.env`
- `docker/QUICKSTART.md`
- `docker/selfhosted-backend-registration.sql`
- `docker/create-first-server.sql`

## Quality Gates

Client:
- `npm run lint`
- `npm run test:run`
- `npm run test:coverage`

Docker setup script:
- `bash docker/tests/test_setup.sh`

## Documentation

See `/Users/coltonspurgin/Developer/congruity/docs/README.md` for the curated docs index and which docs are current vs planning/historical.

Key docs:
- `/Users/coltonspurgin/Developer/congruity/docs/SELF_HOSTING_GUIDE.md`
- `/Users/coltonspurgin/Developer/congruity/docs/SETUP_WORKFLOW.md`
- `/Users/coltonspurgin/Developer/congruity/docs/ALPHA_RELEASE.md`
- `/Users/coltonspurgin/Developer/congruity/docs/ALPHA_SECURITY_AUDIT.md`
- `/Users/coltonspurgin/Developer/congruity/docs/user-stories.md`
