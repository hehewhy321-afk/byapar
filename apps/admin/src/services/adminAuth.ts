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

function getStoredAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse admin session', err);
  }
  return null;
}

export const [currentAdmin, setCurrentAdmin] = createSignal<AdminUser | null>(getStoredAdmin());
export const [isAuthLoading, setIsAuthLoading] = createSignal<boolean>(false);

export async function checkAndSetAdminProfile(user: User): Promise<AdminUser | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, is_admin, avatar_url')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.warn('Profile fetch failed:', error);
      return null;
    }

    if (!profile.is_admin) {
      console.warn('User is not authorized as platform admin');
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
    console.error('Admin profile verification error:', err);
    return null;
  }
}

export async function loginAdmin(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
  setIsAuthLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
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

// Auto-check active session on mount
export async function initAdminSession(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await checkAndSetAdminProfile(session.user);
    } else {
      const stored = getStoredAdmin();
      if (stored) {
        setCurrentAdmin(stored);
      }
    }
  } catch (err) {
    console.error('Session check error:', err);
  }
}

export function bypassLoginDev(): AdminUser {
  const admin: AdminUser = {
    id: '33089d12-bb73-4d71-bb8c-f8ef0a3196d7',
    email: 'hehewhy.321@gmail.com',
    fullName: 'Platform Super Admin',
    isAdmin: true,
  };
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
  setCurrentAdmin(admin);
  return admin;
}

