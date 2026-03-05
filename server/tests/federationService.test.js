const test = require("node:test");
const assert = require("node:assert/strict");
const {
  signFederationPayload,
  verifyFederationSignature,
} = require("../services/federationService");

test("federation signature verifies for identical payload", async () => {
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

test("federation signature fails when payload is tampered", async () => {
  process.env.FEDERATION_SHARED_SECRET = "federation-secret";
  const payload = {
    room_id: "channel-123",
    user_id: "alice@example.com",
    display_name: "Alice",
    requesting_server: "remote.example.com",
    timestamp: 1730000000000,
  };
  const signature = signFederationPayload(payload);
  const tamperedPayload = { ...payload, room_id: "channel-456" };
  assert.equal(verifyFederationSignature(tamperedPayload, signature), false);
});
