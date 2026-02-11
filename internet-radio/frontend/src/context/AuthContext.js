'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('radio_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await api.auth.me();
      setUser(data.user);
    } catch (err) {
      localStorage.removeItem('radio_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('radio_token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (username, email, password) => {
    const data = await api.auth.register({ username, email, password });
    localStorage.setItem('radio_token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('radio_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
    } catch (err) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};
