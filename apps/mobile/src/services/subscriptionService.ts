import { Linking } from 'react-native';
import CryptoJS from 'crypto-js';
import { supabase } from '../config/supabase';

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
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .order('expires_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      const planTier = data.plan_tier || 'free';
      const matchedPlan = plans.find(
        (p) => p.id === planTier || (planTier.includes('pro') && p.id === 'pro_99') || (planTier.includes('starter') && p.id === 'starter_49') || (planTier.includes('enterprise') && p.id === 'enterprise_149')
      ) || defaultFreePlan;

      let daysRemaining = 30;
      if (data.expires_at || data.current_period_end) {
        const exp = new Date(data.expires_at || data.current_period_end).getTime();
        daysRemaining = Math.max(0, Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24)));
      }

      return {
        planTier,
        planName: matchedPlan.name,
        status: (data.status as any) || (daysRemaining > 0 ? 'active' : 'expired'),
        billingCycle: data.billing_cycle || 'monthly',
        expiresAt: data.expires_at || data.current_period_end,
        daysRemaining,
        features: { ...matchedPlan.features, ...(data.features || {}) },
        planConfig: matchedPlan,
      };
    }
  } catch (err) {
    console.warn('Mobile subscription fetch error:', err);
  }

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

export async function upgradeMobileSubscription(params: {
  businessId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  userId?: string;
  promoCode?: string;
}) {
  try {
    const plans = await fetchMobileSubscriptionPlans();
    const plan = plans.find((p) => p.id === params.planId);
    if (!plan) throw new Error('Selected plan not found');

    const basePrice = params.billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;
    let finalPrice = basePrice;
    let promoData: any = null;

    if (params.promoCode) {
      promoData = await validateMobilePromoCode(params.promoCode, params.planId, basePrice);
      if (promoData.valid) finalPrice = promoData.finalPrice;
    }

    const durationDays = params.billingCycle === 'annual' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('business_id', params.businessId)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('subscriptions')
        .update({
          plan_tier: plan.id,
          billing_cycle: params.billingCycle,
          status: 'active',
          price: finalPrice,
          currency: 'NPR',
          features: plan.features,
          current_period_end: expiresAt,
          expires_at: expiresAt,
          updated_at: nowIso,
        })
        .eq('id', existing[0].id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          business_id: params.businessId,
          plan_tier: plan.id,
          billing_cycle: params.billingCycle,
          status: 'active',
          price: finalPrice,
          currency: 'NPR',
          features: plan.features,
          starts_at: nowIso,
          current_period_end: expiresAt,
          expires_at: expiresAt,
        });
    }

    // Log Promo Redemption if applicable
    if (promoData && promoData.valid && promoData.promoId) {
      await supabase.from('promo_redemptions').insert({
        promo_code_id: promoData.promoId,
        business_id: params.businessId,
        redeemed_by: params.userId || null,
        discount_applied: promoData.discountAmount,
      });

      const { data: curPromo } = await supabase
        .from('promo_codes')
        .select('current_redemptions')
        .eq('id', promoData.promoId)
        .single();
      if (curPromo) {
        await supabase
          .from('promo_codes')
          .update({ current_redemptions: (curPromo.current_redemptions || 0) + 1 })
          .eq('id', promoData.promoId);
      }
    }

    // Log transaction to subscription_transactions for Admin sync
    try {
      await supabase.from('subscription_transactions').insert({
        business_id: params.businessId,
        business_name: 'Mobile App Store',
        plan_tier: plan.id,
        billing_cycle: params.billingCycle,
        gateway: 'esewa_mobile',
        amount: finalPrice,
        currency: 'NPR',
        transaction_uuid: `MOB-SUB-${Date.now()}`,
        promo_code: promoData?.code || null,
        discount_amount: promoData?.discountAmount || 0,
        status: 'success',
      });
    } catch (txErr) {
      console.warn('Mobile transaction log warning:', txErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('upgradeMobileSubscription error:', err);
    return { success: false, error: err.message };
  }
}

export async function downgradeMobileSubscription(params: {
  businessId: string;
  targetPlanId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const plans = await fetchMobileSubscriptionPlans();
    const targetPlan = plans.find((p) => p.id === params.targetPlanId) || DEFAULT_MOBILE_PLANS[0];

    const { error } = await supabase
      .from('businesses')
      .update({
        subscription_plan: targetPlan.id,
        subscription_status: targetPlan.id === 'free' ? 'free' : 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.businessId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to downgrade plan' };
  }
}

export async function initiateMobileEsewaPayment(params: {
  businessId: string;
  businessName: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  promoCode?: string;
  discountAmount?: number;
}): Promise<void> {
  const transactionUuid = `BYAPAR-MOB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const productCode = 'EPAYTEST';
  const totalAmount = params.amount.toString();
  const secretKey = '8gBm/:&EnhH.1/q';

  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const signature = CryptoJS.HmacSHA256(message, secretKey).toString(CryptoJS.enc.Base64);

  const formUrl = `https://rc-epay.esewa.com.np/api/epay/main/v2/form?amount=${totalAmount}&tax_amount=0&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}&product_code=${productCode}&product_service_charge=0&product_delivery_charge=0&success_url=https://byapar.app/esewa-success&failure_url=https://byapar.app/esewa-failure&signed_field_names=total_amount,transaction_uuid,product_code&signature=${encodeURIComponent(signature)}`;

  if (await Linking.canOpenURL(formUrl)) {
    await Linking.openURL(formUrl);
  } else {
    throw new Error('Could not launch payment browser on device');
  }
}

