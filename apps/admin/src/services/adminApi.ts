import { supabase } from './adminAuth';

export interface ShopSummary {
  id: string;
  name: string;
  panNumber?: string;
  address?: string;
  phone?: string;
  businessType?: string;
  createdAt: string;
  ownerName?: string;
  ownerEmail?: string;
  planTier: string;
  subscriptionStatus: string;
  expiresAt?: string;
  daysRemaining?: number;
  totalInvoices?: number;
}

export interface OverviewMetrics {
  totalShops: number;
  activeShops: number;
  totalProfiles: number;
  totalInvoices: number;
  totalGmv: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  expiredSubscriptions: number;
  totalNotificationsSent: number;
}

export interface BroadcastLog {
  id: string;
  title: string;
  message: string;
  targetSegment: string;
  category: string;
  priority: string;
  sentCount: number;
  createdAt: string;
  adminEmail?: string;
}

export interface SubscriptionItem {
  id: string;
  businessId: string;
  businessName: string;
  planTier: string;
  status: string;
  billingCycle: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  daysRemaining?: number;
  autoRenew: boolean;
}

export interface AutomationResult {
  runAt: string;
  triggersExecuted: number;
  notificationsCreated: number;
  details: string[];
}

export async function getAdminOverview(): Promise<OverviewMetrics> {
  try {
    // 1. Total Businesses
    const { count: totalShops } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });

    // 2. Total Invoices & GMV
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('total_amount');

    const totalInvoices = invoiceData ? invoiceData.length : 0;
    const totalGmv = invoiceData
      ? invoiceData.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0)
      : 0;

    // 3. Subscriptions
    const { data: subs } = await supabase.from('subscriptions').select('*');
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let activeSubs = 0;
    let expiringSubs = 0;
    let expiredSubs = 0;

    (subs || []).forEach((s) => {
      const end = s.current_period_end ? new Date(s.current_period_end) : null;
      if (s.status === 'active' || s.status === 'trialing') {
        activeSubs++;
        if (end && end <= sevenDaysLater && end >= now) {
          expiringSubs++;
        }
      } else if (s.status === 'expired' || (end && end < now)) {
        expiredSubs++;
      }
    });

    // 4. Total Profiles
    const { count: totalProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // 5. Total notifications sent
    const { count: totalNotifs } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    return {
      totalShops: totalShops || 0,
      activeShops: activeSubs || totalShops || 0,
      totalProfiles: totalProfiles || 0,
      totalInvoices,
      totalGmv,
      activeSubscriptions: activeSubs,
      expiringSubscriptions: expiringSubs,
      expiredSubscriptions: expiredSubs,
      totalNotificationsSent: totalNotifs || 0,
    };
  } catch (err) {
    console.error('getAdminOverview error:', err);
    return {
      totalShops: 0,
      activeShops: 0,
      totalProfiles: 0,
      totalInvoices: 0,
      totalGmv: 0,
      activeSubscriptions: 0,
      expiringSubscriptions: 0,
      expiredSubscriptions: 0,
      totalNotificationsSent: 0,
    };
  }
}

