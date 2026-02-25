# Self-Hosting Setup Workflow (Alpha)

This is the practical workflow for getting a self-hosted Congruity environment running quickly.

It branches into two valid alpha paths:
- **A. Direct Connect** (fastest; no invite code)
- **B. Registry-Backed Server** (full server record + invite code + backend mapping)

For full details, see `SELF_HOSTING_GUIDE.md`.

## Workflow Overview

```text
1) Run docker/setup.sh
2) Start docker compose services
3) Configure/start client
4) Choose a path:
   A) Direct connect by ws://host:3001
   B) Create server + backend registration + invite code
```

## Phase 1: Infrastructure Setup

```bash
cd docker
./setup.sh
# or:
# ./setup.sh --configure-only
# docker compose up -d
```

What the setup script produces:
- `docker/.env`
- `docker/QUICKSTART.md`
- `docker/create-first-server.sql`
- `docker/selfhosted-backend-registration.sql`

Verify:

```bash
docker compose ps
curl http://localhost:3001/health
```

## Phase 2: Client Setup

```bash
cd ../client
cp .env.example .env
```

Set:

```env
VITE_SUPABASE_URL=<your supabase url>
VITE_SUPABASE_ANON_KEY=<your anon key>
VITE_SIGNALING_URL=ws://localhost:3001
```

Start client:

```bash
npm install
npm run dev
# or npm run tauri:dev
```

## Phase 3A: Direct Connect (No Invite Code)

Use this to validate self-hosted signaling immediately.

In the client Join input, paste:
- `ws://localhost:3001`
- `http://localhost:3001`
- or `congruity://join?signal=ws://localhost:3001&name=Local%20Alpha`

Expected result:
- a local pseudo-server appears (`Direct (localhost:3001)`)
- `#voice-lounge` is available for join

## Phase 3B: Registry-Backed Server (Invite Code Flow)

Use this when you want persisted servers/channels/messages and standard invites.

1. Create/login account in client
2. Create a server (UI or `docker/create-first-server.sql`)
3. Edit and run `docker/selfhosted-backend-registration.sql` with your real server ID
4. Share/join using invite code

## Quick Verification Checklist

Infrastructure:
- [ ] `docker compose ps` shows `signaling` healthy
- [ ] `curl http://localhost:3001/health` returns `{"status":"ok"...}`

Client:
- [ ] client starts without fatal errors
- [ ] can log in (registry-backed path) or open direct pseudo-server (direct path)

Direct path:
- [ ] joining `ws://localhost:3001` creates `Direct (...)`
- [ ] can join `#voice-lounge`

Registry-backed path:
- [ ] server visible in list
- [ ] invite code works
- [ ] voice channel uses self-host backend after registration SQL

## Common Failure Points (Alpha)

- `getUserMedia` blocked: use `localhost` locally or HTTPS/WSS remotely
- voice not using self-host backend: backend registration SQL not applied to server
- no direct server entry: join input was invite code, not URL
- signaling unhealthy: inspect `docker compose logs -f signaling`
