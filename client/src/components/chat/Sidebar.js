import React, { useState, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../common/Avatar";
import CreateGroup from "./CreateGroup";
import "./Sidebar.css";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

const Sidebar = ({ onSelectConversation }) => {
  const { user, socket, logout } = useAuth();
  const {
    conversations,
    groups,
    activeConversation,
    onlineUsers,
    unreadCounts,
    searchResults,
    setSearchResults,
    selectConversation,
    deleteConversation,
  } = useChat();

  const [tab, setTab] = useState("chats"); // chats | groups
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const searchTimeout = useRef(null);

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (q.trim().length > 0) {
      searchTimeout.current = setTimeout(() => {
        socket?.emit("searchUsers", { query: q });
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectUser = (targetUser) => {
    socket?.emit("startConversation", { targetUserId: targetUser._id });
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    onSelectConversation?.();
  };

  const handleSelectConversation = (conv) => {
    selectConversation(conv);
    setContextMenu(null);
    onSelectConversation?.();
  };

  const handleContextMenu = (e, conv) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, conv });
  };

  const handleDeleteChat = async () => {
    if (contextMenu?.conv) {
      await deleteConversation(contextMenu.conv._id);
      setContextMenu(null);
    }
  };

  const getConvPartner = (conv) => {
    return conv.members?.find((m) => m._id !== user?._id);
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const allItems = tab === "chats" ? conversations : groups;

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <svg className="brand-icon" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 20 Q20 12 28 20 Q20 28 12 20" fill="currentColor" />
          </svg>
          <span className="brand-name">Nexus</span>
        </div>

        <div className="sidebar-actions">
          <button
            className="icon-btn"
            onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); setSearchResults([]); }}
            title="New Chat"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
            </svg>
          </button>
          <button
            className="icon-btn"
            onClick={() => setShowCreateGroup(true)}
            title="New Group"
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
            </svg>
          </button>
          <div className="avatar-menu-wrap">
            <button className="avatar-btn" onClick={() => setShowMenu(!showMenu)}>
              <Avatar user={user} size="sm" />
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-user">
                  <Avatar user={user} size="md" />
                  <div>
                    <div className="dropdown-name">{user?.name}</div>
                    <div className="dropdown-email">{user?.email}</div>
                  </div>
                </div>
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={logout}>
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="search-panel">
          <div className="search-input-wrap">
            <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" />
            </svg>
            <input
              autoFocus
              type="text"
              className="search-input"
              placeholder="Search people..."
              value={searchQuery}
              onChange={handleSearch}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => { setSearchQuery(""); setSearchResults([]); }}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((u) => (
                <button key={u._id} className="search-result-item" onClick={() => handleSelectUser(u)}>
                  <Avatar user={u} size="md" showOnline isOnline={onlineUsers.has(u._id)} />
                  <div className="search-result-info">
                    <span className="search-result-name">{u.name}</span>
                    <span className="search-result-email">{u.email}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="search-empty">No users found</div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${tab === "chats" ? "active" : ""}`}
          onClick={() => setTab("chats")}
        >
          Chats
          {tab === "chats" && conversations.length > 0 && (
            <span className="tab-count">{conversations.length}</span>
          )}
        </button>
        <button
          className={`sidebar-tab ${tab === "groups" ? "active" : ""}`}
          onClick={() => setTab("groups")}
        >
          Groups
          {tab === "groups" && groups.length > 0 && (
            <span className="tab-count">{groups.length}</span>
          )}
        </button>
      </div>

      {/* Conversation List */}
      <div className="sidebar-list">
        {allItems.length === 0 ? (
          <div className="sidebar-empty">
            <div className="sidebar-empty-icon">
              {tab === "chats" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              )}
            </div>
            <p>{tab === "chats" ? "No conversations yet" : "No groups yet"}</p>
            <span>{tab === "chats" ? "Search for people to start chatting" : "Create a group to get started"}</span>
          </div>
        ) : (
          allItems.map((item) => {
            const isGroup = item.isGroup;
            const partner = !isGroup ? getConvPartner(item) : null;
            const isActive = activeConversation?._id === item._id;
            const isOnline = partner ? onlineUsers.has(partner._id) : false;
            const unread = unreadCounts[item._id] || 0;

            return (
              <button
                key={item._id}
                className={`conv-item ${isActive ? "active" : ""}`}
                onClick={() => handleSelectConversation(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
              >
                {isGroup ? (
                  <div className="group-avatar">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" />
                    </svg>
                  </div>
                ) : (
                  <Avatar user={partner} size="md" showOnline isOnline={isOnline} />
                )}

                <div className="conv-info">
                  <div className="conv-top">
                    <span className="conv-name">
                      {isGroup ? item.groupName : partner?.name || "Unknown"}
                    </span>
                    <span className="conv-time">{formatTime(item.lastMessageAt)}</span>
                  </div>
                  <div className="conv-bottom">
                    <span className="conv-preview">
                      {isGroup
                        ? `${item.members?.length || 0} members`
                        : partner?.bio || partner?.email || "Start chatting"}
                    </span>
                    {unread > 0 && <span className="conv-badge">{unread > 99 ? "99+" : unread}</span>}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="context-overlay" onClick={() => setContextMenu(null)} />
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button className="context-item danger" onClick={handleDeleteChat}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
              </svg>
              Delete Chat
            </button>
          </div>
        </>
      )}

      {/* Click outside to close dropdown */}
      {showMenu && <div className="overlay" onClick={() => setShowMenu(false)} />}

      {/* Create Group Modal */}
      {showCreateGroup && <CreateGroup onClose={() => setShowCreateGroup(false)} />}
    </div>
  );
};

export default Sidebar;
