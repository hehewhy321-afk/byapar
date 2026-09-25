/**
 * BYAPAR (व्यापार) - Mobile Offline-First & Sync Outbox Engine
 * Powered by NetInfo and AsyncStorage
 * Manages zero-latency offline persistence, background outbox queue,
 * network connectivity listeners, and Supabase synchronization.
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { storage } from './storage';
import { supabase } from '../config/supabase';

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

export interface OfflineSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
}

const OUTBOX_STORAGE_KEY = 'offline_outbox';

class OfflineSyncService {
  private isOnline = true;
  private isSyncing = false;
  private pendingCount = 0;
  private lastSyncTime: Date | null = null;
  private listeners: ((status: OfflineSyncStatus) => void)[] = [];
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Initial network check
    const netState = await NetInfo.fetch();
    this.isOnline = !!(netState.isConnected && netState.isInternetReachable !== false);

    // 2. Count existing pending items
    const items = await this.loadQueue();
    this.pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'failed').length;
    this.notify();

    // 3. Subscribe to NetInfo network changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      const wasOffline = !this.isOnline;
      this.isOnline = online;
      this.notify();

      if (online && wasOffline) {
        console.log('[Mobile OfflineSync] Network restored. Processing outbox...');
        this.processQueue();
      }
    });
  }

  public subscribe(listener: (status: OfflineSyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getStatus(): OfflineSyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncTime: this.lastSyncTime,
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((l) => {
      try {
        l(status);
      } catch (err) {
        console.warn('[OfflineSync] Error in status listener:', err);
      }
    });
  }

  private async loadQueue(): Promise<OutboxItem[]> {
    return await storage.get<OutboxItem[]>(OUTBOX_STORAGE_KEY, []);
  }

  private async saveQueue(items: OutboxItem[]): Promise<void> {
    await storage.set<OutboxItem[]>(OUTBOX_STORAGE_KEY, items);
    this.pendingCount = items.filter((i) => i.status === 'pending' || i.status === 'failed').length;
    this.notify();
  }

  /**
   * Enqueue a mutation into the offline outbox
   */
  public async enqueue(item: {
    businessId: string;
    action: OutboxActionType;
    table: string;
    payload: any;
  }): Promise<OutboxItem> {
    const queue = await this.loadQueue();
    const newItem: OutboxItem = {
      id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      businessId: item.businessId,
      action: item.action,
      table: item.table,
      payload: item.payload,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    queue.push(newItem);
    await this.saveQueue(queue);

    // If online, immediately try to sync
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }

    return newItem;
  }

  /**
   * Processes all pending mutations in the outbox
   */
  public async processQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    const queue = await this.loadQueue();
    const pendingItems = queue.filter((i) => i.status === 'pending' || i.status === 'failed');

    if (pendingItems.length === 0) {
      this.pendingCount = 0;
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.notify();
    console.log(`[Mobile OfflineSync] Processing ${pendingItems.length} outbox mutations...`);

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        item.attempts += 1;
        item.lastAttemptAt = new Date().toISOString();

        if (item.action === 'UPLOAD_MEDIA') {
          const { bucket = 'receipts', path, base64Data, contentType = 'image/jpeg' } = item.payload;
          if (bucket && path && base64Data) {
            // Convert base64 to ArrayBuffer or decode if necessary
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(path, base64Data, {
                contentType,
                upsert: true,
              });
            if (uploadError) throw uploadError;
          }
        } else if (item.action === 'CREATE') {
          const { error } = await supabase.from(item.table).upsert(item.payload);
          if (error) throw error;
        } else if (item.action === 'UPDATE') {
          const { id, ...updates } = item.payload;
          if (id) {
            const { error } = await supabase.from(item.table).update(updates).eq('id', id);
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
        console.warn(`[Mobile OfflineSync] Failed to process item ${item.id}:`, err);
        item.status = 'failed';
        item.error = err?.message || 'Sync error';
      }
    }

    // Keep failed items or clean up synced
    const remaining = queue.filter((i) => i.status !== 'synced');
    await this.saveQueue(remaining);

    this.isSyncing = false;
    this.lastSyncTime = new Date();
    this.notify();
  }
}

export const offlineSyncService = new OfflineSyncService();
