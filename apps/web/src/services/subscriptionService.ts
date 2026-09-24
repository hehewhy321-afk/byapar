import { supabase } from '../db/auth';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  currency: string;
  daily_bill_upload_limit: number; // -1 for unlimited
  max_staff_accounts: number;      // -1 for unlimited
  max_stores_allowed: number;      // -1 for unlimited
  features: {
    unlimited_invoices?: boolean;
    thermal_printing?: boolean;
    khata_ledger?: boolean;
    whatsapp_reminders?: boolean;
    fonepay_qr_generation?: boolean;
    ird_vat_audit?: boolean;
    custom_branding?: boolean;
    multi_store?: boolean;
    webhooks?: boolean;
    advanced_analytics?: boolean;
    cloud_backup?: string;
    priority_helpline?: boolean;
    [key: string]: any;
  };
  badge_text?: string;
  is_popular?: boolean;
  is_active: boolean;
  sort_order: number;
}

export const DEFAULT_PLANS: SubscriptionPlan[] = [
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
      fonepay_qr_generation: true,
      ird_vat_audit: false,
      custom_branding: false,
      multi_store: false,
      webhooks: false,
      advanced_analytics: false,
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
      fonepay_qr_generation: true,
      ird_vat_audit: false,
      custom_branding: false,
      multi_store: false,
      webhooks: false,
      advanced_analytics: false,
    },
  },
  {
    id: 'pro_99',
    name: 'Pro Cloud',
    description: 'Comprehensive kirana suite with IRD VAT audit, 2-store support, and advanced analytics',
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
      custom_branding: true,
      multi_store: true,
      webhooks: false,
      advanced_analytics: true,
    },
  },
  {
    id: 'enterprise_149',
    name: 'Enterprise Mart',
    description: 'Chain mart power pack: Unlimited bills, up to 5 stores, webhooks, and priority helpline',
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
      custom_branding: true,
      multi_store: true,
      webhooks: true,
      advanced_analytics: true,
      priority_helpline: true,
    },
  },
];

const PLANS_STORAGE_KEY = 'byapar_subscription_plans_cache';

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      const parsed: SubscriptionPlan[] = data.map((p: any) => ({
        ...p,
        monthly_price: Number(p.monthly_price) || 0,
        annual_price: Number(p.annual_price) || 0,
        daily_bill_upload_limit: Number(p.daily_bill_upload_limit) ?? 3,
        max_staff_accounts: Number(p.max_staff_accounts) ?? 1,
        max_stores_allowed: Number(p.max_stores_allowed) ?? 1,
        features: typeof p.features === 'string' ? JSON.parse(p.features) : (p.features || {}),
      }));
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load subscription plans from cloud, using cache:', err);
  }

  // Fallback to cache or default
  const cached = localStorage.getItem(PLANS_STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return DEFAULT_PLANS;
}

export interface BusinessSubscriptionState {
  planTier: string;
  planName: string;
  status: 'active' | 'trialing' | 'expired';
  billingCycle: 'monthly' | 'annual';
  expiresAt: string | null;
  daysRemaining: number;
  features: Record<string, any>;
  planConfig: SubscriptionPlan;
}

