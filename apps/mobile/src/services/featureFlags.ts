import { supabase } from '../config/supabase';
import { storage } from './storage';

export interface MobileFeatureFlagState {
  key: string;
  name: string;
  category: string;
  enabled: boolean;
}

let activeFlags: Record<string, boolean> = {
  whatsapp_reminders: true,
  ird_cbms_sync: true,
  webhooks_enabled: false,
};

const STORAGE_KEY = 'byapar_feature_flags_cache';

export async function loadMobileFeatureFlags(businessId?: string): Promise<Record<string, boolean>> {
  const flagsMap: Record<string, boolean> = { ...activeFlags };

  try {
    // 1. Fetch global feature flags
    const { data: globalFlags, error: gErr } = await supabase
      .from('feature_flags')
      .select('key, default_enabled');

    if (!gErr && globalFlags) {
      for (const f of globalFlags) {
        flagsMap[f.key] = f.default_enabled ?? false;
      }
    }

    // 2. Fetch business overrides if businessId provided
    if (businessId) {
      const { data: overrides, error: oErr } = await supabase
        .from('business_feature_overrides')
        .select('feature_key, enabled')
        .eq('business_id', businessId);

      if (!oErr && overrides) {
        for (const o of overrides) {
          flagsMap[o.feature_key] = o.enabled;
        }
      }
    }

    activeFlags = flagsMap;
    await storage.set(STORAGE_KEY, flagsMap);
    return flagsMap;
  } catch (err) {
    console.warn('Feature flags load notice:', err);
  }

  // Fallback to cached flags
  const cached = await storage.get<Record<string, boolean>>(STORAGE_KEY, {});
  if (cached && Object.keys(cached).length > 0) {
    activeFlags = { ...activeFlags, ...cached };
    return activeFlags;
  }

  return activeFlags;
}

export function isMobileFeatureActive(key: string): boolean {
  if (key in activeFlags) {
    return activeFlags[key];
  }
  return true; // Default permissive
}
