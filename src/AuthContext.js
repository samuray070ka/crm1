import React, { createContext, useContext, useState, useCallback } from 'react';
import API from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem('datasite_user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const login = useCallback(async (email, password) => {
    const res = await API.login(email, password);
    const u = res.user;
    localStorage.setItem('datasite_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const res = await API.register(data);
    const u = res.user;
    localStorage.setItem('datasite_user', JSON.stringify(u));
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('datasite_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
