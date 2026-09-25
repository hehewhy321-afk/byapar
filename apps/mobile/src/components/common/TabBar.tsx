import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { AnimatedPressable } from './AnimatedPressable';

const { width } = Dimensions.get('window');

export const TabBar: React.FC = () => {
  const { activeTab, setActiveTab, cart, theme, themeMode, language, t } = useApp();
  const [showMoreModal, setShowMoreModal] = useState(false);

  const isDark = themeMode === 'dark';

  // Primary 5 tabs
  const mainTabs: {
    key: ActiveTab;
    label: string;
    icon: keyof typeof Feather.glyphMap;
    badge?: number;
  }[] = [
    { key: 'dashboard', label: t('home'), icon: 'home' },
    { key: 'sales', label: t('sales'), icon: 'trending-up' },
    { key: 'bills', label: t('billsArchive'), icon: 'archive' },
    { key: 'expenses', label: t('expenses'), icon: 'dollar-sign' },
    { key: 'more', label: t('more'), icon: 'grid' },
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
      key: 'pos',
      label: t('pos'),
      sub: language === 'ne' ? 'छिटो बारकोड र नगद बिलिङ' : 'Fast barcode & cash register',
      icon: 'shopping-bag',
      color: '#FF4500',
      bg: 'rgba(255, 69, 0, 0.14)',
    },
    {
      key: 'ledger',
      label: t('ledger'),
      sub: language === 'ne' ? 'ग्राहक, साहुजी र उधारो खाता' : 'Parties, credit & udharo khata',
      icon: 'book-open',
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.14)',
    },
    {
      key: 'inventory',
      label: t('inventory'),
      sub: language === 'ne' ? 'सामान, मूल्य र कम स्टक' : 'Products, catalog & low stock',
      icon: 'box',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.14)',
    },
    {
      key: 'purchase',
      label: t('purchaseHub'),
      sub: language === 'ne' ? 'खरिद बिल र भुक्तानी हिसाब' : 'Bills, Payments Out, Returns',
      icon: 'truck',
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.14)',
    },
    {
      key: 'accounts',
      label: t('accounts'),
      sub: language === 'ne' ? 'नगद, बैंक तथा ट्रान्सफर' : 'Cash, Banks & Transfers',
      icon: 'credit-card',
      color: '#A855F7',
      bg: 'rgba(168, 85, 247, 0.14)',
    },
    {
      key: 'staff',
      label: t('staff'),
      sub: language === 'ne' ? 'कर्मचारी र पहुँच अनुमति' : 'Permissions & Team',
      icon: 'users',
      color: '#0EA5E9',
      bg: 'rgba(14, 165, 233, 0.14)',
    },
    {
      key: 'reports',
      label: t('reports'),
      sub: language === 'ne' ? 'दैनिक हिसाब, नाफा र भ्याट' : 'Statements, Daybook, VAT',
      icon: 'bar-chart-2',
      color: '#EC4899',
      bg: 'rgba(236, 72, 153, 0.14)',
    },
    {
      key: 'notes',
      label: language === 'ne' ? 'दैनिक टिपोट (Notes)' : 'Daily Notes',
      sub: language === 'ne' ? 'अर्डर, चेक र पसलका नोटहरू' : 'Quick notes & memos',
      icon: 'file-text',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.14)',
    },
    {
      key: 'business_card',
      label: language === 'ne' ? 'डिजिटल भिजिटिङ कार्ड' : 'Business Card',
      sub: language === 'ne' ? 'पसलको ब्रान्डेड कार्ड सेयर' : 'Share digital shop card',
      icon: 'award',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.14)',
    },
    {
      key: 'utilities',
      label: language === 'ne' ? 'क्याल्कुलेटर र औजार' : 'Calculators & Tools',
      sub: language === 'ne' ? 'EMI, ब्याज, VAT, मार्जिन र क्यास' : 'EMI, Interest, VAT & Margins',
      icon: 'percent',
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.14)',
    },
    {
      key: 'settings',
      label: t('settings'),
      sub: language === 'ne' ? 'पसल विवरण, भाषा र प्रिन्ट' : 'Store profile, language & print',
      icon: 'settings',
      color: '#6B7280',
      bg: 'rgba(107, 114, 128, 0.14)',
    },
  ];

  const isMoreActive = [
    'pos',
    'ledger',
    'inventory',
    'purchase',
    'accounts',
    'staff',
    'reports',
    'settings',
    'reminders',
    'notes',
    'business_card',
    'utilities',
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
                  {language === 'ne' ? 'सबै सेवा तथा मोड्युलहरू' : 'All Modules & Tools'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: theme.colors.textSecondary }]}>
                  {language === 'ne' ? 'व्यापारका सबै सुविधाहरू' : 'Quick navigation to all business features'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setShowMoreModal(false)}
              >
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
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
            </ScrollView>
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
