import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [business, setBusiness] = useState(() => user?.business || null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize and verify session on initial load
  const verifySession = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setBusiness(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await authService.getMe();
      setUser(data.user);
      setBusiness(data.business);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthError(null);
    } catch {
      setUser(null);
      setBusiness(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();

    // Listen to session expired events dispatched by Axios interceptor
    const handleSessionExpired = () => {
      setUser(null);
      setBusiness(null);
      setAuthError('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [verifySession]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      setBusiness(result.user.business || null);
      return result;
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
      throw err;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setBusiness(null);
    setAuthError(null);
  };

  const value = {
    user,
    business,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isStaff: user?.role === 'STAFF',
    isLoading,
    authError,
    login,
    logout,
    refreshUser: verifySession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
