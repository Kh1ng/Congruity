# Congruity Self-Hosting Guide (Alpha)

This guide is the canonical reference for running Congruity with your own infrastructure.

It covers two practical alpha flows:
- `Direct Connect (fastest)` - run Dockerized signaling and join by URL (`ws://host:3001`) with no invite code
- `Registry-Backed Server (full alpha flow)` - create a real server in Supabase and map it to your self-hosted signaling/storage backend

## What "Self-Hosted" Means in Congruity (Alpha)

Congruity currently splits responsibilities:
- **Supabase**: auth, database, realtime text messaging, server/channel records
- **Signaling server**: WebRTC offer/answer/ICE coordination for voice/video/screen share
- **Storage (MinIO)**: self-hosted object storage for media/attachments/avatars (bundled in current Docker stack)

For alpha testing, you can self-host only signaling (and optionally MinIO) while using:
- **Cloud Supabase (hybrid mode, recommended)**
- **Local Supabase (full self-hosted mode)**

Important distinction:
- **Direct connect** does **not** require a Congruity Cloud record or invite code
- **Invite-code join** is part of the Supabase server registry flow

## Choose a Setup Path

### Path A: Direct Connect (Fastest Test Path)

Use this when you want to validate voice/video signaling quickly.

You will:
- run Docker stack (at minimum signaling)
- start the Congruity client
- join via `ws://<host>:3001` in the existing Join input

No server record, no invite code, no backend registration SQL required.

### Path B: Hybrid (Cloud Supabase + Self-Hosted Signaling/MinIO)

Use this when you want a real server (invite codes, channels, messages) while self-hosting voice/video/storage.

You will:
- use your cloud Supabase project
- run local Docker signaling + MinIO
- create a server in Supabase/UI
- run backend registration SQL to map that server to your self-hosted endpoints

### Path C: Full Self-Hosted (Local Supabase + Signaling/MinIO)

Use this when you want local control of the full stack.

This is more complex and more operationally expensive (backups, upgrades, troubleshooting).

## Supabase Docs (Reference)

