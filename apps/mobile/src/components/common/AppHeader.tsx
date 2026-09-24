import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { AnimatedPressable } from './AnimatedPressable';
import { BranchSwitcherModal } from '../BranchSwitcherModal';
import { SubscriptionModal } from '../SubscriptionModal';
import { getMobileSubscription } from '../../services/subscriptionService';
import {
  initMobileNotifications,
  subscribeNotificationUpdates,
} from '../../services/notificationService';

const TAB_TITLES: Record<string, string> = {
  sales: 'Sales Hub',
  bills: 'Bill Archive',
  expenses: 'Expense & Income',
  pos: 'Point of Sale',
  purchase: 'Purchase Hub',
  accounts: 'Accounts & Cash',
  inventory: 'Stock & Inventory',
  ledger: 'Khata Ledger',
  reports: 'Reports & Analytics',
  staff: 'Staff & Team',
  settings: 'Settings',
  notifications: 'Notifications',
};

export const AppHeader: React.FC = () => {
  const { store, activeBizId, setActiveTab, activeTab, theme, t } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subState, setSubState] = useState<any>(null);

  const getScreenTitle = (tab: string): string => {
    switch (tab) {
      case 'sales':
        return t('salesHub');
      case 'bills':
        return t('billsArchive');
      case 'expenses':
        return t('expenses');
      case 'pos':
        return t('pos');
      case 'purchase':
        return t('purchaseHub');
      case 'accounts':
        return t('accounts');
      case 'inventory':
        return t('inventory');
      case 'ledger':
        return t('ledger');
      case 'reports':
        return t('reports');
      case 'staff':
        return t('staff');
      case 'settings':
        return t('settings');
      case 'notifications':
        return t('notifications');
      default:
        return 'Byapar';
    }
  };

  const refreshSubscription = async () => {
    try {
      const bizId = activeBizId || store.id;
      if (bizId) {
        const sub = await getMobileSubscription(bizId);
        setSubState(sub);
      }
    } catch (err) {
      console.warn('Failed to load subscription in header:', err);
    }
  };

  useEffect(() => {
    refreshSubscription();
  }, [activeBizId, store.id]);

  useEffect(() => {
    const bizId = activeBizId || store.id;
    initMobileNotifications(bizId);
    const unsubscribe = subscribeNotificationUpdates((list) => {
      const unread = list.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    });
    return () => unsubscribe();
  }, [activeBizId, store.id]);

  const isPaid =
    subState?.planTier &&
    subState?.planTier !== 'free' &&
    subState?.status === 'active';

  const isDashboard = activeTab === 'dashboard';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.bg,
          borderBottomColor: theme.colors.borderGlass,
        },
      ]}
    >
      {/* LEFT SECTION */}
      {isDashboard ? (
        // Homescreen: Direct Store Switcher / Creator button
        <TouchableOpacity
          style={[
            styles.storeSwitcherBtn,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.borderGlass,
            },
          ]}
          onPress={() => setShowBranchModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.storeIconBox}>
            <Feather name="briefcase" size={14} color={theme.colors.primary} />
          </View>
          <Text
            style={[styles.storeNameText, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {store.name || 'My Store'}
          </Text>
          {isPaid && (
            <View style={styles.proBadge}>
              <Feather name="zap" size={9} color="#FFFFFF" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
          <Feather name="chevron-down" size={14} color={theme.colors.textMuted} />
        </TouchableOpacity>
      ) : (
        // Other screens: Clean, uncluttered screen title (no back arrow, no logo, no store name)
        <View style={styles.titleContainer}>
          <Text
            style={[styles.screenTitle, { color: theme.colors.textPrimary }]}
            numberOfLines={1}
          >
            {getScreenTitle(activeTab)}
          </Text>
        </View>
      )}

      {/* RIGHT ACTIONS */}
      <View style={styles.headerRightActions}>
        {/* On homescreen, show Upgrade pill ONLY if on free plan */}
        {isDashboard && !isPaid && (
          <AnimatedPressable
            style={styles.upgradePill}
            onPress={() => setShowSubModal(true)}
            activeScale={0.92}
          >
            <Feather name="zap" size={13} color="#FFFFFF" />
            <Text style={styles.upgradePillText}>{t('upgrade')}</Text>
          </AnimatedPressable>
        )}

        <AnimatedPressable
          style={[
            styles.settingsBtn,
            {
              backgroundColor: theme.colors.card,
              borderColor:
                activeTab === 'notifications'
                  ? theme.colors.primary
                  : theme.colors.borderGlass,
            },
            activeTab === 'notifications' && styles.settingsBtnActive,
          ]}
          onPress={() => setActiveTab('notifications')}
          activeScale={0.9}
        >
          <Feather
            name="bell"
            size={18}
            color={
              activeTab === 'notifications'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </AnimatedPressable>

        <AnimatedPressable
          style={[
            styles.settingsBtn,
            {
              backgroundColor: theme.colors.card,
              borderColor:
                activeTab === 'settings'
                  ? theme.colors.primary
                  : theme.colors.borderGlass,
            },
            activeTab === 'settings' && styles.settingsBtnActive,
          ]}
          onPress={() => setActiveTab('settings')}
          activeScale={0.9}
        >
          <Feather
            name="settings"
            size={18}
            color={
              activeTab === 'settings'
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          />
        </AnimatedPressable>
      </View>

      {/* MULTI-STORE BRANCH SWITCHER MODAL */}
      <BranchSwitcherModal
        visible={showBranchModal}
        onClose={() => setShowBranchModal(false)}
        onOpenSubscription={() => {
          setShowBranchModal(false);
          setShowSubModal(true);
        }}
      />

      {/* SUBSCRIPTION UPGRADE MODAL */}
      <SubscriptionModal
        visible={showSubModal}
        onClose={() => {
          setShowSubModal(false);
          refreshSubscription();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  storeSwitcherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: '65%',
  },
  storeIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 69, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeNameText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FF4500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upgradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF4500',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  langBtn: {
    paddingHorizontal: 8,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  settingsBtnActive: {},
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