export async function getShopsList(): Promise<ShopSummary[]> {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        pan_vat_number,
        address_line,
        phone,
        business_type,
        created_at,
        owner_name,
        subscriptions (
          plan_tier,
          status,
          current_period_end
        )
      `)
      .order('created_at', { ascending: false });

    if (error || !businesses) {
      console.warn('Error fetching businesses:', error);
      return [];
    }

    return businesses.map((b: any) => {
      const sub = b.subscriptions && b.subscriptions.length > 0 ? b.subscriptions[0] : null;
      const planTier = sub?.plan_tier || 'free';
      const status = sub?.status || 'active';
      const expiresAt = sub?.current_period_end;
      
      let daysRemaining: number | undefined = undefined;
      if (expiresAt) {
        const diffMs = new Date(expiresAt).getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        id: b.id,
        name: b.name,
        panNumber: b.pan_vat_number || 'N/A',
        address: b.address_line || 'Nepal',
        phone: b.phone || 'N/A',
        businessType: b.business_type || 'General Kirana',
        createdAt: b.created_at,
        ownerName: b.owner_name || 'Owner',
        planTier,
        subscriptionStatus: status,
        expiresAt,
        daysRemaining,
      };
    });
  } catch (err) {
    console.error('getShopsList error:', err);
    return [];
  }
}

export async function updateShopSubscription(
  businessId: string,
  planTier: 'free' | 'pro' | 'enterprise',
  status: 'active' | 'trialing' | 'expired' | 'canceled',
  extendDays: number = 30
): Promise<{ success: boolean; error?: string }> {
  try {
    const newEnd = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('business_id', businessId)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('subscriptions')
        .update({
          plan_tier: planTier,
          status: status,
          current_period_end: newEnd,
          expires_at: newEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
    } else {
      await supabase.from('subscriptions').insert({
        business_id: businessId,
        plan_tier: planTier,
        status: status,
        current_period_start: new Date().toISOString(),
        starts_at: new Date().toISOString(),
        current_period_end: newEnd,
        expires_at: newEnd,
      });
    }

    // Also send confirmation notification to the shop!
    await supabase.from('notifications').insert({
      business_id: businessId,
      title: '🎉 Subscription Updated',
      message: `Your Byapar plan has been set to ${planTier.toUpperCase()} (${status.toUpperCase()}) valid for ${extendDays} days.`,
      type: 'system',
      priority: 'high',
      data: { planTier, status, extendDays },
      is_read: false,
    });

    return { success: true };
  } catch (err: any) {
    console.error('updateShopSubscription error:', err);
    return { success: false, error: err.message || 'Failed to update subscription' };
  }
}

export async function getSubscriptionsList(): Promise<SubscriptionItem[]> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        business_id,
        plan_tier,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        auto_renew,
        businesses (
          name
        )
      `)
      .order('current_period_end', { ascending: true });

    if (error || !data) return [];

    return data.map((s: any) => {
      let daysRemaining: number | undefined = undefined;
      if (s.current_period_end) {
        const diffMs = new Date(s.current_period_end).getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        id: s.id,
        businessId: s.business_id,
        businessName: s.businesses?.name || 'Unnamed Shop',
        planTier: s.plan_tier,
        status: s.status,
        billingCycle: s.billing_cycle || 'monthly',
        currentPeriodStart: s.current_period_start,
        currentPeriodEnd: s.current_period_end,
        daysRemaining,
        autoRenew: s.auto_renew ?? true,
      };
    });
  } catch (err) {
    console.error('getSubscriptionsList error:', err);
    return [];
  }
}

export function getFirebaseConfig(): {
  projectId: string;
  projectNumber: string;
  status: string;
  analyticsEnabled: boolean;
} {
  return {
    projectId: 'byapar-nepal',
    projectNumber: '773315724478',
    status: 'Active (Direct Firebase)',
    analyticsEnabled: true,
  };
}

export async function sendAdminBroadcast(
  adminId: string,
  title: string,
  message: string,
  targetSegment: 'all' | 'free' | 'pro' | 'expiring',
  category: 'announcement' | 'offer' | 'system_alert' | 'maintenance',
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    // 1. Fetch recipient businesses according to segment
    let businessQuery = supabase.from('businesses').select('id, name');
    const { data: businesses, error: bizErr } = await businessQuery;

    if (bizErr || !businesses) {
      return { success: false, sentCount: 0, error: bizErr?.message || 'Failed to fetch businesses' };
    }

    let targetBusinessIds: string[] = [];

    if (targetSegment === 'all') {
      targetBusinessIds = businesses.map((b) => b.id);
      const defaultId = 'a0000000-0000-0000-0000-000000000001';
      if (!targetBusinessIds.includes(defaultId)) {
        targetBusinessIds.push(defaultId);
      }
    } else {
      const { data: subs } = await supabase.from('subscriptions').select('business_id, plan_tier, status, current_period_end');
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      const subMap = new Map((subs || []).map((s) => [s.business_id, s]));

      targetBusinessIds = businesses
        .filter((b) => {
          const s = subMap.get(b.id);
          if (targetSegment === 'free') {
            return !s || s.plan_tier === 'free';
          }
          if (targetSegment === 'pro') {
            return s && s.plan_tier === 'pro' && s.status === 'active';
          }
          if (targetSegment === 'expiring') {
            if (!s || !s.current_period_end) return false;
            const diff = new Date(s.current_period_end).getTime() - now;
            return diff > 0 && diff <= sevenDaysMs;
          }
          return false;
        })
        .map((b) => b.id);
    }

    // 2. Insert into admin_broadcasts
    const { data: broadcastRecord, error: bErr } = await supabase
      .from('admin_broadcasts')
      .insert({
        sent_by: adminId,
        title,
        message,
        target_audience: targetSegment,
        category,
        recipient_count: targetBusinessIds.length,
      })
      .select('id')
      .single();

    if (bErr) {
      console.warn('admin_broadcast insert warning:', bErr);
    }

    const broadcastId = broadcastRecord?.id || 'manual_broadcast';

    // 3. Fan out to notifications table for each business
    if (targetBusinessIds.length > 0) {
      const notifsToInsert = targetBusinessIds.map((bId) => ({
        business_id: bId,
        title,
        message,
        type: 'admin_broadcast',
        priority,
        data: {
          broadcast_id: broadcastId,
          category,
          source: 'admin_console',
        },
        is_read: false,
      }));

      // Insert in chunks of 50
      for (let i = 0; i < notifsToInsert.length; i += 50) {
        const chunk = notifsToInsert.slice(i, i + 50);
        await supabase.from('notifications').insert(chunk);
      }
    }

    return { success: true, sentCount: targetBusinessIds.length };
  } catch (err: any) {
    console.error('sendAdminBroadcast error:', err);
    return { success: false, sentCount: 0, error: err.message };
  }
}

