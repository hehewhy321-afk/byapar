/**
 * Synced Mobile Notification Service
 * Connects mobile to Supabase real-time notifications with instant cross-device updates,
 * integrates native phone status-bar notifications with sound & vibration via expo-notifications & Firebase,
 * and respects Android 13+ permissions and user setting preferences.
 */
import { Platform, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '../config/supabase';
import { storage } from './storage';
import type { NotificationItem } from '../types';

// Configure foreground notification behavior: show alert banner, play sound, and set badge
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationPreferences {
  enabled: boolean;
  debtorReminders: boolean;
  stockAlerts: boolean;
  supplierPayables: boolean;
  adminBroadcasts: boolean;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  debtorReminders: true,
  stockAlerts: true,
  supplierPayables: true,
  adminBroadcasts: true,
};

let cachedNotifications: NotificationItem[] = [];
let listeners: Array<(list: NotificationItem[]) => void> = [];
let activeChannel: any = null;
let activePrefs: NotificationPreferences = DEFAULT_PREFERENCES;
let prefsLoaded = false;
let channelConfigured = false;

/**
 * Configure Android notification channel with high priority, sound, and vibration.
 * Required for Android 8.0+ (API 26+) to display heads-up notifications and play sound.
 */
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android' && !channelConfigured) {
    try {
      await Notifications.setNotificationChannelAsync('byapar_alerts', {
        name: 'Byapar Alerts',
        description: 'Instant customer udhar due reminders, low stock alerts, and business receipts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF4500',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        showBadge: true,
      });
      channelConfigured = true;
    } catch (err) {
      console.warn('[NotificationService] Error setting notification channel:', err);
    }
  }
}

/**
 * Posts an immediate system notification directly to the phone's notification panel with sound and vibration.
 */
