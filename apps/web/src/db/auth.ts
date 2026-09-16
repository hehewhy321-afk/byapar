/// <reference types="vite/client" />
import { createSignal } from 'solid-js';
import { createClient, User } from '@supabase/supabase-js';
import { BusinessType } from '@byapar/core';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  businessId?: string;
  businessName: string;
  businessType?: BusinessType;
  phone?: string;
  pan?: string;
  address?: string;
  role: 'owner' | 'cashier' | 'accountant';
  token?: string;
  isGuest?: boolean;
}

// Online Cloud Supabase integration with secure session store
const env = (import.meta as any).env || {};
export const supabaseUrl = env.VITE_SUPABASE_URL || 'https://sovpldesvrdbmklpntrx.supabase.co';
export const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdnBsZGVzdnJkYm1rbHBudHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NjQ2ODgsImV4cCI6MjEwNTA0MDY4OH0.r22hsDzc8K-b9bchv7JPqwn9YZsPkUQ_Ay9Oom7BrT4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const STORAGE_KEY = 'byapar_auth_user';

function getStoredUser(): AuthUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Failed to parse auth user', e);
  }
  return null;
}

export const [currentUser, setCurrentUser] = createSignal<AuthUser | null>(getStoredUser());
export const isAuthenticated = () => !!currentUser();

// Fetch profile & business details for authenticated Supabase user
export async function syncUserBusiness(user: User): Promise<AuthUser> {
  let name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'व्यापारी';
  let businessId = 'a0000000-0000-0000-0000-000000000001';
  let businessName = user.user_metadata?.business_name || 'Shrestha Mart & General Store';
  let businessType: BusinessType = (user.user_metadata?.business_type as BusinessType) || 'general';
  let phone = user.phone || user.user_metadata?.phone || '';
  let pan = user.user_metadata?.pan || '';
  let address = user.user_metadata?.address || '';

  try {
    // 1. Fetch Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile?.full_name) {
      name = profile.full_name;
    }

    // 2. Fetch Business Membership
    const { data: membership } = await supabase
      .from('business_members')
      .select('business_id, role, businesses(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (membership?.business_id) {
      businessId = membership.business_id;
      const biz = (membership as any).businesses;
      if (biz) {
        businessName = biz.name || businessName;
        phone = biz.phone || phone;
        pan = biz.pan_vat_number || pan;
        address = biz.address_line || address;
        if (biz.business_type) {
          businessType = biz.business_type as BusinessType;
        }
      }
    }
  } catch (err) {
    console.warn('Profile/business lookup non-fatal error:', err);
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email || '',
    name,
    businessId,
    businessName,
    businessType,
    phone,
    pan,
    address,
    role: 'owner',
    token: user.app_metadata?.provider,
  };

  setCurrentUser(authUser);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));

  // Sync with localDb to update currentBusiness and hydrate real cloud data
  import('./localDb').then(({ setCurrentBusiness, syncFromCloud, initRealtimeSync }) => {
    setCurrentBusiness({
      id: businessId,
      name: businessName,
      nameEn: businessName,
      ownerName: name,
      phone: phone,
      pan: pan,
      address: address,
      businessType: businessType,
      isVatRegistered: !!pan,
    });
    syncFromCloud();
    initRealtimeSync();
  });

  return authUser;
}

// Listen for Supabase Auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    await syncUserBusiness(session.user);
  } else if (event === 'SIGNED_OUT') {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
    import('./localDb').then(({ resetAllLocalData }) => {
      if (resetAllLocalData) resetAllLocalData();
    });
  }
});

// Check session on load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    syncUserBusiness(session.user);
  }
});

export async function signIn(email: string, pass: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!email || !pass) {
      return { success: false, error: 'Email and password are required' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;

    if (data.user) {
      await syncUserBusiness(data.user);
      return { success: true };
    }
    return { success: false, error: 'User not found' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Authentication failed' };
  }
}

export async function signUp(params: {
  email: string;
  pass: string;
  name: string;
  businessName: string;
  businessType?: BusinessType;
  phone?: string;
  pan?: string;
  address?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.pass,
      options: {
        data: {
          full_name: params.name,
          business_name: params.businessName,
          business_type: params.businessType || 'general',
          phone: params.phone,
          pan: params.pan,
          address: params.address,
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      // Give trigger moment to create business
      setTimeout(async () => {
        if (data.user) await syncUserBusiness(data.user);
      }, 700);
      return { success: true };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration failed' };
  }
}

export async function signOut() {
  await supabase.auth.signOut();
  setCurrentUser(null);
  localStorage.removeItem(STORAGE_KEY);
  import('./localDb').then(({ resetAllLocalData }) => {
    if (resetAllLocalData) resetAllLocalData();
  });
}

export function updateAuthProfile(updates: Partial<AuthUser>) {
  setCurrentUser((prev) => {
    if (!prev) return null;
    const updated = { ...prev, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  });
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = currentUser();
    if (!user || !user.email) {
      return { success: false, error: 'You must be logged in to change your password' };
    }

    if (!oldPassword || !oldPassword.trim()) {
      return { success: false, error: 'Current password is required' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long' };
    }

    if (oldPassword === newPassword) {
      return { success: false, error: 'New password must be different from current password' };
    }

    // Strictly verify old password with Supabase Auth
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInErr) {
      return { success: false, error: 'Incorrect current password. Please try again.' };
    }

    // Now securely update to the new password
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateErr) {
      return { success: false, error: updateErr.message || 'Failed to update password' };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while changing password',
    };
  }
}

