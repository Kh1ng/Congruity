/**
 * Federation integration tests.
 *
 * Spins up a real "Server B" HTTP listener (inline Express, no real LiveKit/Supabase)
 * and drives `joinFederatedVoiceRoom` against it — the same code path that runs in
 * production when Server A calls a remote peer.
 *
 * What this covers that the unit tests do NOT:
 *   - Actual HTTP transport between two processes (same process, two servers)
 *   - HMAC signing in joinFederatedVoiceRoom → correct verification in remote handler
 *   - Secret mismatch rejection over the wire
 *   - buildFederationUrl localhost detection
 *   - Error message propagation from remote server back to caller
 */

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");

// ── helpers ──────────────────────────────────────────────────────────────────

const {
  buildFederationUrl,
  signFederationPayload,
  verifyFederationSignature,
  joinFederatedVoiceRoom,
} = require("../services/federationService");

/**
 * Spins up a minimal "Server B" federation endpoint on an ephemeral port.
 * Returns { port, close }.
 */
function startServerB({ secret, channelExists = true, federationEnabled = true } = {}) {
  const app = express();
  app.use(express.json());
  const router = express.Router();

  router.get("/v1/info", (req, res) => {
    res.json({ server: "serverb.local", version: "1.0", capabilities: ["voice", "federation"], federation_api_version: 1 });
  });

  router.post("/v1/voice/join", (req, res) => {
    const { room_id: roomId, user_id: userId, display_name: displayName,
            requesting_server: requestingServer, timestamp, signature } = req.body || {};

    if (!roomId || !userId || !requestingServer || !timestamp || !signature) {
      return res.status(400).json({ error: "Missing federation join fields" });
    }

    const requestTimestamp = Number(timestamp);
    if (!Number.isFinite(requestTimestamp) || Math.abs(Date.now() - requestTimestamp) > 5 * 60 * 1000) {
      return res.status(401).json({ error: "Federation request timestamp is out of range" });
    }

    const payload = { room_id: roomId, user_id: userId, display_name: displayName, requesting_server: requestingServer, timestamp };

    // Verify using the secret configured for this server B instance
    const savedSecret = process.env.FEDERATION_SHARED_SECRET;
    process.env.FEDERATION_SHARED_SECRET = secret;
    const valid = verifyFederationSignature(payload, signature);
    process.env.FEDERATION_SHARED_SECRET = savedSecret;

    if (!valid) return res.status(401).json({ error: "Invalid federation signature" });
    if (!roomId.startsWith("channel-")) return res.status(400).json({ error: "Unsupported room id format" });
    if (!channelExists) return res.status(404).json({ error: "Channel not found" });
    if (!federationEnabled) return res.status(403).json({ error: "Channel is not federation-enabled" });

    res.status(200).json({
      livekit_url: "ws://serverb-livekit.local:7880",
      token: "stub-federated-token",
      turn_credentials: null,
    });
  });

  app.use("/_congruity/federation", router);

  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ port, close: () => server.close() });
    });
    server.on("error", reject);
  });
}

// ── buildFederationUrl unit tests ─────────────────────────────────────────────

describe("buildFederationUrl", () => {
  it("uses http:// for localhost", () => {
    delete process.env.FEDERATION_ALLOW_INSECURE;
    assert.equal(buildFederationUrl("localhost:3002", "/path"), "http://localhost:3002/path");
  });

  it("uses http:// for 127.0.0.1", () => {
    delete process.env.FEDERATION_ALLOW_INSECURE;
    assert.equal(buildFederationUrl("127.0.0.1:3002", "/path"), "http://127.0.0.1:3002/path");
  });

  it("uses https:// for remote hosts", () => {
    delete process.env.FEDERATION_ALLOW_INSECURE;
    assert.equal(buildFederationUrl("chat.example.com", "/path"), "https://chat.example.com/path");
  });

  it("uses https:// for remote hosts with port", () => {
    delete process.env.FEDERATION_ALLOW_INSECURE;
    assert.equal(buildFederationUrl("chat.example.com:3001", "/path"), "https://chat.example.com:3001/path");
  });

  it("uses http:// for any host when FEDERATION_ALLOW_INSECURE=true", () => {
    process.env.FEDERATION_ALLOW_INSECURE = "true";
    assert.equal(buildFederationUrl("chat.example.com", "/path"), "http://chat.example.com/path");
    delete process.env.FEDERATION_ALLOW_INSECURE;
  });
});

// ── full HTTP round-trip integration tests ────────────────────────────────────

