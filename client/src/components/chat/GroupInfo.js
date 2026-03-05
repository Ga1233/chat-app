import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import Avatar from "../common/Avatar";
import "./CreateGroup.css";
import "./GroupInfo.css";

const GroupInfo = ({ conversation, onClose }) => {
  const { socket, user } = useAuth();
  const { onlineUsers } = useChat();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const searchTimeout = React.useRef(null);

  const isAdmin = conversation.admin?._id === user?._id || conversation.admin === user?._id;

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (q.trim()) {
      searchTimeout.current = setTimeout(() => {
        socket?.emit("searchUsers", { query: q });
        socket?.once("searchResults", ({ users }) => {
          const memberIds = conversation.members.map((m) => m._id || m);
          setSearchResults(users.filter((u) => !memberIds.includes(u._id)));
        });
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  const handleAddMember = (userId) => {
    socket?.emit("addGroupMember", { conversationId: conversation._id, userId });
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveMember = (userId) => {
    if (window.confirm("Remove this member?")) {
      socket?.emit("removeGroupMember", { conversationId: conversation._id, userId });
    }
  };

  const handleLeaveGroup = () => {
    if (window.confirm("Leave this group?")) {
      socket?.emit("leaveGroup", { conversationId: conversation._id });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>Group Info</h3>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="group-info-header">
            <div className="group-info-avatar">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" />
              </svg>
            </div>
            <h4 className="group-info-name">{conversation.groupName}</h4>
            <p className="group-info-count">{conversation.members?.length} members</p>
          </div>

          {isAdmin && (
            <div className="form-group">
              <label className="form-label">Add Member</label>
              <input
                type="text"
                className="form-input no-icon"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={handleSearch}
              />
              {searchResults.length > 0 && (
                <div className="search-results" style={{ marginTop: 4 }}>
                  {searchResults.map((u) => (
                    <button
                      key={u._id}
                      className="search-result-item"
                      onClick={() => handleAddMember(u._id)}
                    >
                      <Avatar user={u} size="sm" />
                      <span className="search-result-name">{u.name}</span>
                      <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16, color: "var(--accent)" }}>
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="members-section">
            <label className="form-label">Members</label>
            <div className="members-list">
              {conversation.members?.map((member) => {
                const memberId = member._id || member;
                const isMe = memberId === user?._id;
                const isGroupAdmin =
                  conversation.admin?._id === memberId || conversation.admin === memberId;
                const isOnline = onlineUsers.has(memberId);

                return (
                  <div key={memberId} className="member-item">
                    <Avatar user={member} size="sm" showOnline isOnline={isOnline} />
                    <div className="member-info">
                      <span className="member-name">
                        {member.name || "Unknown"} {isMe ? "(you)" : ""}
                      </span>
                      {isGroupAdmin && <span className="admin-badge">Admin</span>}
                    </div>
                    {isAdmin && !isMe && !isGroupAdmin && (
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveMember(memberId)}
                        title="Remove member"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-danger" onClick={handleLeaveGroup}>
            Leave Group
          </button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default GroupInfo;