export async function getBroadcastHistory(): Promise<BroadcastLog[]> {
  try {
    const { data, error } = await supabase
      .from('admin_broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((b: any) => ({
      id: b.id,
      title: b.title,
      message: b.message,
      targetSegment: b.target_audience || 'all',
      category: b.category,
      priority: 'normal',
      sentCount: b.recipient_count || 0,
      createdAt: b.created_at,
    }));
  } catch (err) {
    console.error('getBroadcastHistory error:', err);
    return [];
  }
}

/**
 * Automation Engine:
 * Scans subscriptions and shop health to trigger intelligent automated reminders.
 */
export async function runAutomationsEngine(): Promise<AutomationResult> {
  const result: AutomationResult = {
    runAt: new Date().toLocaleTimeString(),
    triggersExecuted: 0,
    notificationsCreated: 0,
    details: [],
  };

  try {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('id, business_id, plan_tier, status, current_period_end, businesses(name)');

    if (!subs || subs.length === 0) {
      result.details.push('No active subscriptions found to evaluate.');
      return result;
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const notifs: any[] = [];

    // Rule 1: 7-day subscription expiration warning
    result.triggersExecuted++;
    const expiring7 = subs.filter((s) => {
      if (!s.current_period_end || s.status !== 'active') return false;
      const diffDays = Math.ceil((new Date(s.current_period_end).getTime() - now) / dayMs);
      return diffDays > 3 && diffDays <= 7;
    });

    for (const s of expiring7) {
      const diffDays = Math.ceil((new Date(s.current_period_end!).getTime() - now) / dayMs);
      notifs.push({
        business_id: s.business_id,
        title: '⏳ Byapar Pro Renewal Notice',
        message: `Your ${s.plan_tier.toUpperCase()} subscription will renew in ${diffDays} days. Keep your sync and automated alerts uninterrupted.`,
        type: 'system',
        priority: 'high',
        data: { trigger: '7_day_expiry', daysRemaining: diffDays },
        is_read: false,
      });
    }
    result.details.push(`Evaluated 7-day expiry trigger: ${expiring7.length} business(es) flagged.`);

    // Rule 2: 3-day urgent expiration warning
    result.triggersExecuted++;
    const expiring3 = subs.filter((s) => {
      if (!s.current_period_end || s.status !== 'active') return false;
      const diffDays = Math.ceil((new Date(s.current_period_end).getTime() - now) / dayMs);
      return diffDays >= 0 && diffDays <= 3;
    });

    for (const s of expiring3) {
      const diffDays = Math.ceil((new Date(s.current_period_end!).getTime() - now) / dayMs);
      notifs.push({
        business_id: s.business_id,
        title: '⚠️ Urgent: Byapar Subscription Expiring Soon',
        message: `Only ${diffDays === 0 ? 'today' : `${diffDays} days`} left on your current plan. Please renew now to maintain cloud real-time backup and unlimited Khata ledger access.`,
        type: 'system',
        priority: 'urgent',
        data: { trigger: '3_day_urgent', daysRemaining: diffDays },
        is_read: false,
      });
    }
    result.details.push(`Evaluated 3-day urgent trigger: ${expiring3.length} business(es) flagged.`);

    // Rule 3: Expired renewal invitation
    result.triggersExecuted++;
    const expiredList = subs.filter((s) => {
      if (!s.current_period_end) return false;
      return new Date(s.current_period_end).getTime() < now || s.status === 'expired';
    });

    for (const s of expiredList) {
      notifs.push({
        business_id: s.business_id,
        title: '🎁 Exclusive Renewal Discount',
        message: `Your subscription has lapsed. Contact our merchant support today to renew and receive a 15% discount on annual billing!`,
        type: 'system',
        priority: 'normal',
        data: { trigger: 'expired_renewal_offer' },
        is_read: false,
      });
    }
    result.details.push(`Evaluated expired retention trigger: ${expiredList.length} business(es) flagged.`);

    // Batch insert created notifications
    if (notifs.length > 0) {
      for (let i = 0; i < notifs.length; i += 50) {
        await supabase.from('notifications').insert(notifs.slice(i, i + 50));
      }
      result.notificationsCreated = notifs.length;
    }

    return result;
  } catch (err: any) {
    console.error('runAutomationsEngine error:', err);
    result.details.push(`Error executing automations: ${err.message}`);
    return result;
  }
}
