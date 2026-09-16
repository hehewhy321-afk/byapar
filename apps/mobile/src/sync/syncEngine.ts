import { synchronize } from '@nozbe/watermelondb/sync';
import { Database } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import { SUPABASE_URL } from '../config/supabase';

const SUPABASE_SYNC_URL = `${SUPABASE_URL}/functions/v1`;

export async function syncMobileDatabase(database: Database, businessId: string) {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    console.log('[Byapar Sync] Offline, skipping cloud synchronization.');
    return;
  }

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt, schemaVersion, migration }) => {
      const response = await fetch(`${SUPABASE_SYNC_URL}/sync-pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          last_pulled_at: lastPulledAt,
          schema_version: schemaVersion,
        }),
      });

      if (!response.ok) {
        throw new Error(`[Byapar Sync Pull Failed]: ${response.statusText}`);
      }

      const { changes, timestamp } = await response.json();
      return { changes, timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt }) => {
      const response = await fetch(`${SUPABASE_SYNC_URL}/sync-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          changes,
        }),
      });

      if (!response.ok) {
        throw new Error(`[Byapar Sync Push Failed]: ${response.statusText}`);
      }
    },
  });
}
