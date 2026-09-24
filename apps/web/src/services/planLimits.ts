import { supabase } from '../db/auth';
import { getBusinessSubscription } from './subscriptionService';

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  limitDisplay: string;
  planName: string;
  planTier: string;
  message?: string;
}

/**
 * Checks if the business can upload another bill image today
 */
export async function checkBillUploadLimit(businessId: string): Promise<LimitCheckResult> {
  const sub = await getBusinessSubscription(businessId);
  const limit = sub.planConfig.daily_bill_upload_limit;

  // Unlimited
  if (limit === -1) {
    return {
      allowed: true,
      current: 0,
      limit: -1,
      limitDisplay: 'Unlimited',
      planName: sub.planName,
      planTier: sub.planTier,
    };
  }

  // Count bills created today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  try {
    const { count, error } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('created_at', startOfDay.toISOString());

    const currentCount = count || 0;
    const allowed = currentCount < limit;

    return {
      allowed,
      current: currentCount,
      limit,
      limitDisplay: `${limit} bills / day`,
      planName: sub.planName,
      planTier: sub.planTier,
      message: allowed
        ? undefined
        : `Daily upload limit reached (${currentCount}/${limit} bills today). Upgrade to Starter or Pro for higher limits!`,
    };
  } catch (err) {
    console.warn('Bill limit count error:', err);
    return {
      allowed: true,
      current: 0,
      limit,
      limitDisplay: `${limit} bills / day`,
      planName: sub.planName,
      planTier: sub.planTier,
    };
  }
}

/**
 * Checks if the business can invite/add another staff member
 */
export async function checkStaffLimit(businessId: string, currentStaffCount: number): Promise<LimitCheckResult> {
  const sub = await getBusinessSubscription(businessId);
  const limit = sub.planConfig.max_staff_accounts;

  if (limit === -1) {
    return {
      allowed: true,
      current: currentStaffCount,
      limit: -1,
      limitDisplay: 'Unlimited',
      planName: sub.planName,
      planTier: sub.planTier,
    };
  }

  const allowed = currentStaffCount < limit;
  return {
    allowed,
    current: currentStaffCount,
    limit,
    limitDisplay: `${limit} staff seats`,
    planName: sub.planName,
    planTier: sub.planTier,
    message: allowed
      ? undefined
      : `Staff account limit reached (${currentStaffCount}/${limit} staff seats used). Upgrade to add more staff!`,
  };
}

/**
 * Checks if the user can create an additional store/branch in their account
 */
export async function checkStoreLimit(currentStoreCount: number, activePlanTier?: string): Promise<LimitCheckResult> {
  // If planTier not passed, default to standard tier
  const tier = activePlanTier || 'free';
  let limit = 1;
  let planName = 'Free Tier';

  if (tier.includes('enterprise')) {
    limit = 5;
    planName = 'Enterprise Mart';
  } else if (tier.includes('pro')) {
    limit = 2;
    planName = 'Pro Cloud';
  } else if (tier.includes('starter')) {
    limit = 1;
    planName = 'Starter Plan';
  }

  const allowed = currentStoreCount < limit;
  return {
    allowed,
    current: currentStoreCount,
    limit,
    limitDisplay: `${limit} store${limit > 1 ? 's' : ''}`,
    planName,
    planTier: tier,
    message: allowed
      ? undefined
      : `Store branch limit reached (${currentStoreCount}/${limit} stores). Upgrade to Pro (2 stores) or Enterprise (5 stores) to add more branches!`,
  };
}
