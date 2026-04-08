/**
 * Congruity WebRTC Signaling Server
 * 
 * This server handles WebRTC signaling for voice/video calls.
 * All other functionality (auth, messages, etc.) is handled by Supabase.
 */

const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const { createVoiceRouter } = require("./routes/voice");
const { createFederationRouter } = require("./routes/federation");
const { authenticateToken } = require("./services/supabaseService");
const {
  registerUserSocket,
  unregisterSocket,
  getUserSockets,
  getSocketUser,
} = require("./services/socketRegistry");
const logger = require("./utils/logger");

const app = express();
app.use(express.json({ limit: "1mb" }));
const corsOrigins = (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [])
  .map((origin) => origin.trim())
  .filter(Boolean);

const isDefaultAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  if (/^tauri:\/\/localhost$/i.test(origin)) {
    return true;
  }

  if (/^https?:\/\/tauri\.localhost(?::\d+)?$/i.test(origin)) {
    return true;
  }

  return false;
};

const isAllowedOrigin = (origin) => {
  // Non-browser clients may not send Origin.
  if (!origin) return true;

  // In production, require explicit allow-list for browser origins.
  if (process.env.NODE_ENV === "production" && corsOrigins.length === 0) {
    return false;
  }

  if (corsOrigins.length === 0) {
    return isDefaultAllowedOrigin(origin);
  }

  if (corsOrigins.includes(origin)) return true;
  return process.env.NODE_ENV !== "production" && isDefaultAllowedOrigin(origin);
};

const setSecurityHeaders = (res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
};

app.use((req, res, next) => {
  setSecurityHeaders(res);
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    if (origin && !isAllowedOrigin(origin)) {
      res.sendStatus(403);
      return;
    }
    res.sendStatus(204);
    return;
  }

  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }

  next();
});

const fallbackCertPath = path.join(__dirname, "../client/.cert/dev-cert.pem");
const fallbackKeyPath = path.join(__dirname, "../client/.cert/dev-key.pem");

const sslCertPath =
  process.env.SSL_CERT_PATH ||
  process.env.TLS_CERT_PATH ||
  (fs.existsSync(fallbackCertPath) ? fallbackCertPath : undefined);
const sslKeyPath =
  process.env.SSL_KEY_PATH ||
  process.env.TLS_KEY_PATH ||
  (fs.existsSync(fallbackKeyPath) ? fallbackKeyPath : undefined);

const useHttps =
  sslCertPath &&
  sslKeyPath &&
  fs.existsSync(sslCertPath) &&
  fs.existsSync(sslKeyPath);

const server = useHttps
  ? https.createServer(
      {
        cert: fs.readFileSync(sslCertPath),
        key: fs.readFileSync(sslKeyPath),
      },
      app
    )
  : http.createServer(app);

// Configure Socket.IO with CORS for dev
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    methods: ["GET", "POST"],
  },
});

// Track users in rooms (roomId -> Map<socketId, userId>)
const rooms = new Map();
const socketRoomMap = new Map();
const signalingRateLimits = new Map();

const VALID_ID = /^[a-zA-Z0-9_-]{1,128}$/;
const isValidId = (value) => typeof value === "string" && VALID_ID.test(value);

const isValidIceCandidate = (candidate) => {
  if (!candidate || typeof candidate !== "object") return false;
  const c = candidate.candidate;
  return typeof c === "string" && c.length <= 4096;
};

const isValidSdp = (desc) => {
  if (!desc || typeof desc !== "object") return false;
  if (!["offer", "answer"].includes(desc.type)) return false;
  return typeof desc.sdp === "string" && desc.sdp.length > 0 && desc.sdp.length <= 200000;
};

const throttleSocketEvent = (socketId, eventName, maxPerWindow = 100, windowMs = 10_000) => {
  const key = `${socketId}:${eventName}`;
  const now = Date.now();
  const current = signalingRateLimits.get(key) || { count: 0, windowStart: now };
  const elapsed = now - current.windowStart;

  if (elapsed > windowMs) {
    signalingRateLimits.set(key, { count: 1, windowStart: now });
    return false;
  }

  current.count += 1;
  signalingRateLimits.set(key, current);
  return current.count > maxPerWindow;
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.send("Congruity Signaling Server");
});

