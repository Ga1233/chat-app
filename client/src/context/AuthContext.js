import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createSocket, disconnectSocket } from "../socket/socket";
import { initDB, resetDB } from "../storage/indexedDB";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("chatToken");
    const savedUser = localStorage.getItem("chatUser");
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Open this user's own database before anything else
        initDB(parsedUser._id).then(() => {
          setUser(parsedUser);
          const newSocket = createSocket(token);
          setSocket(newSocket);
          setLoading(false);
        });
      } catch (_) {
        localStorage.removeItem("chatToken");
        localStorage.removeItem("chatUser");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (token, userData) => {
    // Open this user's own database on login
    await initDB(userData._id);
    localStorage.setItem("chatToken", token);
    localStorage.setItem("chatUser", JSON.stringify(userData));
    setUser(userData);
    const newSocket = createSocket(token);
    setSocket(newSocket);
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
    resetDB(); // Just closes connection, does NOT delete data
    localStorage.removeItem("chatToken");
    localStorage.removeItem("chatUser");
    setUser(null);
    disconnectSocket();
    setSocket(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("chatUser", JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider value={{ user, socket, loading, authError, setAuthError, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};