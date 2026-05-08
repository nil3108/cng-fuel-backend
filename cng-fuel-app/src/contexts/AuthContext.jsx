import { createContext, useContext, useState, useEffect } from "react";
import { getAuth, setAuth, clearAuth } from "../db/database";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const saved = getAuth();
  const [user, setUser] = useState(() => (saved ? saved.user : null));
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!saved);
  const [role, setRole] = useState(() => (saved ? saved.role : null));
  const [driverInfo, setDriverInfo] = useState(() => (saved ? saved.driverInfo : null));

  useEffect(() => {
    if (isLoggedIn && user) {
      setAuth({ user, role, driverInfo });
    } else {
      clearAuth();
    }
  }, [isLoggedIn, user, role, driverInfo]);

  const login = (userData, userRole) => {
    setUser(userData);
    setIsLoggedIn(true);
    setRole(userRole);
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    setRole(null);
    setDriverInfo(null);
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, role, driverInfo, login, logout, setDriverInfo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
