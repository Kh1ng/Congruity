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

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173", "https://localhost:5173"]
)
  .map((origin) => origin.trim())
  .filter(Boolean);

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
    origin: corsOrigins,
    methods: ["GET", "POST"],
  },
});

// Track users in rooms (roomId -> Map<socketId, userId>)
const rooms = new Map();

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.send("Congruity Signaling Server");
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const emitRoomUsers = (roomId) => {
    const users = Array.from(rooms.get(roomId)?.entries() || []).map(
      ([socketId, userId]) => ({ socketId, userId })
    );
    io.to(roomId).emit("room-users", { roomId, users });
  };

  // Join a voice/video room
  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);

    const participantId = userId || socket.id;

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

    console.log(`User ${participantId} joined room ${roomId}`);
  });

  // Leave a room
  socket.on("leave-room", ({ roomId }) => {
    socket.leave(roomId);

    if (rooms.has(roomId)) {
      const participantId = rooms.get(roomId).get(socket.id) || socket.id;
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }

      socket.to(roomId).emit("user-left", {
        socketId: socket.id,
        userId: participantId,
      });
      emitRoomUsers(roomId);
      console.log(`User ${participantId} left room ${roomId}`);
    }
  });

  // WebRTC signaling: offer
  socket.on("offer", ({ offer, to, roomId, from }) => {
    socket.to(to).emit("offer", { offer, from: from || socket.id });
  });

  // WebRTC signaling: answer
  socket.on("answer", ({ answer, to, roomId, from }) => {
    socket.to(to).emit("answer", { answer, from: from || socket.id });
  });

  // WebRTC signaling: ICE candidate
  socket.on("ice-candidate", ({ candidate, to, roomId, from }) => {
    socket.to(to).emit("ice-candidate", { candidate, from: from || socket.id });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

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
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  const protocol = useHttps ? "https" : "http";
  console.log(`Signaling server running on ${protocol}://0.0.0.0:${PORT}`);
});
