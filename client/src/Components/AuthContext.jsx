import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);

  const login = (data) => {
    setUserId(data.id); // This should trigger re-renders
    localStorage.setItem("authToken", data.id);
  };

  const logout = () => {
    setUserId(null);
    localStorage.removeItem("authToken");
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem("authToken");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
