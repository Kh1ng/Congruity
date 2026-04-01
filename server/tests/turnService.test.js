const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

test("getTurnIceConfig returns null without TURN_SECRET", () => {
  delete process.env.TURN_SECRET;
  delete process.env.TURN_HOST;
  // Clear require cache so env changes take effect
  delete require.cache[require.resolve("../services/turnService")];
  const { getTurnIceConfig } = require("../services/turnService");
  assert.equal(getTurnIceConfig("user-1"), null);
});

test("getTurnIceConfig generates expiring HMAC credentials", () => {
  process.env.TURN_SECRET = "test-turn-secret";
  process.env.TURN_HOST = "turn.example.com";
  delete require.cache[require.resolve("../services/turnService")];
  const { getTurnIceConfig } = require("../services/turnService");

  const config = getTurnIceConfig("user-1");
  assert.ok(config);
  assert.match(config.username, /^\d+:user-1$/);
  assert.ok(config.credential.length > 10);
});

test("getTurnIceConfig credential expires in the future (24h TTL)", () => {
  process.env.TURN_SECRET = "test-secret";
  process.env.TURN_HOST = "turn.example.com";
  delete require.cache[require.resolve("../services/turnService")];
  const { getTurnIceConfig } = require("../services/turnService");

  const config = getTurnIceConfig("user-1");
  const expiry = parseInt(config.username.split(":")[0], 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  assert.ok(expiry > nowSeconds, "expiry must be in the future");
  // Should be approximately 24h from now (within a few seconds of clock drift)
  assert.ok(expiry - nowSeconds > 23 * 3600, "expiry should be at least 23h from now");
});

test("getTurnIceConfig returns both UDP and TCP TURN URLs", () => {
  process.env.TURN_SECRET = "test-secret";
  process.env.TURN_HOST = "turn.example.com";
  delete require.cache[require.resolve("../services/turnService")];
  const { getTurnIceConfig } = require("../services/turnService");

  const config = getTurnIceConfig("user-1");
  assert.equal(config.urls.length, 2);
  assert.ok(
    config.urls.some((u) => u === "turn:turn.example.com:3478"),
    "should include plain UDP TURN URL"
  );
  assert.ok(
    config.urls.some((u) => u.includes("transport=tcp")),
    "should include TCP TURN URL"
  );
});

test("getTurnIceConfig HMAC credential is valid SHA1 for the username", () => {
  process.env.TURN_SECRET = "test-secret";
  process.env.TURN_HOST = "turn.example.com";
  delete require.cache[require.resolve("../services/turnService")];
  const { getTurnIceConfig } = require("../services/turnService");

  const config = getTurnIceConfig("user-99");
  const expected = crypto
    .createHmac("sha1", "test-secret")
    .update(config.username)
    .digest("base64");
  assert.equal(config.credential, expected, "credential must be valid HMAC-SHA1 over username");
});

test("getTurnIceConfig uses custom TURN_HOST", () => {
  process.env.TURN_SECRET = "test-secret";
  process.env.TURN_HOST = "custom.turn.server.io";
  delete require.cache[require.resolve("../services/turnService")];
  const { getTurnIceConfig } = require("../services/turnService");

  const config = getTurnIceConfig("user-1");
  assert.ok(config.urls.every((u) => u.includes("custom.turn.server.io")));
});
