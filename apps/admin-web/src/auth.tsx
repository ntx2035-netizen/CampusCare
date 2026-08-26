import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getSession, saveSession } from './api';
import type { AccountType, RegistrationResult, TokenPair, User } from './types';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  requestRegistration: (fullName: string, email: string, password: string, accountType: AccountType) => Promise<void>;
  verifyRegistration: (email: string, code: string) => Promise<RegistrationResult>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getSession()?.user ?? null);

  useEffect(() => {
    const clear = () => setUser(null);
    window.addEventListener('campuscare:logout', clear);
    return () => window.removeEventListener('campuscare:logout', clear);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    async login(email, password) {
      const session = await api<TokenPair>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      saveSession(session);
      setUser(session.user);
    },
    async requestRegistration(fullName, email, password, accountType) {
      await api('/auth/register/request-otp', {
        method: 'POST', body: JSON.stringify({ full_name: fullName, email, password, account_type: accountType }),
      });
    },
    async verifyRegistration(email, code) {
      const result = await api<RegistrationResult>('/auth/register/verify-otp', {
        method: 'POST', body: JSON.stringify({ email, code }),
      });
      if (result.session) { saveSession(result.session); setUser(result.session.user); }
      return result;
    },
    async logout() {
      const session = getSession();
      try {
        if (session) await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) });
      } finally { saveSession(null); setUser(null); }
    },
    setUser(next) {
      const session = getSession();
      if (session) saveSession({ ...session, user: next });
      setUser(next);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth phải được dùng trong AuthProvider');
  return value;
}
