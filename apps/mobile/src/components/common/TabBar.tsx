import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { AnimatedPressable } from './AnimatedPressable';

const { width } = Dimensions.get('window');

export const TabBar: React.FC = () => {
  const { activeTab, setActiveTab, cart, theme, themeMode } = useApp();
  const [showMoreModal, setShowMoreModal] = useState(false);

  const isDark = themeMode === 'dark';

  // Primary 5 tabs
  const mainTabs: {
    key: ActiveTab;
    label: string;
    icon: keyof typeof Feather.glyphMap;
    badge?: number;
  }[] = [
    { key: 'dashboard', label: 'Home', icon: 'home' },
    {
      key: 'pos',
      label: 'POS',
      icon: 'shopping-bag',
      badge: cart.reduce((sum, item) => sum + item.qty, 0) || undefined,
    },
    { key: 'ledger', label: 'Ledger', icon: 'book-open' },
    { key: 'inventory', label: 'Stock', icon: 'box' },
    { key: 'more', label: 'More', icon: 'grid' },
  ];

  // Secondary tabs inside "More" modal
  const moreModules: {
    key: ActiveTab;
    label: string;
    sub: string;
    icon: keyof typeof Feather.glyphMap;
    color: string;
    bg: string;
  }[] = [
    {
      key: 'sales',
      label: 'Sales Hub',
      sub: 'Invoices, Quotes, Payments',
      icon: 'trending-up',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.14)',
    },
    {
      key: 'purchase',
      label: 'Purchase Hub',
      sub: 'Bills, Payments Out, Returns',
      icon: 'truck',
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.14)',
    },
    {
      key: 'accounts',
      label: 'Bank Accounts',
      sub: 'Cash, Banks & Transfers',
      icon: 'credit-card',
      color: '#A855F7',
      bg: 'rgba(168, 85, 247, 0.14)',
    },
    {
      key: 'staff',
      label: 'Staff & Roles',
      sub: 'Permissions & Team',
      icon: 'users',
      color: '#0EA5E9',
      bg: 'rgba(14, 165, 233, 0.14)',
    },
    {
      key: 'bills',
      label: 'Bills Archive',
      sub: 'Physical receipts & photos',
      icon: 'camera',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.14)',
    },
    {
      key: 'reports',
      label: 'Reports & P&L',
      sub: 'Statements, Daybook, VAT',
      icon: 'bar-chart-2',
      color: '#EC4899',
      bg: 'rgba(236, 72, 153, 0.14)',
    },
    {
      key: 'settings',
      label: 'Settings',
      sub: 'Store profile, theme & print',
      icon: 'settings',
      color: '#6B7280',
      bg: 'rgba(107, 114, 128, 0.14)',
    },
  ];

  const isMoreActive = [
    'sales',
    'purchase',
    'accounts',
    'staff',
    'bills',
    'reports',
    'settings',
    'more',
  ].includes(activeTab);

  const handleTabPress = (key: ActiveTab) => {
    if (key === 'more') {
      setShowMoreModal(true);
    } else {
      setActiveTab(key);
    }
  };

  const handleSelectMoreModule = (key: ActiveTab) => {
    setActiveTab(key);
    setShowMoreModal(false);
  };

  return (
    <>
      <View
        style={[
          styles.bottomBarWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.borderGlass,
          },
        ]}
      >
        <View style={styles.barContainer}>
          {mainTabs.map((tab) => {
            const isActive = tab.key === 'more' ? isMoreActive : activeTab === tab.key;
            return (
              <AnimatedPressable
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => handleTabPress(tab.key)}
                activeScale={0.9}
              >
                <View style={styles.iconContainer}>
                  <Feather
                    name={tab.icon}
                    size={20}
                    color={isActive ? theme.colors.primary : theme.colors.textMuted}
                  />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <View
                      style={[
                        styles.cartBadge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={styles.cartBadgeText}>{tab.badge}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? theme.colors.primary : theme.colors.textMuted,
                      fontWeight: isActive ? '800' : '600',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {/* MORE MODULES BOTTOM SHEET / MODAL */}
      <Modal
        visible={showMoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowMoreModal(false)}
          />

          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandleRow}>
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: isDark ? '#333333' : '#CBD5E1' },
                ]}
              />
            </View>

            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                  All Modules & Tools
                </Text>
                <Text style={[styles.sheetSubtitle, { color: theme.colors.textSecondary }]}>
                  Quick navigation to all business features
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setShowMoreModal(false)}
              >
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modulesGrid}>
              {moreModules.map((item) => {
                const isCurrent = activeTab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.moduleCard,
                      {
                        backgroundColor: isCurrent
                          ? theme.colors.primaryBg
                          : isDark
                          ? '#1A1A1A'
                          : '#F8FAFC',
                        borderColor: isCurrent ? theme.colors.primary : isDark ? '#262626' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => handleSelectMoreModule(item.key)}
                  >
                    <View style={[styles.moduleIconBox, { backgroundColor: item.bg }]}>
                      <Feather name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={styles.moduleTextCol}>
                      <Text
                        style={[
                          styles.moduleTitle,
                          {
                            color: isCurrent ? theme.colors.primary : theme.colors.textPrimary,
                            fontWeight: isCurrent ? '800' : '700',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={[styles.moduleSub, { color: theme.colors.textSecondary }]}>
                        {item.sub}
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={isCurrent ? theme.colors.primary : theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bottomBarWrapper: {
    borderTopWidth: 1,
    paddingBottom: 4,
  },
  barContainer: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: 'transparent',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandleRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  modulesGrid: {
    gap: 10,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  moduleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleTextCol: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 14,
  },
  moduleSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
