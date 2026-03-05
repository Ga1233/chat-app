import React from "react";
import "./Avatar.css";

const COLORS = [
  "#6c8aff", "#a78bfa", "#34d399", "#f97316", "#f43f5e",
  "#06b6d4", "#eab308", "#ec4899", "#8b5cf6", "#10b981",
];

const getColor = (name) => {
  if (!name) return COLORS[0];
  const idx = name.charCodeAt(0) % COLORS.length;
  return COLORS[idx];
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
};

const Avatar = ({ user, size = "md", showOnline = false, isOnline = false, src }) => {
  const color = getColor(user?.name);
  const initials = getInitials(user?.name);
  const imgSrc = src || user?.profilePic;

  return (
    <div className={`avatar avatar-${size}`} style={{ "--avatar-color": color }}>
      {imgSrc ? (
        <img src={imgSrc} alt={user?.name || "avatar"} className="avatar-img" />
      ) : (
        <span className="avatar-initials">{initials}</span>
      )}
      {showOnline && (
        <span className={`avatar-status ${isOnline ? "online" : "offline"}`} />
      )}
    </div>
  );
};

export default Avatar;
