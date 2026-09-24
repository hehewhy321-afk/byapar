import { Linking } from 'react-native';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

export interface MobileSubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  currency: string;
  daily_bill_upload_limit: number;
  max_staff_accounts: number;
  max_stores_allowed: number;
  features: {
    unlimited_invoices?: boolean;
    thermal_printing?: boolean;
    khata_ledger?: boolean;
    whatsapp_reminders?: boolean;
    fonepay_qr_generation?: boolean;
    ird_vat_audit?: boolean;
    advanced_analytics?: boolean;
    custom_branding?: boolean;
    multi_store?: boolean;
    webhooks?: boolean;
    [key: string]: any;
  };
  badge_text?: string;
  is_popular?: boolean;
  is_active: boolean;
  sort_order: number;
}

export const DEFAULT_MOBILE_PLANS: MobileSubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Tier',
    description: 'Perfect for small local dukans starting digital ledger and basic invoicing',
    monthly_price: 0,
    annual_price: 0,
    currency: 'NPR',
    daily_bill_upload_limit: 3,
    max_staff_accounts: 1,
    max_stores_allowed: 1,
    badge_text: 'Free Forever',
    is_popular: false,
    is_active: true,
    sort_order: 1,
    features: {
      unlimited_invoices: true,
      thermal_printing: true,
      khata_ledger: true,
      whatsapp_reminders: false,
      fonepay_qr_generation: false,
      ird_vat_audit: false,
      advanced_analytics: false,
      custom_branding: false,
      multi_store: false,
      webhooks: false,
    },
  },
  {
    id: 'starter_49',
    name: 'Starter Plan',
    description: 'For growing grocery and kirana stores needing automated WhatsApp reminders and 2 staff seats',
    monthly_price: 49,
    annual_price: 499,
    currency: 'NPR',
    daily_bill_upload_limit: 15,
    max_staff_accounts: 2,
    max_stores_allowed: 1,
    badge_text: 'Basic Value',
    is_popular: false,
    is_active: true,
    sort_order: 2,
    features: {
      unlimited_invoices: true,
      thermal_printing: true,
      khata_ledger: true,
      whatsapp_reminders: true,
      fonepay_qr_generation: false,
      ird_vat_audit: false,
      advanced_analytics: false,
      custom_branding: false,
      multi_store: false,
      webhooks: false,
    },
  },
  {
    id: 'pro_99',
    name: 'Pro Cloud',
    description: 'Comprehensive kirana suite with Dynamic Fonepay QR, IRD VAT audit, and 2-store support',
    monthly_price: 99,
    annual_price: 999,
    currency: 'NPR',
    daily_bill_upload_limit: 50,
    max_staff_accounts: 5,
    max_stores_allowed: 2,
    badge_text: 'Most Popular',
    is_popular: true,
    is_active: true,
    sort_order: 3,
    features: {
      unlimited_invoices: true,
      thermal_printing: true,
      khata_ledger: true,
      whatsapp_reminders: true,
      fonepay_qr_generation: true,
      ird_vat_audit: true,
      advanced_analytics: true,
      custom_branding: true,
      multi_store: true,
      webhooks: false,
    },
  },
  {
    id: 'enterprise_149',
    name: 'Enterprise Mart',
    description: 'Chain mart power pack: Unlimited bills, Advanced Analytics, up to 5 stores, and webhooks',
    monthly_price: 149,
    annual_price: 1499,
    currency: 'NPR',
    daily_bill_upload_limit: -1,
    max_staff_accounts: -1,
    max_stores_allowed: 5,
    badge_text: 'Enterprise Power',
    is_popular: false,
    is_active: true,
    sort_order: 4,
    features: {
      unlimited_invoices: true,
      thermal_printing: true,
      khata_ledger: true,
      whatsapp_reminders: true,
      fonepay_qr_generation: true,
      ird_vat_audit: true,
      advanced_analytics: true,
      custom_branding: true,
      multi_store: true,
      webhooks: true,
      priority_helpline: true,
    },
  },
];

export async function fetchMobileSubscriptionPlans(): Promise<MobileSubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((p: any) => ({
        ...p,
        monthly_price: Number(p.monthly_price) || 0,
        annual_price: Number(p.annual_price) || 0,
        daily_bill_upload_limit: Number(p.daily_bill_upload_limit) ?? 3,
        max_staff_accounts: Number(p.max_staff_accounts) ?? 1,
        max_stores_allowed: Number(p.max_stores_allowed) ?? 1,
        features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || {}),
      }));
    }
  } catch (err) {
    console.warn('Failed to load subscription plans from Supabase:', err);
  }
  return DEFAULT_MOBILE_PLANS;
}

