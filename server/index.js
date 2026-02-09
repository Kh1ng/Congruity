/**
 * Congruity WebRTC Signaling Server
 * 
 * This server handles WebRTC signaling for voice/video calls.
 * All other functionality (auth, messages, etc.) is handled by Supabase.
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS for dev
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Track users in rooms
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

  // Join a voice/video room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    
    // Track user in room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);
    
    // Notify others in the room
    socket.to(roomId).emit("user-joined", { userId: socket.id });
    
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Leave a room
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
    
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
    }
    
    socket.to(roomId).emit("user-left", { userId: socket.id });
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // WebRTC signaling: offer
  socket.on("offer", ({ offer, to, roomId }) => {
    socket.to(to).emit("offer", { offer, from: socket.id });
  });

  // WebRTC signaling: answer
  socket.on("answer", ({ answer, to, roomId }) => {
    socket.to(to).emit("answer", { answer, from: socket.id });
  });

  // WebRTC signaling: ICE candidate
  socket.on("ice-candidate", ({ candidate, to, roomId }) => {
    socket.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    
    // Remove from all rooms and notify
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit("user-left", { userId: socket.id });
        if (users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
