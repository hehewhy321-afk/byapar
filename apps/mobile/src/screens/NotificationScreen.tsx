import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import {
  subscribeNotificationUpdates,
  initMobileNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationPreferences,
} from '../services/notificationService';
import { analytics } from '../services/analyticsService';
import type { NotificationItem } from '../types';

export const NotificationScreen: React.FC = () => {
  const { activeBizId, store, setActiveTab, theme, refreshData } = useApp();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'debtor_reminder' | 'supplier_payable' | 'low_stock' | 'system'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [prefsEnabled, setPrefsEnabled] = useState(true);

  const currentBizId = activeBizId || store.id || 'a0000000-0000-0000-0000-000000000001';

  useEffect(() => {
    initMobileNotifications(currentBizId);
    getNotificationPreferences().then((p) => setPrefsEnabled(p.enabled));
    const unsubscribe = subscribeNotificationUpdates((list) => {
      setNotifications(list);
      getNotificationPreferences().then((p) => setPrefsEnabled(p.enabled));
    });
    return () => unsubscribe();
  }, [currentBizId]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        initMobileNotifications(currentBizId),
        refreshData(),
      ]);
    } catch (e) {
      console.warn('[NotificationScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'system') {
        return n.type === 'system' || n.type === 'subscription_alert' || n.type === 'admin_broadcast';
      }
      return n.type === activeFilter;
    });
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Group notifications chronologically by date
  const groupedNotifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const groups: { [key: string]: NotificationItem[] } = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Earlier: [],
    };

    filteredList.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      itemDate.setHours(0, 0, 0, 0);

      if (itemDate.getTime() === today.getTime()) {
        groups.Today.push(item);
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(item);
      } else if (itemDate > sevenDaysAgo) {
        groups['This Week'].push(item);
      } else {
        groups.Earlier.push(item);
      }
    });

    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([title, items]) => ({ title, items }));
  }, [filteredList]);

  const handleSendWhatsApp = (n: NotificationItem) => {
    const phone = n.data?.partyPhone;
    const name = n.data?.partyName || 'Customer';
    const amount = n.data?.amount ? `Rs. ${n.data.amount.toLocaleString()}` : 'pending balance';
    const shopName = store.name || 'Byapar';

    analytics.logReminderSent(name, Number(n.data?.amount) || 0, 'whatsapp');

    const text = encodeURIComponent(
      `Namaste ${name} ji,\nFriendly payment reminder from ${shopName} regarding your outstanding balance of ${amount}. Kindly clear the due at your convenience.\nThank you!`
    );

    const cleanPhone = phone?.replace(/\D/g, '') || '';
    const url = cleanPhone
      ? `whatsapp://send?phone=977${cleanPhone.length === 10 ? cleanPhone : cleanPhone.slice(-10)}&text=${text}`
      : `whatsapp://send?text=${text}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://wa.me/?text=${text}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://wa.me/?text=${text}`);
      });
  };

  const formatShortTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: theme.colors.borderGlass }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{unreadCount} new</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markReadBtn}
            onPress={() => markAllNotificationsAsRead(currentBizId)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.markReadText, { color: theme.colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Horizontal Chips */}
      <View style={[styles.filterBar, { borderBottomColor: theme.colors.borderGlass }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'debtor_reminder', label: 'Udhar' },
            { id: 'supplier_payable', label: 'Suppliers' },
            { id: 'low_stock', label: 'Stock' },
            { id: 'system', label: 'System' },
          ].map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : 'transparent',
                    borderColor: isSelected ? theme.colors.primary : theme.colors.borderGlass,
                  },
                ]}
                onPress={() => setActiveFilter(tab.id as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification Stream (No box design, separated cleanly by date) */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {groupedNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name={!prefsEnabled ? 'bell-off' : 'bell'} size={28} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {!prefsEnabled ? 'Notifications are Disabled' : 'No notifications'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}>
              {!prefsEnabled
                ? 'In-app notifications are switched off in your Settings. Turn them on to receive instant alerts.'
                : 'Customer payment reminders and business alerts will appear here.'}
            </Text>
            {!prefsEnabled && (
              <TouchableOpacity
                style={{
                  marginTop: 14,
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
                onPress={() => setActiveTab('settings')}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Open Settings
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          groupedNotifications.map((group) => (
            <View key={group.title} style={styles.dateGroup}>
              {/* Date Section Header */}
              <View style={[styles.dateHeaderRow, { backgroundColor: theme.colors.bg }]}>
                <Text style={[styles.dateHeaderText, { color: theme.colors.textMuted }]}>
                  {group.title.toUpperCase()}
                </Text>
                <View style={[styles.dateDividerLine, { backgroundColor: theme.colors.borderGlass }]} />
              </View>

              {/* Minimal Notification Rows (NO BOX) */}
              {group.items.map((item) => {
                const isDebtor = item.type === 'debtor_reminder';
                const isSupplier = item.type === 'supplier_payable';
                const isStock = item.type === 'low_stock';

                let iconColor = '#8B5CF6';
                let iconName: any = 'bell';
                if (isDebtor) {
                  iconColor = '#EF4444';
                  iconName = 'user-check';
                } else if (isSupplier) {
                  iconColor = '#3B82F6';
                  iconName = 'truck';
                } else if (isStock) {
                  iconColor = '#F59E0B';
                  iconName = 'alert-triangle';
                } else if (item.type === 'admin_broadcast') {
                  iconColor = '#10B981';
                  iconName = 'volume-2';
                }

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    style={[
                      styles.itemRow,
                      {
                        borderBottomColor: theme.colors.borderGlass,
                        backgroundColor: !item.isRead ? 'rgba(255, 69, 0, 0.04)' : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      markNotificationAsRead(item.id);
                      analytics.logNotificationOpened(item.id, item.type);
                    }}
                  >
                    {/* Compact Icon */}
                    <View style={[styles.iconCircle, { backgroundColor: iconColor + '18' }]}>
                      <Feather name={iconName} size={15} color={iconColor} />
                    </View>

                    {/* Content Column */}
                    <View style={styles.itemCenter}>
                      <View style={styles.itemTitleRow}>
                        <Text
                          style={[
                            styles.itemTitle,
                            {
                              color: theme.colors.textPrimary,
                              fontWeight: !item.isRead ? '700' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
                      </View>

                      <Text
                        style={[styles.itemMessage, { color: theme.colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.message}
                      </Text>

                      {/* Minimal Inline Action Buttons */}
                      {(isDebtor || isSupplier || isStock) && (
                        <View style={styles.inlineActionRow}>
                          {isDebtor && (
                            <>
                              <TouchableOpacity
                                style={styles.inlineActionBtnGreen}
                                onPress={() => handleSendWhatsApp(item)}
                              >
                                <FontAwesome5 name="whatsapp" size={11} color="#10B981" />
                                <Text style={styles.inlineActionTextGreen}>WhatsApp Remind</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.inlineActionBtnGray}
                                onPress={() => {
                                  markNotificationAsRead(item.id);
                                  setActiveTab('ledger');
                                }}
                              >
                                <Text style={[styles.inlineActionTextGray, { color: theme.colors.textMuted }]}>
                                  View Khata
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}

                          {isSupplier && (
                            <TouchableOpacity
                              style={styles.inlineActionBtnBlue}
                              onPress={() => {
                                markNotificationAsRead(item.id);
                                setActiveTab('purchase');
                              }}
                            >
                              <Text style={styles.inlineActionTextBlue}>Pay Due Bill</Text>
                            </TouchableOpacity>
                          )}

                          {isStock && (
                            <TouchableOpacity
                              style={styles.inlineActionBtnAmber}
                              onPress={() => {
                                markNotificationAsRead(item.id);
                                setActiveTab('inventory');
                              }}
                            >
                              <Text style={styles.inlineActionTextAmber}>Check Stock</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Right Meta Column: Time & Delete */}
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemTime, { color: theme.colors.textMuted }]}>
                        {formatShortTime(item.createdAt)}
                      </Text>
                      <TouchableOpacity
                        style={styles.trashBtn}
                        onPress={() => deleteNotification(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="x" size={13} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  unreadPill: {
    backgroundColor: '#FF4500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  markReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 8,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  dateHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  dateDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  /* Minimal Flat Row - NO BOX */
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  itemCenter: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 13,
    flex: 1,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
    paddingTop: 2,
    gap: 6,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  trashBtn: {
    padding: 2,
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  inlineActionBtnGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  inlineActionTextGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  inlineActionBtnGray: {
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  inlineActionTextGray: {
    fontSize: 11,
    fontWeight: '600',
  },
  inlineActionBtnBlue: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  inlineActionTextBlue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
  },
  inlineActionBtnAmber: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  inlineActionTextAmber: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
