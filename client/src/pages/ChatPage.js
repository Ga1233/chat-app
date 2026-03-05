import React, { useState } from "react";
import Sidebar from "../components/chat/Sidebar";
import ChatWindow from "../components/chat/ChatWindow";
import { useChat } from "../context/ChatContext";
import "./ChatPage.css";

const ChatPage = () => {
  const { activeConversation } = useChat();
  const [showSidebar, setShowSidebar] = useState(true);

  // On mobile, show either sidebar or chat window
  const handleSelectConversation = () => {
    setShowSidebar(false);
  };

  const handleBack = () => {
    setShowSidebar(true);
  };

  return (
    <div className="chat-page">
      <div className={`chat-sidebar-wrapper ${!showSidebar ? "mobile-hidden" : ""}`}>
        <Sidebar onSelectConversation={handleSelectConversation} />
      </div>
      <div className={`chat-main-wrapper ${showSidebar && !activeConversation ? "mobile-hidden" : ""}`}>
        <ChatWindow onBack={handleBack} />
      </div>
    </div>
  );
};

export default ChatPage;
