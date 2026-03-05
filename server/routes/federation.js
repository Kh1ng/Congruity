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
} = require("../services/federationService");

function createFederationRouter() {
  const router = express.Router();

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
      res.status(500).json({
        error: "Federation join failed",
        details: String(error?.message || error),
      });
    }
  });

  return router;
}

module.exports = {
  createFederationRouter,
};
