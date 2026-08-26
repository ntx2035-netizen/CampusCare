import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Incident, QueueItem, Session } from './types';

const localFallback = Platform.OS === 'web'
  ? '/api'
  : Platform.OS === 'android'
    ? 'http://10.0.2.2/api'
    : 'http://localhost/api';
const configured = process.env.EXPO_PUBLIC_API_URL || localFallback;
export const API_URL = configured.replace(/\/$/, '');
export const SESSION_KEY = 'campuscare:session';

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function getSession(): Promise<Session | null> {
  try { return JSON.parse(await AsyncStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export async function saveSession(session: Session | null) {
  if (session) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)); else await AsyncStorage.removeItem(SESSION_KEY);
}

async function errorMessage(response: Response) {
  try {
    const body = await response.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail) && body.detail.length) {
      const issue = body.detail[0] as { loc?: unknown[]; msg?: string; ctx?: { min_length?: number } };
      const field = String(issue.loc?.at(-1) || 'dữ liệu');
      const labels: Record<string, string> = {
        full_name: 'Họ và tên', email: 'Email', password: 'Mật khẩu',
        account_type: 'Loại tài khoản', code: 'Mã OTP',
      };
      if (issue.ctx?.min_length) return `${labels[field] || field} phải có tối thiểu ${issue.ctx.min_length} ký tự`;
      const message = (issue.msg || 'không hợp lệ').replace(/^Value error,\s*/i, '');
      return `${labels[field] || field}: ${message}`;
    }
    return 'Dữ liệu không hợp lệ';
  }
  catch { return 'Không thể kết nối máy chủ'; }
}

async function refresh(): Promise<Session | null> {
  const current = await getSession(); if (!current) return null;
  const response = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: current.refresh_token }) });
  if (!response.ok) { await saveSession(null); return null; }
  const next = await response.json() as Session; await saveSession(next); return next;
}

export async function api<T>(path: string, init: RequestInit = {}, canRetry = true): Promise<T> {
  const session = await getSession(); const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (response.status === 401 && canRetry && await refresh()) return api<T>(path, init, false);
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return response.json() as Promise<T>;
}

export async function sendQueuedReport(item: QueueItem): Promise<void> {
  const incident = await api<Incident>('/incidents', { method: 'POST', body: JSON.stringify(item.payload) });
  for (let index = 0; index < item.imageUris.length; index += 1) {
    const uri = item.imageUris[index]; const body = new FormData(); body.append('kind', 'REPORT');
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob(); body.append('file', blob, `bao-cao-${index + 1}.jpg`);
    } else {
      body.append('file', { uri, name: `bao-cao-${index + 1}.jpg`, type: 'image/jpeg' } as unknown as Blob);
    }
    await api(`/incidents/${incident.id}/images`, { method: 'POST', body });
  }
}
