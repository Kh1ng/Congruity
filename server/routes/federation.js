const express = require("express");
const {
  createOrGetRoom,
  generateToken,
  getConnectionInfo,
} = require("../services/livekitService");
const { getTurnIceConfig } = require("../services/turnService");
const { getChannelById } = require("../services/supabaseService");
const {
  verifyFederationSignature,
  getServerDomain,
  isFederationServerAllowed,
  normalizeRemoteServer,
} = require("../services/federationService");
const { createRateLimit } = require("../middleware/rateLimit");
const { sendError } = require("../utils/http");

function createFederationRouter() {
  const router = express.Router();
  router.use(
    createRateLimit({
      windowMs: 60_000,
      max: 120,
      keyFn: (req) => req.ip || "unknown",
    })
  );

  router.get("/v1/info", async (req, res) => {
    const { livekitUrl } = getConnectionInfo();
    res.status(200).json({
      server: getServerDomain(),
      version: "1.0",
      capabilities: ["voice", "video", "screen_share", "federation"],
      livekit_available: Boolean(livekitUrl),
      federation_api_version: 1,
    });
  });

  router.post(
    "/v1/voice/join",
    createRateLimit({
      windowMs: 60_000,
      max: 30,
      keyFn: (req) => req.ip || "unknown",
    }),
    async (req, res) => {
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
      if (!Number.isFinite(requestTimestamp) || Math.abs(now - requestTimestamp) > 5 * 60 * 1000) {
        res.status(401).json({ error: "Federation request timestamp is out of range" });
        return;
      }

      const payload = {
        room_id: roomId,
        user_id: userId,
        display_name: displayName,
        requesting_server: requestingServer,
        timestamp,
      };

      let normalizedRequestingServer;
      try {
        normalizedRequestingServer = normalizeRemoteServer(requestingServer);
      } catch {
        res.status(400).json({ error: "Invalid requesting_server value" });
        return;
      }

      if (!isFederationServerAllowed(normalizedRequestingServer)) {
        res.status(403).json({ error: "Requesting server is not allowed" });
        return;
      }

      const signatureValid = verifyFederationSignature(payload, signature);
      if (!signatureValid) {
        res.status(401).json({ error: "Invalid federation signature" });
        return;
      }

      if (!roomId.startsWith("channel-")) {
        res.status(400).json({ error: "Unsupported room id format" });
        return;
      }

      const channelId = roomId.replace(/^channel-/, "");
      const channel = await getChannelById(channelId);
      if (!channel) {
        res.status(404).json({ error: "Channel not found" });
        return;
      }
      if (!channel.federation_enabled) {
        res.status(403).json({ error: "Channel is not federation-enabled" });
        return;
      }

      await createOrGetRoom(roomId);
      const participantIdentity = `fed:${userId}`;
      const token = await generateToken(roomId, participantIdentity, displayName || userId);
      const { livekitUrl } = getConnectionInfo();

      res.status(200).json({
        livekit_url: livekitUrl,
        token,
        turn_credentials: getTurnIceConfig(participantIdentity),
      });
    } catch (error) {
      sendError(res, 500, "Federation join failed", error);
    }
    }
  );

  return router;
}

module.exports = {
  createFederationRouter,
};
