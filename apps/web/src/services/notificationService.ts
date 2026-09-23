/**
 * Synced Notification Service for Web
 * Syncs real-time notifications with Supabase, triggers browser push, and manages business reminders.
 */
import { createSignal, createMemo } from 'solid-js';
import { supabase } from '../db/auth';
import type { AppNotification, NotificationType, NotificationPriority, ReminderType, ReminderFrequency } from '@byapar/core';
/**
 * Native Browser Notification Dispatcher (Direct Browser HTML5 API)
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/assets/logo.png',
        badge: '/assets/logo.png',
        ...options,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
}

// Reactive signals for real-time notification state
export const [syncedNotifications, setSyncedNotifications] = createSignal<AppNotification[]>([]);
export const [isNotificationLoading, setIsNotificationLoading] = createSignal(false);

export const unreadNotificationCount = createMemo(() => {
  return syncedNotifications().filter((n) => !n.isRead).length;
});

let activeChannel: any = null;

/**
 * Initializes and fetches notifications from Supabase, then binds a Realtime channel.
 */
export async function initNotificationSync(businessId: string): Promise<void> {
  if (!businessId) return;

  setIsNotificationLoading(true);
  try {
    // 1. Initial Fetch
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`business_id.eq.${businessId},business_id.eq.a0000000-0000-0000-0000-000000000001,type.eq.admin_broadcast`)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      console.warn('[NotificationService] Error fetching notifications:', error);
    } else if (data) {
      const mapped: AppNotification[] = data.map(mapDbNotification);
      setSyncedNotifications(mapped);
    }

    // 2. Realtime Subscription
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
    }

    activeChannel = supabase
      .channel(`business_notifications_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const rec: any = payload.new || payload.old;
          if (
            !rec ||
            rec.business_id === businessId ||
            rec.business_id === 'a0000000-0000-0000-0000-000000000001' ||
            !rec.business_id ||
            rec.type === 'admin_broadcast'
          ) {
            handleRealtimeNotificationUpdate(payload);
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotificationService] Realtime sync status:', status);
      });
  } catch (err) {
    console.error('[NotificationService] Init error:', err);
  } finally {
    setIsNotificationLoading(false);
  }
}

function handleRealtimeNotificationUpdate(payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT' && newRecord) {
    const item = mapDbNotification(newRecord);
    setSyncedNotifications((prev) => [item, ...prev.filter((n) => n.id !== item.id)]);

    // Trigger local browser push alert if not read
    if (!item.isRead) {
      sendBrowserNotification(item.title, {
        body: item.message,
        tag: item.id,
      });
    }
  } else if (eventType === 'UPDATE' && newRecord) {
    const item = mapDbNotification(newRecord);
    setSyncedNotifications((prev) => prev.map((n) => (n.id === item.id ? item : n)));
  } else if (eventType === 'DELETE' && oldRecord) {
    setSyncedNotifications((prev) => prev.filter((n) => n.id !== oldRecord.id));
  }
}

/**
 * Creates and broadcasts a notification across web and mobile.
 */
export async function createNotification(
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>
): Promise<AppNotification | null> {
  try {
    const payload = {
      business_id: notification.businessId,
      user_id: notification.userId || null,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority || 'normal',
      data: notification.data || {},
      is_read: false,
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.warn('[NotificationService] Insert error:', error);
      // Fallback local addition if network/DB delay
      const fallback: AppNotification = {
        ...notification,
        id: 'local-' + Date.now(),
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setSyncedNotifications((prev) => [fallback, ...prev]);
      return fallback;
    }

    return mapDbNotification(data);
  } catch (err) {
    console.error('[NotificationService] Create failed:', err);
    return null;
  }
}

/**
 * Marks a notification as read in database and local state.
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  setSyncedNotifications((prev) =>
    prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
  );

  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
  } catch (err) {
    console.warn('[NotificationService] Mark read error:', err);
  }
}

/**
 * Marks all notifications as read for current business.
 */
export async function markAllNotificationsAsRead(businessId: string): Promise<void> {
  const now = new Date().toISOString();
  setSyncedNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: now })));

  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('business_id', businessId)
      .eq('is_read', false);
  } catch (err) {
    console.warn('[NotificationService] Mark all read error:', err);
  }
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(id: string): Promise<void> {
  setSyncedNotifications((prev) => prev.filter((n) => n.id !== id));

  try {
    await supabase.from('notifications').delete().eq('id', id);
  } catch (err) {
    console.warn('[NotificationService] Delete error:', err);
  }
}

/**
 * Creates a Customer / Debtor payment reminder that syncs to DB and alerts devices.
 */
export async function createDebtorReminder(params: {
  businessId: string;
  partyId: string;
  partyName: string;
  partyPhone?: string;
  amount: number;
  dueDate: string;
  frequency?: ReminderFrequency;
  notes?: string;
}): Promise<void> {
  const { businessId, partyId, partyName, partyPhone, amount, dueDate, frequency = 'once', notes } = params;

  // 1. Insert into reminders table
  try {
    await supabase.from('reminders').insert({
      business_id: businessId,
      party_id: partyId,
      title: `Udhar Due: ${partyName}`,
      amount,
      due_date_ad: dueDate,
      status: 'upcoming',
      reminder_type: 'customer_due',
      frequency,
      notify_web: true,
      notify_mobile: true,
      is_active: true,
    });
  } catch (err) {
    console.warn('[NotificationService] Error inserting reminder:', err);
  }

  // 2. Insert notification alert
  await createNotification({
    businessId,
    title: `Payment Reminder: ${partyName}`,
    message: `${partyName} has an outstanding Udhar balance of Rs. ${amount.toLocaleString()}. Due on ${dueDate}.`,
    type: 'debtor_reminder',
    priority: 'high',
    data: {
      partyId,
      partyName,
      partyPhone,
      amount,
      linkScreen: 'khata',
      notes,
    },
  });
}

/**
 * Creates a Supplier / Wholesaler purchase payable reminder.
 */
export async function createSupplierPayableReminder(params: {
  businessId: string;
  supplierId?: string;
  supplierName: string;
  amount: number;
  dueDate: string;
  invoiceNumber?: string;
}): Promise<void> {
  const { businessId, supplierId, supplierName, amount, dueDate, invoiceNumber } = params;

  // 1. Insert into reminders table
  try {
    await supabase.from('reminders').insert({
      business_id: businessId,
      party_id: supplierId,
      title: `Payable: ${supplierName}`,
      amount,
      due_date_ad: dueDate,
      status: 'upcoming',
      reminder_type: 'supplier_payment',
      frequency: 'once',
      notify_web: true,
      notify_mobile: true,
      is_active: true,
    });
  } catch (err) {
    console.warn('[NotificationService] Error inserting supplier reminder:', err);
  }

  // 2. Insert notification
  await createNotification({
    businessId,
    title: `Payment Due to Supplier: ${supplierName}`,
    message: `Payment of Rs. ${amount.toLocaleString()} is due to ${supplierName} on ${dueDate}.${
      invoiceNumber ? ` (Bill #${invoiceNumber})` : ''
    }`,
    type: 'supplier_payable',
    priority: 'high',
    data: {
      supplierId,
      supplierName,
      amount,
      dueDate,
      linkScreen: 'purchase',
    },
  });
}

/**
 * Checks low stock items and triggers synced notification alert.
 */
export async function checkAndTriggerStockAlerts(
  businessId: string,
  items: Array<{ id: string; name: string; currentStock: number; lowStockThreshold: number }>
): Promise<void> {
  const lowItems = items.filter((i) => i.currentStock <= i.lowStockThreshold);
  if (lowItems.length === 0) return;

  // Check if we already alerted in the last 2 hours
  const existing = syncedNotifications().find(
    (n) => n.type === 'low_stock' && Date.now() - new Date(n.createdAt).getTime() < 2 * 60 * 60 * 1000
  );
  if (existing) return;

  const names = lowItems.slice(0, 3).map((i) => i.name).join(', ');
  const moreText = lowItems.length > 3 ? ` and ${lowItems.length - 3} more` : '';

  await createNotification({
    businessId,
    title: `Low Stock Alert (${lowItems.length} items)`,
    message: `${names}${moreText} have reached minimum stock levels. Restock now to prevent stockouts.`,
    type: 'low_stock',
    priority: 'urgent',
    data: {
      count: lowItems.length,
      linkScreen: 'inventory',
    },
  });
}

function mapDbNotification(row: any): AppNotification {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    title: row.title || 'Notification',
    message: row.message || '',
    type: (row.type as NotificationType) || 'system',
    priority: (row.priority as NotificationPriority) || 'normal',
    data: row.data || {},
    isRead: Boolean(row.is_read),
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
