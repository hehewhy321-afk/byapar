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

const PENDING_OTP_EMAIL_KEY = 'byapar_pending_otp_email';
export const [pendingOtpEmail, _setPendingOtpEmail] = createSignal<string>(
  typeof window !== 'undefined' ? localStorage.getItem(PENDING_OTP_EMAIL_KEY) || '' : ''
);
export function setPendingOtpEmail(email: string) {
  _setPendingOtpEmail(email);
  if (typeof window !== 'undefined') {
    if (email) {
      localStorage.setItem(PENDING_OTP_EMAIL_KEY, email);
    } else {
      localStorage.removeItem(PENDING_OTP_EMAIL_KEY);
    }
  }
}


export interface UserStoreMembership {
  businessId: string;
  businessName: string;
  phone?: string;
  pan?: string;
  address?: string;
  role: string;
  businessType?: BusinessType;
  planTier?: string;
}

export const [userStores, setUserStores] = createSignal<UserStoreMembership[]>([]);
export const [showCreateStoreModal, setShowCreateStoreModal] = createSignal(false);

// Fetch profile & business details for authenticated Supabase user
export async function syncUserBusiness(user: User): Promise<AuthUser | null> {
  const isConfirmed = !!(user.email_confirmed_at || (user as any)?.confirmed_at);
  if (!isConfirmed) {
    console.warn('[Auth] Cannot sync business: Email verification required for user', user.email);
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }

  let name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'व्यापारी';
  let businessId = 'a0000000-0000-0000-0000-000000000001';
  let businessName = user.user_metadata?.business_name || '';
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

    // 2. Fetch All Business Memberships for Multi-Store Support
    const { data: memberships } = await supabase
      .from('business_members')
      .select('business_id, role, businesses(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (memberships && memberships.length > 0) {
      const stores: UserStoreMembership[] = memberships.map((m: any) => {
        const b = m.businesses;
        return {
          businessId: m.business_id,
          businessName: b?.name || 'My Store',
          phone: b?.phone || '',
          pan: b?.pan_vat_number || '',
          address: b?.address_line || '',
          role: m.role || 'owner',
          businessType: b?.business_type as BusinessType,
        };
      });
      setUserStores(stores);

      // Check if user has an existing selected store
      const storedActiveBizId = localStorage.getItem('byapar_selected_biz_id');
      const activeMembership = (storedActiveBizId && memberships.find((m: any) => m.business_id === storedActiveBizId)) || memberships[0];

      businessId = activeMembership.business_id;
      const biz = (activeMembership as any).businesses;
      if (biz) {
        businessName = biz.name || businessName;
        phone = biz.phone || phone;
        pan = biz.pan_vat_number || pan;
        address = biz.address_line || address;
        if (biz.owner_name) {
          name = biz.owner_name;
        }
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
  import('./localDb').then(({ currentBusiness, setCurrentBusiness, syncFromCloud, initRealtimeSync }) => {
    setCurrentBusiness((prev) => ({
      ...prev,
      id: businessId,
      name: businessName,
      nameEn: businessName,
      ownerName: name,
      phone: phone,
      pan: pan,
      address: address,
      businessType: businessType,
      isVatRegistered: !!pan,
    }));
    localStorage.setItem('byapar_current_business', JSON.stringify(currentBusiness));
    syncFromCloud();
    initRealtimeSync(businessId);
  });

  return authUser;
}

export async function switchUserStore(targetBusinessId: string) {
  const store = userStores().find((s) => s.businessId === targetBusinessId);
  if (!store) return;

  localStorage.setItem('byapar_selected_biz_id', targetBusinessId);

  // Update current user
  setCurrentUser((prev) => (prev ? { ...prev, businessId: targetBusinessId, businessName: store.businessName } : null));

  // Sync with localDb
  const { currentBusiness, setCurrentBusiness, syncFromCloud, initRealtimeSync } = await import('./localDb');
  setCurrentBusiness((prev) => ({
    ...prev,
    id: targetBusinessId,
    name: store.businessName,
    nameEn: store.businessName,
    phone: store.phone || prev.phone,
    pan: store.pan || prev.pan,
    address: store.address || prev.address,
    businessType: store.businessType || prev.businessType,
    isVatRegistered: !!store.pan,
  }));
  localStorage.setItem('byapar_current_business', JSON.stringify(currentBusiness));
  syncFromCloud();
  initRealtimeSync(targetBusinessId);
}

export async function createNewUserStore(params: {
  name: string;
  phone?: string;
  pan?: string;
  address?: string;
  businessType?: BusinessType;
}): Promise<{ success: boolean; businessId?: string; error?: string }> {
  try {
    const user = currentUser();
    if (!user) throw new Error('You must be signed in to create an additional store');

    // 1. Create Business in Supabase
    const { data: newBiz, error: bErr } = await supabase
      .from('businesses')
      .insert({
        name: params.name,
        owner_name: user.name,
        phone: params.phone || user.phone,
        pan_vat_number: params.pan,
        address_line: params.address,
        business_type: params.businessType || 'general',
      })
      .select()
      .single();

    if (bErr || !newBiz) throw bErr || new Error('Failed to create store record');

    // 2. Add Business Member (owner)
    const { error: mErr } = await supabase.from('business_members').insert({
      business_id: newBiz.id,
      user_id: user.id,
      role: 'owner',
    });
    if (mErr) console.warn('Member link warning:', mErr);

    // 3. Create initial Subscription
    await supabase.from('subscriptions').insert({
      business_id: newBiz.id,
      plan_tier: 'free',
      status: 'active',
      price: 0,
      currency: 'NPR',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // 4. Update user stores list
    const newStore: UserStoreMembership = {
      businessId: newBiz.id,
      businessName: newBiz.name,
      phone: newBiz.phone,
      pan: newBiz.pan_vat_number,
      address: newBiz.address_line,
      role: 'owner',
      businessType: newBiz.business_type,
    };
    setUserStores((prev) => [...prev, newStore]);

    // 5. Switch to the newly created store
    await switchUserStore(newBiz.id);

    return { success: true, businessId: newBiz.id };
  } catch (err: any) {
    console.error('createNewUserStore error:', err);
    return { success: false, error: err.message || 'Failed to create new store' };
  }
}


// Listen for Supabase Auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  const isConfirmed = !!(session?.user?.email_confirmed_at || (session?.user as any)?.confirmed_at);
  if (event === 'SIGNED_IN' && session?.user && isConfirmed) {
    await syncUserBusiness(session.user);
  } else if (event === 'SIGNED_OUT' || (session?.user && !isConfirmed)) {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY);
    if (event === 'SIGNED_OUT') {
      import('./localDb').then(({ resetAllLocalData }) => {
        if (resetAllLocalData) resetAllLocalData();
      });
    }
  }
});

// Handle custom domain token_hash email verification on load (?token_hash=...&type=email|signup)
if (typeof window !== 'undefined' && window.location) {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenHash = urlParams.get('token_hash');
  const type = (urlParams.get('type') || 'email') as any;
  if (tokenHash) {
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ data, error }) => {
      const url = new URL(window.location.href);
      url.searchParams.delete('token_hash');
      url.searchParams.delete('type');
      window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
      if (!error && data.user) {
        syncUserBusiness(data.user);
      }
    });
  }
}

