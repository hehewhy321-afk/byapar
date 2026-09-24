import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { ActiveTab, Party, LedgerEntry } from '../types';
import { OnboardingChecklistWidget } from '../components/OnboardingChecklistWidget';

export const DashboardScreen: React.FC = () => {
  const {
    store,
    theme,
    themeMode,
    setActiveTab,
    invoices,
    parties,
    accounts,
    products,
    purchaseBills,
    ledgerEntries,
    addLedgerEntry,
    cart,
    user,
    language,
    t,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [quickLedgerModal, setQuickLedgerModal] = useState(false);
  const [quickLedgerPartyId, setQuickLedgerPartyId] = useState('');
  const [quickLedgerType, setQuickLedgerType] = useState<'credit' | 'payment'>('credit');
  const [quickLedgerAmount, setQuickLedgerAmount] = useState('');
  const [quickLedgerNote, setQuickLedgerNote] = useState('');
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactFilterType, setContactFilterType] = useState<'all' | 'customer' | 'supplier'>('all');

  const selectedQuickParty = useMemo(() => {
    return parties.find((p) => p.id === quickLedgerPartyId) || null;
  }, [parties, quickLedgerPartyId]);

  const filteredPickerParties = useMemo(() => {
    return parties.filter((p) => {
      const matchQuery =
        p.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
        p.phone.includes(contactSearchQuery);
      const matchType = contactFilterType === 'all' || p.type === contactFilterType;
      return matchQuery && matchType;
    });
  }, [parties, contactSearchQuery, contactFilterType]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  // Financial Metrics Calculations
  const metrics = useMemo(() => {
    const totalSales = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const totalPurchases = purchaseBills.reduce((sum, bill) => sum + (Number(bill.totalAmount) || 0), 0);
    const toReceive = parties
      .filter((p) => p.balance > 0)
      .reduce((sum, p) => sum + p.balance, 0);
    const toGive = parties
      .filter((p) => p.balance < 0)
      .reduce((sum, p) => sum + Math.abs(p.balance), 0);
    const totalBalance = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const lowStockCount = products.filter((p) => p.stock <= 5).length;

    return {
      totalSales,
      totalPurchases,
      toReceive,
      toGive,
      totalBalance,
      lowStockCount,
      totalProducts: products.length,
      totalParties: parties.length,
    };
  }, [invoices, purchaseBills, parties, accounts, products]);

  // Combined Recent Activity (Latest 6 entries)
  const recentActivities = useMemo(() => {
    const list: {
      id: string;
      title: string;
      sub: string;
      amount: number;
      isPositive: boolean;
      time: string;
      icon: keyof typeof Feather.glyphMap;
      tab: ActiveTab;
    }[] = [];

    invoices.slice(0, 3).forEach((inv) => {
      list.push({
        id: `inv-${inv.id}`,
        title: `Sale #${inv.invoiceNumber}`,
        sub: inv.partyName || 'Walk-in Customer',
        amount: inv.total,
        isPositive: true,
        time: inv.date,
        icon: 'trending-up',
        tab: 'sales',
      });
    });

    ledgerEntries.slice(0, 3).forEach((entry) => {
      const party = parties.find((p) => p.id === entry.partyId);
      const isCredit = entry.type === 'credit';
      list.push({
        id: `ldg-${entry.id}`,
        title: isCredit ? 'Credit Given' : 'Payment Received',
        sub: party ? party.name : 'Ledger Party',
        amount: entry.amount,
        isPositive: !isCredit,
        time: entry.date,
        icon: isCredit ? 'arrow-up-right' : 'arrow-down-left',
        tab: 'ledger',
      });
    });

    purchaseBills.slice(0, 2).forEach((pb) => {
      list.push({
        id: `pb-${pb.id}`,
        title: `Purchase #${pb.billNumber}`,
        sub: pb.supplierName || 'Supplier',
        amount: pb.totalAmount,
        isPositive: false,
        time: pb.date,
        icon: 'truck',
        tab: 'purchase',
      });
    });

    return list.slice(0, 6);
  }, [invoices, ledgerEntries, purchaseBills, parties]);

  const handleSaveQuickLedger = async () => {
    const amt = parseFloat(quickLedgerAmount);
    if (!quickLedgerPartyId) {
      Alert.alert('Required', 'Please select a customer or supplier.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Required', 'Please enter a valid amount.');
      return;
    }

    try {
      await addLedgerEntry({
        partyId: quickLedgerPartyId,
        date: new Date().toISOString().split('T')[0],
        type: quickLedgerType,
        amount: amt,
        note: quickLedgerNote || (quickLedgerType === 'credit' ? 'Quick Credit' : 'Quick Payment'),
      });
      setQuickLedgerModal(false);
      setQuickLedgerAmount('');
      setQuickLedgerNote('');
      Alert.alert('Success', 'Ledger entry recorded successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save ledger entry.');
    }
  };

  const isDark = themeMode === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* MERCHANT ONBOARDING PROGRESS CHECKLIST */}
        <OnboardingChecklistWidget />

        {/* BENTO GRID: ROW 1 - CRITICAL FINANCIAL METRICS */}
        <View style={styles.gridRow}>
          {/* Card 1: To Receive (Receivables) */}
          <TouchableOpacity
            style={[
              styles.bentoCard,
              styles.cardHalf,
              {
                backgroundColor: isDark ? '#111827' : '#F0FDF4',
                borderColor: isDark ? '#1E293B' : '#DCFCE7',
              },
            ]}
            onPress={() => setActiveTab('ledger')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardLabel, { color: isDark ? '#9CA3AF' : '#166534' }]}>
                {language === 'ne' ? 'लिन बाँकी' : 'TO RECEIVE'}
              </Text>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Feather name="arrow-down-left" size={16} color="#10B981" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#10B981' }]}>
              Rs. {metrics.toReceive.toLocaleString()}
            </Text>
            <Text style={[styles.cardFootnote, { color: theme.colors.textMuted }]}>
              {language === 'ne'
                ? `${parties.filter((p) => p.balance > 0).length} जना ग्राहकबाट`
                : `From ${parties.filter((p) => p.balance > 0).length} customers`}
            </Text>
          </TouchableOpacity>

          {/* Card 2: To Pay (Payables) */}
          <TouchableOpacity
            style={[
              styles.bentoCard,
              styles.cardHalf,
              {
                backgroundColor: isDark ? '#1F1215' : '#FEF2F2',
                borderColor: isDark ? '#3B191E' : '#FEE2E2',
              },
            ]}
            onPress={() => setActiveTab('ledger')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardLabel, { color: isDark ? '#9CA3AF' : '#991B1B' }]}>
                {language === 'ne' ? 'तिर्न बाँकी' : 'TO PAY'}
              </Text>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Feather name="arrow-up-right" size={16} color="#EF4444" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#EF4444' }]}>
              Rs. {metrics.toGive.toLocaleString()}
            </Text>
            <Text style={[styles.cardFootnote, { color: theme.colors.textMuted }]}>
              {language === 'ne'
                ? `${parties.filter((p) => p.balance < 0).length} जना साहुजीलाई`
                : `To ${parties.filter((p) => p.balance < 0).length} suppliers`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* BENTO GRID: ROW 2 - SALES & CASH POSITION */}
        <View style={styles.gridRow}>
          {/* Total Sales */}
          <TouchableOpacity
            style={[
              styles.bentoCard,
              styles.cardHalf,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
            onPress={() => setActiveTab('sales')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                {language === 'ne' ? 'कुल बिक्री' : 'TOTAL SALES'}
              </Text>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 69, 0, 0.12)' }]}>
                <Feather name="shopping-bag" size={16} color={theme.colors.primary} />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: theme.colors.textPrimary }]}>
              Rs. {metrics.totalSales.toLocaleString()}
            </Text>
            <Text style={[styles.cardFootnote, { color: theme.colors.textMuted }]}>
              {language === 'ne'
                ? `${invoices.length} वटा बिल काटिएको`
                : `${invoices.length} invoices generated`}
            </Text>
          </TouchableOpacity>

          {/* Cash & Bank Balance */}
          <TouchableOpacity
            style={[
              styles.bentoCard,
              styles.cardHalf,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
            onPress={() => setActiveTab('accounts')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                {language === 'ne' ? 'नगद तथा बैंक' : 'CASH & BANK'}
              </Text>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
                <Feather name="credit-card" size={16} color="#0EA5E9" />
              </View>
            </View>
            <Text style={[styles.cardValue, { color: '#0EA5E9' }]}>
              Rs. {metrics.totalBalance.toLocaleString()}
            </Text>
            <Text style={[styles.cardFootnote, { color: theme.colors.textMuted }]}>
              {language === 'ne'
                ? `${accounts.length} वटा खाताहरू`
                : `${accounts.length} active accounts`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* QUICK SHORTCUTS BENTO TILES */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          {language === 'ne' ? 'द्रुत कार्य तथा कारोबार' : 'Quick Actions & Operations'}
        </Text>
        <View style={styles.shortcutGrid}>
          <TouchableOpacity
            style={[
              styles.shortcutCard,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
            onPress={() => setActiveTab('pos')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: 'rgba(255, 69, 0, 0.14)' }]}>
              <Feather name="shopping-cart" size={20} color={theme.colors.primary} />
            </View>
            <Text style={[styles.shortcutTitle, { color: theme.colors.textPrimary }]}>
              {t('pos')}
            </Text>
            <Text style={[styles.shortcutDesc, { color: theme.colors.textMuted }]}>
              {language === 'ne' ? 'छिटो बिल काट्ने' : 'Fast checkout'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.shortcutCard,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
            onPress={() => setActiveTab('ledger')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
              <Feather name="book-open" size={20} color="#10B981" />
            </View>
            <Text style={[styles.shortcutTitle, { color: theme.colors.textPrimary }]}>
              {t('ledger')}
            </Text>
            <Text style={[styles.shortcutDesc, { color: theme.colors.textMuted }]}>
              {language === 'ne' ? 'उधारो तथा ताकेता' : 'Credit & reminders'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.shortcutCard,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
            onPress={() => setActiveTab('inventory')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: 'rgba(168, 85, 247, 0.14)' }]}>
              <Feather name="box" size={20} color="#A855F7" />
            </View>
            <Text style={[styles.shortcutTitle, { color: theme.colors.textPrimary }]}>
              {t('inventory')}
            </Text>
            <Text style={[styles.shortcutDesc, { color: theme.colors.textMuted }]}>
              {language === 'ne' ? `${metrics.totalProducts} वटा सामान` : `${metrics.totalProducts} items`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.shortcutCard,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.8}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: 'rgba(236, 72, 153, 0.14)' }]}>
              <Feather name="bar-chart-2" size={20} color="#EC4899" />
            </View>
            <Text style={[styles.shortcutTitle, { color: theme.colors.textPrimary }]}>
              {t('reports')}
            </Text>
            <Text style={[styles.shortcutDesc, { color: theme.colors.textMuted }]}>
              {language === 'ne' ? 'नाफा र स्टेटमेन्ट' : 'P&L & statements'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* RECENT TRANSACTIONS FEED */}
        <View style={styles.activityHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginBottom: 0 }]}>
            {language === 'ne' ? 'पछिल्ला कारोबारहरू' : 'Recent Transactions'}
          </Text>
          <TouchableOpacity onPress={() => setActiveTab('sales')}>
            <Text style={[styles.viewAllLink, { color: theme.colors.primary }]}>
              {language === 'ne' ? 'सबै हेर्नुहोस्' : 'View Hub'}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.activityContainer,
            {
              backgroundColor: isDark ? '#141414' : '#FFFFFF',
              borderColor: isDark ? '#262626' : '#E2E8F0',
            },
          ]}
        >
          {recentActivities.map((act, index) => (
            <TouchableOpacity
              key={act.id}
              style={[
                styles.activityRow,
                index < recentActivities.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#222222' : '#F1F5F9',
                },
              ]}
              onPress={() => setActiveTab(act.tab)}
            >
              <View
                style={[
                  styles.activityIconBox,
                  {
                    backgroundColor: act.isPositive
                      ? 'rgba(16, 185, 129, 0.12)'
                      : 'rgba(239, 68, 68, 0.12)',
                  },
                ]}
              >
                <Feather
                  name={act.icon}
                  size={16}
                  color={act.isPositive ? '#10B981' : '#EF4444'}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.activityTitle, { color: theme.colors.textPrimary }]}>
                  {act.title}
                </Text>
                <Text style={[styles.activitySub, { color: theme.colors.textMuted }]}>
                  {act.sub} • {act.time}
                </Text>
              </View>
              <Text
                style={[
                  styles.activityAmount,
                  { color: act.isPositive ? '#10B981' : theme.colors.textPrimary },
                ]}
              >
                {act.isPositive ? '+ ' : '- '}Rs. {act.amount.toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
          {recentActivities.length === 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Feather name="inbox" size={32} color={theme.colors.textMuted} />
              <Text style={{ color: theme.colors.textMuted, marginTop: 8, fontSize: 13 }}>
                No recent transactions.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FLOATING ACTION BUTTON (FAB) FOR QUICK RECORD ENTRY */}
      <TouchableOpacity
        style={[styles.floatingRecordBtn, { backgroundColor: theme.colors.primary }]}
        onPress={() => setQuickLedgerModal(true)}
        activeOpacity={0.88}
      >
        <Feather name="plus" size={18} color="#FFFFFF" />
        <Text style={styles.floatingRecordText}>Udhar</Text>
      </TouchableOpacity>
      <Modal
        visible={quickLedgerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickLedgerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setQuickLedgerModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Quick Record Entry
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Record customer/supplier credit or payment
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setQuickLedgerModal(false)}
              >
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  quickLedgerType === 'credit' && styles.typeTabCreditActive,
                ]}
                onPress={() => setQuickLedgerType('credit')}
              >
                <Feather
                  name="plus-circle"
                  size={15}
                  color={quickLedgerType === 'credit' ? '#FFFFFF' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    quickLedgerType === 'credit' && styles.typeTabTextActive,
                  ]}
                >
                  Give Credit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  quickLedgerType === 'payment' && styles.typeTabPaymentActive,
                ]}
                onPress={() => setQuickLedgerType('payment')}
              >
                <Feather
                  name="check-circle"
                  size={15}
                  color={quickLedgerType === 'payment' ? '#FFFFFF' : theme.colors.primary}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    quickLedgerType === 'payment' && styles.typeTabTextActive,
                  ]}
                >
                  Got Payment
                </Text>
              </TouchableOpacity>
            </View>

            {/* Party Selector Dropdown */}
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Select Contact (Party) *
            </Text>
            <TouchableOpacity
              style={[
                styles.partySelectTrigger,
                {
                  backgroundColor: isDark ? '#1C1C1C' : '#F8FAFC',
                  borderColor: quickLedgerPartyId ? theme.colors.primary : isDark ? '#333333' : '#CBD5E1',
                },
              ]}
              onPress={() => {
                setContactSearchQuery('');
                setContactPickerVisible(true);
              }}
              activeOpacity={0.8}
            >
              {selectedQuickParty ? (
                <View style={styles.selectedPartyDisplay}>
                  <View style={[styles.partyAvatarCircle, { backgroundColor: theme.colors.primaryBg }]}>
                    <Text style={[styles.partyAvatarText, { color: theme.colors.primary }]}>
                      {selectedQuickParty.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.selectedPartyName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {selectedQuickParty.name}
                      </Text>
                      <View
                        style={[
                          styles.contactTypePill,
                          {
                            backgroundColor:
                              selectedQuickParty.type === 'customer'
                                ? 'rgba(14, 165, 233, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            borderColor:
                              selectedQuickParty.type === 'customer' ? '#0EA5E9' : '#F59E0B',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.contactTypePillText,
                            { color: selectedQuickParty.type === 'customer' ? '#0EA5E9' : '#F59E0B' },
                          ]}
                        >
                          {selectedQuickParty.type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.selectedPartyPhone, { color: theme.colors.textMuted }]}>
                      {selectedQuickParty.phone || 'No phone'} • Balance: Rs. {Math.abs(selectedQuickParty.balance).toLocaleString()}
                    </Text>
                  </View>
                  <Feather name="chevron-down" size={18} color={theme.colors.textSecondary} />
                </View>
              ) : (
                <View style={styles.partySelectPlaceholder}>
                  <Feather name="user-check" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                  <Text style={[styles.partySelectPlaceholderText, { color: theme.colors.textMuted }]}>
                    Choose customer or supplier...
                  </Text>
                  <Feather name="chevron-down" size={18} color={theme.colors.textMuted} />
                </View>
              )}
            </TouchableOpacity>

            {/* Amount */}
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Amount (Rs.) *
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                {
                  backgroundColor: isDark ? '#1F1F1F' : '#F8FAFC',
                  borderColor: quickLedgerType === 'credit' ? '#EF4444' : theme.colors.primary,
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
              value={quickLedgerAmount}
              onChangeText={setQuickLedgerAmount}
            />

            {/* Note */}
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Note / Description
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#1F1F1F' : '#F8FAFC',
                  borderColor: isDark ? '#333333' : '#CBD5E1',
                  color: theme.colors.textPrimary,
                },
              ]}
              placeholder="e.g. Groceries, partial clearance"
              placeholderTextColor={theme.colors.textMuted}
              value={quickLedgerNote}
              onChangeText={setQuickLedgerNote}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: isDark ? '#262626' : '#E2E8F0' },
                ]}
                onPress={() => setQuickLedgerModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  {
                    backgroundColor:
                      quickLedgerType === 'credit' ? '#EF4444' : theme.colors.primary,
                  },
                ]}
                onPress={handleSaveQuickLedger}
              >
                <Feather name="check" size={16} color="#FFFFFF" />
                <Text style={styles.modalSubmitText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONTACT PICKER SEARCHABLE MODAL */}
      <Modal
        visible={contactPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setContactPickerVisible(false)}
          />
          <View
            style={[
              styles.pickerModalCard,
              {
                backgroundColor: isDark ? '#161616' : '#FFFFFF',
                borderColor: isDark ? '#2A2A2A' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Select Contact
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  Search party or filter by customer / supplier
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setContactPickerVisible(false)}
              >
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View
              style={[
                styles.pickerSearchBar,
                {
                  backgroundColor: isDark ? '#202020' : '#F1F5F9',
                  borderColor: isDark ? '#333333' : '#CBD5E1',
                },
              ]}
            >
              <Feather name="search" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.pickerSearchInput, { color: theme.colors.textPrimary }]}
                placeholder="Search contact name or phone..."
                placeholderTextColor={theme.colors.textMuted}
                value={contactSearchQuery}
                onChangeText={setContactSearchQuery}
              />
              {contactSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                  <Feather name="x-circle" size={16} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Role Filter Chips */}
            <View style={styles.pickerFilterRow}>
              {(['all', 'customer', 'supplier'] as const).map((ft) => {
                const isActive = contactFilterType === ft;
                return (
                  <TouchableOpacity
                    key={ft}
                    style={[
                      styles.pickerFilterChip,
                      isActive && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                      !isActive && {
                        backgroundColor: isDark ? '#222222' : '#F1F5F9',
                        borderColor: isDark ? '#333333' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => setContactFilterType(ft)}
                  >
                    <Text
                      style={[
                        styles.pickerFilterChipText,
                        {
                          color: isActive ? '#FFFFFF' : theme.colors.textSecondary,
                          fontWeight: isActive ? '800' : '600',
                        },
                      ]}
                    >
                      {ft === 'all' ? 'All' : ft === 'customer' ? 'Customers' : 'Suppliers'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Contacts FlatList */}
            <FlatList
              data={filteredPickerParties}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320, marginTop: 8 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.id === quickLedgerPartyId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerItemRow,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? '#242424'
                            : '#EEF2F6'
                          : isDark
                          ? '#1A1A1A'
                          : '#FAFAFA',
                        borderColor: isSelected ? theme.colors.primary : isDark ? '#2A2A2A' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => {
                      setQuickLedgerPartyId(item.id);
                      setContactPickerVisible(false);
                    }}
                  >
                    <View style={[styles.partyAvatarCircle, { backgroundColor: theme.colors.primaryBg }]}>
                      <Text style={[styles.partyAvatarText, { color: theme.colors.primary }]}>
                        {item.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text
                          style={[
                            styles.pickerItemName,
                            { color: theme.colors.textPrimary, fontWeight: isSelected ? '800' : '600' },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.contactTypePill,
                            {
                              backgroundColor:
                                item.type === 'customer'
                                  ? 'rgba(14, 165, 233, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              borderColor:
                                item.type === 'customer' ? '#0EA5E9' : '#F59E0B',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.contactTypePillText,
                              { color: item.type === 'customer' ? '#0EA5E9' : '#F59E0B' },
                            ]}
                          >
                            {item.type.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.pickerItemPhone, { color: theme.colors.textMuted }]}>
                        {item.phone || 'No phone'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.pickerItemBalance,
                          {
                            color:
                              item.balance > 0
                                ? '#10B981'
                                : item.balance < 0
                                ? '#EF4444'
                                : theme.colors.textMuted,
                          },
                        ]}
                      >
                        Rs. {Math.abs(item.balance).toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>
                        {item.balance > 0 ? 'Receivable' : item.balance < 0 ? 'Payable' : 'Settled'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Feather name="users" size={28} color={theme.colors.textMuted} style={{ marginBottom: 6 }} />
                  <Text style={{ color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                    No contacts found matching "{contactSearchQuery}".
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 88,
  },
  floatingRecordBtn: {
    position: 'absolute',
    bottom: 20,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingRecordText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  syncText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#10B981',
  },
  storeTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  storeSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  quickEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  quickEntryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  bentoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHalf: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardFootnote: {
    fontSize: 11,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 12,
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  shortcutCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  shortcutDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  activityContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 30,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  activityIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  activitySub: {
    fontSize: 11,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333333',
  },
  typeTabCreditActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  typeTabPaymentActive: {
    backgroundColor: '#FF4500',
    borderColor: '#FF4500',
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888888',
  },
  typeTabTextActive: {
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 8,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  textInput: {
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  partySelectTrigger: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  selectedPartyDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  partyAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  selectedPartyName: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedPartyPhone: {
    fontSize: 11,
    marginTop: 2,
  },
  contactTypePill: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  contactTypePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  partySelectPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  partySelectPlaceholderText: {
    flex: 1,
    fontSize: 13,
  },
  pickerModalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginTop: 6,
    marginBottom: 10,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  pickerFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pickerFilterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pickerFilterChipText: {
    fontSize: 12,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickerItemName: {
    fontSize: 14,
  },
  pickerItemPhone: {
    fontSize: 11,
    marginTop: 2,
  },
  pickerItemBalance: {
    fontSize: 13,
    fontWeight: '800',
  },
});