export interface MobileSubscriptionState {
  planTier: string;
  planName: string;
  status: 'active' | 'trialing' | 'expired';
  billingCycle: 'monthly' | 'annual';
  expiresAt: string | null;
  daysRemaining: number;
  features: Record<string, any>;
  planConfig: MobileSubscriptionPlan;
}

export async function getMobileSubscription(businessId: string): Promise<MobileSubscriptionState> {
  const plans = await fetchMobileSubscriptionPlans();
  const defaultFreePlan = plans.find((p) => p.id === 'free') || DEFAULT_MOBILE_PLANS[0];

  try {
    // 1. Check businesses table (the primary source of truth for business license status)
    const { data: bizData } = await supabase
      .from('businesses')
      .select('subscription_tier, subscription_status, subscription_expires_at, name')
      .eq('id', businessId)
      .maybeSingle();

    // 2. Check subscriptions table for details
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawTier = bizData?.subscription_tier || subData?.plan_tier || 'free';
    const planTier = rawTier.toLowerCase().trim();

    const matchedPlan = plans.find(
      (p) =>
        p.id === planTier ||
        (planTier.includes('enterprise') && p.id === 'enterprise_149') ||
        (planTier.includes('pro') && p.id === 'pro_99') ||
        (planTier.includes('starter') && p.id === 'starter_49')
    ) || defaultFreePlan;

    const expiresAtStr = bizData?.subscription_expires_at || subData?.expires_at || subData?.current_period_end;
    let daysRemaining = 30;
    if (expiresAtStr) {
      const exp = new Date(expiresAtStr).getTime();
      daysRemaining = Math.max(0, Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24)));
    } else if (matchedPlan.id === 'free') {
      daysRemaining = 999;
    }

    const liveStatus = bizData?.subscription_status || subData?.status || 'active';

    return {
      planTier: matchedPlan.id,
      planName: matchedPlan.name,
      status: liveStatus === 'cancelled' ? 'expired' : daysRemaining > 0 ? 'active' : 'expired',
      billingCycle: subData?.billing_cycle || 'monthly',
      expiresAt: expiresAtStr || null,
      daysRemaining,
      features: { ...matchedPlan.features, ...(subData?.features || {}) },
      planConfig: matchedPlan,
    };
  } catch (err) {
    console.warn('Mobile subscription fetch error:', err);
    return {
      planTier: 'free',
      planName: defaultFreePlan.name,
      status: 'active',
      billingCycle: 'monthly',
      expiresAt: null,
      daysRemaining: 999,
      features: defaultFreePlan.features,
      planConfig: defaultFreePlan,
    };
  }
}

export async function validateMobilePromoCode(code: string, planTier: string, originalPrice: number) {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, discountAmount: 0, finalPrice: originalPrice, message: 'Please enter a coupon code' };
  }

  try {
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .single();

    if (error || !promo) {
      return { valid: false, discountAmount: 0, finalPrice: originalPrice, message: 'Invalid or expired coupon code' };
    }

    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
      return { valid: false, discountAmount: 0, finalPrice: originalPrice, message: 'This coupon has expired' };
    }

    if (promo.max_redemptions && promo.current_redemptions >= promo.max_redemptions) {
      return { valid: false, discountAmount: 0, finalPrice: originalPrice, message: 'Coupon usage limit reached' };
    }

    const discVal = Number(promo.discount_value) || 0;
    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = Math.round((originalPrice * discVal) / 100);
    } else {
      discountAmount = Math.min(originalPrice, discVal);
    }
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return {
      valid: true,
      code: promo.code,
      discountAmount,
      finalPrice,
      promoId: promo.id,
      message: `Coupon applied: Saved रु ${discountAmount}!`,
    };
  } catch (err: any) {
    return { valid: false, discountAmount: 0, finalPrice: originalPrice, message: err.message || 'Validation failed' };
  }
}

export interface MobileEsewaPaymentSession {
  formUrl: string;
  htmlForm: string;
  transactionUuid: string;
  amount: number;
  planId: string;
  billingCycle: 'monthly' | 'annual';
}

