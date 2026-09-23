import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { AnimatedPressable } from './AnimatedPressable';
import {
  initMobileNotifications,
  subscribeNotificationUpdates,
} from '../../services/notificationService';

export const AppHeader: React.FC = () => {
  const { store, activeBizId, setActiveTab, activeTab, navigateBack, theme } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const bizId = activeBizId || store.id;
    initMobileNotifications(bizId);
    const unsubscribe = subscribeNotificationUpdates((list) => {
      const unread = list.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    });
    return () => unsubscribe();
  }, [activeBizId, store.id]);

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
      <View style={styles.brandRow}>
        {activeTab !== 'dashboard' && (
          <AnimatedPressable
            style={[
              styles.backBtn,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.borderGlass,
              },
            ]}
            onPress={() => navigateBack()}
            activeScale={0.9}
          >
            <Feather name="arrow-left" size={17} color={theme.colors.textPrimary} />
          </AnimatedPressable>
        )}
        <View style={styles.logoBadge}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImg}
            resizeMode="cover"
          />
        </View>
        <View style={styles.brandCol}>
          <Text style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>Byapar</Text>
          <Text
            style={[styles.storeSubtitle, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {store.name}
          </Text>
        </View>
      </View>

      <View style={styles.headerRightActions}>
        <AnimatedPressable
          style={[
            styles.settingsBtn,
            {
              backgroundColor: theme.colors.card,
              borderColor: activeTab === 'notifications' ? theme.colors.primary : theme.colors.borderGlass,
            },
            activeTab === 'notifications' && styles.settingsBtnActive,
          ]}
          onPress={() => setActiveTab('notifications')}
          activeScale={0.9}
        >
          <Feather
            name="bell"
            size={18}
            color={activeTab === 'notifications' ? theme.colors.primary : theme.colors.textSecondary}
          />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </AnimatedPressable>

        <AnimatedPressable
          style={[
            styles.settingsBtn,
            {
              backgroundColor: theme.colors.card,
              borderColor: activeTab === 'settings' ? theme.colors.primary : theme.colors.borderGlass,
            },
            activeTab === 'settings' && styles.settingsBtnActive,
          ]}
          onPress={() => setActiveTab('settings')}
          activeScale={0.9}
        >
          <Feather
            name="settings"
            size={18}
            color={activeTab === 'settings' ? theme.colors.primary : theme.colors.textSecondary}
          />
        </AnimatedPressable>
      </View>
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
  brandRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 16,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  brandCol: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  storeSubtitle: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
