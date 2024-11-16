const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const jwt = require("jsonwebtoken");

//routes stuff
const loginRoutes = require("./routes/login");
const signupRoutes = require("./routes/signup");

app.use(express.json());
app.use("/login", loginRoutes);
app.use("/signup", signupRoutes);

app.get("/", (req, res) => {
  res.send("You found the REAR end!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle offer
  socket.on("offer", async ({ offer, roomId, userId }) => {
    // Save offer to database
    await prisma.call.create({
      data: { callerId: userId, roomId },
    });
    socket.broadcast.to(roomId).emit("offer", { offer });
  });

  // Handle answer
  socket.on("answer", async ({ answer, roomId }) => {
    socket.broadcast.to(roomId).emit("answer", { answer });
  });

  // Handle ICE candidates
  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.broadcast.to(roomId).emit("ice-candidate", { candidate });
  });

  // Join a room
  socket.on("join-room", async (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("Signaling server running on port 3001");
});
