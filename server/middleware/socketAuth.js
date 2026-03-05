const jwt = require("jsonwebtoken");

const socketAuthMiddleware = (socket, next, token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userName = decoded.name;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

module.exports = { socketAuthMiddleware, verifyToken };
