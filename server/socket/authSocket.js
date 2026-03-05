const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id.toString(), name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = (io, socket, onlineUsers) => {
  // REGISTER
  socket.on("register", async (data) => {
    try {
      const { name, email, password } = data;

      if (!name || !email || !password) {
        return socket.emit("registerError", { message: "All fields are required" });
      }

      const exists = await User.findOne({ email });
      if (exists) {
        return socket.emit("registerError", { message: "Email already in use" });
      }

      const user = await User.create({ name, email, password });
      const token = generateToken(user);

      socket.userId = user._id.toString();
      socket.join(socket.userId);
      onlineUsers.set(socket.userId, socket.id);

      socket.emit("registerSuccess", { token, user: user.toSafeObject() });
      io.emit("userOnline", { userId: socket.userId });
    } catch (err) {
      socket.emit("registerError", { message: "Registration failed" });
      console.error("Register error:", err);
    }
  });

  // LOGIN
  socket.on("login", async (data) => {
    try {
      const { email, password } = data;

      if (!email || !password) {
        return socket.emit("loginError", { message: "Email and password required" });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return socket.emit("loginError", { message: "Invalid credentials" });
      }

      const valid = await user.comparePassword(password);
      if (!valid) {
        return socket.emit("loginError", { message: "Invalid credentials" });
      }

      const token = generateToken(user);

      socket.userId = user._id.toString();
      socket.join(socket.userId);
      onlineUsers.set(socket.userId, socket.id);

      socket.emit("loginSuccess", { token, user: user.toSafeObject() });
      io.emit("userOnline", { userId: socket.userId });
    } catch (err) {
      socket.emit("loginError", { message: "Login failed" });
      console.error("Login error:", err);
    }
  });

  // SEARCH USERS
  socket.on("searchUsers", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });

      const { query } = data;
      if (!query || query.trim().length < 1) {
        return socket.emit("searchResults", { users: [] });
      }

      const users = await User.find({
        $and: [
          { _id: { $ne: socket.userId } },
          {
            $or: [
              { name: { $regex: query, $options: "i" } },
              { email: { $regex: query, $options: "i" } },
            ],
          },
        ],
      })
        .select("-password")
        .limit(10);

      socket.emit("searchResults", { users });
    } catch (err) {
      socket.emit("error", { message: "Search failed" });
    }
  });

  // GET PROFILE
  socket.on("getProfile", async () => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });

      const user = await User.findById(socket.userId).select("-password");
      socket.emit("profileData", { user });
    } catch (err) {
      socket.emit("error", { message: "Failed to get profile" });
    }
  });

  // UPDATE PROFILE
  socket.on("updateProfile", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });

      const { name, bio } = data;
      const user = await User.findByIdAndUpdate(
        socket.userId,
        { name, bio },
        { new: true, runValidators: true }
      ).select("-password");

      socket.emit("profileUpdated", { user });
    } catch (err) {
      socket.emit("error", { message: "Update failed" });
    }
  });

  // GET ONLINE USERS LIST
  socket.on("getOnlineUsers", () => {
    const onlineIds = Array.from(onlineUsers.keys());
    socket.emit("onlineUsers", { userIds: onlineIds });
  });
};
