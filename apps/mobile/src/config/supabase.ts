import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sovpldesvrdbmklpntrx.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdnBsZGVzdnJkYm1rbHBudHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NjQ2ODgsImV4cCI6MjEwNTA0MDY4OH0.r22hsDzc8K-b9bchv7JPqwn9YZsPkUQ_Ay9Oom7BrT4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
