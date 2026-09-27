/// <reference types="vite/client" />
import { createSignal } from 'solid-js';
import { createClient, User } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
export const supabaseUrl = env.VITE_SUPABASE_URL || 'https://sovpldesvrdbmklpntrx.supabase.co';
export const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdnBsZGVzdnJkYm1rbHBudHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NjQ2ODgsImV4cCI6MjEwNTA0MDY4OH0.r22hsDzc8K-b9bchv7JPqwn9YZsPkUQ_Ay9Oom7BrT4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  avatarUrl?: string;
}

const ADMIN_STORAGE_KEY = 'byapar_admin_session';

export const [currentAdmin, setCurrentAdmin] = createSignal<AdminUser | null>(null);
export const [isAuthLoading, setIsAuthLoading] = createSignal<boolean>(false);
export const [isInitializingSession, setIsInitializingSession] = createSignal<boolean>(true);

export async function checkAndSetAdminProfile(user: User): Promise<AdminUser | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, is_admin, avatar_url')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.warn('[AdminSecurity] Profile fetch failed or not found:', error?.message);
      return null;
    }

    if (!profile.is_admin) {
      console.warn('[AdminSecurity] Unauthorized access attempt: Account is not a platform admin:', user.id);
      return null;
    }

    const admin: AdminUser = {
      id: user.id,
      email: user.email || '',
      fullName: profile.full_name || user.email?.split('@')[0] || 'Admin',
      isAdmin: true,
      avatarUrl: profile.avatar_url || '',
    };

    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
    setCurrentAdmin(admin);
    return admin;
  } catch (err) {
    console.error('[AdminSecurity] Admin profile verification error:', err);
    return null;
  }
}

export async function loginAdmin(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
  setIsAuthLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });

    if (error || !data.user) {
      setIsAuthLoading(false);
      return { success: false, error: error?.message || 'Authentication failed' };
    }

    const admin = await checkAndSetAdminProfile(data.user);
    setIsAuthLoading(false);

    if (!admin) {
      await supabase.auth.signOut();
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      setCurrentAdmin(null);
      return { success: false, error: 'Access denied: Your account is not configured as a Platform Admin.' };
    }

    return { success: true };
  } catch (err: any) {
    setIsAuthLoading(false);
    return { success: false, error: err.message || 'Unexpected login error' };
  }
}

export async function logoutAdmin(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // Ignore error
  }
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  setCurrentAdmin(null);
}

// Auto-check active session cryptographically on mount
export async function initAdminSession(): Promise<void> {
  setIsInitializingSession(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const admin = await checkAndSetAdminProfile(session.user);
      if (!admin) {
        // Logged in with Supabase but not an admin -> kick out
        await supabase.auth.signOut();
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        setCurrentAdmin(null);
      }
    } else {
      // No active JWT session -> wipe any stale/spoofed local storage
      localStorage.removeItem(ADMIN_STORAGE_KEY);
      setCurrentAdmin(null);
    }
  } catch (err) {
    console.error('[AdminSecurity] Session check error:', err);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setCurrentAdmin(null);
  } finally {
    setIsInitializingSession(false);
  }
}

// Listen to auth state transitions
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setCurrentAdmin(null);
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.user) {
      await checkAndSetAdminProfile(session.user);
    }
  }
});

