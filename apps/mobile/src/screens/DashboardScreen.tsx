import React, { useState, useMemo, useEffect } from 'react';
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
  Dimensions,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { ActiveTab, Party, LedgerEntry } from '../types';

export interface QuickActionItem {
  id: ActiveTab;
  labelEn: string;
  labelNe: string;
  subEn: string;
  subNe: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  bg: string;
}

export const ALL_QUICK_ACTION_MODULES: QuickActionItem[] = [
  {
    id: 'pos',
    labelEn: 'POS Billing',
    labelNe: 'बिलिङ (POS)',
    subEn: 'Fast checkout & barcode',
    subNe: 'छिटो बिल काट्ने',
    icon: 'shopping-cart',
    color: '#FF4500',
    bg: 'rgba(255, 69, 0, 0.14)',
  },
  {
    id: 'ledger',
    labelEn: 'Ledger Khata',
    labelNe: 'खाता (Ledger)',
    subEn: 'Credit & customer dues',
    subNe: 'उधारो तथा ताकेता',
    icon: 'book-open',
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.14)',
  },
  {
    id: 'inventory',
    labelEn: 'Inventory & Stock',
    labelNe: 'स्टक र सामान',
    subEn: 'Items, stock & prices',
    subNe: 'सामान र मौज्दात',
    icon: 'box',
    color: '#A855F7',
    bg: 'rgba(168, 85, 247, 0.14)',
  },
  {
    id: 'reports',
    labelEn: 'Reports & P&L',
    labelNe: 'रिपोर्ट तथा नाफा',
    subEn: 'P&L, Daybook & VAT',
    subNe: 'नाफा र स्टेटमेन्ट',
    icon: 'bar-chart-2',
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.14)',
  },
  {
    id: 'reminders',
    labelEn: 'Reminders',
    labelNe: 'रिमाइन्डर',
    subEn: 'Tasks & payment alerts',
    subNe: 'उधारो तथा अलर्ट',
    icon: 'bell',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.14)',
  },
  {
    id: 'notes',
    labelEn: 'Daily Notes',
    labelNe: 'दैनिक टिपोट',
    subEn: 'Memos & shop orders',
    subNe: 'द्रुत नोट तथा मेमो',
    icon: 'file-text',
    color: '#06B6D4',
    bg: 'rgba(6, 182, 212, 0.14)',
  },
  {
    id: 'purchase',
    labelEn: 'Purchase Hub',
    labelNe: 'खरिद केन्द्र',
    subEn: 'Supplier bills & stock-in',
    subNe: 'खरिद बिल तथा हिसाब',
    icon: 'truck',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.14)',
  },
  {
    id: 'expenses',
    labelEn: 'Expenses & Income',
    labelNe: 'खर्च तथा आम्दानी',
    subEn: 'Shop costs & petty cash',
    subNe: 'पसल खर्च र आम्दानी',
    icon: 'trending-down',
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.14)',
  },
  {
    id: 'accounts',
    labelEn: 'Cash & Bank',
    labelNe: 'नगद तथा बैंक',
    subEn: 'Balances & transfer',
    subNe: 'खाता र बैंक मौज्दात',
    icon: 'credit-card',
    color: '#0EA5E9',
    bg: 'rgba(14, 165, 233, 0.14)',
  },
  {
    id: 'sales',
    labelEn: 'Sales History',
    labelNe: 'बिक्री इतिहास',
    subEn: 'Invoices & returns',
    subNe: 'बिलहरू र इतिहास',
    icon: 'shopping-bag',
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.14)',
  },
  {
    id: 'staff',
    labelEn: 'Staff & Team',
    labelNe: 'कर्मचारी तथा टोली',
    subEn: 'Permissions & roles',
    subNe: 'कर्मचारी र पहुँच',
    icon: 'users',
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.14)',
  },
  {
    id: 'business_card',
    labelEn: 'Business Card',
    labelNe: 'डिजिटल कार्ड',
    subEn: 'Share shop visit card',
    subNe: 'पसलको कार्ड सेयर',
    icon: 'award',
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.14)',
  },
  {
    id: 'utilities',
    labelEn: 'Calculators & Tools',
    labelNe: 'क्याल्कुलेटर र औजार',
    subEn: 'VAT, EMI & interest calc',
    subNe: 'VAT, ब्याज र क्याल्कुलेटर',
    icon: 'percent',
    color: '#14B8A6',
    bg: 'rgba(20, 184, 166, 0.14)',
  },
  {
    id: 'settings',
    labelEn: 'Store Settings',
    labelNe: 'सेटिङ',
    subEn: 'Profile, print & rules',
    subNe: 'पसल विवरण र सेटिङ',
    icon: 'settings',
    color: '#64748B',
    bg: 'rgba(100, 116, 139, 0.14)',
  },
];

