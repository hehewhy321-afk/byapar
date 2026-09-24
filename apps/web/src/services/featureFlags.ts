import { createSignal } from 'solid-js';
import { supabase } from '../db/auth';

export interface FeatureFlagState {
  key: string;
  name: string;
  category: string;
  enabled: boolean;
}

const [flags, setFlags] = createSignal<Record<string, boolean>>({});

export const featureFlags = flags;

const STORAGE_KEY = 'byapar_feature_flags_cache';

export async function loadFeatureFlags(businessId?: string): Promise<Record<string, boolean>> {
  const flagsMap: Record<string, boolean> = {};

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

    setFlags(flagsMap);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flagsMap));
    return flagsMap;
  } catch (err) {
    console.warn('Feature flags load notice:', err);
  }

  // Fallback to cache or defaults
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      setFlags(parsed);
      return parsed;
    } catch {}
  }

  const defaults: Record<string, boolean> = {
    fonepay_qr_generation: true,
    whatsapp_reminders: true,
    ird_cbms_sync: true,
    advanced_analytics: true,
    webhooks_enabled: false,
  };
  setFlags(defaults);
  return defaults;
}

export function isFeatureActive(key: string): boolean {
  const cur = flags();
  if (key in cur) {
    return cur[key];
  }
  return true; // Default permissive for core features
}