describe("federation end-to-end HTTP round-trip", () => {
  const SHARED_SECRET = "integration-test-secret-abc123";

  before(() => {
    process.env.FEDERATION_ALLOW_INSECURE = "true";
    process.env.NODE_ENV = "development";
  });

  after(() => {
    delete process.env.FEDERATION_ALLOW_INSECURE;
  });

  beforeEach(() => {
    process.env.FEDERATION_SHARED_SECRET = SHARED_SECRET;
    process.env.SERVER_DOMAIN = "localhost:3001";
  });

  it("successful federated join returns livekit_url and token", async () => {
    const serverB = await startServerB({ secret: SHARED_SECRET });
    try {
      const result = await joinFederatedVoiceRoom({
        remoteServer: `localhost:${serverB.port}`,
        channelId: "channel-uuid-123",
        localUser: { username: "alice", display_name: "Alice" },
      });
      assert.equal(result.livekit_url, "ws://serverb-livekit.local:7880");
      assert.equal(result.token, "stub-federated-token");
    } finally {
      serverB.close();
    }
  });

  it("mismatched FEDERATION_SHARED_SECRET causes 401 on remote", async () => {
    const serverB = await startServerB({ secret: "different-secret" });
    try {
      await assert.rejects(
        () => joinFederatedVoiceRoom({
          remoteServer: `localhost:${serverB.port}`,
          channelId: "channel-uuid-123",
          localUser: { username: "alice", display_name: "Alice" },
        }),
        /401/
      );
    } finally {
      serverB.close();
    }
  });

  it("channel not found on remote causes 404 error", async () => {
    const serverB = await startServerB({ secret: SHARED_SECRET, channelExists: false });
    try {
      await assert.rejects(
        () => joinFederatedVoiceRoom({
          remoteServer: `localhost:${serverB.port}`,
          channelId: "channel-nonexistent",
          localUser: { username: "bob", display_name: "Bob" },
        }),
        /404/
      );
    } finally {
      serverB.close();
    }
  });

  it("federation disabled on channel causes 403 error", async () => {
    const serverB = await startServerB({ secret: SHARED_SECRET, federationEnabled: false });
    try {
      await assert.rejects(
        () => joinFederatedVoiceRoom({
          remoteServer: `localhost:${serverB.port}`,
          channelId: "channel-nofed",
          localUser: { username: "carol", display_name: "Carol" },
        }),
        /403/
      );
    } finally {
      serverB.close();
    }
  });

  it("display_name is forwarded to remote server", async () => {
    let capturedDisplayName;
    const appB = express();
    appB.use(express.json());
    appB.get("/_congruity/federation/v1/info", (req, res) => {
      res.json({ capabilities: ["federation"], federation_api_version: 1 });
    });
    appB.post("/_congruity/federation/v1/voice/join", (req, res) => {
      capturedDisplayName = req.body.display_name;
      res.json({ livekit_url: "ws://serverb:7880", token: "tok" });
    });
    await new Promise((resolve, reject) => {
      const srv = http.createServer(appB);
      srv.listen(0, "127.0.0.1", async () => {
        const { port } = srv.address();
        try {
          await joinFederatedVoiceRoom({
            remoteServer: `localhost:${port}`,
            channelId: "channel-abc",
            localUser: { username: "dave", display_name: "Dave McUser" },
          });
          assert.equal(capturedDisplayName, "Dave McUser");
        } finally {
          srv.close(resolve);
        }
      });
      srv.on("error", reject);
    });
  });

  it("requesting_server is set to local SERVER_DOMAIN", async () => {
    process.env.SERVER_DOMAIN = "myserver.example.com";
    let capturedRequestingServer;
    const appB = express();
    appB.use(express.json());
    appB.get("/_congruity/federation/v1/info", (req, res) => {
      res.json({ capabilities: ["federation"], federation_api_version: 1 });
    });
    appB.post("/_congruity/federation/v1/voice/join", (req, res) => {
      capturedRequestingServer = req.body.requesting_server;
      res.json({ livekit_url: "ws://serverb:7880", token: "tok" });
    });
    await new Promise((resolve, reject) => {
      const srv = http.createServer(appB);
      srv.listen(0, "127.0.0.1", async () => {
        const { port } = srv.address();
        try {
          await joinFederatedVoiceRoom({
            remoteServer: `localhost:${port}`,
            channelId: "channel-abc",
            localUser: { username: "eve", display_name: "Eve" },
          });
          assert.equal(capturedRequestingServer, "myserver.example.com");
        } finally {
          srv.close(resolve);
        }
      });
      srv.on("error", reject);
    });
  });

  it("remote server returning 503 causes descriptive error", async () => {
    const appB = express();
    appB.use(express.json());
    appB.get("/_congruity/federation/v1/info", (req, res) => res.status(503).end());
    await new Promise((resolve, reject) => {
      const srv = http.createServer(appB);
      srv.listen(0, "127.0.0.1", async () => {
        const { port } = srv.address();
        try {
          await assert.rejects(
            () => joinFederatedVoiceRoom({
              remoteServer: `localhost:${port}`,
              channelId: "channel-abc",
              localUser: { username: "frank", display_name: "Frank" },
            }),
            /503/
          );
        } finally {
          srv.close(resolve);
        }
      });
      srv.on("error", reject);
    });
  });
});