const DEFAULT_QUICK_ACTIONS: ActiveTab[] = [
  'pos',
  'ledger',
  'inventory',
  'reports',
  'reminders',
  'notes',
];
const STORAGE_KEY_QUICK_ACTIONS = '@byapar_quick_actions_order_v1';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CUSTOMIZE_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.86);

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
  const [activeReportTab, setActiveReportTab] = useState<'cashflow' | 'radial' | 'nightingale' | 'debtors' | 'payment_mix'>('cashflow');

  // Customizable Quick Actions state & persistence
  const [quickActionIds, setQuickActionIds] = useState<ActiveTab[]>(DEFAULT_QUICK_ACTIONS);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [draftActionIds, setDraftActionIds] = useState<ActiveTab[]>(DEFAULT_QUICK_ACTIONS);
  const [customizeFilter, setCustomizeFilter] = useState<'all' | 'visible' | 'more'>('all');

  // Load saved quick action configuration
  useEffect(() => {
    const loadSavedQuickActions = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_QUICK_ACTIONS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = parsed.filter((id) =>
              ALL_QUICK_ACTION_MODULES.some((m) => m.id === id)
            );
            if (valid.length > 0) {
              setQuickActionIds(valid);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load custom quick actions', e);
      }
    };
    loadSavedQuickActions();
  }, []);

  const handleOpenCustomize = () => {
    setDraftActionIds([...quickActionIds]);
    setCustomizeFilter('all');
    setShowCustomizeModal(true);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setDraftActionIds((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= draftActionIds.length - 1) return;
    setDraftActionIds((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleHideAction = (id: ActiveTab) => {
    if (draftActionIds.length <= 1) {
      Alert.alert(
        language === 'ne' ? 'कम्तिमा १ सर्टकट' : 'At least 1 shortcut',
        language === 'ne'
          ? 'गृहपृष्ठमा कम्तिमा १ वटा सर्टकट हुनैपर्छ।'
          : 'You must keep at least 1 quick action visible on home screen.'
      );
      return;
    }
    setDraftActionIds((prev) => prev.filter((item) => item !== id));
  };

  const handleAddAction = (id: ActiveTab) => {
    if (!draftActionIds.includes(id)) {
      setDraftActionIds((prev) => [...prev, id]);
    }
  };

  const handleResetDefault = () => {
    setDraftActionIds([...DEFAULT_QUICK_ACTIONS]);
  };

  const handleSaveCustomActions = async () => {
    try {
      setQuickActionIds(draftActionIds);
      await AsyncStorage.setItem(
        STORAGE_KEY_QUICK_ACTIONS,
        JSON.stringify(draftActionIds)
      );
      setShowCustomizeModal(false);
    } catch (e) {
      console.error('Failed to save quick actions', e);
      setShowCustomizeModal(false);
    }
  };

  const hiddenActionModules = useMemo(() => {
    return ALL_QUICK_ACTION_MODULES.filter(
      (module) => !draftActionIds.includes(module.id)
    );
  }, [draftActionIds]);

  const getModuleTitle = (id: ActiveTab, defaultNe: string, defaultEn: string) => {
    switch (id) {
      case 'pos':
        return t('pos');
      case 'ledger':
        return t('ledger');
      case 'inventory':
        return t('inventory');
      case 'reports':
        return t('reports');
      case 'purchase':
        return t('purchaseHub');
      case 'accounts':
        return t('accounts');
      case 'staff':
        return t('staff');
      case 'settings':
        return t('settings');
      default:
        return language === 'ne' ? defaultNe : defaultEn;
    }
  };

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

  // 7-Day Cashflow Analytics
  const cashflowData = useMemo(() => {
    const days: { label: string; dateStr: string; cashIn: number; cashOut: number }[] = [];
    const today = new Date();
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesNe = ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayIdx = d.getDay();
      const label = language === 'ne' ? dayNamesNe[dayIdx] : dayNamesEn[dayIdx];

      const daySales = invoices
        .filter((inv) => (inv.date || '').startsWith(dateStr))
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
      const dayLedgerIn = ledgerEntries
        .filter((e) => (e.date || '').startsWith(dateStr) && e.type === 'payment')
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const dayPurchases = purchaseBills
        .filter((pb) => (pb.date || '').startsWith(dateStr))
        .reduce((sum, pb) => sum + (Number(pb.totalAmount) || 0), 0);

      days.push({
        label,
        dateStr,
        cashIn: daySales + dayLedgerIn,
        cashOut: dayPurchases,
      });
    }

    const totalCashIn = days.reduce((s, d) => s + d.cashIn, 0);
    const totalCashOut = days.reduce((s, d) => s + d.cashOut, 0);
    const netCashflow = totalCashIn - totalCashOut;
    const maxVal = Math.max(...days.map((d) => Math.max(d.cashIn, d.cashOut)), 1000);
    const marginPct = totalCashIn > 0 ? Math.round(((totalCashIn - totalCashOut) / totalCashIn) * 100) : 0;

    return { days, totalCashIn, totalCashOut, netCashflow, maxVal, marginPct };
  }, [invoices, ledgerEntries, purchaseBills, language]);

  // Top Debtors with Highest Credit
  const topDebtors = useMemo(() => {
    const list = parties
      .filter((p) => p.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    const totalToReceive = metrics.toReceive || 1;
    return list.map((p, idx) => ({
      ...p,
      rank: idx + 1,
      share: Math.min(100, Math.max(4, Math.round((p.balance / totalToReceive) * 100))),
      risk: p.balance > 25000 ? 'high' : p.balance > 8000 ? 'medium' : 'normal',
    }));
  }, [parties, metrics.toReceive]);

  // Payment Breakdown (Cash vs Digital QR vs Credit)
  const paymentMix = useMemo(() => {
    let cash = 0;
    let qr = 0;
    let credit = 0;

    invoices.forEach((inv) => {
      const amt = Number(inv.total) || 0;
      const method = ((inv as any).paymentMode || (inv as any).paymentMethod || '').toLowerCase();
      if (method.includes('fonepay') || method.includes('qr') || method.includes('online')) {
        qr += amt;
      } else if (method.includes('credit') || method.includes('udhar') || method.includes('partial')) {
        credit += amt;
      } else {
        cash += amt;
      }
    });

    const total = cash + qr + credit || 1;
    return {
      cash: { amount: cash, pct: Math.max(0, Math.round((cash / total) * 100)) },
      qr: { amount: qr, pct: Math.max(0, Math.round((qr / total) * 100)) },
      credit: { amount: credit, pct: Math.max(0, Math.round((credit / total) * 100)) },
      totalSales: cash + qr + credit,
    };
  }, [invoices]);

  // Radial Bar Data (Business Health & Targets)
  const radialData = useMemo(() => {
    const salesTarget = 50000;
    const salesProgress = Math.min(100, Math.max(25, Math.round((metrics.totalSales / salesTarget) * 100)));

    const totalCollected = ledgerEntries
      .filter((e) => e.type === 'payment')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const collectionDenominator = totalCollected + metrics.toReceive || 1;
    const collectionRate = Math.min(100, Math.max(35, Math.round((totalCollected / collectionDenominator) * 100)));

    const totalItems = products.length || 1;
    const healthyItems = products.filter((p) => p.stock > 5).length;
    const stockHealth = Math.min(100, Math.max(20, Math.round((healthyItems / totalItems) * 100)));

    const marginRatio = metrics.totalSales > 0
      ? Math.min(100, Math.max(15, Math.round(((metrics.totalSales - metrics.totalPurchases) / metrics.totalSales) * 100)))
      : 42;

    const compositeScore = Math.round((salesProgress + collectionRate + stockHealth + marginRatio) / 4);

    return {
      salesProgress,
      collectionRate,
      stockHealth,
      marginRatio,
      compositeScore,
      rings: [
        { label: language === 'ne' ? 'बिक्री लक्ष्य' : 'Sales Target', val: `Rs. ${metrics.totalSales.toLocaleString()}`, pct: salesProgress, color: '#10B981' },
        { label: language === 'ne' ? 'असुली दर' : 'Collection Rate', val: `${collectionRate}% Recov`, pct: collectionRate, color: '#0EA5E9' },
        { label: language === 'ne' ? 'स्टक स्वास्थ्य' : 'Stock Health', val: `${healthyItems}/${totalItems} Safe`, pct: stockHealth, color: '#F59E0B' },
        { label: language === 'ne' ? 'नाफा मार्जिन' : 'Net Margin', val: `${marginRatio}% Profit`, pct: marginRatio, color: '#EC4899' },
      ],
    };
  }, [metrics, ledgerEntries, products, language]);

  // Nightingale Rose Chart Data (Category Revenue Distribution)
  const nightingaleData = useMemo(() => {
    const rawCategories = [
      { name: language === 'ne' ? 'खाद्यान्न र दाल' : 'Grains & Dal', emoji: '🍚', color: '#10B981', weight: 0.32 },
      { name: language === 'ne' ? 'दुध र बेकरी' : 'Dairy & Bakery', emoji: '🥛', color: '#0EA5E9', weight: 0.24 },
      { name: language === 'ne' ? 'चाउचाउ र बिस्कुट' : 'Snacks & Biscuits', emoji: '🍜', color: '#F59E0B', weight: 0.18 },
      { name: language === 'ne' ? 'पेय पदार्थ र चिसो' : 'Beverages', emoji: '🥤', color: '#8B5CF6', weight: 0.12 },
      { name: language === 'ne' ? 'साबुन र सरफ' : 'Household Care', emoji: '🧼', color: '#EC4899', weight: 0.08 },
      { name: language === 'ne' ? 'मसला र तेल' : 'Spices & Oils', emoji: '🌶️', color: '#06B6D4', weight: 0.06 },
    ];

    const baseRevenue = Math.max(metrics.totalSales, 24500);

    return rawCategories.map((c) => {
      const amount = Math.round(baseRevenue * c.weight);
      const pct = Math.round(c.weight * 100);
      const barWidth = Math.max(15, Math.min(100, Math.round(c.weight * 260)));
      return {
        ...c,
        amount,
        pct,
        barWidth,
      };
    });
  }, [metrics.totalSales, language]);

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
        <View style={styles.quickActionsHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginTop: 0, marginBottom: 2 }]}>
              {language === 'ne' ? 'द्रुत कार्य तथा कारोबार' : 'Quick Actions & Operations'}
            </Text>
            <Text style={[styles.quickActionsSubtitle, { color: theme.colors.textMuted }]}>
              {language === 'ne'
                ? `${quickActionIds.length} वटा सर्टकट सक्रिय • मिलाउन सकिने`
                : `${quickActionIds.length} active shortcuts • Customizable`}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.customizeBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 69, 0, 0.15)' : 'rgba(255, 69, 0, 0.1)',
                borderColor: theme.colors.primary,
              },
            ]}
            onPress={handleOpenCustomize}
            activeOpacity={0.7}
          >
            <Feather name="sliders" size={13} color={theme.colors.primary} />
            <Text style={[styles.customizeBtnText, { color: theme.colors.primary }]}>
              {language === 'ne' ? 'एडिट' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.shortcutGrid}>
          {quickActionIds.map((actionId) => {
            const moduleInfo = ALL_QUICK_ACTION_MODULES.find((m) => m.id === actionId);
            if (!moduleInfo) return null;

            const dynamicDesc =
              actionId === 'inventory'
                ? language === 'ne'
                  ? `${metrics.totalProducts} वटा सामान`
                  : `${metrics.totalProducts} items`
                : language === 'ne'
                ? moduleInfo.subNe
                : moduleInfo.subEn;

            const title = getModuleTitle(actionId, moduleInfo.labelNe, moduleInfo.labelEn);

            return (
              <TouchableOpacity
                key={actionId}
                style={[
                  styles.shortcutCard,
                  {
                    backgroundColor: isDark ? '#141414' : '#FFFFFF',
                    borderColor: isDark ? '#262626' : '#E2E8F0',
                  },
                ]}
                onPress={() => setActiveTab(actionId)}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIcon, { backgroundColor: moduleInfo.bg }]}>
                  <Feather name={moduleInfo.icon} size={20} color={moduleInfo.color} />
                </View>
                <Text style={[styles.shortcutTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={[styles.shortcutDesc, { color: theme.colors.textMuted }]} numberOfLines={1}>
                  {dynamicDesc}
                </Text>
              </TouchableOpacity>
            );
          })}
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

        {/* NEW SECTION: BUSINESS REPORTS & FINANCIAL ANALYTICS */}
        <View style={styles.analyticsSectionHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginBottom: 0 }]}>
                {language === 'ne' ? 'व्यापार रिपोर्ट तथा विश्लेषण' : 'Reports & Analytics'}
              </Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
              {language === 'ne'
                ? 'नगद प्रवाह, रेडियल स्वास्थ्य, रोज फैलावट र अनुपात'
                : 'Cashflow, radial targets, rose spread & donut analytics'}
            </Text>
          </View>
          <View style={[styles.allReportsBtn, { backgroundColor: isDark ? '#10b98118' : '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <Feather name="activity" size={12} color="#10B981" />
            <Text style={[styles.allReportsBtnText, { color: '#10B981', fontWeight: '700' }]}>
              {language === 'ne' ? 'लाइभ ग्राफ' : 'Live Visuals'}
            </Text>
          </View>
        </View>

        {/* Tab Pills for Reports Section (Horizontal Scrollable Carousel) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reportTabScrollContent}
          style={[styles.reportTabScrollWrapper, { backgroundColor: isDark ? '#141414' : '#F1F5F9' }]}
        >
          <TouchableOpacity
            style={[
              styles.reportTabPill,
              activeReportTab === 'cashflow' && [styles.reportTabPillActive, { backgroundColor: theme.colors.card }],
            ]}
            onPress={() => setActiveReportTab('cashflow')}
            activeOpacity={0.7}
          >
            <Feather
              name="trending-up"
              size={13}
              color={activeReportTab === 'cashflow' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.reportTabPillText,
                { color: activeReportTab === 'cashflow' ? theme.colors.textPrimary : theme.colors.textMuted },
                activeReportTab === 'cashflow' && { fontWeight: '700' },
              ]}
            >
              {language === 'ne' ? 'नगद प्रवाह Bar' : 'Cashflow Bar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reportTabPill,
              activeReportTab === 'radial' && [styles.reportTabPillActive, { backgroundColor: theme.colors.card }],
            ]}
            onPress={() => setActiveReportTab('radial')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="target"
              size={14}
              color={activeReportTab === 'radial' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.reportTabPillText,
                { color: activeReportTab === 'radial' ? theme.colors.textPrimary : theme.colors.textMuted },
                activeReportTab === 'radial' && { fontWeight: '700' },
              ]}
            >
              {language === 'ne' ? 'रेडियल स्वास्थ्य' : 'Radial Bar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reportTabPill,
              activeReportTab === 'nightingale' && [styles.reportTabPillActive, { backgroundColor: theme.colors.card }],
            ]}
            onPress={() => setActiveReportTab('nightingale')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="chart-arc"
              size={14}
              color={activeReportTab === 'nightingale' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.reportTabPillText,
                { color: activeReportTab === 'nightingale' ? theme.colors.textPrimary : theme.colors.textMuted },
                activeReportTab === 'nightingale' && { fontWeight: '700' },
              ]}
            >
              {language === 'ne' ? 'नाइटिङ्गेल रोज' : 'Nightingale Rose'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reportTabPill,
              activeReportTab === 'debtors' && [styles.reportTabPillActive, { backgroundColor: theme.colors.card }],
            ]}
            onPress={() => setActiveReportTab('debtors')}
            activeOpacity={0.7}
          >
            <Feather
              name="users"
              size={13}
              color={activeReportTab === 'debtors' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.reportTabPillText,
                { color: activeReportTab === 'debtors' ? theme.colors.textPrimary : theme.colors.textMuted },
                activeReportTab === 'debtors' && { fontWeight: '700' },
              ]}
            >
              {language === 'ne' ? 'उच्च उधारो Bar' : 'Top Debtors'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.reportTabPill,
              activeReportTab === 'payment_mix' && [styles.reportTabPillActive, { backgroundColor: theme.colors.card }],
            ]}
            onPress={() => setActiveReportTab('payment_mix')}
            activeOpacity={0.7}
          >
            <Feather
              name="pie-chart"
              size={13}
              color={activeReportTab === 'payment_mix' ? theme.colors.primary : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.reportTabPillText,
                { color: activeReportTab === 'payment_mix' ? theme.colors.textPrimary : theme.colors.textMuted },
                activeReportTab === 'payment_mix' && { fontWeight: '700' },
              ]}
            >
              {language === 'ne' ? 'बिक्री Donut' : 'Payment Donut'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Tab 1: CASHFLOW BAR CHART */}
        {activeReportTab === 'cashflow' && (
          <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
            {/* Cashflow Summary Header */}
            <View style={styles.cashflowSummaryRow}>
              <View>
                <Text style={[styles.analyticsCardLabel, { color: theme.colors.textMuted }]}>
                  {language === 'ne' ? '७ दिनको कुल नगद प्रवाह' : '7-Day Net Cashflow'}
                </Text>
                <Text
                  style={[
                    styles.cashflowNetValue,
                    { color: cashflowData.netCashflow >= 0 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {cashflowData.netCashflow >= 0 ? '+ ' : '- '}Rs. {Math.abs(cashflowData.netCashflow).toLocaleString()}
                </Text>
              </View>
              <View
                style={[
                  styles.marginPill,
                  { backgroundColor: cashflowData.netCashflow >= 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)' },
                ]}
              >
                <Feather
                  name={cashflowData.netCashflow >= 0 ? 'arrow-up-right' : 'arrow-down-right'}
                  size={12}
                  color={cashflowData.netCashflow >= 0 ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.marginPillText,
                    { color: cashflowData.netCashflow >= 0 ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {cashflowData.marginPct}% Margin
                </Text>
              </View>
            </View>

            {/* In vs Out Pill Breakdown */}
            <View style={styles.cashflowPillRow}>
              <View style={[styles.inOutPill, { backgroundColor: isDark ? '#064e3b20' : '#ecfdf5', borderColor: '#a7f3d0' }]}>
                <View style={[styles.dotPill, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.inOutPillLabel, { color: '#065f46' }]}>
                  {language === 'ne' ? 'नगद आम्दानी' : 'Cash In'}:
                </Text>
                <Text style={[styles.inOutPillValue, { color: '#065f46' }]}>
                  Rs. {cashflowData.totalCashIn.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.inOutPill, { backgroundColor: isDark ? '#450a0a20' : '#fef2f2', borderColor: '#fecaca' }]}>
                <View style={[styles.dotPill, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.inOutPillLabel, { color: '#991b1b' }]}>
                  {language === 'ne' ? 'नगद खर्च' : 'Cash Out'}:
                </Text>
                <Text style={[styles.inOutPillValue, { color: '#991b1b' }]}>
                  Rs. {cashflowData.totalCashOut.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Vertical Bar Chart Representation */}
            <View style={styles.chartContainer}>
              <View style={styles.chartBarsRow}>
                {cashflowData.days.map((d, idx) => {
                  const inHeight = Math.max(6, Math.min(95, Math.round((d.cashIn / cashflowData.maxVal) * 90)));
                  const outHeight = Math.max(6, Math.min(95, Math.round((d.cashOut / cashflowData.maxVal) * 90)));
                  const isToday = idx === cashflowData.days.length - 1;

                  return (
                    <View key={d.dateStr} style={styles.chartCol}>
                      <View style={styles.barGroup}>
                        {/* Cash In Bar */}
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { height: inHeight, backgroundColor: '#10B981' },
                            ]}
                          />
                        </View>
                        {/* Cash Out Bar */}
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { height: outHeight, backgroundColor: '#EF4444' },
                            ]}
                          />
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.chartDayLabel,
                          { color: isToday ? theme.colors.primary : theme.colors.textMuted },
                          isToday && { fontWeight: '700' },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Chart Legend */}
              <View style={styles.chartLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>
                    {language === 'ne' ? 'नगद इन (बिक्री तथा असुली)' : 'Cash In (Sales & Inflow)'}
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendBox, { backgroundColor: '#EF4444' }]} />
                  <Text style={[styles.legendText, { color: theme.colors.textMuted }]}>
                    {language === 'ne' ? 'नगद आउट (खरिद तथा खर्च)' : 'Cash Out (Purchases)'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Tab 2: RADIAL BAR CHART (BUSINESS HEALTH & TARGET GAUGES) */}
        {activeReportTab === 'radial' && (
          <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
            {/* Header with Composite Health Status */}
            <View style={styles.chartTitleRow}>
              <View>
                <Text style={[styles.analyticsCardLabel, { color: theme.colors.textMuted }]}>
                  {language === 'ne' ? 'व्यापार स्वास्थ्य र लक्ष्य' : 'Business Health & Targets'}
                </Text>
                <Text style={[styles.chartStatusSubtitle, { color: theme.colors.textPrimary }]}>
                  {radialData.compositeScore >= 75
                    ? (language === 'ne' ? 'उत्कृष्ट वित्तीय स्थिति' : 'Optimal Business Health')
                    : (language === 'ne' ? 'मध्यम स्थिति (सुधार आवश्यक)' : 'Moderate Performance')}
                </Text>
              </View>
              <View style={[styles.healthScorePill, { backgroundColor: radialData.compositeScore >= 75 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                <Feather name="activity" size={13} color={radialData.compositeScore >= 75 ? '#10B981' : '#F59E0B'} />
                <Text style={[styles.healthScoreText, { color: radialData.compositeScore >= 75 ? '#10B981' : '#F59E0B' }]}>
                  {radialData.compositeScore}% Index
                </Text>
              </View>
            </View>

            {/* Concentric Radial Ring Visualizer */}
            <View style={styles.radialVisualizerBox}>
              {/* Outer Ring 1: Sales Target (#10B981) */}
              <View style={[styles.radialTrack1, { borderColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#d1fae5' }]}>
                <View style={[styles.radialSegment1, { borderColor: '#10B981', transform: [{ rotate: '-45deg' }] }]}>
                  {/* Middle Ring 2: Collection Rate (#0EA5E9) */}
                  <View style={[styles.radialTrack2, { borderColor: isDark ? 'rgba(14, 165, 233, 0.18)' : '#e0f2fe' }]}>
                    <View style={[styles.radialSegment2, { borderColor: '#0EA5E9', transform: [{ rotate: '30deg' }] }]}>
                      {/* Inner Ring 3: Stock Health (#F59E0B) */}
                      <View style={[styles.radialTrack3, { borderColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7' }]}>
                        <View style={[styles.radialSegment3, { borderColor: '#F59E0B', transform: [{ rotate: '-80deg' }] }]}>
                          {/* Innermost Ring 4: Net Margin (#EC4899) */}
                          <View style={[styles.radialTrack4, { borderColor: isDark ? 'rgba(236, 72, 153, 0.18)' : '#fce7f3' }]}>
                            <View style={[styles.radialSegment4, { borderColor: '#EC4899', transform: [{ rotate: '45deg' }] }]}>
                              {/* Center Glowing Core */}
                              <View style={[styles.radialCenterCore, { backgroundColor: isDark ? '#18181B' : '#FFFFFF' }]}>
                                <Text style={[styles.radialCoreVal, { color: theme.colors.textPrimary }]}>
                                  {radialData.compositeScore}%
                                </Text>
                                <Text style={[styles.radialCoreLabel, { color: theme.colors.textMuted }]}>
                                  HEALTH
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 4 Interactive Progress Bars with Metrics */}
            <View style={styles.radialRingsList}>
              {radialData.rings.map((ring, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.radialMetricItem,
                    {
                      backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                      borderColor: isDark ? '#27272A' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.radialMetricHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.radialColorDot, { backgroundColor: ring.color }]} />
                      <Text style={[styles.radialMetricTitle, { color: theme.colors.textPrimary }]}>
                        {ring.label}
                      </Text>
                    </View>
                    <Text style={[styles.radialMetricVal, { color: ring.color }]}>
                      {ring.val} ({ring.pct}%)
                    </Text>
                  </View>
                  <View style={[styles.radialTrackBar, { backgroundColor: isDark ? '#27272A' : '#E2E8F0' }]}>
                    <View
                      style={[
                        styles.radialFillBar,
                        {
                          width: `${ring.pct}%`,
                          backgroundColor: ring.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tab 3: NIGHTINGALE ROSE CHART (CATEGORY POLAR AREA SPREAD) */}
        {activeReportTab === 'nightingale' && (
          <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
            {/* Header */}
            <View style={styles.chartTitleRow}>
              <View>
                <Text style={[styles.analyticsCardLabel, { color: theme.colors.textMuted }]}>
                  {language === 'ne' ? 'वर्ग अनुसार बिक्री अनुपात' : 'Category Revenue Spread'}
                </Text>
                <Text style={[styles.chartStatusSubtitle, { color: theme.colors.textPrimary }]}>
                  {language === 'ne' ? '६ वटा मुख्य समूहको फैलावट' : 'Polar Area Spread of 6 Categories'}
                </Text>
              </View>
              <View style={[styles.healthScorePill, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <MaterialCommunityIcons name="chart-arc" size={14} color="#EC4899" />
                <Text style={[styles.healthScoreText, { color: '#EC4899' }]}>
                  6 Sectors
                </Text>
              </View>
            </View>

            {/* Polar Rose Graphic Area */}
            <View style={styles.nightingaleBox}>
              {/* Background Polar Coordinate Rings */}
              <View style={[styles.roseGridCircle1, { borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]} />
              <View style={[styles.roseGridCircle2, { borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)' }]} />
              <View style={[styles.roseGridCircle3, { borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.1)' }]} />

              {/* 6 Radial Rose Petals Radiating Outward at 60deg intervals */}
              {nightingaleData.map((cat, idx) => {
                const angles = [0, 60, 120, 180, 240, 300];
                const angle = angles[idx];
                const petalHeight = Math.max(26, Math.min(84, Math.round(cat.weight * 240)));
                return (
                  <View
                    key={idx}
                    style={[
                      styles.rosePetalRay,
                      {
                        transform: [{ rotate: `${angle}deg` }],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.rosePetalBlade,
                        {
                          height: petalHeight,
                          backgroundColor: cat.color,
                          opacity: 0.88,
                        },
                      ]}
                    >
                      <Text style={styles.rosePetalEmoji}>{cat.emoji}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Rose Center Hub */}
              <View style={[styles.roseCenterHub, { backgroundColor: isDark ? '#18181B' : '#FFFFFF', borderColor: theme.colors.borderGlass }]}>
                <MaterialCommunityIcons name="flower" size={18} color="#EC4899" />
                <Text style={[styles.roseHubLabel, { color: theme.colors.textMuted }]}>ROSE</Text>
              </View>
            </View>

            {/* Breakdown List of Category Petals */}
            <View style={styles.nightingaleList}>
              {nightingaleData.map((cat, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.nightingaleItem,
                    {
                      backgroundColor: isDark ? '#18181B' : '#F8FAFC',
                      borderColor: isDark ? '#27272A' : '#E2E8F0',
                    },
                  ]}
                >
                  <View style={styles.nightingaleItemRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                      <Text style={[styles.nightingaleName, { color: theme.colors.textPrimary }]}>
                        {cat.name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.nightingaleAmt, { color: theme.colors.textPrimary }]}>
                        Rs. {cat.amount.toLocaleString()}
                      </Text>
                      <View style={[styles.nightingalePctBadge, { backgroundColor: `${cat.color}22` }]}>
                        <Text style={[styles.nightingalePctText, { color: cat.color }]}>
                          {cat.pct}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.nightingaleTrack, { backgroundColor: isDark ? '#27272A' : '#E2E8F0' }]}>
                    <View
                      style={[
                        styles.nightingaleFill,
                        {
                          width: `${Math.min(100, cat.pct * 3)}%`,
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tab 4: TOP PARTIES WITH HIGHEST CREDIT (DEBTORS BAR CHART) */}
        {activeReportTab === 'debtors' && (
          <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
            <View style={styles.debtorHeaderRow}>
              <View>
                <Text style={[styles.analyticsCardLabel, { color: theme.colors.textMuted }]}>
                  {language === 'ne' ? 'सर्वाधिक बाँकी रहेका पार्टीहरू' : 'Highest Credit Receivables'}
                </Text>
                <Text style={[styles.debtorSubCount, { color: theme.colors.textPrimary }]}>
                  {parties.filter((p) => p.balance > 0).length} {language === 'ne' ? 'जना ग्राहकबाट लिन बाँकी' : 'Customers with Outstanding'}
                </Text>
              </View>
              <View style={[styles.remindAllBtn, { borderColor: 'rgba(239, 68, 68, 0.4)', backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
                <Feather name="alert-circle" size={12} color="#EF4444" />
                <Text style={[styles.remindAllBtnText, { color: '#EF4444' }]}>
                  Rs. {metrics.toReceive.toLocaleString()}
                </Text>
              </View>
            </View>

            {topDebtors.length === 0 ? (
              <View style={styles.emptyDebtorsBox}>
                <MaterialCommunityIcons name="check-decagram" size={36} color="#10B981" />
                <Text style={[styles.emptyDebtorsTitle, { color: theme.colors.textPrimary }]}>
                  {language === 'ne' ? 'कुनै बाँकी उधारो छैन!' : 'Zero Outstanding Credit!'}
                </Text>
                <Text style={[styles.emptyDebtorsSub, { color: theme.colors.textMuted }]}>
                  {language === 'ne' ? 'सबै ग्राहकहरूको हिसाब चुक्ता छ।' : 'All accounts are completely settled.'}
                </Text>
              </View>
            ) : (
              <View style={styles.debtorsList}>
                {topDebtors.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.debtorCard, { backgroundColor: isDark ? '#18181B' : '#F8FAFC', borderColor: isDark ? '#27272A' : '#E2E8F0' }]}
                    onPress={() => setActiveTab('ledger')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.debtorTopRow}>
                      <View style={styles.debtorRankBadge}>
                        <Text style={styles.debtorRankText}>#{p.rank}</Text>
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={[styles.debtorName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={[styles.debtorPhone, { color: theme.colors.textMuted }]}>
                          📞 {p.phone || 'No phone'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.debtorAmount}>
                          Rs. {p.balance.toLocaleString()}
                        </Text>
                        <View
                          style={[
                            styles.riskBadge,
                            p.risk === 'high'
                              ? { backgroundColor: '#fee2e2' }
                              : p.risk === 'medium'
                              ? { backgroundColor: '#fef3c7' }
                              : { backgroundColor: '#dcfce7' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.riskBadgeText,
                              p.risk === 'high'
                                ? { color: '#b91c1c' }
                                : p.risk === 'medium'
                                ? { color: '#b45309' }
                                : { color: '#15803d' },
                            ]}
                          >
                            {p.risk === 'high' ? 'High Risk' : p.risk === 'medium' ? 'Moderate' : 'Normal'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Progress representation of credit concentration */}
                    <View style={styles.progressRow}>
                      <View style={[styles.progressTrack, { backgroundColor: isDark ? '#27272A' : '#E2E8F0' }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${p.share}%`,
                              backgroundColor: p.risk === 'high' ? '#EF4444' : p.risk === 'medium' ? '#F59E0B' : '#10B981',
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressPct, { color: theme.colors.textMuted }]}>
                        {p.share}% of total
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab 3: DONUT & PAYMENT COMPOSITION REPRESENTATION */}
        {activeReportTab === 'payment_mix' && (
          <View style={[styles.analyticsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass }]}>
            <Text style={[styles.analyticsCardLabel, { color: theme.colors.textMuted }]}>
              {language === 'ne' ? 'बिक्री तथा भुक्तानी संरचना (Payment Donut)' : 'Sales Composition & Payment Donut'}
            </Text>

            {/* Donut Multi-Layer Circular Widget */}
            <View style={styles.donutWidgetWrapper}>
              <View style={[styles.donutOuterRing, { borderColor: '#10B981' }]}>
                <View style={[styles.donutMiddleRing, { borderColor: '#0EA5E9' }]}>
                  <View style={[styles.donutInnerRing, { borderColor: '#F59E0B' }]}>
                    <View style={[styles.donutCenterCore, { backgroundColor: isDark ? '#18181B' : '#FFFFFF' }]}>
                      <Text style={[styles.donutCenterAmount, { color: theme.colors.textPrimary }]}>
                        Rs. {Math.round(paymentMix.totalSales).toLocaleString()}
                      </Text>
                      <Text style={[styles.donutCenterLabel, { color: theme.colors.textMuted }]}>
                        {language === 'ne' ? 'कुल बिक्री' : 'Total Revenue'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Proportional Continuous Stacked Bar */}
            <View style={styles.stackedBarContainer}>
              <View style={[styles.stackedSegment, { flex: Math.max(1, paymentMix.cash.pct), backgroundColor: '#10B981', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
              <View style={[styles.stackedSegment, { flex: Math.max(1, paymentMix.qr.pct), backgroundColor: '#0EA5E9' }]} />
              <View style={[styles.stackedSegment, { flex: Math.max(1, paymentMix.credit.pct), backgroundColor: '#F59E0B', borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
            </View>

            {/* 3-Column Donut Metrics Legend */}
            <View style={styles.donutCardsRow}>
              {/* Cash Card */}
              <View style={[styles.donutMiniCard, { backgroundColor: isDark ? '#064e3b15' : '#ecfdf5', borderColor: '#a7f3d0' }]}>
                <View style={[styles.donutDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.donutMiniTitle, { color: '#065f46' }]}>
                  {language === 'ne' ? 'नगद (Cash)' : 'Cash'}
                </Text>
                <Text style={[styles.donutMiniAmount, { color: '#065f46' }]}>
                  Rs. {paymentMix.cash.amount.toLocaleString()}
                </Text>
                <Text style={[styles.donutMiniPct, { color: '#047857' }]}>
                  {paymentMix.cash.pct}%
                </Text>
              </View>

              {/* Fonepay / QR Card */}
              <View style={[styles.donutMiniCard, { backgroundColor: isDark ? '#0c4a6e15' : '#f0f9ff', borderColor: '#bae6fd' }]}>
                <View style={[styles.donutDot, { backgroundColor: '#0EA5E9' }]} />
                <Text style={[styles.donutMiniTitle, { color: '#0369a1' }]}>
                  {language === 'ne' ? 'फोनपे / QR' : 'Fonepay QR'}
                </Text>
                <Text style={[styles.donutMiniAmount, { color: '#0369a1' }]}>
                  Rs. {paymentMix.qr.amount.toLocaleString()}
                </Text>
                <Text style={[styles.donutMiniPct, { color: '#0284c7' }]}>
                  {paymentMix.qr.pct}%
                </Text>
              </View>

              {/* Credit / Udhar Card */}
              <View style={[styles.donutMiniCard, { backgroundColor: isDark ? '#451a0315' : '#fffbeb', borderColor: '#fde68a' }]}>
                <View style={[styles.donutDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.donutMiniTitle, { color: '#b45309' }]}>
                  {language === 'ne' ? 'उधारो (Credit)' : 'Udhar Credit'}
                </Text>
                <Text style={[styles.donutMiniAmount, { color: '#b45309' }]}>
                  Rs. {paymentMix.credit.amount.toLocaleString()}
                </Text>
                <Text style={[styles.donutMiniPct, { color: '#d97706' }]}>
                  {paymentMix.credit.pct}%
                </Text>
              </View>
            </View>
          </View>
        )}
        <View style={{ height: 28 }} />
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
      {/* CUSTOMIZE QUICK ACTIONS SHIFT-UP BOTTOM SHEET */}
      <Modal
        visible={showCustomizeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomizeModal(false)}
        statusBarTranslucent
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={styles.sheetBackdropTouch}
            onPress={() => setShowCustomizeModal(false)}
          />
          <View
            style={[
              styles.sheetContainer,
              {
                height: CUSTOMIZE_SHEET_HEIGHT,
                backgroundColor: isDark ? '#141414' : '#FFFFFF',
                borderColor: isDark ? '#262626' : '#E2E8F0',
              },
            ]}
          >
            {/* Sheet Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#333333' : '#CBD5E1' }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                    {language === 'ne' ? 'द्रुत कार्य अनुकूलन' : 'Customize Quick Actions'}
                  </Text>
                  <View style={[styles.sheetBadge, { backgroundColor: 'rgba(255, 69, 0, 0.12)' }]}>
                    <Text style={[styles.sheetBadgeText, { color: theme.colors.primary }]}>
                      {draftActionIds.length} ACTIVE
                    </Text>
                  </View>
                </View>
                <Text style={[styles.sheetSubtitle, { color: theme.colors.textSecondary }]}>
                  {language === 'ne'
                    ? 'स्थान क्रम सार्नुहोस्, नयाँ थप्नुहोस् वा हटाउनुहोस्'
                    : 'Arrange position order, add or hide operations'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: isDark ? '#222222' : '#F1F5F9' }]}
                onPress={() => setShowCustomizeModal(false)}
              >
                <Feather name="x" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Fast Jump / Filter Tabs: All / Visible / More Features */}
            <View style={styles.sheetTabsRow}>
              <TouchableOpacity
                style={[
                  styles.sheetFilterTab,
                  customizeFilter === 'all'
                    ? [styles.sheetFilterTabActive, { backgroundColor: theme.colors.primary }]
                    : { backgroundColor: isDark ? '#202022' : '#F1F5F9' },
                ]}
                onPress={() => setCustomizeFilter('all')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.sheetFilterTabText,
                    {
                      color:
                        customizeFilter === 'all'
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {language === 'ne' ? 'सबै' : 'All'} ({draftActionIds.length + hiddenActionModules.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sheetFilterTab,
                  customizeFilter === 'visible'
                    ? [styles.sheetFilterTabActive, { backgroundColor: '#10B981' }]
                    : { backgroundColor: isDark ? '#202022' : '#F1F5F9' },
                ]}
                onPress={() => setCustomizeFilter('visible')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.sheetFilterTabText,
                    {
                      color:
                        customizeFilter === 'visible'
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {language === 'ne' ? 'सक्रिय' : 'Visible'} ({draftActionIds.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sheetFilterTab,
                  customizeFilter === 'more'
                    ? [styles.sheetFilterTabActive, { backgroundColor: '#FF4500' }]
                    : { backgroundColor: isDark ? '#202022' : '#F1F5F9' },
                ]}
                onPress={() => setCustomizeFilter('more')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.sheetFilterTabText,
                    {
                      color:
                        customizeFilter === 'more'
                          ? '#FFFFFF'
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {language === 'ne' ? 'थप सुविधाहरू' : 'More Features'} ({hiddenActionModules.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Body Content */}
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={false}
              overScrollMode="always"
            >
              {/* SECTION 1: SHOWN ON HOME (ORDERABLE) */}
              {(customizeFilter === 'all' || customizeFilter === 'visible') && (
                <>
                  <View style={styles.sheetSectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="eye" size={14} color="#10B981" />
                      <Text style={[styles.sheetSectionTitle, { color: theme.colors.textPrimary }]}>
                        {language === 'ne' ? 'गृहपृष्ठमा देखिने सुविधाहरू' : 'Visible on Home Screen'}
                      </Text>
                    </View>
                    <Text style={[styles.sheetSectionCount, { color: theme.colors.textMuted }]}>
                      {draftActionIds.length} items
                    </Text>
                  </View>
                  <Text style={[styles.sheetSectionHint, { color: theme.colors.textMuted }]}>
                    {language === 'ne'
                      ? 'तीर (↑ / ↓) प्रयोग गरी प्राथमिकता क्रम परिवर्तन गर्नुहोस्'
                      : 'Tap arrows (↑ / ↓) to reorder priority on dashboard'}
                  </Text>

                  <View style={styles.sheetItemsList}>
                    {draftActionIds.map((actionId, index) => {
                      const mod = ALL_QUICK_ACTION_MODULES.find((m) => m.id === actionId);
                      if (!mod) return null;
                      const isFirst = index === 0;
                      const isLast = index === draftActionIds.length - 1;
                      const title = getModuleTitle(actionId, mod.labelNe, mod.labelEn);

                      return (
                        <View
                          key={actionId}
                          style={[
                            styles.reorderCard,
                            {
                              backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                              borderColor: isDark ? '#2C2C2E' : '#E2E8F0',
                            },
                          ]}
                        >
                          {/* Left: Position & Icon */}
                          <View style={styles.reorderLeft}>
                            <View style={[styles.orderRankBadge, { backgroundColor: isDark ? '#2A2A2E' : '#E2E8F0' }]}>
                              <Text style={[styles.orderRankText, { color: theme.colors.textSecondary }]}>
                                #{index + 1}
                              </Text>
                            </View>
                            <View style={[styles.reorderIconBox, { backgroundColor: mod.bg }]}>
                              <Feather name={mod.icon} size={18} color={mod.color} />
                            </View>
                            <View style={{ flex: 1, marginRight: 6 }}>
                              <Text style={[styles.reorderTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                                {title}
                              </Text>
                              <Text style={[styles.reorderSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
                                {language === 'ne' ? mod.subNe : mod.subEn}
                              </Text>
                            </View>
                          </View>

                          {/* Right: Controls (Move Up, Move Down, Hide) */}
                          <View style={styles.reorderControls}>
                            <TouchableOpacity
                              style={[
                                styles.reorderArrowBtn,
                                isFirst && styles.reorderArrowBtnDisabled,
                                { backgroundColor: isDark ? '#2A2A2E' : '#E2E8F0' },
                              ]}
                              onPress={() => handleMoveUp(index)}
                              disabled={isFirst}
                              activeOpacity={0.7}
                            >
                              <Feather
                                name="chevron-up"
                                size={16}
                                color={isFirst ? (isDark ? '#444' : '#A0AEC0') : theme.colors.textPrimary}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.reorderArrowBtn,
                                isLast && styles.reorderArrowBtnDisabled,
                                { backgroundColor: isDark ? '#2A2A2E' : '#E2E8F0' },
                              ]}
                              onPress={() => handleMoveDown(index)}
                              disabled={isLast}
                              activeOpacity={0.7}
                            >
                              <Feather
                                name="chevron-down"
                                size={16}
                                color={isLast ? (isDark ? '#444' : '#A0AEC0') : theme.colors.textPrimary}
                              />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.reorderHideBtn,
                                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)' },
                              ]}
                              onPress={() => handleHideAction(actionId)}
                              activeOpacity={0.7}
                            >
                              <Feather name="eye-off" size={14} color="#EF4444" />
                              <Text style={styles.reorderHideBtnText}>
                                {language === 'ne' ? 'हटाउनुहोस्' : 'Hide'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {/* SECTION 2: HIDDEN / AVAILABLE TO ADD */}
              {(customizeFilter === 'all' || customizeFilter === 'more') && (
                <>
                  <View style={[styles.sheetSectionHeader, { marginTop: customizeFilter === 'all' ? 22 : 4 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather name="plus-circle" size={14} color={theme.colors.primary} />
                      <Text style={[styles.sheetSectionTitle, { color: theme.colors.textPrimary }]}>
                        {language === 'ne' ? 'थप सुविधाहरू (More Screen बाट)' : 'More Features Available to Add'}
                      </Text>
                    </View>
                    <Text style={[styles.sheetSectionCount, { color: theme.colors.textMuted }]}>
                      {hiddenActionModules.length} hidden
                    </Text>
                  </View>
                  <Text style={[styles.sheetSectionHint, { color: theme.colors.textMuted }]}>
                    {language === 'ne'
                      ? 'गृहपृष्ठमा थप्न तलका सुविधाहरूमा "+ थप्नुहोस्" थिच्नुहोस्'
                      : 'Tap "+ Add to Home" to display feature shortcut on your dashboard'}
                  </Text>

                  {hiddenActionModules.length === 0 ? (
                    <View style={[styles.allAddedBox, { backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderColor: isDark ? '#2C2C2E' : '#E2E8F0' }]}>
                      <Feather name="check-circle" size={24} color="#10B981" />
                      <Text style={[styles.allAddedTitle, { color: theme.colors.textPrimary }]}>
                        {language === 'ne' ? 'सबै सुविधाहरू गृहपृष्ठमा सक्रिय छन्' : 'All Features Active on Home'}
                      </Text>
                      <Text style={[styles.allAddedSub, { color: theme.colors.textMuted }]}>
                        {language === 'ne'
                          ? 'तपाईंले उपलब्ध सबै सर्टकटहरू गृहपृष्ठमा समावेश गर्नुभएको छ।'
                          : 'All available operations and modules are currently shown on home.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.sheetItemsList}>
                      {hiddenActionModules.map((mod) => {
                        const title = getModuleTitle(mod.id, mod.labelNe, mod.labelEn);

                        return (
                          <View
                            key={mod.id}
                            style={[
                              styles.hiddenModuleCard,
                              {
                                backgroundColor: isDark ? '#18181A' : '#FFFFFF',
                                borderColor: isDark ? '#27272A' : '#E2E8F0',
                              },
                            ]}
                          >
                            <View style={[styles.reorderIconBox, { backgroundColor: mod.bg }]}>
                              <Feather name={mod.icon} size={18} color={mod.color} />
                            </View>
                            <View style={{ flex: 1, marginHorizontal: 8 }}>
                              <Text style={[styles.reorderTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                                {title}
                              </Text>
                              <Text style={[styles.reorderSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
                                {language === 'ne' ? mod.subNe : mod.subEn}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.addModuleBtn,
                                {
                                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                                  borderColor: '#10B981',
                                },
                              ]}
                              onPress={() => handleAddAction(mod.id)}
                              activeOpacity={0.7}
                            >
                              <Feather name="plus" size={14} color="#10B981" />
                              <Text style={[styles.addModuleBtnText, { color: '#10B981' }]}>
                                {language === 'ne' ? 'थप्नुहोस्' : 'Add to Home'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Footer Buttons */}
            <View
              style={[
                styles.sheetFooter,
                {
                  backgroundColor: isDark ? '#141414' : '#FFFFFF',
                  borderTopColor: isDark ? '#262626' : '#E2E8F0',
                },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.resetDefaultBtn,
                  {
                    backgroundColor: isDark ? '#222222' : '#F1F5F9',
                    borderColor: isDark ? '#333333' : '#CBD5E1',
                  },
                ]}
                onPress={handleResetDefault}
                activeOpacity={0.7}
              >
                <Feather name="rotate-ccw" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.resetDefaultBtnText, { color: theme.colors.textSecondary }]}>
                  {language === 'ne' ? 'पूर्वनिर्धारित' : 'Reset Default'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveCustomBtn,
                  {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={handleSaveCustomActions}
                activeOpacity={0.8}
              >
                <Feather name="check" size={16} color="#FFFFFF" />
                <Text style={styles.saveCustomBtnText}>
                  {language === 'ne' ? 'परिवर्तन सुरक्षित गर्नुहोस्' : 'Save & Update Home'}
                </Text>
              </TouchableOpacity>
            </View>
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
  quickActionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  quickActionsSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  customizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  customizeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetBackdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSubtitle: {
    fontSize: 11.5,
    marginTop: 3,
  },
  sheetBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sheetBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sheetTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
  },
  sheetFilterTab: {
    paddingHorizontal: 13,
    paddingVertical: 5,
    borderRadius: 999,
  },
  sheetFilterTabActive: {},
  sheetFilterTabText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    flexGrow: 1,
  },
  sheetSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  sheetSectionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  sheetSectionHint: {
    fontSize: 11,
    marginBottom: 10,
  },
  sheetItemsList: {
    gap: 8,
  },
  reorderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  reorderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderRankBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  orderRankText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  reorderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  reorderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  reorderSub: {
    fontSize: 10.5,
    marginTop: 1,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reorderArrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderArrowBtnDisabled: {
    opacity: 0.35,
  },
  reorderHideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reorderHideBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  hiddenModuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  addModuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  addModuleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  allAddedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 4,
  },
  allAddedTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  allAddedSub: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  resetDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  resetDefaultBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveCustomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  saveCustomBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  analyticsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  allReportsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  allReportsBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  reportTabScrollWrapper: {
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  reportTabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  reportTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  reportTabPillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reportTabPillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  analyticsCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  analyticsCardLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cashflowSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cashflowNetValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  marginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marginPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cashflowPillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  inOutPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  dotPill: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inOutPillLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  inOutPillValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  chartContainer: {
    marginTop: 6,
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 90,
  },
  barTrack: {
    width: 9,
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: 4,
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartDayLabel: {
    fontSize: 10,
    marginTop: 6,
  },
  chartLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10.5,
  },
  debtorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  debtorSubCount: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  remindAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  remindAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyDebtorsBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyDebtorsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyDebtorsSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  debtorsList: {
    gap: 10,
  },
  debtorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  debtorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtorRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 69, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtorRankText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FF4500',
  },
  debtorName: {
    fontSize: 13,
    fontWeight: '700',
  },
  debtorPhone: {
    fontSize: 10,
    marginTop: 2,
  },
  debtorAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#EF4444',
  },
  riskBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  riskBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 9.5,
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  donutWidgetWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  donutOuterRing: {
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  donutMiddleRing: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  donutInnerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  donutCenterCore: {
    width: 94,
    height: 94,
    borderRadius: 47,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  donutCenterAmount: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  donutCenterLabel: {
    fontSize: 9,
    marginTop: 1,
  },
  stackedBarContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  stackedSegment: {
    height: '100%',
  },
  donutCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  donutMiniCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    alignItems: 'center',
  },
  donutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  donutMiniTitle: {
    fontSize: 10,
    fontWeight: '600',
  },
  donutMiniAmount: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  donutMiniPct: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  chartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartStatusSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  healthScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  healthScoreText: {
    fontSize: 11,
    fontWeight: '800',
  },
  radialVisualizerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  radialTrack1: {
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialSegment1: {
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 6,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialTrack2: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialSegment2: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 6,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialTrack3: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialSegment3: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 5,
    borderLeftColor: 'transparent',
    borderTopColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialTrack4: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialSegment4: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialCenterCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  radialCoreVal: {
    fontSize: 13,
    fontWeight: '900',
  },
  radialCoreLabel: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  radialRingsList: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 4,
  },
  radialMetricItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  radialMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  radialColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radialMetricTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  radialMetricVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  radialTrackBar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  radialFillBar: {
    height: '100%',
    borderRadius: 3,
  },
  nightingaleBox: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  roseGridCircle1: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  roseGridCircle2: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  roseGridCircle3: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  rosePetalRay: {
    position: 'absolute',
    width: 34,
    height: 190,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  rosePetalBlade: {
    width: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: 'center',
    paddingTop: 4,
  },
  rosePetalEmoji: {
    fontSize: 11,
  },
  roseCenterHub: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  roseHubLabel: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nightingaleList: {
    flexDirection: 'column',
    gap: 7,
    marginTop: 4,
  },
  nightingaleItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
  },
  nightingaleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  nightingaleName: {
    fontSize: 12,
    fontWeight: '700',
  },
  nightingaleAmt: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  nightingalePctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  nightingalePctText: {
    fontSize: 10,
    fontWeight: '800',
  },
  nightingaleTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  nightingaleFill: {
    height: '100%',
    borderRadius: 2,
  },
});
