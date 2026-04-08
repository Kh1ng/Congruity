const test = require("node:test");
const assert = require("node:assert/strict");
const {
  signFederationPayload,
  verifyFederationSignature,
  stableStringify,
  joinFederatedVoiceRoom,
  getServerDomain,
} = require("../services/federationService");

// --- stableStringify ---

test("stableStringify produces deterministic output regardless of key insertion order", () => {
  const a = { z: 1, a: 2, m: 3 };
  const b = { m: 3, z: 1, a: 2 };
  assert.equal(stableStringify(a), stableStringify(b));
});

test("stableStringify handles nested objects deterministically", () => {
  const obj = { b: { y: 2, x: 1 }, a: 1 };
  const expected = '{"a":1,"b":{"x":1,"y":2}}';
  assert.equal(stableStringify(obj), expected);
});

test("stableStringify preserves array order (no sorting)", () => {
  assert.equal(stableStringify([3, 1, 2]), "[3,1,2]");
});

test("stableStringify handles primitive values", () => {
  assert.equal(stableStringify(42), "42");
  assert.equal(stableStringify("hello"), '"hello"');
  assert.equal(stableStringify(null), "null");
  assert.equal(stableStringify(true), "true");
});

// --- signFederationPayload ---

test("federation signature verifies for identical payload", () => {
  process.env.FEDERATION_SHARED_SECRET = "federation-secret";
  const payload = {
    room_id: "channel-123",
    user_id: "alice@example.com",
    display_name: "Alice",
    requesting_server: "remote.example.com",
    timestamp: 1730000000000,
  };
  const signature = signFederationPayload(payload);
  assert.equal(verifyFederationSignature(payload, signature), true);
});

test("federation signature fails when payload is tampered", () => {
  process.env.FEDERATION_SHARED_SECRET = "federation-secret";
  const payload = {
    room_id: "channel-123",
    user_id: "alice@example.com",
    display_name: "Alice",
    requesting_server: "remote.example.com",
    timestamp: 1730000000000,
  };
  const signature = signFederationPayload(payload);
  const tampered = { ...payload, room_id: "channel-456" };
  assert.equal(verifyFederationSignature(tampered, signature), false);
});

test("signFederationPayload throws when FEDERATION_SHARED_SECRET is not set", () => {
  delete process.env.FEDERATION_SHARED_SECRET;
  assert.throws(
    () => signFederationPayload({ room_id: "channel-1", timestamp: Date.now() }),
    /FEDERATION_SHARED_SECRET/
  );
  process.env.FEDERATION_SHARED_SECRET = "federation-secret";
});

test("signFederationPayload is order-independent (key order in payload doesn't change signature)", () => {
  process.env.FEDERATION_SHARED_SECRET = "federation-secret";
  const a = { room_id: "channel-1", user_id: "alice", timestamp: 1 };
  const b = { user_id: "alice", timestamp: 1, room_id: "channel-1" };
  assert.equal(signFederationPayload(a), signFederationPayload(b));
});

// --- verifyFederationSignature ---

test("verifyFederationSignature returns false for empty signature", () => {
  process.env.FEDERATION_SHARED_SECRET = "federation-secret";
  const payload = { room_id: "channel-1", timestamp: Date.now() };
  assert.equal(verifyFederationSignature(payload, ""), false);
});

test("verifyFederationSignature returns false for null/undefined signature", () => {
  process.env.FEDERATION_SHARED_SECRET = "federation-secret";
  const payload = { room_id: "channel-1", timestamp: Date.now() };
  assert.equal(verifyFederationSignature(payload, null), false);
  assert.equal(verifyFederationSignature(payload, undefined), false);
});

test("verifyFederationSignature returns false for wrong-length hex string", () => {
  process.env.FEDERATION_SHARED_SECRET = "federation-secret";
  const payload = { room_id: "channel-1", timestamp: Date.now() };
  assert.equal(verifyFederationSignature(payload, "deadbeef"), false);
});

