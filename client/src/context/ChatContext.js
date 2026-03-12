import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import {
  saveMessage,
  getMessagesByConversation,
  deleteConversationMessages,
  updateMessageSeenStatus,
} from "../storage/indexedDB";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { socket, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [searchResults, setSearchResults] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const typingTimeouts = useRef({});

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId) => {
    const msgs = await getMessagesByConversation(conversationId);
    setMessages(msgs);
  }, []);

  const selectConversation = useCallback(
    async (conversation) => {
      setActiveConversation(conversation);
      const convId = conversation._id;
      await loadMessages(convId);
      socket?.emit("joinConversation", { conversationId: convId });

      // Mark messages as seen
      const msgs = await getMessagesByConversation(convId);
      const unseenIds = msgs
        .filter((m) => m.senderId !== user?._id && !m.seenBy?.includes(user?._id))
        .map((m) => m.id);

      if (unseenIds.length > 0) {
        socket?.emit("markSeen", { conversationId: convId, messageIds: unseenIds });
        await updateMessageSeenStatus(unseenIds, user?._id);
      }

      // Clear unread count
      setUnreadCounts((prev) => ({ ...prev, [convId]: 0 }));
    },
    [socket, user, loadMessages]
  );

  const deleteConversation = useCallback(
    async (conversationId) => {
      await deleteConversationMessages(conversationId);
      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    },
    [activeConversation]
  );

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleConversationsList = ({ conversations }) => setConversations(conversations);
    const handleGroupsList = ({ groups }) => setGroups(groups);

    const handleNewMessage = async ({ message }) => {
      try {
        // Save to IndexedDB (non-blocking — UI updates even if save fails)
        saveMessage(message).catch((err) => console.warn("IndexedDB save error:", err));

        if (activeConversation?._id === message.conversationId) {
          setMessages((prev) => {
            const exists = prev.find((m) => m.id === message.id);
            return exists ? prev : [...prev, message];
          });

          // Mark as seen if active
          if (message.senderId !== user?._id) {
            socket.emit("markSeen", {
              conversationId: message.conversationId,
              messageIds: [message.id],
            });
            updateMessageSeenStatus([message.id], user?._id).catch(() => {});
          }
        } else {
          setUnreadCounts((prev) => ({
            ...prev,
            [message.conversationId]: (prev[message.conversationId] || 0) + 1,
          }));
        }

        // Update conversation order
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c._id === message.conversationId ? { ...c, lastMessageAt: message.timestamp } : c
          );
          return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        });

        setGroups((prev) => {
          const updated = prev.map((g) =>
            g._id === message.conversationId ? { ...g, lastMessageAt: message.timestamp } : g
          );
          return updated.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        });
      } catch (err) {
        console.warn("handleNewMessage error:", err);
      }
    };

    const handleMessagesSeen = ({ messageIds, seenBy }) => {
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id) && !m.seenBy?.includes(seenBy)
            ? { ...m, seenBy: [...(m.seenBy || []), seenBy] }
            : m
        )
      );
    };

    const handleUserTyping = ({ userId, conversationId }) => {
      if (conversationId === activeConversation?._id) {
        setTypingUsers((prev) => ({ ...prev, [userId]: true }));
        clearTimeout(typingTimeouts.current[userId]);
        typingTimeouts.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const n = { ...prev };
            delete n[userId];
            return n;
          });
        }, 3000);
      }
    };

    const handleUserStoppedTyping = ({ userId }) => {
      setTypingUsers((prev) => {
        const n = { ...prev };
        delete n[userId];
        return n;
      });
    };

    const handleUserOnline = ({ userId }) => setOnlineUsers((prev) => new Set([...prev, userId]));
    const handleUserOffline = ({ userId }) =>
      setOnlineUsers((prev) => {
        const n = new Set(prev);
        n.delete(userId);
        return n;
      });
    const handleOnlineUsers = ({ userIds }) => setOnlineUsers(new Set(userIds));

    const handleConversationStarted = ({ conversation }) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === conversation._id);
        return exists ? prev : [conversation, ...prev];
      });
      selectConversation(conversation);
    };

    const handleGroupCreated = ({ group }) => {
      setGroups((prev) => {
        const exists = prev.find((g) => g._id === group._id);
        return exists ? prev : [group, ...prev];
      });
    };

    const handleGroupUpdated = ({ group }) => {
      setGroups((prev) => prev.map((g) => (g._id === group._id ? group : g)));
      if (activeConversation?._id === group._id) {
        setActiveConversation(group);
      }
    };

    const handleGroupLeft = ({ conversationId }) => {
      setGroups((prev) => prev.filter((g) => g._id !== conversationId));
      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    };

    const handleRemovedFromGroup = ({ conversationId }) => {
      setGroups((prev) => prev.filter((g) => g._id !== conversationId));
      if (activeConversation?._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    };

    socket.on("conversationsList", handleConversationsList);
    socket.on("groupsList", handleGroupsList);
    socket.on("newMessage", handleNewMessage);
    socket.on("messagesSeen", handleMessagesSeen);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStoppedTyping", handleUserStoppedTyping);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    socket.on("onlineUsers", handleOnlineUsers);
    socket.on("conversationStarted", handleConversationStarted);
    socket.on("groupCreated", handleGroupCreated);
    socket.on("addedToGroup", handleGroupCreated);
    socket.on("groupUpdated", handleGroupUpdated);
    socket.on("groupLeft", handleGroupLeft);
    socket.on("removedFromGroup", handleRemovedFromGroup);
    socket.on("searchResults", ({ users }) => setSearchResults(users));

    // Initial data fetch
    socket.emit("getConversations");
    socket.emit("getGroups");
    socket.emit("getOnlineUsers");

    return () => {
      socket.off("conversationsList", handleConversationsList);
      socket.off("groupsList", handleGroupsList);
      socket.off("newMessage", handleNewMessage);
      socket.off("messagesSeen", handleMessagesSeen);
      socket.off("userTyping", handleUserTyping);
      socket.off("userStoppedTyping", handleUserStoppedTyping);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      socket.off("onlineUsers", handleOnlineUsers);
      socket.off("conversationStarted", handleConversationStarted);
      socket.off("groupCreated", handleGroupCreated);
      socket.off("addedToGroup", handleGroupCreated);
      socket.off("groupUpdated", handleGroupUpdated);
      socket.off("groupLeft", handleGroupLeft);
      socket.off("removedFromGroup", handleRemovedFromGroup);
      socket.off("searchResults");
    };
  }, [socket, activeConversation, user, selectConversation]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        groups,
        activeConversation,
        messages,
        onlineUsers,
        typingUsers,
        searchResults,
        unreadCounts,
        setSearchResults,
        selectConversation,
        deleteConversation,
        loadMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
};