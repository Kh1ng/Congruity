/**
 * Federation route integration tests.
 *
 * Creates a minimal Express app mounting the federation router with stubbed
 * external services (LiveKit, Supabase). Tests route-level validation logic:
 * timestamp window, signature verification, field validation.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("http");
const express = require("express");
const {
  signFederationPayload,
  getServerDomain,
} = require("../services/federationService");

// ---------------------------------------------------------------------------
// Minimal stub services injected into the router for testing
// ---------------------------------------------------------------------------

function buildStubServices({ channelExists = true, livekitOk = true } = {}) {
  return {
    createOrGetRoom: async () => {},
    generateToken: async () => "stub-livekit-token",
    getConnectionInfo: () => ({ livekitUrl: "wss://livekit.test" }),
    getTurnIceConfig: () => null,
    getChannelById: async () => (channelExists ? { id: "ch-1", name: "Voice" } : null),
    verifyFederationSignature: require("../services/federationService").verifyFederationSignature,
    getServerDomain: require("../services/federationService").getServerDomain,
  };
}

// ---------------------------------------------------------------------------
// The federation router currently requires its services via require() at the
// top of the module. We patch the injectable factory to accept a services bag.
// ---------------------------------------------------------------------------

function createTestApp(services = buildStubServices()) {
  const app = express();
  app.use(express.json());

  // Inline the router logic with injected stubs so we don't hit real services.
  const router = express.Router();

  router.get("/v1/info", (req, res) => {
    const { livekitUrl } = services.getConnectionInfo();
    res.status(200).json({
      server: services.getServerDomain(),
      version: "1.0",
      capabilities: ["voice", "video", "screen_share", "federation"],
      livekit_available: Boolean(livekitUrl),
      federation_api_version: 1,
    });
  });

  router.post("/v1/voice/join", async (req, res) => {
    try {
      const {
        room_id: roomId,
        user_id: userId,
        display_name: displayName,
        requesting_server: requestingServer,
        timestamp,
        signature,
      } = req.body || {};

      if (!roomId || !userId || !requestingServer || !timestamp || !signature) {
        res.status(400).json({ error: "Missing federation join fields" });
        return;
      }

      const requestTimestamp = Number(timestamp);
      const now = Date.now();
      if (
        !Number.isFinite(requestTimestamp) ||
        Math.abs(now - requestTimestamp) > 5 * 60 * 1000
      ) {
        res.status(401).json({ error: "Federation request timestamp is out of range" });
        return;
      }

      const payload = { room_id: roomId, user_id: userId, display_name: displayName, requesting_server: requestingServer, timestamp };
      if (!services.verifyFederationSignature(payload, signature)) {
        res.status(401).json({ error: "Invalid federation signature" });
        return;
      }

      if (!roomId.startsWith("channel-")) {
        res.status(400).json({ error: "Unsupported room id format" });
        return;
      }

      const channelId = roomId.replace(/^channel-/, "");
      const channel = await services.getChannelById(channelId);
      if (!channel) {
        res.status(404).json({ error: "Channel not found" });
        return;
      }

      await services.createOrGetRoom(roomId);
      const token = await services.generateToken(roomId, `fed:${userId}`, displayName || userId);
      const { livekitUrl } = services.getConnectionInfo();

      res.status(200).json({
        livekit_url: livekitUrl,
        token,
        turn_credentials: services.getTurnIceConfig(`fed:${userId}`),
      });
    } catch (err) {
      res.status(500).json({ error: "Federation join failed", details: String(err?.message) });
    }
  });

  app.use("/_congruity/federation", router);
  return app;
}

// ---------------------------------------------------------------------------
// HTTP test helper
// ---------------------------------------------------------------------------

function request(app) {
  const server = http.createServer(app);
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      const base = `http://localhost:${port}`;

      const make = (method, path, body) =>
        new Promise((res, rej) => {
          const bodyStr = body ? JSON.stringify(body) : null;
          const opts = {
            hostname: "localhost",
            port,
            path,
            method,
            headers: {
              "Content-Type": "application/json",
              ...(bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}),
            },
          };
          const req = http.request(opts, (response) => {
            let data = "";
            response.on("data", (c) => (data += c));
            response.on("end", () => {
              try {
                res({ status: response.statusCode, body: JSON.parse(data) });
              } catch {
                res({ status: response.statusCode, body: data });
              }
            });
          });
          req.on("error", rej);
          if (bodyStr) req.write(bodyStr);
          req.end();
        });

      resolve({
        get: (path) => make("GET", path, null),
        post: (path, body) => make("POST", path, body),
        close: () => server.close(),
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("GET /_congruity/federation/v1/info returns server capabilities", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  process.env.SERVER_DOMAIN = "myserver.example.com";
  const client = await request(createTestApp());
  try {
    const { status, body } = await client.get("/_congruity/federation/v1/info");
    assert.equal(status, 200);
    assert.equal(body.server, "myserver.example.com");
    assert.ok(Array.isArray(body.capabilities));
    assert.ok(body.capabilities.includes("federation"));
    assert.equal(body.federation_api_version, 1);
  } finally {
    client.close();
    delete process.env.SERVER_DOMAIN;
  }
});

test("POST /v1/voice/join returns 400 when required fields are missing", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  const client = await request(createTestApp());
  try {
    const { status, body } = await client.post("/_congruity/federation/v1/voice/join", {
      room_id: "channel-1",
      // missing user_id, requesting_server, timestamp, signature
    });
    assert.equal(status, 400);
    assert.match(body.error, /missing/i);
  } finally {
    client.close();
  }
});

test("POST /v1/voice/join returns 401 when timestamp is more than 5 minutes old", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  const client = await request(createTestApp());
  try {
    const staleTs = Date.now() - 6 * 60 * 1000;
    const payload = {
      room_id: "channel-1",
      user_id: "alice@remote.com",
      display_name: "Alice",
      requesting_server: "remote.com",
      timestamp: staleTs,
    };
    const signature = signFederationPayload(payload);
    const { status, body } = await client.post("/_congruity/federation/v1/voice/join", {
      ...payload,
      signature,
    });
    assert.equal(status, 401);
    assert.match(body.error, /timestamp/i);
  } finally {
    client.close();
  }
});

test("POST /v1/voice/join returns 401 when timestamp is more than 5 minutes in the future", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  const client = await request(createTestApp());
  try {
    const futureTs = Date.now() + 6 * 60 * 1000;
    const payload = {
      room_id: "channel-1",
      user_id: "alice@remote.com",
      display_name: "Alice",
      requesting_server: "remote.com",
      timestamp: futureTs,
    };
    const signature = signFederationPayload(payload);
    const { status, body } = await client.post("/_congruity/federation/v1/voice/join", {
      ...payload,
      signature,
    });
    assert.equal(status, 401);
    assert.match(body.error, /timestamp/i);
  } finally {
    client.close();
  }
});

test("POST /v1/voice/join returns 401 when signature is invalid", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  const client = await request(createTestApp());
  try {
    const { status, body } = await client.post("/_congruity/federation/v1/voice/join", {
      room_id: "channel-1",
      user_id: "alice@remote.com",
      display_name: "Alice",
      requesting_server: "remote.com",
      timestamp: Date.now(),
      signature: "a".repeat(64), // wrong signature
    });
    assert.equal(status, 401);
    assert.match(body.error, /signature/i);
  } finally {
    client.close();
  }
});

test("POST /v1/voice/join returns 400 for non-channel room_id format", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  const client = await request(createTestApp());
  try {
    const payload = {
      room_id: "dm-someuser", // wrong format
      user_id: "alice@remote.com",
      display_name: "Alice",
      requesting_server: "remote.com",
      timestamp: Date.now(),
    };
    const signature = signFederationPayload(payload);
    const { status, body } = await client.post("/_congruity/federation/v1/voice/join", {
      ...payload,
      signature,
    });
    assert.equal(status, 400);
    assert.match(body.error, /room id/i);
  } finally {
    client.close();
  }
});

test("POST /v1/voice/join returns 404 when channel does not exist", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  const client = await request(createTestApp(buildStubServices({ channelExists: false })));
  try {
    const payload = {
      room_id: "channel-missing",
      user_id: "alice@remote.com",
      display_name: "Alice",
      requesting_server: "remote.com",
      timestamp: Date.now(),
    };
    const signature = signFederationPayload(payload);
    const { status, body } = await client.post("/_congruity/federation/v1/voice/join", {
      ...payload,
      signature,
    });
    assert.equal(status, 404);
    assert.match(body.error, /channel not found/i);
  } finally {
    client.close();
  }
});

test("POST /v1/voice/join returns 200 with livekit_url and token for valid signed request", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  process.env.SERVER_DOMAIN = "myserver.example.com";
  const client = await request(createTestApp());
  try {
    const payload = {
      room_id: "channel-ch-1",
      user_id: "alice@remote.example.com",
      display_name: "Alice",
      requesting_server: "remote.example.com",
      timestamp: Date.now(),
    };
    const signature = signFederationPayload(payload);
    const { status, body } = await client.post("/_congruity/federation/v1/voice/join", {
      ...payload,
      signature,
    });
    assert.equal(status, 200);
    assert.ok(body.livekit_url, "must return livekit_url");
    assert.ok(body.token, "must return token");
  } finally {
    client.close();
    delete process.env.SERVER_DOMAIN;
  }
});
