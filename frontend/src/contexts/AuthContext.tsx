import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { authService } from '../services/auth.service';

export type UserRole = 'SUPER_ADMIN' | 'BRANCH_ADMIN' | 'STUDENT';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
  studentId?: string;
  branchId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem('user');
      const token = sessionStorage.getItem('token');
      if (saved && token) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved user', e);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const logoutTimerRef = useRef<number | null>(null);

  const clearAutoLogout = () => {
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const parseTokenExpiry = (token: string): number | null => {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (decoded && decoded.exp) return decoded.exp * 1000; // exp is in seconds
      return null;
    } catch (e) {
      return null;
    }
  };

  const scheduleAutoLogout = (token: string) => {
    clearAutoLogout();
    const exp = parseTokenExpiry(token);
    if (!exp) return;
    const ms = exp - Date.now();
    if (ms <= 0) {
      authService.logout();
      setUser(null);
      return;
    }
    logoutTimerRef.current = window.setTimeout(() => {
      authService.logout();
      setUser(null);
      window.location.href = '/auth/login';
    }, ms + 500);
  };

  // Validate existing token on mount and refresh user state
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    let mounted = true;
    setIsLoading(true);
    authService
      .getMe()
      .then((res: any) => {
        if (!mounted) return;
        if (res && res.success) {
          const profile = res.data as any;
          // If the access token contains branchId (set for BRANCH_ADMIN), attach it to profile
          try {
            const payload = token.split('.')[1];
            const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            if (decoded && decoded.branchId && !profile.branchId) profile.branchId = decoded.branchId;
          } catch (e) {
            // ignore
          }
          setUser(profile);
          scheduleAutoLogout(token);
        } else {
          authService.logout();
          setUser(null);
        }
      })
      .catch(() => {
        if (!mounted) return;
        authService.logout();
        setUser(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

      const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login(identifier, password);
      setUser(response.data.user);
      const token = sessionStorage.getItem('token');
      if (token) scheduleAutoLogout(token);
      setIsLoading(false);
      return response;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    clearAutoLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
