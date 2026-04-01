const express = require("express");
const { requireAuth } = require("../middleware/auth");
const {
  createOrGetRoom,
  generateToken,
  getParticipants,
  removeParticipant,
  getConnectionInfo,
} = require("../services/livekitService");
const {
  canAccessChannel,
  getProfileByUserId,
} = require("../services/supabaseService");
const {
  joinFederatedVoiceRoom,
  normalizeRemoteServer,
  isFederationServerAllowed,
} = require("../services/federationService");
const { getTurnIceConfig } = require("../services/turnService");
const { getUserSockets } = require("../services/socketRegistry");
const { sendError } = require("../utils/http");

const SIGNAL_TYPES = new Set(["offer", "answer", "ice-candidate", "hangup"]);

function createVoiceRouter({ io }) {
  const router = express.Router();

  router.post("/channel/join", requireAuth, async (req, res) => {
    try {
      const { channel_id: channelId, server_id: serverId } = req.body || {};
      if (!channelId || !serverId) {
        res.status(400).json({ error: "channel_id and server_id are required" });
        return;
      }

      const permission = await canAccessChannel({
        userId: req.user.id,
        channelId,
        serverId,
      });
      if (!permission.allowed) {
        res.status(403).json({ error: "User cannot access this voice channel" });
        return;
      }

      const roomName = `channel-${channelId}`;
      await createOrGetRoom(roomName);
      const profile = await getProfileByUserId(req.user.id);
      const displayName =
        profile?.display_name || profile?.username || req.user.email || req.user.id;
      const token = await generateToken(roomName, req.user.id, displayName);
      const turnConfig = getTurnIceConfig(req.user.id);
      const { livekitUrl } = getConnectionInfo();

      io.emit("voice:participant:joined", {
        channel_id: channelId,
        user_id: req.user.id,
        display_name: displayName,
      });

      res.status(200).json({
        livekit_url: livekitUrl,
        token,
        room_name: roomName,
        turn_credentials: turnConfig,
      });
    } catch (error) {
      sendError(res, 500, "Failed to join channel voice", error);
    }
  });

  router.post("/channel/leave", requireAuth, async (req, res) => {
    try {
      const { channel_id: channelId } = req.body || {};
      if (!channelId) {
        res.status(400).json({ error: "channel_id is required" });
        return;
      }
      const roomName = `channel-${channelId}`;
      await removeParticipant(roomName, req.user.id);
      io.emit("voice:participant:left", {
        channel_id: channelId,
        user_id: req.user.id,
      });

      res.status(200).json({ ok: true });
    } catch (error) {
      sendError(res, 500, "Failed to leave channel voice", error);
    }
  });

  router.get("/channel/:channelId/participants", requireAuth, async (req, res) => {
    try {
      const { channelId } = req.params;
      if (!channelId) {
        res.status(400).json({ error: "channel_id is required" });
        return;
      }

      const permission = await canAccessChannel({
        userId: req.user.id,
        channelId,
      });
      if (!permission.allowed) {
        res.status(403).json({ error: "User cannot access this voice channel" });
        return;
      }

      const roomName = `channel-${channelId}`;
      const participants = await getParticipants(roomName);
      res.status(200).json({
        room_name: roomName,
        participants: (participants || []).map((participant) => ({
          identity: participant.identity,
          name: participant.name,
          sid: participant.sid,
        })),
      });
    } catch (error) {
      sendError(res, 500, "Failed to list participants", error);
    }
  });

  router.post("/dm/signal", requireAuth, async (req, res) => {
    try {
      const {
        target_user_id: targetUserId,
        signal_type: signalType,
        payload,
      } = req.body || {};

      if (!targetUserId || !signalType || !SIGNAL_TYPES.has(signalType)) {
        res.status(400).json({
          error: "target_user_id and valid signal_type are required",
        });
        return;
      }

      const sockets = getUserSockets(targetUserId);
      const fromProfile = await getProfileByUserId(req.user.id);
      const fromName =
        fromProfile?.display_name || fromProfile?.username || req.user.email || req.user.id;

      sockets.forEach((socketId) => {
        if (signalType === "offer") {
          io.to(socketId).emit("dm:call:incoming", {
            from_user_id: req.user.id,
            display_name: fromName,
            offer: payload,
          });
          return;
        }

        if (signalType === "hangup") {
          io.to(socketId).emit("dm:call:hangup", {
            from_user_id: req.user.id,
          });
          return;
        }

        io.to(socketId).emit("dm:call:signal", {
          from_user_id: req.user.id,
          signal_type: signalType,
          payload,
        });
      });

      io.to(req.user.id).emit("dm:call:signal", {
        to_user_id: targetUserId,
        signal_type: signalType,
      });

      res.status(200).json({
        delivered: sockets.length,
        turn_credentials: getTurnIceConfig(req.user.id),
      });
    } catch (error) {
      sendError(res, 500, "Failed to send DM signal", error);
    }
  });

  router.get("/turn-credentials", requireAuth, async (req, res) => {
    const turnConfig = getTurnIceConfig(req.user.id);
    res.status(200).json({
      turn_credentials: turnConfig,
    });
  });

  router.post("/federation/channel/join", requireAuth, async (req, res) => {
    try {
      const { remote_server: remoteServer, channel_id: channelId } = req.body || {};
      if (!remoteServer || !channelId) {
        res.status(400).json({ error: "remote_server and channel_id are required" });
        return;
      }
      let normalizedRemoteServer;
      try {
        normalizedRemoteServer = normalizeRemoteServer(remoteServer);
      } catch {
        res.status(400).json({ error: "Invalid remote_server value" });
        return;
      }
      if (!isFederationServerAllowed(normalizedRemoteServer)) {
        res.status(403).json({ error: "Remote server is not allowed" });
        return;
      }

      const profile = await getProfileByUserId(req.user.id);
      const localUser = {
        username: profile?.username || req.user.id,
        display_name: profile?.display_name || profile?.username || req.user.email || req.user.id,
      };

      const payload = await joinFederatedVoiceRoom({
        remoteServer: normalizedRemoteServer,
        channelId,
        localUser,
      });

      res.status(200).json(payload);
    } catch (error) {
      sendError(res, 500, "Failed to join federated voice room", error);
    }
  });

  return router;
}

module.exports = {
  createVoiceRouter,
};
