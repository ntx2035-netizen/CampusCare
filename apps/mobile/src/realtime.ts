import { getApiUrl, getSession } from './api';

type Listener = (event: { event: string; incident_id?: string }) => void;
const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let stopped = true;

function wsUrl(apiUrl: string) {
  if (/^https?:/.test(apiUrl)) return `${apiUrl.replace(/^http/, 'ws')}/ws`;
  if (typeof location !== 'undefined') return `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${apiUrl}/ws`;
  return '';
}

export async function startRealtime() {
  stopped = false; const session = await getSession(); const url = wsUrl(await getApiUrl());
  if (!session || !url || socket) return;
  socket = new WebSocket(url, ['campuscare', session.access_token]);
  socket.onmessage = (message) => { try { const event = JSON.parse(message.data); listeners.forEach((listener) => listener(event)); } catch { /* Bỏ qua payload không hợp lệ. */ } };
  socket.onclose = () => { socket = null; if (!stopped) retryTimer = setTimeout(startRealtime, 3000); };
}

export function stopRealtime() {
  stopped = true; if (retryTimer) clearTimeout(retryTimer); retryTimer = null;
  if (socket) { socket.onclose = null; socket.close(); socket = null; }
}

export function subscribeRealtime(listener: Listener) { listeners.add(listener); return () => { listeners.delete(listener); }; }
