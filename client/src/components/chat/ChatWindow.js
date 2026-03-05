import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../common/Avatar";
import MessageBubble from "./MessageBubble";
import GroupInfo from "./GroupInfo";
import "./ChatWindow.css";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

const ChatWindow = ({ onBack }) => {
  const { user, socket } = useAuth();
  const { activeConversation, messages, onlineUsers, typingUsers } = useChat();

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const getPartner = () => {
    if (!activeConversation || activeConversation.isGroup) return null;
    return activeConversation.members?.find((m) => m._id !== user?._id);
  };

  const partner = getPartner();
  const isPartnerOnline = partner ? onlineUsers.has(partner._id) : false;
  const isPartnerTyping = activeConversation
    ? Object.keys(typingUsers).some(
        (uid) => uid !== user?._id && typingUsers[uid] && uid !== user?._id
      )
    : false;

  const handleTextChange = (e) => {
    setText(e.target.value);

    // Typing indicator
    if (!isTyping) {
      setIsTyping(true);
      socket?.emit("typing", { conversationId: activeConversation?._id });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      socket?.emit("stopTyping", { conversationId: activeConversation?._id });
    }, 2000);

    // Auto-resize textarea
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const sendMessage = () => {
    if (!text.trim() || !activeConversation) return;

    socket?.emit("sendMessage", {
      conversationId: activeConversation._id,
      text: text.trim(),
      messageType: "text",
    });

    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    clearTimeout(typingTimeout.current);
    setIsTyping(false);
    socket?.emit("stopTyping", { conversationId: activeConversation._id });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      socket?.emit("uploadFile", {
        conversationId: activeConversation._id,
        fileData: evt.target.result,
        fileName: file.name,
        mimeType: file.type,
      });
      setUploading(false);
    };
    reader.onerror = () => {
      setUploading(false);
      alert("Failed to read file");
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = "";
  };

  if (!activeConversation) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-content">
          <div className="chat-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2>Select a conversation</h2>
          <p>Choose from your existing conversations or start a new one</p>
        </div>
      </div>
    );
  }

  const displayName = activeConversation.isGroup
    ? activeConversation.groupName
    : partner?.name || "Unknown";

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <button className="back-btn mobile-only" onClick={onBack}>
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" />
          </svg>
        </button>

        {activeConversation.isGroup ? (
          <div className="group-avatar-sm">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" />
            </svg>
          </div>
        ) : (
          <Avatar user={partner} size="md" showOnline isOnline={isPartnerOnline} />
        )}

        <div className="chat-header-info" onClick={() => activeConversation.isGroup && setShowGroupInfo(true)}>
          <h3 className="chat-header-name">{displayName}</h3>
          <span className="chat-header-status">
            {activeConversation.isGroup
              ? `${activeConversation.members?.length || 0} members`
              : isPartnerTyping
              ? "typing..."
              : isPartnerOnline
              ? "Online"
              : "Offline"}
          </span>
        </div>

        {activeConversation.isGroup && (
          <button className="icon-btn" onClick={() => setShowGroupInfo(true)} title="Group info">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="messages-empty">
            <div className="messages-empty-avatar">
              {activeConversation.isGroup ? (
                <div className="group-avatar-lg">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" />
                  </svg>
                </div>
              ) : (
                <Avatar user={partner} size="xl" />
              )}
            </div>
            <p className="messages-empty-name">{displayName}</p>
            <p className="messages-empty-hint">
              {activeConversation.isGroup
                ? "Group created. Start the conversation!"
                : `Say hello to ${partner?.name?.split(" ")[0] || "them"}!`}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.senderId === user?._id}
                showAvatar={
                  !activeConversation.isGroup ||
                  idx === 0 ||
                  messages[idx - 1]?.senderId !== msg.senderId
                }
                sender={
                  activeConversation.isGroup
                    ? activeConversation.members?.find((m) => m._id === msg.senderId)
                    : null
                }
              />
            ))}

            {isPartnerTyping && (
              <div className="typing-indicator">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
                <span className="typing-text">
                  {activeConversation.isGroup ? "Someone is" : `${partner?.name?.split(" ")[0]} is`} typing
                </span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <button
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Attach file"
        >
          {uploading ? (
            <span className="mini-spinner" />
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" />
            </svg>
          )}
        </button>

        <div className="input-box">
          <textarea
            ref={textareaRef}
            className="message-textarea"
            placeholder="Type a message..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>

        <button
          className={`send-btn ${text.trim() ? "active" : ""}`}
          onClick={sendMessage}
          disabled={!text.trim()}
          title="Send message"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden-input"
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
        />
      </div>

      {/* Group Info Drawer */}
      {showGroupInfo && activeConversation.isGroup && (
        <GroupInfo conversation={activeConversation} onClose={() => setShowGroupInfo(false)} />
      )}
    </div>
  );
};

export default ChatWindow;
