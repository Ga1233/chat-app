const { v4: uuidv4 } = require("uuid");
const Conversation = require("../models/Conversation");
const User = require("../models/User");

module.exports = (io, socket, onlineUsers) => {
  // GET GROUP CONVERSATIONS
  socket.on("getGroups", async () => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });

      const groups = await Conversation.find({
        members: socket.userId,
        isGroup: true,
      })
        .populate("members", "-password")
        .populate("admin", "-password")
        .sort({ lastMessageAt: -1 });

      socket.emit("groupsList", { groups });
    } catch (err) {
      socket.emit("error", { message: "Failed to get groups" });
    }
  });

  // CREATE GROUP
  socket.on("createGroup", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });

      const { groupName, memberIds } = data;

      if (!groupName || !memberIds || memberIds.length < 1) {
        return socket.emit("groupError", { message: "Group name and at least 1 member required" });
      }

      const allMembers = [...new Set([socket.userId, ...memberIds])];

      const group = await Conversation.create({
        isGroup: true,
        groupName: groupName.trim(),
        members: allMembers,
        admin: socket.userId,
      });

      const populated = await group.populate([
        { path: "members", select: "-password" },
        { path: "admin", select: "-password" },
      ]);

      // Notify all members
      allMembers.forEach((memberId) => {
        const memberSocketId = onlineUsers.get(memberId.toString());
        if (memberSocketId) {
          io.to(memberSocketId).socketsJoin(group._id.toString());
          io.to(memberSocketId).emit("groupCreated", { group: populated });
        }
      });
    } catch (err) {
      socket.emit("groupError", { message: "Failed to create group" });
      console.error("createGroup error:", err);
    }
  });

  // ADD MEMBER TO GROUP
  socket.on("addGroupMember", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });

      const { conversationId, userId } = data;

      const group = await Conversation.findOne({
        _id: conversationId,
        isGroup: true,
        admin: socket.userId,
      });

      if (!group) {
        return socket.emit("groupError", { message: "Only admin can add members" });
      }

      if (group.members.includes(userId)) {
        return socket.emit("groupError", { message: "User already in group" });
      }

      group.members.push(userId);
      await group.save();

      const populated = await group.populate([
        { path: "members", select: "-password" },
        { path: "admin", select: "-password" },
      ]);

      // Notify new member
      const newMemberSocketId = onlineUsers.get(userId);
      if (newMemberSocketId) {
        io.to(newMemberSocketId).socketsJoin(conversationId);
        io.to(newMemberSocketId).emit("addedToGroup", { group: populated });
      }

      io.to(conversationId).emit("groupUpdated", { group: populated });
    } catch (err) {
      socket.emit("groupError", { message: "Failed to add member" });
    }
  });

  // REMOVE MEMBER FROM GROUP
  socket.on("removeGroupMember", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });

      const { conversationId, userId } = data;

      const group = await Conversation.findOne({
        _id: conversationId,
        isGroup: true,
        admin: socket.userId,
      });

      if (!group) {
        return socket.emit("groupError", { message: "Only admin can remove members" });
      }

      if (userId === socket.userId) {
        return socket.emit("groupError", { message: "Admin cannot remove themselves" });
      }

      group.members = group.members.filter((m) => m.toString() !== userId);
      await group.save();

      const populated = await group.populate([
        { path: "members", select: "-password" },
        { path: "admin", select: "-password" },
      ]);

      // Notify removed member
      const removedSocketId = onlineUsers.get(userId);
      if (removedSocketId) {
        io.to(removedSocketId).socketsLeave(conversationId);
        io.to(removedSocketId).emit("removedFromGroup", { conversationId });
      }

      io.to(conversationId).emit("groupUpdated", { group: populated });
    } catch (err) {
      socket.emit("groupError", { message: "Failed to remove member" });
    }
  });

  // LEAVE GROUP
  socket.on("leaveGroup", async (data) => {
    try {
      if (!socket.userId) return socket.emit("error", { message: "Unauthorized" });

      const { conversationId } = data;

      const group = await Conversation.findOne({
        _id: conversationId,
        isGroup: true,
        members: socket.userId,
      });

      if (!group) {
        return socket.emit("groupError", { message: "Group not found" });
      }

      // If admin leaves, assign new admin or delete group
      if (group.admin.toString() === socket.userId) {
        const newAdminId = group.members.find((m) => m.toString() !== socket.userId);
        if (newAdminId) {
          group.admin = newAdminId;
        } else {
          await Conversation.findByIdAndDelete(conversationId);
          return socket.emit("groupLeft", { conversationId });
        }
      }

      group.members = group.members.filter((m) => m.toString() !== socket.userId);
      await group.save();

      const populated = await group.populate([
        { path: "members", select: "-password" },
        { path: "admin", select: "-password" },
      ]);

      socket.leave(conversationId);
      socket.emit("groupLeft", { conversationId });
      io.to(conversationId).emit("groupUpdated", { group: populated });
    } catch (err) {
      socket.emit("groupError", { message: "Failed to leave group" });
    }
  });
};
