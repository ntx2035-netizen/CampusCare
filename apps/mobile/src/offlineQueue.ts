import type { QueueItem, ReportPayload } from './types';

export interface QueueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export const QUEUE_KEY = 'campuscare:offline-reports';

export async function readQueue(storage: QueueStorage): Promise<QueueItem[]> {
  try { return JSON.parse(await storage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

export async function enqueue(storage: QueueStorage, payload: ReportPayload, imageUris: string[]): Promise<QueueItem> {
  const queue = await readQueue(storage);
  const item: QueueItem = { id: payload.idempotency_key, payload, imageUris, status: 'WAITING', createdAt: new Date().toISOString() };
  const existing = queue.findIndex((entry) => entry.id === item.id);
  if (existing >= 0) queue[existing] = item; else queue.push(item);
  await storage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return item;
}

export interface SyncResult { synced: number; failed: number; lastError?: string; }

export async function syncQueue(storage: QueueStorage, sender: (item: QueueItem) => Promise<void>): Promise<SyncResult> {
  const queue = await readQueue(storage); let synced = 0; let failed = 0; let lastError: string | undefined; const remaining: QueueItem[] = [];
  for (const item of queue) {
    try { await sender({ ...item, status: 'SYNCING' }); synced += 1; }
    catch (reason) { failed += 1; lastError = reason instanceof Error ? reason.message : 'Không thể đồng bộ'; remaining.push({ ...item, status: 'ERROR', error: lastError }); }
  }
  await storage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed, ...(lastError ? { lastError } : {}) };
}