// Check session on load
supabase.auth.getSession().then(({ data: { session } }) => {
  const isConfirmed = !!(session?.user?.email_confirmed_at || (session?.user as any)?.confirmed_at);
  if (session?.user && isConfirmed) {
    syncUserBusiness(session.user);
  } else {
    // If unverified or no active Supabase session, clear any stale stored user
    const stored = getStoredUser();
    if (stored && !stored.isGuest) {
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
});

export async function signIn(
  email: string,
  pass: string
): Promise<{ success: boolean; needsVerification?: boolean; error?: string }> {
  try {
    if (!email || !pass) {
      return { success: false, error: 'Email and password are required' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      if (error.message?.toLowerCase().includes('email not confirmed')) {
        setPendingOtpEmail(email.trim());
        return {
          success: false,
          needsVerification: true,
          error: 'Your email is not verified yet. Please enter the 6-digit verification code sent to your email.',
        };
      }
      throw error;
    }

    if (data.user) {
      const isConfirmed = !!(data.user.email_confirmed_at || (data.user as any)?.confirmed_at);
      if (!isConfirmed) {
        await supabase.auth.signOut();
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEY);
        setPendingOtpEmail(email.trim());
        return {
          success: false,
          needsVerification: true,
          error: 'Your email is not verified yet. Please enter the 6-digit verification code sent to your email before logging in.',
        };
      }
      setPendingOtpEmail('');
      await syncUserBusiness(data.user);
      return { success: true };
    }
    return { success: false, error: 'User not found' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Authentication failed' };
  }
}

/**
 * Resolves the authentication redirect URL following standard 12-factor principles:
 * 1. Build-time/Deploy-time environment variable (e.g. VITE_AUTH_REDIRECT_URL in Cloudflare Pages / CI)
 * 2. Active browser origin (automatically adapts to localhost, preview deploys, or production)
 * 3. Returns undefined if running outside a browser, allowing Supabase's configured Site URL to be the single source of truth.
 */
export function getAuthRedirectUrl(): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_REDIRECT_URL) {
    return import.meta.env.VITE_AUTH_REDIRECT_URL;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return undefined;
}

export async function signUp(params: {
  email: string;
  pass: string;
  name: string;
  businessName: string;
  phone: string;
  businessType?: BusinessType;
  pan?: string;
  address?: string;
}): Promise<{ success: boolean; needsVerification?: boolean; error?: string }> {
  try {
    if (!params.phone || !params.phone.trim()) {
      return { success: false, error: 'Mobile phone number is compulsory for account registration' };
    }
    const cleanPhone = params.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile phone number' };
    }

    const redirectUrl = getAuthRedirectUrl();

    const { data, error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.pass,
      options: {
        ...(redirectUrl ? { emailRedirectTo: redirectUrl } : {}),
        data: {
          full_name: params.name,
          business_name: params.businessName,
          business_type: params.businessType || 'general',
          phone: params.phone.trim(),
          pan: params.pan,
          address: params.address,
        },
      },
    });

    if (error) throw error;

    // Check if email confirmation is required
    const isConfirmed = !!(data.user?.email_confirmed_at || (data.user as any)?.confirmed_at || data.session);

    if (isConfirmed && data.user) {
      // Auto-confirmed user (e.g. if email confirmation is disabled)
      setPendingOtpEmail('');
      setTimeout(async () => {
        if (data.user) await syncUserBusiness(data.user);
      }, 700);
      return { success: true, needsVerification: false };
    }

    // Email verification required: store pending OTP email and DO NOT log the user in!
    setPendingOtpEmail(params.email.trim());
    return { success: true, needsVerification: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration failed' };
  }
}

/**
 * Verifies email using 6-digit OTP code sent by Supabase
 */
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim();
    const cleanToken = token.trim().replace(/\s+/g, '');
    if (!cleanEmail) {
      return { success: false, error: 'Email address is required' };
    }
    if (!cleanToken || cleanToken.length !== 6) {
      return { success: false, error: 'Please enter a valid 6-digit verification code' };
    }

    // Try 'signup' verification type first
    let res = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    // If 'signup' fails with type mismatch, try 'email'
    if (res.error && (res.error.message?.toLowerCase().includes('type') || res.error.message?.toLowerCase().includes('invalid'))) {
      const fallbackRes = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });
      if (!fallbackRes.error) {
        res = fallbackRes;
      }
    }

    if (res.error) throw res.error;

    if (res.data?.user) {
      setPendingOtpEmail('');
      await syncUserBusiness(res.data.user);
      return { success: true };
    }
    return { success: false, error: 'Verification failed. Please check the code and try again.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Invalid or expired verification code' };
  }
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim();
    if (!cleanEmail) return { success: false, error: 'Email is required' };

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resend verification code' };
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

