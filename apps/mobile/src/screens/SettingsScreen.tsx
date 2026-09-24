import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { SupportHelpdeskModal } from '../components/SupportHelpdeskModal';
import { BranchSwitcherModal } from '../components/BranchSwitcherModal';
import { getMobileSubscription } from '../services/subscriptionService';
import { updateService, CURRENT_APP_VERSION } from '../services/updateService';
import { buildWhatsAppReminderMessage } from '../services/whatsapp';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  openAppNotificationSettings,
  getNotificationPreferences,
  saveNotificationPreferences,
  triggerSampleNotification,
  NotificationPreferences,
  DEFAULT_PREFERENCES,
} from '../services/notificationService';
import { analytics } from '../services/analyticsService';

interface TemplatePreset {
  id: string;
  name: string;
  badge: string;
  template: string;
}

const PREMADE_TEMPLATES: TemplatePreset[] = [
  {
    id: 'friendly',
    name: 'Friendly Reminder',
    badge: 'Standard',
    template:
      'नमस्ते {name} जी, {store} बाट तपाईंको बाँकी हिसाब रु. {balance} रहेको छ। कृपया समयमै भुक्तानी गरिदिनुहोला। धन्यवाद!',
  },
  {
    id: 'formal',
    name: 'Formal Notice',
    badge: 'Business',
    template:
      'Dear {name}, this is a gentle reminder from {store} regarding your pending ledger balance of Rs. {balance} as of {date}. Kindly clear the dues at your earliest convenience.',
  },
  {
    id: 'urgent',
    name: 'Urgent Overdue Notice',
    badge: 'Urgent',
    template:
      'IMPORTANT NOTICE: Namaste {customer_name},\n\nYour outstanding credit balance of *Rs. {amount}* with *{store_name}* is overdue as of {date}.\n\nPlease clear the pending amount immediately to ensure uninterrupted credit and delivery services.\n\nContact us directly for queries.',
  },
  {
    id: 'receipt',
    name: 'Payment Acknowledgment',
    badge: 'Thank You',
    template:
      'Namaste {customer_name},\n\nWe have received your payment at *{store_name}*. Thank you!\nYour updated remaining ledger balance is *Rs. {amount}* as of {date}.\n\nWe appreciate your timely settlement.',
  },
  {
    id: 'quick',
    name: 'Quick Compact SMS',
    badge: 'Short',
    template:
      '{store_name}: Dear {customer_name}, pending balance is Rs. {amount} as of {date}. Please settle via digital QR or cash. Thank you.',
  },
];

const TEMPLATE_VARIABLES = [
  { tag: '{customer_name}', desc: 'Customer' },
  { tag: '{store_name}', desc: 'Store' },
  { tag: '{amount}', desc: 'Due Balance' },
  { tag: '{date}', desc: 'Date' },
];