/**
 * Initiates an industrial-grade eSewa payment on Mobile:
 * - Confidential keys & signatures remain 100% inside Supabase Secrets (Backend)
 * - Server verifies authoritative plan pricing and promo codes
 * - Returns pre-signed auto-submitting POST HTML form for in-app WebView
 */
export async function initiateMobileEsewaPayment(params: {
  businessId: string;
  businessName: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  amount?: number;
  promoCode?: string;
  discountAmount?: number;
}): Promise<MobileEsewaPaymentSession> {
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/esewa-verify`;
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      action: 'initiate',
      business_id: params.businessId,
      plan_id: params.planId,
      billing_cycle: params.billingCycle,
      promo_code: params.promoCode,
      platform: 'mobile',
    }),
  });

  const res = await response.json();
  if (!response.ok || !res.success) {
    throw new Error(res.error || 'Failed to initiate secure eSewa payment session');
  }

  return {
    formUrl: res.action_url || '',
    htmlForm: res.html_form || '',
    transactionUuid: res.transaction_uuid || '',
    amount: res.amount ?? (params.amount || 0),
    planId: res.plan_id || params.planId,
    billingCycle: res.billing_cycle || params.billingCycle,
  };
}

/**
 * Verifies mobile eSewa payment via Supabase Edge Function
 */
export async function verifyMobileEsewaPayment(
  data: string,
  transactionUuid?: string,
  businessId?: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const cleanUuid = (transactionUuid || '').split('?')[0].split('&')[0].trim();
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/esewa-verify`;
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'verify',
        data: data || '',
        transaction_uuid: cleanUuid,
        transactionUuid: cleanUuid,
        business_id: businessId,
        businessId,
      }),
    });

    const res = await response.json();
    if (!response.ok || !res.success) {
      return { success: false, message: res.error || 'eSewa payment verification failed' };
    }

    return { success: true, message: 'Payment successfully verified!', data: res };
  } catch (err: any) {
    console.error('verifyMobileEsewaPayment error:', err);
    return { success: false, message: err.message || 'Network error verifying eSewa payment' };
  }
}

/**
 * Cancels mobile eSewa payment via Supabase Edge Function so status doesn't stay pending
 */
export async function cancelMobileEsewaPayment(
  transactionUuid: string,
  reason?: string,
  businessId?: string
): Promise<{ success: boolean }> {
  try {
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/esewa-verify`;
    await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'cancel',
        transaction_uuid: transactionUuid,
        transactionUuid,
        business_id: businessId,
        businessId,
        reason: reason || 'Cancelled on mobile app',
      }),
    });
    return { success: true };
  } catch (err) {
    console.warn('cancelMobileEsewaPayment error:', err);
    return { success: false };
  }
}

export interface MobileSubscriptionTransactionRecord {
  id: string;
  business_id: string;
  plan_tier: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  gateway: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transaction_uuid: string;
  transaction_code?: string;
  gateway_response?: any;
  created_at: string;
}

export async function fetchMobileSubscriptionHistory(
  businessId: string
): Promise<MobileSubscriptionTransactionRecord[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_transactions')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return (data || []) as MobileSubscriptionTransactionRecord[];
  } catch (err) {
    console.warn('fetchMobileSubscriptionHistory error:', err);
    return [];
  }
}

export async function downgradeMobileSubscription(params: {
  businessId: string;
  targetPlanId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const plans = await fetchMobileSubscriptionPlans();
    const targetPlan = plans.find((p) => p.id === params.targetPlanId) || DEFAULT_MOBILE_PLANS[0];

    // 1. Update businesses table (subscription_tier is the actual DB column)
    const { error: bizErr } = await supabase
      .from('businesses')
      .update({
        subscription_tier: targetPlan.id,
        subscription_status: targetPlan.id === 'free' ? 'free' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.businessId);

    if (bizErr) throw bizErr;

    // 2. Update subscriptions table
    await supabase
      .from('subscriptions')
      .update({
        plan_tier: targetPlan.id,
        status: targetPlan.id === 'free' ? 'free' : 'active',
        features: targetPlan.features,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', params.businessId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to downgrade plan' };
  }
}

/**
 * Free plan activation without gateway
 */
export async function activateFreeMobileSubscription(params: {
  businessId: string;
}): Promise<{ success: boolean; error?: string }> {
  return downgradeMobileSubscription({
    businessId: params.businessId,
    targetPlanId: 'free',
  });
}