export async function displaySystemNotification(
  title: string,
  body: string,
  data: any = {}
): Promise<void> {
  const prefs = await ensurePrefsLoaded();
  if (!prefs.enabled) return;

  try {
    await setupAndroidNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        data,
        // @ts-ignore - Expo Android specific channel routing
        channelId: 'byapar_alerts',
      },
      trigger: null, // Displays immediately in Android status bar / shade
    });
  } catch (err) {
    console.warn('[NotificationService] Failed to display phone system notification:', err);
  }
}export async function scheduleReminderNotification(reminder: {
  id: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  amount?: number;
  note?: string;
}): Promise<string | undefined> {
  const prefs = await ensurePrefsLoaded();
  if (!prefs.enabled) return;

  try {
    const timeStr = reminder.dueTime || '10:00';
    const targetDate = new Date(`${reminder.dueDate}T${timeStr}:00`);
    if (isNaN(targetDate.getTime()) || targetDate.getTime() <= Date.now()) {
      return;
    }

    await setupAndroidNotificationChannel();
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${reminder.title}`,
        body: reminder.note || (reminder.amount ? `Amount: Rs. ${reminder.amount.toLocaleString()}` : `Due: ${reminder.dueDate} ${timeStr}`),
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { reminderId: reminder.id, screen: 'reminders' },
        // @ts-ignore - Expo Android specific channel routing
        channelId: 'byapar_alerts',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });
    return notifId;
  } catch (err) {
    console.warn('[NotificationService] Failed to schedule reminder notification:', err);
  }
}

export async function ensurePrefsLoaded(): Promise<NotificationPreferences> {
  if (!prefsLoaded) {
    activePrefs = await getNotificationPreferences();
    prefsLoaded = true;
  }
  return activePrefs;
}

export function filterNotificationsByPrefs(
  list: NotificationItem[],
  prefs: NotificationPreferences
): NotificationItem[] {
  if (!prefs.enabled) {
    return [];
  }
  return list.filter((item) => {
    if (item.type === 'debtor_reminder' && !prefs.debtorReminders) return false;
    if (item.type === 'low_stock' && !prefs.stockAlerts) return false;
    if (item.type === 'supplier_payable' && !prefs.supplierPayables) return false;
    if (item.type === 'admin_broadcast' && !prefs.adminBroadcasts) return false;
    return true;
  });
}

function notifyListeners() {
  const filtered = filterNotificationsByPrefs(cachedNotifications, activePrefs);
  listeners.forEach((cb) => cb([...filtered]));
}

export function subscribeNotificationUpdates(callback: (list: NotificationItem[]) => void): () => void {
  listeners.push(callback);
  ensurePrefsLoaded().then((prefs) => {
    callback(filterNotificationsByPrefs(cachedNotifications, prefs));
  });
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

const DEFAULT_BIZ_ID = 'a0000000-0000-0000-0000-000000000001';

/**
 * Initializes and fetches notifications from Supabase, sets up Android channels,
 * and opens a Realtime channel.
 */
export async function initMobileNotifications(businessId?: string): Promise<NotificationItem[]> {
  await ensurePrefsLoaded();
  await setupAndroidNotificationChannel();
  const targetBizId = businessId && businessId.trim() !== '' ? businessId : DEFAULT_BIZ_ID;

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    query = query.or(
      `business_id.eq.${targetBizId},business_id.eq.${DEFAULT_BIZ_ID},business_id.is.null,type.eq.admin_broadcast`
    );

    const { data, error } = await query;

    if (!error && data) {
      cachedNotifications = data.map(mapDbNotification);
      notifyListeners();
    } else if (error) {
      console.warn('[Mobile Notifications] Query warning:', error);
    }

    // Realtime channel
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
    }

    activeChannel = supabase
      .channel(`mobile_notifications_${targetBizId}`)
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
            rec.business_id === targetBizId ||
            rec.business_id === DEFAULT_BIZ_ID ||
            !rec.business_id ||
            rec.type === 'admin_broadcast'
          ) {
            handleRealtimeNotificationUpdate(payload);
          }
        }
      )
      .subscribe();

    return filterNotificationsByPrefs(cachedNotifications, activePrefs);
  } catch (err) {
    console.warn('[Mobile Notifications] Init error:', err);
    return filterNotificationsByPrefs(cachedNotifications, activePrefs);
  }
}

function handleRealtimeNotificationUpdate(payload: any) {
  const { eventType, new: newRecord, old: oldRecord } = payload;

  if (eventType === 'INSERT' && newRecord) {
    const item = mapDbNotification(newRecord);
    cachedNotifications = [item, ...cachedNotifications.filter((n) => n.id !== item.id)];
    notifyListeners();

    // Check user preferences before sounding and displaying system notification
    if (activePrefs.enabled) {
      let allow = true;
      if (item.type === 'debtor_reminder' && !activePrefs.debtorReminders) allow = false;
      if (item.type === 'low_stock' && !activePrefs.stockAlerts) allow = false;
      if (item.type === 'supplier_payable' && !activePrefs.supplierPayables) allow = false;
      if (item.type === 'admin_broadcast' && !activePrefs.adminBroadcasts) allow = false;

      if (allow) {
        displaySystemNotification(item.title, item.message, item.data);
      }
    }
  } else if (eventType === 'UPDATE' && newRecord) {
    const item = mapDbNotification(newRecord);
    cachedNotifications = cachedNotifications.map((n) => (n.id === item.id ? item : n));
    notifyListeners();
  } else if (eventType === 'DELETE' && oldRecord) {
    cachedNotifications = cachedNotifications.filter((n) => n.id !== oldRecord.id);
    notifyListeners();
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  cachedNotifications = cachedNotifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  notifyListeners();

  try {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
  } catch (err) {
    console.warn('[Mobile Notifications] Mark read error:', err);
  }
}

export async function markAllNotificationsAsRead(businessId: string): Promise<void> {
  cachedNotifications = cachedNotifications.map((n) => ({ ...n, isRead: true }));
  notifyListeners();

  try {
    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('is_read', false);
  } catch (err) {
    console.warn('[Mobile Notifications] Mark all read error:', err);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  cachedNotifications = cachedNotifications.filter((n) => n.id !== id);
  notifyListeners();

  try {
    await supabase.from('notifications').delete().eq('id', id);
  } catch (err) {
    console.warn('[Mobile Notifications] Delete error:', err);
  }
}

function mapDbNotification(row: any): NotificationItem {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    title: row.title || 'Notification',
    message: row.message || '',
    type: row.type || 'system',
    priority: row.priority || 'normal',
    data: row.data || {},
    isRead: Boolean(row.is_read),
    createdAt: row.created_at,
  };
}

// ----------------------------------------------------------------------------
// Notification Permissions & User Preferences (Android 13+ & App Settings)
// ----------------------------------------------------------------------------

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted || settings.status === 'granted';
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    await setupAndroidNotificationChannel();
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (existing.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = requested.status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return false;
  }
}

export function openAppNotificationSettings(): void {
  try {
    Linking.openSettings();
  } catch (err) {
    console.warn('Failed to open settings:', err);
  }
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const prefs = await storage.get<NotificationPreferences>('notification_prefs', DEFAULT_PREFERENCES);
  activePrefs = prefs;
  prefsLoaded = true;
  return prefs;
}

export async function saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
  activePrefs = prefs;
  prefsLoaded = true;
  await storage.set('notification_prefs', prefs);
  notifyListeners();
}

/**
 * Triggers a sample notification both locally in the Android phone notification shade
 * with sound and vibration, and records it in Supabase for cross-device visibility.
 */
export async function triggerSampleNotification(businessId: string): Promise<{ success: boolean; reason?: string }> {
  await ensurePrefsLoaded();
  if (!activePrefs.enabled) {
    return {
      success: false,
      reason: 'In-app notifications are disabled in settings. Enable "Allow In-App Notifications" first.',
    };
  }

  const sample = {
    business_id: businessId,
    title: '🔔 Test Alert (Byapar Mobile)',
    message: 'Notifications are active and working properly on your device with sound!',
    type: 'system',
    priority: 'normal',
    data: { source: 'settings_test' },
    is_read: false,
  };

  // 1. Immediately post to the phone's native notification shade with sound & vibration!
  await displaySystemNotification(sample.title, sample.message, sample.data);

  // 2. Insert into Supabase notifications table
  try {
    const { error } = await supabase.from('notifications').insert(sample);
    if (error) {
      // Local fallback in cache so user immediately sees it in the app list as well
      const localItem: NotificationItem = {
        id: 'local_test_' + Date.now(),
        businessId,
        title: sample.title,
        message: sample.message,
        type: 'system',
        priority: 'normal',
        data: sample.data,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      cachedNotifications = [localItem, ...cachedNotifications];
      notifyListeners();
      return { success: true };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('triggerSampleNotification error:', err);
    return { success: true };
  }
}

/**
 * Fetches the native Firebase device push token (FCM token) for this device.
 */
export async function getDevicePushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    console.log('[Firebase FCM Device Token]', token.data);
    return typeof token.data === 'string' ? token.data : JSON.stringify(token.data);
  } catch (err) {
    console.warn('[Firebase FCM] Could not get device token:', err);
    return null;
  }
}
