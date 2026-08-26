import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getSession, saveSession } from './api';
import type { AccountType, RegistrationResult, Session, User } from './types';

interface AuthValue { user: User | null; ready: boolean; login(email: string, password: string): Promise<void>; requestRegistration(fullName: string, email: string, password: string, accountType: AccountType): Promise<void>; verifyRegistration(email: string, code: string): Promise<RegistrationResult>; logout(): Promise<void>; refreshUser(): Promise<void>; }
const Context = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(false);
  useEffect(() => { getSession().then((session) => setUser(session?.user || null)).finally(() => setReady(true)); }, []);
  const value = useMemo<AuthValue>(() => ({ user, ready,
    async login(email, password) { const session = await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); await saveSession(session); setUser(session.user); },
    async requestRegistration(fullName, email, password, accountType) { await api('/auth/register/request-otp', { method: 'POST', body: JSON.stringify({ full_name: fullName, email, password, account_type: accountType }) }); },
    async verifyRegistration(email, code) { const result = await api<RegistrationResult>('/auth/register/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) }); if (result.session) { await saveSession(result.session); setUser(result.session.user); } return result; },
    async logout() { const session = await getSession(); try { if (session) await api('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) }); } finally { await saveSession(null); setUser(null); } },
    async refreshUser() { const next = await api<User>('/auth/me'); const session = await getSession(); if (session) await saveSession({ ...session, user: next }); setUser(next); },
  }), [ready, user]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('Thiếu AuthProvider'); return value; }