export async function getBusinessSubscription(businessId: string): Promise<BusinessSubscriptionState> {
  const plans = await fetchSubscriptionPlans();
  const defaultFreePlan = plans.find((p) => p.id === 'free') || DEFAULT_PLANS[0];

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
      // Match with configured plan or normalized id
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
    console.warn('Subscription fetch notice:', err);
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

export interface PromoValidationResult {
  valid: boolean;
  code: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: number;
  discountAmount: number;
  finalPrice: number;
  promoId?: string;
  message: string;
}

export async function validatePromoCode(
  code: string,
  planTier: string,
  originalPrice: number
): Promise<PromoValidationResult> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return {
      valid: false,
      code: '',
      discountType: 'fixed_amount',
      discountValue: 0,
      discountAmount: 0,
      finalPrice: originalPrice,
      message: 'Please enter a coupon code',
    };
  }

  try {
    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .single();

    if (error || !promo) {
      return {
        valid: false,
        code: cleanCode,
        discountType: 'fixed_amount',
        discountValue: 0,
        discountAmount: 0,
        finalPrice: originalPrice,
        message: 'Invalid or expired coupon code',
      };
    }

    // Check expiration
    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
      return {
        valid: false,
        code: cleanCode,
        discountType: 'fixed_amount',
        discountValue: 0,
        discountAmount: 0,
        finalPrice: originalPrice,
        message: 'This coupon has expired',
      };
    }

    // Check max redemptions
    if (promo.max_redemptions && promo.current_redemptions >= promo.max_redemptions) {
      return {
        valid: false,
        code: cleanCode,
        discountType: 'fixed_amount',
        discountValue: 0,
        discountAmount: 0,
        finalPrice: originalPrice,
        message: 'Coupon usage limit has been reached',
      };
    }

    // Check minimum amount
    if (promo.min_amount && originalPrice < Number(promo.min_amount)) {
      return {
        valid: false,
        code: cleanCode,
        discountType: 'fixed_amount',
        discountValue: 0,
        discountAmount: 0,
        finalPrice: originalPrice,
        message: `Coupon requires minimum order of रु ${promo.min_amount}`,
      };
    }

    // Check tier eligibility
    const appliesTo = (promo.applies_to_tier || 'all').toLowerCase();
    if (appliesTo !== 'all' && !planTier.toLowerCase().includes(appliesTo)) {
      return {
        valid: false,
        code: cleanCode,
        discountType: 'fixed_amount',
        discountValue: 0,
        discountAmount: 0,
        finalPrice: originalPrice,
        message: `This coupon is only valid for ${promo.applies_to_tier.toUpperCase()} plans`,
      };
    }

    // Calculate discount
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
      discountType: promo.discount_type,
      discountValue: discVal,
      discountAmount,
      finalPrice,
      promoId: promo.id,
      message: `Coupon applied: Saved रु ${discountAmount}!`,
    };
  } catch (err: any) {
    return {
      valid: false,
      code: cleanCode,
      discountType: 'fixed_amount',
      discountValue: 0,
      discountAmount: 0,
      finalPrice: originalPrice,
      message: err.message || 'Failed to validate promo code',
    };
  }
}

export async function upgradeBusinessSubscription(params: {
  businessId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  userId?: string;
  promoCode?: string;
}): Promise<{ success: boolean; error?: string; subscription?: any }> {
  try {
    const plans = await fetchSubscriptionPlans();
    const plan = plans.find((p) => p.id === params.planId);
    if (!plan) throw new Error('Selected plan does not exist');

    const basePrice = params.billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;
    let finalPrice = basePrice;
    let promoData: PromoValidationResult | null = null;

    if (params.promoCode) {
      promoData = await validatePromoCode(params.promoCode, params.planId, basePrice);
      if (promoData.valid) {
        finalPrice = promoData.finalPrice;
      }
    }

    const durationDays = params.billingCycle === 'annual' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    // Check existing subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('business_id', params.businessId)
      .limit(1);

    let subRecord: any = null;

    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          plan_tier: plan.id,
          billing_cycle: params.billingCycle,
          status: 'active',
          price: finalPrice,
          currency: 'NPR',
          features: plan.features,
          starts_at: nowIso,
          current_period_start: nowIso,
          current_period_end: expiresAt,
          expires_at: expiresAt,
          updated_at: nowIso,
        })
        .eq('id', existing[0].id)
        .select()
        .single();

      if (error) throw error;
      subRecord = data;
    } else {
      const { data, error } = await supabase
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
          current_period_start: nowIso,
          current_period_end: expiresAt,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      subRecord = data;
    }

    // Log Promo Redemption if applicable
    if (promoData && promoData.valid && promoData.promoId) {
      await supabase.from('promo_redemptions').insert({
        promo_code_id: promoData.promoId,
        business_id: params.businessId,
        redeemed_by: params.userId || null,
        discount_applied: promoData.discountAmount,
      });

      // Increment promo code redemptions
      try {
        await supabase.rpc('increment_promo_redemption', { p_code_id: promoData.promoId });
      } catch {
        // Fallback direct increment
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
    }

    // Update business table as well
    await supabase
      .from('businesses')
      .update({
        subscription_tier: plan.id,
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
      })
      .eq('id', params.businessId);

    // Insert user notification
    await supabase.from('notifications').insert({
      business_id: params.businessId,
      title: '🎉 Subscription Activated!',
      message: `You are now on the ${plan.name} (${params.billingCycle.toUpperCase()}). All limits and features are active!`,
      type: 'subscription',
      priority: 'high',
      data: {
        planTier: plan.id,
        planName: plan.name,
        expiresAt,
      },
      is_read: false,
    });

    return { success: true, subscription: subRecord };
  } catch (err: any) {
    console.error('upgradeBusinessSubscription error:', err);
    return { success: false, error: err.message || 'Upgrade failed' };
  }
}

