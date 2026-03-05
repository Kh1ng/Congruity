# Federation

Congruity federation lets one server request short-lived voice access credentials from another server.

## Trust model

- Peered servers share an out-of-band `FEDERATION_SHARED_SECRET`.
- Requests are signed with HMAC-SHA256 over a stable JSON payload.
- The receiving server verifies signature and timestamp window before issuing a token.

## Endpoints

- `GET /_congruity/federation/v1/info`
  - Public capability discovery
- `POST /_congruity/federation/v1/voice/join`
  - Signed request to obtain LiveKit token for a remote user

## Signed payload

```json
{
  "room_id": "channel-<channel-id>",
  "user_id": "alice@remote.example.com",
  "display_name": "Alice",
  "requesting_server": "remote.example.com",
  "timestamp": 1730000000000
}
```

The sender computes:

`signature = HMAC_SHA256(FEDERATION_SHARED_SECRET, stable_json(payload))`

and sends `{ ...payload, signature }`.

## Operational notes

- Keep server clocks synced (NTP). Requests outside a ±5 minute window are rejected.
- Rotate federation secrets using staged rollout between peers.
- Federation is opt-in by channel (`federation_enabled`).