export const SettingsScreen: React.FC = () => {
  const {
    store,
    activeBizId,
    updateStoreProfile,
    theme,
    themeMode,
    toggleThemeMode,
    user,
    logout,
    changePassword,
    setShowAuthModal,
    userStores,
  } = useApp();

  // Notification Permission & Preferences state
  const [hasPermission, setHasPermission] = useState<boolean>(true);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [testingNotif, setTestingNotif] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [showHelpdeskModal, setShowHelpdeskModal] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [currentPlanName, setCurrentPlanName] = useState<string>('Free Tier');
  const [subState, setSubState] = useState<any>(null);

  // Fonepay QR State
  const [showFonepayModal, setShowFonepayModal] = useState(false);
  const [fonepayMerchantId, setFonepayMerchantId] = useState(store.fonepayMerchantId || '');
  const [fonepayCounterId, setFonepayCounterId] = useState(store.fonepayCounterId || '');
  const [savingFonepay, setSavingFonepay] = useState(false);

  const loadPlanName = async () => {
    try {
      const sub = await getMobileSubscription(activeBizId);
      setSubState(sub);
      if (sub?.planName) {
        setCurrentPlanName(sub.planName);
      }
    } catch (err) {
      console.warn('Failed to load plan in settings:', err);
    }
  };

  useEffect(() => {
    checkNotificationPermission().then(setHasPermission);
    getNotificationPreferences().then(setNotifPrefs);
    loadPlanName();
  }, [activeBizId]);

  const handleTogglePref = async (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    await saveNotificationPreferences(updated);
    analytics.logEvent('notification_pref_changed', { setting: key, value });
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    if (!granted) {
      Alert.alert(
        'Permission Required',
        'Notification permission was not granted. Would you like to open Settings to enable it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openAppNotificationSettings },
        ]
      );
    } else {
      Alert.alert('Permission Granted', 'System notifications are now enabled for Byapar.');
    }
  };

  const handleSendTestNotif = async () => {
    if (!notifPrefs.enabled) {
      Alert.alert(
        'Notifications Disabled',
        'In-app notifications are currently disabled. Please enable "Allow In-App Notifications" above first.'
      );
      return;
    }
    setTestingNotif(true);
    const bizId = activeBizId || store.id || 'a0000000-0000-0000-0000-000000000001';
    const res = await triggerSampleNotification(bizId);
    setTestingNotif(false);
    if (res.success) {
      Alert.alert(
        'Test Dispatched',
        'A test notification has been sent! Check the bell icon at the top of the screen to view it.'
      );
    } else {
      Alert.alert('Notice', res.reason || 'Could not dispatch test notification.');
    }
  };

  // Store profile modal & fields (REAL: updates store profile across app & Supabase)
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeName, setStoreName] = useState(store.name || '');
  const [ownerName, setOwnerName] = useState(store.ownerName || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [panNumber, setPanNumber] = useState(store.panNumber || '');
  const [address, setAddress] = useState(store.address || '');
  const [vatEnabled, setVatEnabled] = useState(store.vatEnabled || false);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(store.paperWidth || '58mm');
  const [isSavingStore, setIsSavingStore] = useState(false);

  // Change Password state (REAL: verifies current password via Supabase signIn & updates password)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // WhatsApp Template Modal & fields (REAL: saved to store and used when generating WhatsApp reminder in Ledger)
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState(
    store.whatsappTemplate || PREMADE_TEMPLATES[0].template
  );
  const [activePresetId, setActivePresetId] = useState<string>('friendly');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // In-app update check (REAL: calls updateService to check GitHub/Supabase releases)
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    setStoreName(store.name || '');
    setOwnerName(store.ownerName || '');
    setPhone(store.phone || '');
    setPanNumber(store.panNumber || '');
    setAddress(store.address || '');
    setVatEnabled(store.vatEnabled || false);
    setPaperWidth(store.paperWidth || '58mm');
    setFonepayMerchantId(store.fonepayMerchantId || '');
    setFonepayCounterId(store.fonepayCounterId || '');
    if (store.whatsappTemplate) {
      setMessageTemplate(store.whatsappTemplate);
    }
  }, [store]);

  const handleSaveFonepay = async () => {
    setSavingFonepay(true);
    try {
      await updateStoreProfile({
        fonepayMerchantId: fonepayMerchantId.trim(),
        fonepayCounterId: fonepayCounterId.trim(),
      });
      setShowFonepayModal(false);
      Alert.alert('Fonepay QR Saved', 'Counter and merchant configuration updated.');
    } catch {
      Alert.alert('Error', 'Failed to save Fonepay details.');
    } finally {
      setSavingFonepay(false);
    }
  };

  const handleSaveStoreProfile = async () => {
    setIsSavingStore(true);
    try {
      await updateStoreProfile({
        name: storeName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        panNumber: panNumber.trim(),
        address: address.trim(),
        vatEnabled,
        paperWidth,
      });
      setShowStoreModal(false);
      Alert.alert('Success', 'Store profile saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save store profile.');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleTogglePaperWidth = async () => {
    const nextWidth = paperWidth === '58mm' ? '80mm' : '58mm';
    setPaperWidth(nextWidth);
    await updateStoreProfile({ paperWidth: nextWidth });
  };

  const handleChangePasswordSubmit = async () => {
    if (!oldPassword.trim()) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (oldPassword === newPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await changePassword(oldPassword, newPassword);
      if (res.error) {
        setPasswordError(res.error);
      } else {
        setShowPasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Success', 'Your password has been changed successfully.');
      }
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleApplyPreset = (preset: TemplatePreset) => {
    setMessageTemplate(preset.template);
    setActivePresetId(preset.id);
  };

  const handleInsertVariable = (tag: string) => {
    setMessageTemplate((prev) => `${prev} ${tag}`);
  };

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      await updateStoreProfile({
        whatsappTemplate: messageTemplate.trim(),
      });
      setShowTemplateModal(false);
      Alert.alert('Success', 'WhatsApp reminder template saved.');
    } catch {
      Alert.alert('Error', 'Failed to save template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      await updateService.checkForUpdates(false);
    } catch {
      Alert.alert('Update Check', 'Unable to reach the update server. Please check your connection.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of your Byapar account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const previewText = buildWhatsAppReminderMessage(
    'Ram Sharma',
    storeName.trim() || 'Byapar Store',
    4500,
    messageTemplate
  );

  const displayName =
    store.ownerName || user?.user_metadata?.owner_name || store.name || 'Store Owner';
  const displayEmail = user?.email || 'Local Offline Mode';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Profile Header Card */}
      <View
        style={[
          styles.profileCard,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
        ]}
      >
        <View style={[styles.avatarBox, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarLetter}>{displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileTextCol}>
          <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
            {displayName}
          </Text>
          <Text style={[styles.profileEmail, { color: theme.colors.textSecondary }]}>
            {displayEmail}
          </Text>
        </View>
        {user ? (
          <View style={styles.cloudBadge}>
            <View style={styles.cloudDot} />
            <Text style={styles.cloudBadgeText}>Synced</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.signInBadge, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowAuthModal(true)}
          >
            <Text style={styles.signInBadgeText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. ACCOUNT & SECURITY */}
      <View style={styles.categoryBlock}>
        <Text style={[styles.categoryTitle, { color: theme.colors.textMuted }]}>
          ACCOUNT & SECURITY
        </Text>
        <View
          style={[
            styles.cardGroup,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          {user ? (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError(null);
                  setShowPasswordModal(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <Feather name="lock" size={18} color={theme.colors.textPrimary} />
                  </View>
                  <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                    Change Password
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.rowSeparator, { backgroundColor: theme.colors.borderGlass }]} />

              <TouchableOpacity style={styles.settingRow} onPress={handleLogout} activeOpacity={0.7}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <Feather name="log-out" size={18} color="#EF4444" />
                  </View>
                  <Text style={[styles.rowLabel, { color: '#EF4444', fontWeight: '600' }]}>
                    Sign Out
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowAuthModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                  <Feather name="log-in" size={18} color={theme.colors.primary} />
                </View>
                <Text style={[styles.rowLabel, { color: theme.colors.primary, fontWeight: '600' }]}>
                  Sign In to Cloud Account
                </Text>
              </View>
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 3. STORE & BUSINESS PROFILE */}
      <View style={styles.categoryBlock}>
        <Text style={[styles.categoryTitle, { color: theme.colors.textMuted }]}>
          STORE & BUSINESS PROFILE
        </Text>
        <View
          style={[
            styles.cardGroup,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowStoreModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="shopping-bag" size={18} color={theme.colors.textPrimary} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                Store Details & PAN
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text
                style={[styles.rowValueText, { color: theme.colors.textMuted }]}
                numberOfLines={1}
              >
                {store.name || 'Edit'}
              </Text>
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowSeparator, { backgroundColor: theme.colors.borderGlass }]} />

          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="file-text" size={18} color={theme.colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  VAT Registered (13%)
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Adds 13% VAT breakdown to invoices
                </Text>
              </View>
            </View>
            <Switch
              value={vatEnabled}
              onValueChange={async (val) => {
                setVatEnabled(val);
                await updateStoreProfile({ vatEnabled: val });
              }}
              trackColor={{ false: theme.colors.surface, true: '#FF4500' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Subscription Tier */}
          <View style={[styles.rowSeparator, { backgroundColor: theme.colors.borderGlass }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowSubModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 69, 0, 0.12)' }]}>
                <Feather name="award" size={18} color="#FF4500" />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Subscription & Plans
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Active: {currentPlanName}
                  {subState && subState.planTier !== 'free' && subState.daysRemaining !== undefined
                    ? ` • ${subState.daysRemaining} days left`
                    : ''}
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              {(!subState || subState.planTier === 'free') ? (
                <Text style={[styles.rowValueText, { color: '#FF4500', fontWeight: '700' }]}>
                  Upgrade
                </Text>
              ) : (
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '700' }}>
                    {subState?.daysRemaining ?? 30}d left
                  </Text>
                </View>
              )}
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Store Branches / Multi-Store */}
          <View style={[styles.rowSeparator, { backgroundColor: theme.colors.borderGlass }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowBranchModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Feather name="layers" size={18} color="#3B82F6" />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Store Branches & Switch
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  {userStores && userStores.length > 0
                    ? `${userStores.length} branch${userStores.length > 1 ? 'es' : ''} in account`
                    : '1 branch in account'}
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValueText, { color: theme.colors.textMuted }]}>
                Switch / Add
              </Text>
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. APPEARANCE */}
      <View style={styles.categoryBlock}>
        <Text style={[styles.categoryTitle, { color: theme.colors.textMuted }]}>
          APPEARANCE
        </Text>
        <View
          style={[
            styles.cardGroup,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather
                  name={themeMode === 'dark' ? 'moon' : 'sun'}
                  size={18}
                  color={theme.colors.textPrimary}
                />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>Dark Mode</Text>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={toggleThemeMode}
              trackColor={{ false: theme.colors.surface, true: '#FF4500' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </View>

      {/* 5. RECEIPT & BILLING */}
      <View style={styles.categoryBlock}>
        <Text style={[styles.categoryTitle, { color: theme.colors.textMuted }]}>
          RECEIPT & BILLING
        </Text>
        <View
          style={[
            styles.cardGroup,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleTogglePaperWidth}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="printer" size={18} color={theme.colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Thermal Paper Width
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  {paperWidth === '58mm' ? '58mm (Compact POS printer)' : '80mm (Standard invoice printer)'}
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValueText, { color: theme.colors.textMuted }]}>
                {paperWidth}
              </Text>
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowSeparator, { backgroundColor: theme.colors.borderGlass }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowFonepayModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Feather name="grid" size={18} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Fonepay Dynamic QR
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  {store.fonepayMerchantId
                    ? `Merchant: ${store.fonepayMerchantId}`
                    : 'Not configured (Tap to enter credentials)'}
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text
                style={[
                  styles.rowValueText,
                  { color: store.fonepayMerchantId ? '#10B981' : theme.colors.textMuted },
                ]}
              >
                {store.fonepayMerchantId ? 'Configured' : 'Setup'}
              </Text>
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 6. WHATSAPP NOTIFICATIONS */}
      <View style={styles.categoryBlock}>
        <Text style={[styles.categoryTitle, { color: theme.colors.textMuted }]}>
          WHATSAPP NOTIFICATIONS
        </Text>
        <View
          style={[
            styles.cardGroup,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowTemplateModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="message-circle" size={18} color={theme.colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Dues Reminder Template
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Custom message when sending Khata reminders
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValueText, { color: theme.colors.textMuted }]}>
                Customize
              </Text>
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 6.5 NOTIFICATIONS & ALERTS */}
      <View style={styles.categoryBlock}>
        <Text style={[styles.categoryTitle, { color: theme.colors.textMuted }]}>
          NOTIFICATIONS & ALERTS
        </Text>
        <View
          style={[
            styles.cardGroup,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          {/* Permission Status */}
          <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: hasPermission
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
                  },
                ]}
              >
                <Feather
                  name={hasPermission ? 'bell' : 'bell-off'}
                  size={18}
                  color={hasPermission ? '#10B981' : '#EF4444'}
                />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  System Push Permission
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  {hasPermission
                    ? 'Device allows lock-screen notifications'
                    : 'System permission required for background alerts'}
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              {!hasPermission ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                  onPress={handleRequestPermission}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                    Enable
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={[styles.rowValueText, { color: '#10B981', fontWeight: '700' }]}>
                  Active
                </Text>
              )}
            </View>
          </View>

          {/* Master Notifications Toggle */}
          <View
            style={[
              styles.settingRow,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="bell" size={18} color={theme.colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Allow In-App Notifications
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Sync notifications in real-time across devices
                </Text>
              </View>
            </View>
            <Switch
              value={notifPrefs.enabled}
              onValueChange={(val) => handleTogglePref('enabled', val)}
              trackColor={{ false: theme.colors.borderGlass, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Debtor / Udhar Due Alerts */}
          <View
            style={[
              styles.settingRow,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="users" size={18} color={theme.colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Customer Udhar Due Alerts
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Notify when customer credit reaches scheduled due date
                </Text>
              </View>
            </View>
            <Switch
              value={notifPrefs.debtorReminders}
              disabled={!notifPrefs.enabled}
              onValueChange={(val) => handleTogglePref('debtorReminders', val)}
              trackColor={{ false: theme.colors.borderGlass, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Low Stock Alerts */}
          <View
            style={[
              styles.settingRow,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="alert-triangle" size={18} color={theme.colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Low Stock Warnings
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Instant alert when item stock falls below threshold
                </Text>
              </View>
            </View>
            <Switch
              value={notifPrefs.stockAlerts}
              disabled={!notifPrefs.enabled}
              onValueChange={(val) => handleTogglePref('stockAlerts', val)}
              trackColor={{ false: theme.colors.borderGlass, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Supplier Payables Alerts */}
          <View
            style={[
              styles.settingRow,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="truck" size={18} color={theme.colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Supplier Payable Reminders
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Remind when purchase bills are due for payment
                </Text>
              </View>
            </View>
            <Switch
              value={notifPrefs.supplierPayables}
              disabled={!notifPrefs.enabled}
              onValueChange={(val) => handleTogglePref('supplierPayables', val)}
              trackColor={{ false: theme.colors.borderGlass, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Test Notification Button */}
          <TouchableOpacity
            style={[
              styles.settingRow,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.borderGlass },
            ]}
            onPress={handleSendTestNotif}
            disabled={testingNotif}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="send" size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.primary, fontWeight: '700' }]}>
                  Send Test Notification
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Dispatches a sample notification to your device
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Feather name="chevron-right" size={17} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 7. APP INFORMATION */}
      <View style={styles.categoryBlock}>
        <Text style={[styles.categoryTitle, { color: theme.colors.textMuted }]}>
          APP INFORMATION
        </Text>
        <View
          style={[
            styles.cardGroup,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <TouchableOpacity
            style={styles.settingRow}
            onPress={handleCheckUpdate}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={styles.iconContainer}>
                <Feather name="info" size={18} color={theme.colors.textPrimary} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                Check for Updates
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValueText, { color: theme.colors.textMuted }]}>
                {checkingUpdate ? 'Checking...' : `v${CURRENT_APP_VERSION}`}
              </Text>
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* Helpdesk & Support */}
          <View style={[styles.rowSeparator, { backgroundColor: theme.colors.borderGlass }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowHelpdeskModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Feather name="help-circle" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary }]}>
                  Support Helpdesk & Tickets
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  FAQs, hotlines & merchant live support
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValueText, { color: '#10B981', fontWeight: '600' }]}>
                Helpdesk
              </Text>
              <Feather name="chevron-right" size={17} color={theme.colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* FOOTER */}
      <View style={styles.footerNote}>
        <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
          Byapar - Retail Management & Accounting
        </Text>
      </View>

      {/* ================= MODALS ================= */}

      {/* 1. STORE DETAILS MODAL */}
      <Modal visible={showStoreModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Feather name="shopping-bag" size={20} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Store Information
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowStoreModal(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                  Store Name *
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="e.g. Shrestha Mart"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                  Owner Full Name
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="e.g. Suman Shrestha"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                  Phone Number
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="e.g. 9841234567"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                  PAN / VAT Number
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={panNumber}
                  onChangeText={setPanNumber}
                  placeholder="9-digit PAN"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                  Store Address
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="e.g. New Road, Kathmandu"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                onPress={() => setShowStoreModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveStoreProfile}
                disabled={isSavingStore}
              >
                {isSavingStore ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Store</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. CHANGE PASSWORD MODAL */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Feather name="lock" size={20} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Change Password
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                disabled={passwordLoading}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {passwordError && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorBannerText}>{passwordError}</Text>
              </View>
            )}

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                Current Password *
              </Text>
              <View
                style={[
                  styles.passwordInputBox,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordTextInput, { color: theme.colors.textPrimary }]}
                  placeholder="Enter current password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showOldPassword}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowOldPassword(!showOldPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showOldPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                New Password *
              </Text>
              <View
                style={[
                  styles.passwordInputBox,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordTextInput, { color: theme.colors.textPrimary }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showNewPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                Confirm New Password *
              </Text>
              <View
                style={[
                  styles.passwordInputBox,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordTextInput, { color: theme.colors.textPrimary }]}
                  placeholder="Re-type new password"
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                onPress={() => setShowPasswordModal(false)}
                disabled={passwordLoading}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleChangePasswordSubmit}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. WHATSAPP TEMPLATE MODAL */}
      <Modal visible={showTemplateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Feather name="message-circle" size={20} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  WhatsApp Template
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTemplateModal(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Presets Pills */}
              <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                Select Premade Style
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {PREMADE_TEMPLATES.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor:
                          activePresetId === preset.id ? theme.colors.primary : theme.colors.surface,
                        borderColor:
                          activePresetId === preset.id
                            ? theme.colors.primary
                            : theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => handleApplyPreset(preset)}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: activePresetId === preset.id ? '#FFFFFF' : theme.colors.textSecondary },
                      ]}
                    >
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Tag inserters */}
              <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary, marginBottom: 6 }]}>
                Insert Dynamic Tag
              </Text>
              <View style={styles.tagsRow}>
                {TEMPLATE_VARIABLES.map((v) => (
                  <TouchableOpacity
                    key={v.tag}
                    style={[
                      styles.tagChip,
                      { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
                    ]}
                    onPress={() => handleInsertVariable(v.tag)}
                  >
                    <Text style={[styles.tagChipText, { color: theme.colors.primary }]}>
                      + {v.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Multiline Template Input */}
              <TextInput
                style={[
                  styles.templateInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                multiline
                numberOfLines={4}
                value={messageTemplate}
                onChangeText={setMessageTemplate}
                placeholder="Type your WhatsApp message template..."
                placeholderTextColor={theme.colors.textMuted}
              />

              {/* Live Preview Card */}
              <View
                style={[
                  styles.previewBox,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
                ]}
              >
                <View style={styles.previewHeaderRow}>
                  <Feather name="eye" size={13} color={theme.colors.textMuted} />
                  <Text style={[styles.previewHeaderTitle, { color: theme.colors.textMuted }]}>
                    Message Preview
                  </Text>
                </View>
                <Text style={[styles.previewMsgText, { color: theme.colors.textPrimary }]}>
                  {previewText}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                onPress={() => setShowTemplateModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveTemplate}
                disabled={isSavingTemplate}
              >
                {isSavingTemplate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Template</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. SUBSCRIPTION MODAL */}
      <SubscriptionModal
        visible={showSubModal}
        onClose={() => {
          setShowSubModal(false);
          loadPlanName();
        }}
      />

      {/* 5. SUPPORT HELPDESK & TICKETS */}
      <SupportHelpdeskModal
        visible={showHelpdeskModal}
        onClose={() => setShowHelpdeskModal(false)}
      />

      {/* 6. MULTI-STORE BRANCH SWITCHER */}
      <BranchSwitcherModal
        visible={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        onOpenSubscription={() => setShowSubModal(true)}
      />

      {/* 7. FONEPAY DYNAMIC QR CONFIG MODAL */}
      <Modal visible={showFonepayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Fonepay Merchant Setup
                </Text>
                <Text style={[styles.rowSubLabel, { color: theme.colors.textMuted }]}>
                  Configure your QR counter credentials
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFonepayModal(false)}
                style={styles.modalCloseBtn}
              >
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                Fonepay Merchant ID / Code *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                value={fonepayMerchantId}
                onChangeText={setFonepayMerchantId}
                placeholder="e.g. 9841234567 or FP-109283"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.modalInputLabel, { color: theme.colors.textSecondary }]}>
                Counter ID / Terminal ID (Optional)
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                value={fonepayCounterId}
                onChangeText={setFonepayCounterId}
                placeholder="e.g. Counter-01"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                onPress={() => setShowFonepayModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleSaveFonepay}
                disabled={savingFonepay}
              >
                {savingFonepay ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Save Credentials</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
  },

  // Profile Header Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  profileTextCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    gap: 5,
  },
  cloudDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  cloudBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  signInBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  signInBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Category Layout (Matches Reference Screenshot)
  categoryBlock: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  cardGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowLabel: {
    fontSize: 14.5,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  rowSubLabel: {
    fontSize: 11.5,
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValueText: {
    fontSize: 13,
    fontWeight: '400',
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 58,
  },

  footerNote: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 11,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  passwordInputBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  passwordTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
  },

  // Template Modal Styles
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  templateInput: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  previewBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  previewHeaderTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewMsgText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Actions
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