app.get("/rooms", (req, res) => {
  const requestedRoomIdsRaw = String(req.query.roomIds || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const requestedRoomIds = requestedRoomIdsRaw
    .filter(isValidId)
    .slice(0, 100);

  const roomEntries =
    requestedRoomIds.length > 0
      ? requestedRoomIds
          .filter((roomId) => rooms.has(roomId))
          .map((roomId) => [roomId, rooms.get(roomId)])
      : [];

  const roomsSnapshot = roomEntries.map(([roomId, users]) => ({
    roomId,
    users: Array.from(users.entries()).map(([socketId, userId]) => ({
      socketId,
      userId,
    })),
  }));

  res.status(200).json({ rooms: roomsSnapshot });
});

io.on("connection", (socket) => {
  logger.info("Socket connected", { socketId: socket.id });

  const emitDmSignal = ({ fromUserId, toUserId, signalType, payload }) => {
    const socketIds = getUserSockets(toUserId);
    socketIds.forEach((targetSocketId) => {
      if (signalType === "offer") {
        io.to(targetSocketId).emit("dm:call:incoming", {
          from_user_id: fromUserId,
          offer: payload,
        });
        return;
      }

      if (signalType === "hangup") {
        io.to(targetSocketId).emit("dm:call:hangup", {
          from_user_id: fromUserId,
        });
        return;
      }

      io.to(targetSocketId).emit("dm:call:signal", {
        from_user_id: fromUserId,
        signal_type: signalType,
        payload,
      });
    });
  };

  socket.on("auth:identify", async (payload = {}) => {
    const accessToken = typeof payload.accessToken === "string" ? payload.accessToken : null;
    const claimedUserId = typeof payload.userId === "string" ? payload.userId : null;
    if (!accessToken) {
      return;
    }

    try {
      const authenticatedUser = await authenticateToken(accessToken);
      if (!authenticatedUser?.id || !isValidId(authenticatedUser.id)) {
        socket.emit("auth:identified", { ok: false });
        return;
      }

      if (claimedUserId && claimedUserId !== authenticatedUser.id) {
        logger.warn("Socket identify mismatch", {
          socketId: socket.id,
          claimedUserId,
          authenticatedUserId: authenticatedUser.id,
        });
      }

      registerUserSocket(authenticatedUser.id, socket.id);
      socket.emit("auth:identified", { ok: true, user_id: authenticatedUser.id });
    } catch (error) {
      logger.warn("Socket identify failed", { socketId: socket.id, error: String(error?.message || error) });
      socket.emit("auth:identified", { ok: false });
    }
  });

  const emitRoomUsers = (roomId) => {
    const users = Array.from(rooms.get(roomId)?.entries() || []).map(
      ([socketId, userId]) => ({ socketId, userId })
    );
    io.to(roomId).emit("room-users", { roomId, users });
  };

  // Join a voice/video room
  socket.on("join-room", ({ roomId, userId }) => {
    if (!isValidId(roomId)) return;
    if (userId && !isValidId(userId)) return;

    const authenticatedUserId = getSocketUser(socket.id);
    if (authenticatedUserId && userId && authenticatedUserId !== userId) {
      logger.warn("Socket join-room rejected due to user mismatch", {
        socketId: socket.id,
        claimedUserId: userId,
        authenticatedUserId,
        roomId,
      });
      return;
    }

    const previousRoomId = socketRoomMap.get(socket.id);
    if (previousRoomId && previousRoomId !== roomId && rooms.has(previousRoomId)) {
      socket.leave(previousRoomId);
      const previousParticipantId = rooms.get(previousRoomId).get(socket.id) || socket.id;
      rooms.get(previousRoomId).delete(socket.id);
      socket.to(previousRoomId).emit("user-left", {
        socketId: socket.id,
        userId: previousParticipantId,
      });
      emitRoomUsers(previousRoomId);
      if (rooms.get(previousRoomId).size === 0) {
        rooms.delete(previousRoomId);
      }
    }

    socket.join(roomId);
    socketRoomMap.set(socket.id, roomId);

    const participantId = authenticatedUserId || socket.id;

    // Track user in room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    rooms.get(roomId).set(socket.id, participantId);

    // Notify others in the room
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userId: participantId,
    });
    emitRoomUsers(roomId);

    logger.info("Socket joined room", { socketId: socket.id, participantId, roomId });
  });

  socket.on("voice:join", ({ channel_id: channelId }) => {
    const userId = getSocketUser(socket.id);
    if (!userId) return;
    if (!isValidId(channelId)) return;

    const voiceRoom = `voice:channel:${channelId}`;
    socket.join(voiceRoom);
    socket.to(voiceRoom).emit("voice:participant:joined", {
      channel_id: channelId,
      user_id: userId,
    });
  });

  socket.on("voice:leave", ({ channel_id: channelId }) => {
    const userId = getSocketUser(socket.id);
    if (!userId) return;
    if (!isValidId(channelId)) return;
    const voiceRoom = `voice:channel:${channelId}`;
    socket.leave(voiceRoom);
    socket.to(voiceRoom).emit("voice:participant:left", {
      channel_id: channelId,
      user_id: userId,
    });
  });

  socket.on("dm:call:signal", ({ to_user_id: toUserId, signal_type: signalType, payload }) => {
    const fromUserId = getSocketUser(socket.id);
    if (!fromUserId || !isValidId(toUserId)) return;
    if (!["offer", "answer", "ice-candidate", "hangup"].includes(signalType)) return;
    emitDmSignal({
      fromUserId,
      toUserId,
      signalType,
      payload,
    });
  });

  // Leave a room
  socket.on("leave-room", ({ roomId }) => {
    if (!isValidId(roomId)) return;
    socket.leave(roomId);

    if (rooms.has(roomId)) {
      const participantId = rooms.get(roomId).get(socket.id) || socket.id;
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
      if (socketRoomMap.get(socket.id) === roomId) {
        socketRoomMap.delete(socket.id);
      }

      socket.to(roomId).emit("user-left", {
        socketId: socket.id,
        userId: participantId,
      });
      emitRoomUsers(roomId);
      logger.info("Socket left room", { socketId: socket.id, participantId, roomId });
    }
  });

  // WebRTC signaling: offer
  socket.on("offer", ({ offer, to, roomId, from }) => {
    if (throttleSocketEvent(socket.id, "offer", 30, 10_000)) return;
    if (!isValidId(to) || !isValidId(roomId) || !isValidSdp(offer)) return;
    socket.to(to).emit("offer", { offer, from: from || socket.id });
  });

  // WebRTC signaling: answer
  socket.on("answer", ({ answer, to, roomId, from }) => {
    if (throttleSocketEvent(socket.id, "answer", 30, 10_000)) return;
    if (!isValidId(to) || !isValidId(roomId) || !isValidSdp(answer)) return;
    socket.to(to).emit("answer", { answer, from: from || socket.id });
  });

  // WebRTC signaling: ICE candidate
  socket.on("ice-candidate", ({ candidate, to, roomId, from }) => {
    if (throttleSocketEvent(socket.id, "ice-candidate", 300, 10_000)) return;
    if (!isValidId(to) || !isValidId(roomId) || !isValidIceCandidate(candidate)) return;
    socket.to(to).emit("ice-candidate", { candidate, from: from || socket.id });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    logger.info("Socket disconnected", { socketId: socket.id });

    // Remove from all rooms and notify
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        const participantId = users.get(socket.id) || socket.id;
        users.delete(socket.id);
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          userId: participantId,
        });
        emitRoomUsers(roomId);
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
    socketRoomMap.delete(socket.id);
    unregisterSocket(socket.id);
  });
});

app.use("/api/voice", createVoiceRouter({ io }));
app.use("/_congruity/federation", createFederationRouter());

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  const protocol = useHttps ? "https" : "http";
  logger.info("Signaling server running", { protocol, host: "0.0.0.0", port: PORT });
});
