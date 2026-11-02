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
export const API_URL_KEY = 'campuscare:api-url';

export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function getSession(): Promise<Session | null> {
  try { return JSON.parse(await AsyncStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}
export async function saveSession(session: Session | null) {
  if (session) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)); else await AsyncStorage.removeItem(SESSION_KEY);
}

export function normalizeApiUrl(value: string): string {
  let url = value.trim().replace(/\/$/, '');
  if (!url) throw new Error('Vui lòng nhập địa chỉ máy chủ');
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  if (!/\/api$/i.test(url)) url = `${url}/api`;
  try { new URL(url); } catch { throw new Error('Địa chỉ máy chủ không hợp lệ'); }
  return url;
}

export async function getApiUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem(API_URL_KEY);
  return saved || API_URL;
}

export async function setApiUrl(value: string): Promise<string> {
  const normalized = normalizeApiUrl(value);
  await AsyncStorage.setItem(API_URL_KEY, normalized);
  return normalized;
}

export async function checkApiHealth(value?: string): Promise<string> {
  const url = value ? normalizeApiUrl(value) : await getApiUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${url}/health`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Máy chủ phản hồi lỗi ${response.status}`);
    return url;
  } catch (reason) {
    if (reason instanceof Error && reason.name === 'AbortError') throw new Error('Máy chủ không phản hồi sau 6 giây');
    throw new Error(reason instanceof Error ? reason.message : 'Không thể kết nối máy chủ');
  } finally { clearTimeout(timer); }
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
  const baseUrl = await getApiUrl();
  const response = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: current.refresh_token }) });
  if (!response.ok) { await saveSession(null); return null; }
  const next = await response.json() as Session; await saveSession(next); return next;
}

export async function api<T>(path: string, init: RequestInit = {}, canRetry = true): Promise<T> {
  const session = await getSession(); const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`);
  const baseUrl = await getApiUrl();
  let response: Response;
  try { response = await fetch(`${baseUrl}${path}`, { ...init, headers }); }
  catch { throw new ApiError(0, 'Không kết nối được máy chủ. Hãy kiểm tra Docker, IP máy tính và mục Máy chủ demo.'); }
  if (response.status === 401 && canRetry && await refresh()) return api<T>(path, init, false);
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return response.json() as Promise<T>;
}

function imageMetadata(uri: string, index: number) {
  const dataMime = uri.match(/^data:(image\/(?:jpeg|png|webp));/i)?.[1]?.toLowerCase();
  const extension = uri.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  const type = dataMime || (extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg');
  const suffix = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return { type, name: `bao-cao-${index + 1}.${suffix}` };
}

function uploadErrorMessage(body: string, status: number): string {
  try {
    const payload = JSON.parse(body) as { detail?: string };
    if (typeof payload.detail === 'string') return payload.detail;
  } catch { /* Phản hồi không phải JSON. */ }
  return `Máy chủ từ chối ảnh (HTTP ${status})`;
}

async function uploadNativeImage(
  incidentId: string,
  uri: string,
  file: ReturnType<typeof imageMetadata>,
  canRetry = true,
): Promise<void> {
  const session = await getSession();
  const baseUrl = await getApiUrl();
  const FileSystem = await import('expo-file-system/legacy');
  let result: Awaited<ReturnType<typeof FileSystem.uploadAsync>>;
  try {
    result = await FileSystem.uploadAsync(`${baseUrl}/incidents/${incidentId}/images`, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: file.type,
      parameters: { kind: 'REPORT' },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : 'không rõ nguyên nhân';
    throw new ApiError(0, `Không tải được ảnh lên máy chủ: ${detail}`);
  }
  if (result.status === 401 && canRetry && await refresh()) {
    return uploadNativeImage(incidentId, uri, file, false);
  }
  if (result.status < 200 || result.status >= 300) {
    throw new ApiError(result.status, uploadErrorMessage(result.body, result.status));
  }
}

export async function sendQueuedReport(item: QueueItem): Promise<void> {
  const incident = await api<Incident>('/incidents', { method: 'POST', body: JSON.stringify(item.payload) });
  if (item.payload.latitude != null && item.payload.longitude != null) {
    try {
      await api('/users/me/location', { method: 'PATCH', body: JSON.stringify({ latitude: item.payload.latitude, longitude: item.payload.longitude }) });
    } catch { /* Báo cáo vẫn phải đồng bộ được nếu cập nhật vị trí thiết bị lỗi. */ }
  }
  for (let index = 0; index < item.imageUris.length; index += 1) {
    const uri = item.imageUris[index]; const file = imageMetadata(uri, index); const body = new FormData(); body.append('kind', 'REPORT');
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob(); body.append('file', blob, file.name);
      await api(`/incidents/${incident.id}/images`, { method: 'POST', body });
    } else {
      // FileSystem dùng uploader native ổn định hơn fetch + FormData với file:// trên iOS/Android.
      await uploadNativeImage(incident.id, uri, file);
    }
  }
}
