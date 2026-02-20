# Alpha Security Audit

Date: 2026-02-20

Scope:
- `/Users/coltonspurgin/Developer/congruity/server`
- `/Users/coltonspurgin/Developer/congruity/client`
- `/Users/coltonspurgin/Developer/congruity/docker`
- `/Users/coltonspurgin/Developer/congruity/supabase`

## Fixed in this pass

1. Signaling HTTP CORS wildcard removed
- Before: `Access-Control-Allow-Origin: *` on all HTTP endpoints.
- After: origin is validated with allow-list logic aligned with Socket.IO CORS, blocked with `403` if disallowed.

2. Production hardening for origin allow-list
- Before: permissive localhost defaults could still be used if config missing.
- After: in `NODE_ENV=production`, browser origins are denied unless `CORS_ORIGIN` is explicitly configured.

3. Security headers for signaling HTTP endpoints
- Added: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Resource-Policy`.

4. Signaling input validation
- Added strict validation for:
  - `roomId`, `userId`, `to` identifiers
  - SDP payload shape/size for `offer` and `answer`
  - ICE candidate payload shape/size

5. Signaling abuse throttling
- Added per-socket rate limits for:
  - `offer`
  - `answer`
  - `ice-candidate`

6. Multi-room hijack / duplicate-join mitigation
- Before: a socket could join multiple rooms without server-side cleanup.
- After: joining a new room force-leaves any prior room for that socket, with proper `user-left` broadcasts.

7. Presence endpoint data minimization
- Before: `/rooms` returned all active rooms.
- After: `/rooms` only returns explicitly requested `roomIds` (validated + capped).
- Client now requests only current voice channel IDs.

8. Removed stale insecure middleware artifact
- Removed unused JWT middleware file containing hardcoded-secret patterns and token logging.

## Remaining risks / follow-ups

1. Dependency CVE scan not completed in this environment
- `npm audit` could not run due blocked network DNS.
- Run on a connected host:
  - `cd /Users/coltonspurgin/Developer/congruity/client && npm audit`
  - `cd /Users/coltonspurgin/Developer/congruity/server && npm audit`

2. Transport security for production
- Require TLS termination for signaling (`wss://`) behind Cloudflare tunnel or reverse proxy.
- Keep `CORS_ORIGIN` explicitly set to trusted client origins only.

3. TURN credentials
- Ensure TURN credentials are short-lived or rotated for public alpha.

4. Secrets hygiene for self-host mode
- Do not use placeholder Supabase keys from setup defaults in internet-facing deployments.
- Rotate MinIO root credentials and dashboard credentials before external testers.
