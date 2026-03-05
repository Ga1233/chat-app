import React, { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../common/Avatar";
import "./CreateGroup.css";

const CreateGroup = ({ onClose }) => {
  const { socket } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState("");
  const searchTimeout = useRef(null);

  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimeout.current);
    if (q.trim()) {
      searchTimeout.current = setTimeout(() => {
        socket?.emit("searchUsers", { query: q });
        socket?.once("searchResults", ({ users }) => setSearchResults(users));
      }, 300);
    } else {
      setSearchResults([]);
    }
  };

  const toggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim()) return setError("Group name is required");
    if (selectedUsers.length < 1) return setError("Add at least 1 member");

    socket?.emit("createGroup", {
      groupName: groupName.trim(),
      memberIds: selectedUsers.map((u) => u._id),
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-header">
          <h3>Create Group</h3>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input
              type="text"
              className="form-input no-icon"
              placeholder="Enter group name..."
              value={groupName}
              onChange={(e) => { setGroupName(e.target.value); setError(""); }}
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Add Members</label>
            <input
              type="text"
              className="form-input no-icon"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="selected-users">
              {selectedUsers.map((u) => (
                <div key={u._id} className="selected-chip">
                  <Avatar user={u} size="sm" />
                  <span>{u.name.split(" ")[0]}</span>
                  <button onClick={() => toggleUser(u)}>
                    <svg viewBox="0 0 12 12" fill="currentColor">
                      <path d="M6 4.586L2.707 1.293 1.293 2.707 4.586 6 1.293 9.293l1.414 1.414L6 7.414l3.293 3.293 1.414-1.414L7.414 6l3.293-3.293L9.293 1.293z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((u) => {
                const isSelected = selectedUsers.find((s) => s._id === u._id);
                return (
                  <button
                    key={u._id}
                    className={`search-result-item ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleUser(u)}
                  >
                    <Avatar user={u} size="sm" />
                    <span className="search-result-name">{u.name}</span>
                    {isSelected && (
                      <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedUsers.length < 1}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
