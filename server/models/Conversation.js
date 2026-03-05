const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    isGroup: { type: Boolean, default: false },
    groupName: { type: String, default: "", trim: true, maxlength: 50 },
    groupPic: { type: String, default: "" },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for faster member lookups
conversationSchema.index({ members: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
