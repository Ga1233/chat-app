const { v4: uuidv4 } = require("uuid");
const Conversation = require("../models/Conversation");
const path = require("path");
const fs = require("fs");

module.exports = (io, socket, onlineUsers) => {

  // GET CONVERSATIONS
  socket.on("getConversations", async () => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });
      const conversations = await Conversation.find({ members: socket.userId, isGroup: false })
        .populate("members", "-password")
        .sort({ lastMessageAt: -1 });
      socket.emit("conversationsList", { conversations });
    } catch (err) {
      socket.emit("error", { message: "Failed to get conversations" });
    }
  });

  // START OR GET CONVERSATION
  socket.on("startConversation", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });
      const { targetUserId } = data;
      let conversation = await Conversation.findOne({
        isGroup: false,
        members: { $all: [socket.userId, targetUserId], $size: 2 },
      }).populate("members", "-password");
      if (!conversation) {
        conversation = await Conversation.create({ members: [socket.userId, targetUserId], isGroup: false });
        conversation = await conversation.populate("members", "-password");
      }
      socket.join(conversation._id.toString());
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) io.to(targetSocketId).socketsJoin(conversation._id.toString());
      socket.emit("conversationStarted", { conversation });
    } catch (err) {
      socket.emit("error", { message: "Failed to start conversation" });
    }
  });

  // SEND MESSAGE
  socket.on("sendMessage", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });
      const { conversationId, text, messageType = "text", fileUrl = "", fileName = "", replyTo = null } = data;
      const conversation = await Conversation.findOne({ _id: conversationId, members: socket.userId });
      if (!conversation) return socket.emit("error", { message: "Conversation not found" });

      const message = {
        id: uuidv4(),
        senderId: socket.userId,
        conversationId,
        text: text || "",
        fileUrl: fileUrl || "",
        fileName: fileName || "",
        messageType,
        timestamp: Date.now(),
        seenBy: [socket.userId],
        replyTo: replyTo ? {
          id: String(replyTo.id || ""),
          text: String(replyTo.text || ""),
          senderName: String(replyTo.senderName || ""),
          messageType: String(replyTo.messageType || "text"),
          fileName: String(replyTo.fileName || ""),
        } : null,
      };

      await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });
      io.to(conversationId).emit("newMessage", { message });

      conversation.members.forEach((memberId) => {
        const mId = memberId.toString();
        if (mId !== socket.userId) {
          const memberSocketId = onlineUsers.get(mId);
          if (memberSocketId) {
            io.to(memberSocketId).emit("messageNotification", {
              conversationId,
              senderId: socket.userId,
              preview: messageType === "text" ? text?.substring(0, 50) : "📎 File",
            });
          }
        }
      });
    } catch (err) {
      socket.emit("error", { message: "Failed to send message" });
      console.error("sendMessage error:", err);
    }
  });

  // UPLOAD FILE
  socket.on("uploadFile", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });
      const { conversationId, fileData, fileName, mimeType, replyTo = null } = data;
      const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
      if (fileData.length > maxSize * 1.37) return socket.emit("uploadError", { message: "File too large" });
      const allowedTypes = [
        "image/jpeg","image/png","image/gif","image/webp",
        "application/pdf","text/plain","application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(mimeType)) return socket.emit("uploadError", { message: "File type not allowed" });

      const ext = path.extname(fileName);
      const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
      const uploadsDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      fs.writeFileSync(path.join(uploadsDir, uniqueName), base64Data, "base64");

      const fileUrl = `/uploads/${uniqueName}`;
      const messageType = mimeType.startsWith("image/") ? "image" : "file";
      const conversation = await Conversation.findOne({ _id: conversationId, members: socket.userId });
      if (!conversation) return socket.emit("error", { message: "Conversation not found" });

      const message = {
        id: uuidv4(),
        senderId: socket.userId,
        conversationId,
        text: "",
        fileUrl,
        fileName,
        messageType,
        timestamp: Date.now(),
        seenBy: [socket.userId],
        replyTo: replyTo ? {
          id: String(replyTo.id || ""),
          text: String(replyTo.text || ""),
          senderName: String(replyTo.senderName || ""),
          messageType: String(replyTo.messageType || "text"),
          fileName: String(replyTo.fileName || ""),
        } : null,
      };

      await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });
      io.to(conversationId).emit("newMessage", { message });
      socket.emit("uploadSuccess", { fileUrl, messageType });
    } catch (err) {
      socket.emit("uploadError", { message: "File upload failed" });
      console.error("uploadFile error:", err);
    }
  });

  // TYPING
  socket.on("typing", (data) => {
    socket.to(data.conversationId).emit("userTyping", { userId: socket.userId, conversationId: data.conversationId });
  });
  socket.on("stopTyping", (data) => {
    socket.to(data.conversationId).emit("userStoppedTyping", { userId: socket.userId });
  });

  // MARK SEEN
  socket.on("markSeen", (data) => {
    const { conversationId, messageIds } = data;
    socket.to(conversationId).emit("messagesSeen", { conversationId, messageIds, seenBy: socket.userId });
  });

  // JOIN / LEAVE
  socket.on("joinConversation", (data) => { socket.join(data.conversationId); });
  socket.on("leaveConversation", (data) => { socket.leave(data.conversationId); });
};