Use official Supabase docs for self-hosting details and production hardening:
- [Supabase Self-Hosting (Docker)](https://supabase.com/docs/guides/hosting/docker)
- [Supabase Self-Hosted S3 / Storage Backend](https://supabase.com/docs/guides/self-hosting/self-hosted-s3)

Notes for Congruity:
- Supabase Storage does not require MinIO by default (filesystem backend is possible)
- Current Congruity Docker self-host stack bundles MinIO for a ready S3-compatible media path during alpha

## Prerequisites

Required:
- Docker Desktop / Docker Engine + Compose v2
- OpenSSL
- Git

Recommended for external access:
- domain or dynamic DNS
- reverse proxy / TLS for HTTPS and WSS

## Ports (Defaults)

- `3001` signaling server (HTTP/WS; use `wss://` behind TLS in production)
- `9000` MinIO API
- `9001` MinIO console
- `8000` Supabase API gateway (full local Supabase mode only)

## 1. Run the Setup Script

From the repo root:

```bash
cd docker
./setup.sh
```

The script:
- checks Docker/Compose/OpenSSL
- checks Docker daemon reachability
- checks for port conflicts
- prompts for deployment mode (hybrid vs full local Supabase)
- generates `docker/.env`
- generates helper docs/SQL files
- can start containers (or you can use configure-only and start manually)

Useful flags:

```bash
./setup.sh --configure-only
./setup.sh --non-interactive --skip-cloudflare
```

Generated files:
- `docker/.env`
- `docker/QUICKSTART.md`
- `docker/create-first-server.sql`
- `docker/selfhosted-backend-registration.sql`

## 2. Start the Docker Services

If you used `--configure-only`, start manually:

```bash
docker compose up -d
```

Check status:

```bash
docker compose ps
curl http://localhost:3001/health
```

Expected health response:

```json
{"status":"ok","timestamp":"..."}
```

## 3. Configure the Client

Client env (`client/.env` or `client/.env.local`):

```env
VITE_SUPABASE_URL=<your supabase url>
VITE_SUPABASE_ANON_KEY=<your anon key>
VITE_SIGNALING_URL=ws://localhost:3001
```

Start web client:

```bash
cd ../client
npm install
npm run dev
```

Or Tauri desktop:

```bash
npm run tauri:dev
```

## Path A Walkthrough: Direct Connect (No Invite Code)

This is the fastest self-host validation path and is recommended for alpha smoke tests.

### Steps

1. Start Docker services (at least signaling)
2. Start the client
3. In the normal **Join** input, paste one of:
   - `ws://localhost:3001`
   - `http://localhost:3001` (auto-converted to `ws://`)
   - `congruity://join?signal=ws://localhost:3001&name=Local%20Alpha`
4. A local pseudo-server entry appears (for example `Direct (localhost:3001)`)
5. Select the server, then join `#voice-lounge`

### What Works in Direct Connect Mode

- signaling / voice-video join path testing
- multi-client voice presence in the direct room UI
- local self-hosted alpha smoke testing

### What Direct Connect Does Not Do

- invite-code joins
- persisted server/channel metadata in Supabase
- normal server membership flows

## Path B Walkthrough: Hybrid (Cloud Supabase + Self-Hosted Backend)

Use this for a "real" alpha server with invite code and persisted channels/messages.

### Step 1: Create/Login an Account

1. Open the client
2. Sign up / log in using your Supabase-backed auth

### Step 2: Create Your Server

Either:
- create via client UI, or
- run `docker/create-first-server.sql` in the Supabase SQL editor

If you use SQL, keep the output:
- `server_id`
- `invite_code`

### Step 3: Map the Server to Your Self-Hosted Backend

1. Open `docker/selfhosted-backend-registration.sql`
2. Replace `YOUR_SERVER_ID_HERE` with your real server ID
3. Run the SQL in your Supabase SQL editor

This tells the client to use your self-hosted:
- signaling URL
- storage endpoint (MinIO) for that server

### Step 4: Join by Invite Code (Optional for Other Users)

In the client Join input, paste the invite code from your server record.

## Path C Walkthrough: Full Local Supabase

This follows the same high-level flow as hybrid, but your `API_EXTERNAL_URL` and client Supabase values point to the local stack.

Use setup mode `2` in `docker/setup.sh`.

Additional checks:
- `docker compose logs -f kong`
- `docker compose logs -f auth`
- `docker compose logs -f rest`
- `docker compose logs -f realtime`

## Production / Remote Access Notes (Important)

For remote users and reliable media permissions:
- serve the client over **HTTPS**
- expose signaling as **WSS**
- configure OS/browser camera/microphone permissions

`getUserMedia` issues are expected on non-secure origins (except localhost).

Minimum production recommendations:
- reverse proxy (Caddy / Nginx / Traefik)
- TLS certificates
- WSS forwarding to signaling container
- firewall + only expose required ports

## Troubleshooting

### "Microphone access unavailable" / `getUserMedia` blocked

Cause:
- insecure origin (`http://` on non-localhost), or runtime permission issue

Fix:
- use `https://` / `wss://` for remote access
- on local machine, use `localhost`
- verify OS mic/camera permissions for browser/Tauri app

### Cannot connect to voice / no peers appear

Checks:

```bash
curl http://localhost:3001/health
docker compose logs -f signaling
```

Verify client join target:
- direct mode should point to `ws://<host>:3001`
- registry-backed server should have backend mapping SQL applied

### Direct server appears but no channels

Direct mode should always create a local `voice-lounge`.
If not:
- clear local app storage
- re-enter the direct URL in Join input

### Invite code works but voice still uses cloud/default signaling

Cause:
- backend mapping not inserted for that server

Fix:
- rerun `selfhosted-backend-registration.sql` with the correct `server_id`

### MinIO issues

Checks:

```bash
docker compose ps minio
docker compose logs -f minio
```

If you are testing voice only, MinIO issues should not block direct signaling tests.

## Maintenance

Basic operations:

```bash
cd docker
docker compose ps
docker compose logs -f signaling
docker compose restart signaling
docker compose down
docker compose up -d
```

For full local Supabase, plan backups before external testing.

## Recommended Alpha Test Order

1. Direct connect smoke test (`ws://localhost:3001`)
2. Hybrid mode server-backed test (invite code + backend registration)
3. External access test over HTTPS/WSS
4. Multi-user voice/video test across different networks (TURN/WSS as needed)
