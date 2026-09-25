/**
 * BYAPAR (व्यापार) - Web Offline-First & Sync Outbox Engine
 * Manages zero-latency offline persistence, background outbox queue,
 * online/offline network listeners, and cloud synchronization.
 */

import { createSignal } from 'solid-js';
import { supabase } from '../db/auth';
import { currentBusiness } from '../db/localDb';

export type OutboxActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'UPLOAD_MEDIA';

export interface OutboxItem {
  id: string;
  businessId: string;
  action: OutboxActionType;
  table: string;
  payload: any;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  createdAt: string;
}

const OUTBOX_STORAGE_KEY = 'byapar_offline_outbox';

// Reactive signals for UI binding
const initialOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
export const [isOnline, setIsOnline] = createSignal<boolean>(initialOnline);
export const [isSyncing, setIsSyncing] = createSignal<boolean>(false);
export const [pendingCount, setPendingCount] = createSignal<number>(0);
export const [lastSyncTime, setLastSyncTime] = createSignal<Date | null>(null);

function loadOutboxFromStorage(): OutboxItem[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[OfflineSync] Failed to read outbox storage:', err);
    return [];
  }
}

function saveOutboxToStorage(items: OutboxItem[]): void {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
    const pending = items.filter((i) => i.status === 'pending' || i.status === 'failed').length;
    setPendingCount(pending);
  } catch (err) {
    console.error('[OfflineSync] Failed to write outbox storage:', err);
  }
}

/**
 * Enqueue a mutation into the offline outbox
 */
export function enqueueOutbox(item: {
  action: OutboxActionType;
  table: string;
  payload: any;
}): OutboxItem {
  const current = loadOutboxFromStorage();
  const newItem: OutboxItem = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    action: item.action,
    table: item.table,
    payload: item.payload,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
  };

  current.push(newItem);
  saveOutboxToStorage(current);

  // If online, attempt background flush immediately
  if (isOnline() && !isSyncing()) {
    processOutboxQueue();
  }

  return newItem;
}

/**
 * Processes queued items in chronological order
 */
export async function processOutboxQueue(): Promise<void> {
  if (isSyncing() || !isOnline()) return;

  const items = loadOutboxFromStorage();
  const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'failed');

  if (pendingItems.length === 0) {
    setPendingCount(0);
    return;
  }

  setIsSyncing(true);
  console.log(`[OfflineSync] Processing ${pendingItems.length} outbox mutations...`);

  for (const item of pendingItems) {
    try {
      item.status = 'syncing';
      item.attempts += 1;
      item.lastAttemptAt = new Date().toISOString();

      if (item.action === 'UPLOAD_MEDIA') {
        // Upload base64 or blob to receipts storage bucket
        const { bucket = 'receipts', path, fileData } = item.payload;
        if (bucket && path && fileData) {
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(path, fileData, { upsert: true });
          if (uploadError) throw uploadError;
        }
      } else if (item.action === 'CREATE') {
        const { error } = await supabase.from(item.table).upsert(item.payload);
        if (error) throw error;
      } else if (item.action === 'UPDATE') {
        const { id, ...data } = item.payload;
        if (id) {
          const { error } = await supabase.from(item.table).update(data).eq('id', id);
          if (error) throw error;
        }
      } else if (item.action === 'DELETE') {
        const { id } = item.payload;
        if (id) {
          const { error } = await supabase.from(item.table).delete().eq('id', id);
          if (error) throw error;
        }
      }

      item.status = 'synced';
    } catch (err: any) {
      console.warn(`[OfflineSync] Error syncing item ${item.id}:`, err);
      item.status = 'failed';
      item.error = err?.message || 'Sync failed';
    }
  }

  // Retain recent failed or clean up synced older items
  const updatedItems = items.filter((i) => i.status !== 'synced');
  saveOutboxToStorage(updatedItems);

  setIsSyncing(false);
  setLastSyncTime(new Date());
}

/**
 * Initialize network connection listener and start periodic sync check
 */
export function initOfflineSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    console.log('[OfflineSync] Connection restored. Flushing outbox...');
    setIsOnline(true);
    processOutboxQueue();
  };

  const handleOffline = () => {
    console.log('[OfflineSync] Connection lost. Operating in zero-latency offline mode.');
    setIsOnline(false);
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial count load
  const initialItems = loadOutboxFromStorage();
  const initialPending = initialItems.filter(
    (i) => i.status === 'pending' || i.status === 'failed'
  ).length;
  setPendingCount(initialPending);

  // Periodic flush every 60 seconds if online
  const interval = setInterval(() => {
    if (isOnline() && !isSyncing()) {
      processOutboxQueue();
    }
  }, 60000);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    clearInterval(interval);
  };
}
