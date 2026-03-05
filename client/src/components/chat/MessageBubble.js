import React, { useState } from "react";
import Avatar from "../common/Avatar";
import "./MessageBubble.css";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

const MessageBubble = ({ message, isOwn, showAvatar, sender }) => {
  const [imgError, setImgError] = useState(false);

  const formatTime = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isImage = message.messageType === "image";
  const isFile = message.messageType === "file";

  const fileUrl = message.fileUrl
    ? message.fileUrl.startsWith("http")
      ? message.fileUrl
      : `${SERVER_URL}${message.fileUrl}`
    : null;

  const seenCount = message.seenBy?.length || 0;

  return (
    <div className={`message-row ${isOwn ? "own" : "other"}`}>
      {!isOwn && showAvatar && (
        <div className="message-avatar">
          <Avatar user={sender} size="sm" />
        </div>
      )}
      {!isOwn && !showAvatar && <div className="message-avatar-spacer" />}

      <div className={`bubble-group ${isOwn ? "own" : "other"}`}>
        {!isOwn && sender && showAvatar && (
          <span className="sender-name">{sender.name}</span>
        )}

        <div className={`bubble ${isOwn ? "bubble-own" : "bubble-other"} ${isImage ? "bubble-image" : ""}`}>
          {isImage && fileUrl && !imgError ? (
            <img
              src={fileUrl}
              alt={message.fileName || "Image"}
              className="msg-image"
              onError={() => setImgError(true)}
              onClick={() => window.open(fileUrl, "_blank")}
            />
          ) : isFile && fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="file-attachment"
            >
              <div className="file-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                </svg>
              </div>
              <div className="file-info">
                <span className="file-name">{message.fileName || "File"}</span>
                <span className="file-action">Click to open</span>
              </div>
              <div className="file-dl">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                </svg>
              </div>
            </a>
          ) : (
            <p className="msg-text">{message.text}</p>
          )}

          <div className="msg-meta">
            <span className="msg-time">{formatTime(message.timestamp)}</span>
            {isOwn && (
              <span className={`msg-seen ${seenCount > 1 ? "seen" : ""}`}>
                {seenCount > 1 ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" title="Seen">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" title="Sent">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
