import type { TokenPair } from './types';

export const API_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'campuscare_auth';

export function getSession(): TokenPair | null {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch { return null; }
}
export function saveSession(session: TokenPair | null) {
  if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function invalidateSession() {
  saveSession(null);
  window.dispatchEvent(new Event('campuscare:logout'));
}

async function parseError(response: Response) {
  try {
    const body = await response.json();
    if (Array.isArray(body.detail)) return body.detail.map((item: any) => item.msg).join(', ');
    return body.detail || 'Yêu cầu không thành công';
  } catch { return 'Không thể kết nối đến máy chủ'; }
}

async function refreshSession(): Promise<TokenPair | null> {
  const current = getSession();
  if (!current?.refresh_token) { invalidateSession(); return null; }
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });
    if (!response.ok) { invalidateSession(); return null; }
    const updated = await response.json() as TokenPair;
    saveSession(updated);
    return updated;
  } catch {
    invalidateSession();
    return null;
  }
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const session = getSession();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && retry && await refreshSession()) return api<T>(path, init, false);
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function download(path: string): Promise<Blob> {
  const session = getSession();
  const response = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
  if (!response.ok) throw new ApiError(response.status, await parseError(response));
  return response.blob();
}

export function websocketUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  const path = configured || '/api/ws';
  if (/^wss?:/.test(path)) return path;
  return `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${path}`;
}
