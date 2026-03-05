import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { createSocket, disconnectSocket, getSocket } from "../socket/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("chatToken");
    const savedUser = localStorage.getItem("chatUser");

    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      const newSocket = createSocket(token);
      setSocket(newSocket);
    }
    setLoading(false);
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem("chatToken", token);
    localStorage.setItem("chatUser", JSON.stringify(userData));
    setUser(userData);
    const newSocket = createSocket(token);
    setSocket(newSocket);
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
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
