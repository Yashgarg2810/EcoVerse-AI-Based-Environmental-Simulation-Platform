import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = 'http://localhost:5000';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('ecoverse_token'));
  const [loading, setLoading] = useState(true); // true while restoring session

  // ─── Restore session on app load ────────────────────────────────────────────
  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem('ecoverse_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          // Token invalid or expired — clear it
          localStorage.removeItem('ecoverse_token');
          setToken(null);
        }
      } catch {
        // Network error — clear stale token
        localStorage.removeItem('ecoverse_token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  // ─── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (registerData) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed.');
    localStorage.setItem('ecoverse_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password, rememberMe = false }) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');
    localStorage.setItem('ecoverse_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('ecoverse_token');
    setToken(null);
    setUser(null);
  }, []);

  // ─── Authenticated fetch helper ─────────────────────────────────────────────
  const authFetch = useCallback(async (url, options = {}) => {
    const storedToken = localStorage.getItem('ecoverse_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      ...options.headers,
    };
    return fetch(`${API_BASE}${url}`, { ...options, headers });
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook for easy consumption
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
