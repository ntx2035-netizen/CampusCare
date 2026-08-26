import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { sendQueuedReport } from './api';
import { enqueue, readQueue, syncQueue } from './offlineQueue';
import type { ReportPayload } from './types';

let syncing = false;

export async function persistImages(uris: string[], key: string): Promise<string[]> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return uris;
  const directory = `${FileSystem.documentDirectory}offline-reports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const saved: string[] = [];
  for (let index = 0; index < uris.length; index += 1) {
    const extension = uris[index].split('.').pop()?.split('?')[0] || 'jpg';
    const target = `${directory}${key}-${index}.${extension}`;
    await FileSystem.copyAsync({ from: uris[index], to: target }); saved.push(target);
  }
  return saved;
}

export async function queueReport(payload: ReportPayload, imageUris: string[]) {
  const durableUris = await persistImages(imageUris, payload.idempotency_key);
  return enqueue(AsyncStorage, payload, durableUris);
}

export async function runSync() {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  try { return await syncQueue(AsyncStorage, sendQueuedReport); } finally { syncing = false; }
}

export function watchConnectivity(onChange?: () => void) {
  return NetInfo.addEventListener(async (state) => {
    if (state.isConnected && (await readQueue(AsyncStorage)).length) { await runSync(); onChange?.(); }
  });
}

export const offlineStorage = AsyncStorage;

