import { useState, createContext, useContext, ReactNode } from 'react';

export type UserRole = 'citizen' | 'officer' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: number | null;
  language_pref?: string;
  phone?: string;
  points: number;
}

interface LoginResult {
  ok: boolean;
  role?: UserRole;
  message?: string;
  notFound?: boolean; // true when email doesn't exist in the DB
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = async (identifier: string, password: string): Promise<LoginResult> => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const url = baseUrl ? `${baseUrl}/api/login` : '/api/login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        const loggedInUser: AuthUser = data.user;
        setUser(loggedInUser);
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
        localStorage.setItem('token', data.token);
        if (loggedInUser.language_pref) {
          localStorage.setItem('i18nextLng', loggedInUser.language_pref);
        }
        return { ok: true, role: loggedInUser.role };
      }

      // Surface granular error types to the UI
      const isNotFound = res.status === 404;
      return { ok: false, message: data.message || 'Login failed', notFound: isNotFound };
    } catch {
      return { ok: false, message: 'Network error. Is the server running?' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const updatedUserData = await res.json();
        setUser(updatedUserData);
        localStorage.setItem('user', JSON.stringify(updatedUserData));
      }
    } catch (err) {
      console.error('Refresh User Error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isAuthenticated: !!user && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
