Simple web chat app I hope to deploy using tauri across multiple devices. 

## Goals:
- Self hosted
- Dockerized
- Text chat, private messages
- Audio chat, voice rooms
- Video chat

### Bonus goals:
- use something other than Javascript for backend
- screen sharing
- federation

## Dev log
#### October 11, 2024
For the time being, I have decided on an expressJS backend, once I understand how a signaling server works better i'd like to write it in something other than JS just as a learning experience.

## Current Status (WIP)
The UI is not 100% yet. Remaining work (from ongoing chat + dev plan):

### WebRTC Reliability
- [ ] Use WSS signaling in production and document TLS/reverse-proxy setup.
- [ ] Offer/answer glare handling (polite peer or joiner‑only offer).
- [ ] TURN server support wired to env + defaults documented.
- [ ] Participant identity mapping (socket id vs user id) verified in UI.

### UI & UX Gaps
- [ ] Member list panel (dockable) with presence indicators.
- [ ] Channels CRUD UI (create/edit/delete, topics, slow mode).
- [ ] Message edit/delete UI + edited state.
- [ ] DMs: thread list + realtime updates.
- [ ] Presence/status controls + unread/mention indicators.
- [ ] Search, pins, typing indicators.

### TDD & Tests
- [ ] Expand tests for hooks: useMessages, useDirectMessages, useFriends, useWebRTC.
- [ ] Add WebRTC integration tests where feasible.
- [ ] CLI test coverage for auth/servers/channels/DMs.

### CLI & Tooling
- [ ] Expand CLI parity (watch mode, typing indicator, message edits).
- [ ] Add more helpful CLI output/flags for paging/filtering.

### Infra & Ops
- [ ] Fix dashboard upload issue (needs correct repo/source).
- [ ] Ollama embedding availability check + fallback behavior.

## Self-host Quickstart (Signaling + MinIO)
From `/Users/coltonspurgin/Developer/congruity/docker`:

```bash
./setup.sh
```

Choose mode `1` for:
- Cloud Supabase (free tier) + local `signaling` + local `minio`.

Choose mode `2` for:
- Full local Supabase stack + local `signaling` + local `minio`.

The installer now generates:
- `/Users/coltonspurgin/Developer/congruity/docker/.env`
- `/Users/coltonspurgin/Developer/congruity/docker/selfhosted-backend-registration.sql`

Use `selfhosted-backend-registration.sql` in Supabase after creating a server to map that server to its self-hosted signaling/storage endpoints.

## Alpha Build Targets (Tauri)

Desktop:
- macOS
- Windows

Mobile:
- Android
- iOS

See `/Users/coltonspurgin/Developer/congruity/docs/ALPHA_RELEASE.md` for commands, init steps, and toolchain prerequisites.
