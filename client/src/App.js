import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import "./styles/global.css";

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="splash-screen">
        <div className="splash-logo">
          <svg viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
            <path d="M12 20 Q20 12 28 20 Q20 28 12 20" fill="currentColor" opacity="0.7" />
          </svg>
          <span>Nexus</span>
        </div>
        <div className="splash-spinner" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <ChatProvider>
      <ChatPage />
    </ChatProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