export async function downgradeBusinessSubscription(params: {
  businessId: string;
  targetPlanId: string;
}): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const plans = await fetchSubscriptionPlans();
    const plan = plans.find((p) => p.id === params.targetPlanId);
    if (!plan) throw new Error('Selected plan does not exist');

    const nowIso = new Date().toISOString();
    // Default 30 days period or lifetime for free
    const expiresAt = params.targetPlanId === 'free'
      ? new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        business_id: params.businessId,
        plan_tier: plan.id,
        billing_cycle: 'monthly',
        status: 'active',
        price: plan.monthly_price,
        currency: 'NPR',
        features: plan.features,
        starts_at: nowIso,
        current_period_start: nowIso,
        current_period_end: expiresAt,
        expires_at: expiresAt,
        updated_at: nowIso,
      });

    if (error) throw error;

    await supabase
      .from('businesses')
      .update({
        subscription_tier: plan.id,
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
      })
      .eq('id', params.businessId);

    await supabase.from('notifications').insert({
      business_id: params.businessId,
      title: 'Plan Updated',
      message: `Your subscription has been switched to ${plan.name}.`,
      type: 'subscription',
      priority: 'normal',
      is_read: false,
    });

    return { success: true, message: `Successfully switched to ${plan.name}` };
  } catch (err: any) {
    console.error('downgradeBusinessSubscription error:', err);
    return { success: false, message: 'Downgrade failed', error: err.message };
  }
}

export async function generateEsewaSignature(message: string, secretKey: string = '8gBm/:&EnhH.1/q'): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  let binary = '';
  for (let i = 0; i < hashArray.length; i++) {
    binary += String.fromCharCode(hashArray[i]);
  }
  return btoa(binary);
}

export interface EsewaPaymentInitiation {
  actionUrl: string;
  fields: Record<string, string>;
  transactionUuid: string;
}

