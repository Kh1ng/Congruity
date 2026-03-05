const test = require("node:test");
const assert = require("node:assert/strict");

test("getTurnIceConfig returns null without TURN_SECRET", async () => {
  delete process.env.TURN_SECRET;
  delete process.env.TURN_HOST;
  const { getTurnIceConfig } = require("../services/turnService");
  assert.equal(getTurnIceConfig("user-1"), null);
});

test("getTurnIceConfig generates expiring HMAC credentials", async () => {
  process.env.TURN_SECRET = "test-turn-secret";
  process.env.TURN_HOST = "turn.example.com";
  const { getTurnIceConfig } = require("../services/turnService");

  const config = getTurnIceConfig("user-1");
  assert.ok(config);
  assert.equal(config.urls[0], "turn:turn.example.com:3478");
  assert.match(config.username, /^\d+:user-1$/);
  assert.ok(config.credential.length > 10);
});