// --- getServerDomain ---

test("getServerDomain returns SERVER_DOMAIN env var when set", () => {
  process.env.SERVER_DOMAIN = "chat.example.com";
  delete process.env.SELFHOSTED_PUBLIC_HOST;
  assert.equal(getServerDomain(), "chat.example.com");
});

test("getServerDomain falls back to SELFHOSTED_PUBLIC_HOST when SERVER_DOMAIN unset", () => {
  delete process.env.SERVER_DOMAIN;
  process.env.SELFHOSTED_PUBLIC_HOST = "selfhosted.local";
  assert.equal(getServerDomain(), "selfhosted.local");
});

test("getServerDomain falls back to localhost when no env vars are set", () => {
  delete process.env.SERVER_DOMAIN;
  delete process.env.SELFHOSTED_PUBLIC_HOST;
  assert.equal(getServerDomain(), "localhost");
});

// --- joinFederatedVoiceRoom ---

test("joinFederatedVoiceRoom sends a signed POST to the remote server", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  process.env.SERVER_DOMAIN = "local.example.com";

  let capturedJoinUrl = null;
  let capturedBody = null;

  global.fetch = async (url, init) => {
    if (url.includes("/info")) {
      return { ok: true, json: async () => ({ server: "remote.example.com" }) };
    }
    capturedJoinUrl = url;
    capturedBody = JSON.parse(init?.body || "{}");
    return {
      ok: true,
      json: async () => ({
        livekit_url: "wss://livekit.remote.example.com",
        token: "livekit-token",
        turn_credentials: null,
      }),
    };
  };

  const result = await joinFederatedVoiceRoom({
    remoteServer: "remote.example.com",
    channelId: "ch-1",
    localUser: { username: "alice", display_name: "Alice" },
  });

  assert.ok(capturedJoinUrl.includes("remote.example.com"), "must POST to remote server");
  assert.equal(capturedBody.room_id, "channel-ch-1");
  assert.equal(capturedBody.requesting_server, "local.example.com");
  assert.ok(capturedBody.signature, "signed request must include signature");
  assert.ok(typeof capturedBody.timestamp === "number", "timestamp must be numeric");
  assert.equal(result.livekit_url, "wss://livekit.remote.example.com");

  delete process.env.SERVER_DOMAIN;
});

test("joinFederatedVoiceRoom throws when remote /info fetch fails", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  global.fetch = async () => ({ ok: false, status: 503 });

  await assert.rejects(
    () =>
      joinFederatedVoiceRoom({
        remoteServer: "down.example.com",
        channelId: "ch-1",
        localUser: { username: "alice" },
      }),
    /federation info lookup failed/i
  );
});

test("joinFederatedVoiceRoom throws when remote voice/join returns error", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  global.fetch = async (url) => {
    if (url.includes("/info")) return { ok: true, json: async () => ({}) };
    return { ok: false, status: 401 };
  };

  await assert.rejects(
    () =>
      joinFederatedVoiceRoom({
        remoteServer: "remote.example.com",
        channelId: "ch-1",
        localUser: { username: "alice" },
      }),
    /federation voice join failed/i
  );
});

test("joinFederatedVoiceRoom includes display_name in payload", async () => {
  process.env.FEDERATION_SHARED_SECRET = "test-secret";
  process.env.SERVER_DOMAIN = "local.example.com";

  let capturedBody = null;
  global.fetch = async (url, init) => {
    if (url.includes("/info")) return { ok: true, json: async () => ({}) };
    capturedBody = JSON.parse(init?.body || "{}");
    return {
      ok: true,
      json: async () => ({ livekit_url: "wss://x", token: "t", turn_credentials: null }),
    };
  };

  await joinFederatedVoiceRoom({
    remoteServer: "remote.example.com",
    channelId: "ch-2",
    localUser: { username: "bob", display_name: "Bob Smith" },
  });

  assert.equal(capturedBody.display_name, "Bob Smith");
  delete process.env.SERVER_DOMAIN;
});