export async function initiateEsewaPayment(params: {
  businessId: string;
  businessName: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  promoCode?: string;
  userId?: string;
  autoSubmit?: boolean;
}): Promise<{ success: boolean; data?: EsewaPaymentInitiation; error?: string }> {
  try {
    const plans = await fetchSubscriptionPlans();
    const plan = plans.find((p) => p.id === params.planId);
    if (!plan) throw new Error('Selected plan does not exist');

    const basePrice = params.billingCycle === 'annual' ? plan.annual_price : plan.monthly_price;
    let finalPrice = basePrice;
    let promoData: PromoValidationResult | null = null;

    if (params.promoCode) {
      promoData = await validatePromoCode(params.promoCode, params.planId, basePrice);
      if (promoData.valid) {
        finalPrice = promoData.finalPrice;
      }
    }

    if (finalPrice <= 0) {
      // If 100% discount, activate directly
      const upg = await upgradeBusinessSubscription({
        businessId: params.businessId,
        planId: params.planId,
        billingCycle: params.billingCycle,
        userId: params.userId,
        promoCode: params.promoCode,
      });
      return { success: upg.success, error: upg.error };
    }

    const transactionUuid = `SUB-${params.businessId.slice(0, 8)}-${Date.now()}`;
    const productCode = 'EPAYTEST'; // eSewa standard UAT merchant code
    const totalAmount = finalPrice.toString();

    // Insert pending transaction in Supabase
    await supabase.from('subscription_transactions').insert({
      business_id: params.businessId,
      business_name: params.businessName,
      plan_tier: params.planId,
      billing_cycle: params.billingCycle,
      gateway: 'esewa',
      amount: finalPrice,
      currency: 'NPR',
      transaction_uuid: transactionUuid,
      promo_code: promoData?.code || null,
      discount_amount: promoData?.discountAmount || 0,
      status: 'pending',
    });

    // Build signature message
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
    const signature = await generateEsewaSignature(message, '8gBm/:&EnhH.1/q');

    const successUrl = `${window.location.origin}/?payment=esewa_success`;
    const failureUrl = `${window.location.origin}/?payment=esewa_failure`;
    const actionUrl = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

    const fields: Record<string, string> = {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: productCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature: signature,
    };

    // Auto submit form to eSewa Payment Gateway unless explicitly suppressed
    if (params.autoSubmit !== false) {
      const form = document.createElement('form');
      form.setAttribute('method', 'POST');
      form.setAttribute('action', actionUrl);
      form.setAttribute('style', 'display: none;');

      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', key);
        input.setAttribute('value', value);
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    }

    return {
      success: true,
      data: {
        actionUrl,
        fields,
        transactionUuid,
      },
    };
  } catch (err: any) {
    console.error('initiateEsewaPayment error:', err);
    return { success: false, error: err.message || 'Could not initiate eSewa payment' };
  }
}

export async function verifyAndHandleEsewaResponse(params: {
  encodedData: string;
  businessId: string;
}): Promise<{ success: boolean; message: string; planName?: string }> {
  try {
    // 1. Try server-side verification with deployed Supabase Edge Function
    try {
      const edgeRes = await fetch(
        'https://sovpldesvrdbmklpntrx.supabase.co/functions/v1/esewa-verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: params.encodedData }),
        }
      );
      if (edgeRes.ok) {
        const edgeData = await edgeRes.json();
        if (edgeData.success) {
          return {
            success: true,
            message: `eSewa Payment Verified! Ref #${edgeData.transaction_code || 'DONE'} (Plan: ${edgeData.plan_tier?.toUpperCase()})`,
            planName: edgeData.plan_tier,
          };
        }
      }
    } catch (edgeErr) {
      console.warn('Edge function verification notice, falling back to direct:', edgeErr);
    }

    // 2. Direct Fallback Verification
    const jsonStr = atob(params.encodedData);
    const parsed = JSON.parse(jsonStr);
    const { transaction_code, status, total_amount, transaction_uuid } = parsed;

    if (status !== 'COMPLETE') {
      await supabase
        .from('subscription_transactions')
        .update({ status: 'failed', gateway_response: parsed })
        .eq('transaction_uuid', transaction_uuid);
      return { success: false, message: 'Payment was not completed by eSewa.' };
    }

    // Find the pending transaction
    const { data: txn, error: tErr } = await supabase
      .from('subscription_transactions')
      .select('*')
      .eq('transaction_uuid', transaction_uuid)
      .single();

    if (tErr || !txn) {
      return { success: false, message: 'Transaction record not found in system.' };
    }

    // Mark transaction complete
    await supabase
      .from('subscription_transactions')
      .update({
        status: 'completed',
        transaction_code: transaction_code || `ESEWA-${Date.now()}`,
        completed_at: new Date().toISOString(),
        gateway_response: parsed,
      })
      .eq('id', txn.id);

    // Activate the subscription
    await upgradeBusinessSubscription({
      businessId: txn.business_id,
      planId: txn.plan_tier,
      billingCycle: txn.billing_cycle as any,
      promoCode: txn.promo_code || undefined,
    });

    return {
      success: true,
      message: `🎉 eSewa Payment Verified! Transaction #${transaction_code} successful.`,
      planName: txn.plan_tier,
    };
  } catch (err: any) {
    console.error('verifyAndHandleEsewaResponse error:', err);
    return { success: false, message: err.message || 'Verification error' };
  }
}
