import React, { useState, useRef } from "react";
import Avatar from "../common/Avatar";
import "./MessageBubble.css";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

const MessageBubble = ({ message, isOwn, showAvatar, sender, onReply, onScrollToMessage }) => {
  const [imgError, setImgError] = useState(false);
  const [showReplyBtn, setShowReplyBtn] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(null);
  const rowRef = useRef(null);

  const formatTime = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isImage = message.messageType === "image";
  const isFile = message.messageType === "file";

  const fileUrl = message.fileUrl
    ? message.fileUrl.startsWith("http") ? message.fileUrl : `${SERVER_URL}${message.fileUrl}`
    : null;

  const seenCount = message.seenBy?.length || 0;

  // Touch swipe to reply
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Only allow swipe right for other's messages, left for own
    if (isOwn && diff < 0) setSwipeX(Math.max(diff, -60));
    if (!isOwn && diff > 0) setSwipeX(Math.min(diff, 60));
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeX) >= 50) onReply?.(message);
    setSwipeX(0);
    touchStartX.current = null;
  };

  const getReplyPreview = (replyTo) => {
    if (!replyTo) return null;
    if (replyTo.messageType === "image") return "📷 Photo";
    if (replyTo.messageType === "file") return `📎 ${replyTo.fileName || "File"}`;
    return replyTo.text;
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={`message-row ${isOwn ? "own" : "other"}`}
      onMouseEnter={() => setShowReplyBtn(true)}
      onMouseLeave={() => setShowReplyBtn(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={rowRef}
      style={{ transform: `translateX(${swipeX}px)`, transition: swipeX === 0 ? "transform 0.2s ease" : "none" }}
    >
      {!isOwn && showAvatar && (
        <div className="message-avatar"><Avatar user={sender} size="sm" /></div>
      )}
      {!isOwn && !showAvatar && <div className="message-avatar-spacer" />}

      {/* Reply button — shown on hover, left side for own, right side for other */}
      {!isOwn && (
        <button
          className={`inline-reply-btn ${showReplyBtn ? "visible" : ""}`}
          onClick={() => onReply?.(message)}
          title="Reply"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      <div className={`bubble-group ${isOwn ? "own" : "other"}`}>
        {!isOwn && sender && showAvatar && (
          <span className="sender-name">{sender.name}</span>
        )}

        <div className={`bubble ${isOwn ? "bubble-own" : "bubble-other"} ${isImage ? "bubble-image" : ""}`}>

          {/* Reply quote inside bubble */}
          {message.replyTo && (
            <div
              className={`reply-quote ${isOwn ? "reply-quote-own" : "reply-quote-other"}`}
              onClick={() => onScrollToMessage?.(message.replyTo.id)}
            >
              <div className="reply-quote-line" />
              <div className="reply-quote-body">
                <span className="reply-quote-sender">{message.replyTo.senderName}</span>
                <span className="reply-quote-text">{getReplyPreview(message.replyTo)}</span>
              </div>
            </div>
          )}

          {isImage && fileUrl && !imgError ? (
            <img
              src={fileUrl}
              alt={message.fileName || "Image"}
              className="msg-image"
              onError={() => setImgError(true)}
              onClick={() => window.open(fileUrl, "_blank")}
            />
          ) : isFile && fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="file-attachment">
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

      {/* Reply button for own messages */}
      {isOwn && (
        <button
          className={`inline-reply-btn own-reply-btn ${showReplyBtn ? "visible" : ""}`}
          onClick={() => onReply?.(message)}
          title="Reply"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MessageBubble;