require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const authSocket = require("./socket/authSocket");
const chatSocket = require("./socket/chatSocket");
const groupSocket = require("./socket/groupSocket");
const { socketAuthMiddleware } = require("./middleware/socketAuth");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 2e7, // 10MB for file transfers
});

// Express middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "ok" }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Track online users: Map<userId, socketId>
const onlineUsers = new Map();

// Socket.io middleware for auth (skip for login/register)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    socketAuthMiddleware(socket, next, token);
  } else {
    next(); // Allow unauthenticated connections (for login/register)
  }
});

// Socket.io event handlers
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Register online user
  if (socket.userId) {
    onlineUsers.set(socket.userId, socket.id);
    io.emit("userOnline", { userId: socket.userId });
    socket.join(socket.userId); // Join personal room
  }

  // Attach handlers
  authSocket(io, socket, onlineUsers);
  chatSocket(io, socket, onlineUsers);
  groupSocket(io, socket, onlineUsers);

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("userOffline", { userId: socket.userId });
    }
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
