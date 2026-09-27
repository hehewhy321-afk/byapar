import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { ExpenseRecord, IncomeRecord } from '../types';
import { formatNepaliCurrency } from '@byapar/core';
import { uploadBillImage } from '../services/billImageUploadService';
import { checkMobileBillUploadLimit } from '../services/planLimits';
import { BillImageViewer } from '../components/bills/BillImageViewer';
import { downloadBillImage } from '../services/imageDownloadService';

const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Utilities',
  'Transport',
  'Supplies',
  'Food',
  'Marketing',
  'Packaging',
  'Maintenance',
  'Tax / License',
  'Other',
];

const DEFAULT_INCOME_CATEGORIES = [
  'Sales',
  'Service Fee',
  'Commission',
  'Interest',
  'Rental Income',
  'Cashback / Discount',
  'Asset Sale',
  'Other',
];

const PAYMENT_MODES = ['Cash', 'Fonepay QR', 'Bank Transfer', 'eSewa / Khalti', 'Cheque'];

type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export const ExpenseIncomeScreen: React.FC = () => {
  const {
    expenses,
    incomes,
    addExpense,
    editExpense,
    deleteExpense,
    addIncome,
    editIncome,
    deleteIncome,
    customExpenseCategories,
    addExpenseCategory,
    deleteExpenseCategory,
    customIncomeCategories,
    addIncomeCategory,
    deleteIncomeCategory,
    theme,
    themeMode,
    language,
    activeBizId,
    refreshData,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.warn('[ExpenseIncomeScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const ne = language === 'ne';
  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [showDateFilterSheet, setShowDateFilterSheet] = useState(false);

  // Form / Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<(ExpenseRecord | IncomeRecord) | null>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState(PAYMENT_MODES[0]);
  const [formParty, setFormParty] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formReceiptUrl, setFormReceiptUrl] = useState('');
  const [formPrimaryImageId, setFormPrimaryImageId] = useState<string | undefined>(undefined);

  // Category Manager modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Image Preview modal
  const [previewRecord, setPreviewRecord] = useState<{ receiptUrl?: string; primaryImageId?: string } | null>(null);

  // Transaction Details modal
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<ExpenseRecord | IncomeRecord | null>(null);

  // Upload state
  const [rawImageUri, setRawImageUri] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  const isExpense = activeTab === 'expense';

  // Categories list merging defaults + user custom categories
  const categoriesList = useMemo(() => {
    if (isExpense) {
      return [...DEFAULT_EXPENSE_CATEGORIES, ...(customExpenseCategories || [])];
    } else {
      return [...DEFAULT_INCOME_CATEGORIES, ...(customIncomeCategories || [])];
    }
  }, [isExpense, customExpenseCategories, customIncomeCategories]);

  // Date filter evaluation
  const isDateInFilter = (dateStr: string) => {
    if (!dateStr || dateFilter === 'all') return true;
    const itemDate = new Date(dateStr);
    itemDate.setHours(0, 0, 0, 0);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === 'today') {
      return itemDate.getTime() === today.getTime();
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return itemDate.getTime() === yesterday.getTime();
    }
    if (dateFilter === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return itemDate >= startOfWeek && itemDate <= today;
    }
    if (dateFilter === 'month') {
      return itemDate.getFullYear() === today.getFullYear() && itemDate.getMonth() === today.getMonth();
    }
    if (dateFilter === 'year') {
      return itemDate.getFullYear() === today.getFullYear();
    }
    if (dateFilter === 'custom') {
      if (!customStartDate) return true;
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = customEndDate ? new Date(customEndDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    }
    return true;
  };

  // Filtered Records
  const filteredRecords = useMemo(() => {
    const list = isExpense ? expenses : incomes;
    const q = searchQuery.toLowerCase().trim();

    return list.filter((r) => {
      if (!isDateInFilter(r.date)) return false;

      const matchCat = selectedCategory === 'All' || r.category === selectedCategory;
      const party = isExpense
        ? (r as any).recipientName || ''
        : (r as any).payerName || '';
      const matchSearch =
        !q ||
        r.category.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q)) ||
        party.toLowerCase().includes(q) ||
        (r.paymentMode && r.paymentMode.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [isExpense, expenses, incomes, searchQuery, selectedCategory, dateFilter, customStartDate, customEndDate]);

  // Totals for active filtered view
  const periodTotal = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [filteredRecords]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const totalIncomes = useMemo(() => {
    return incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [incomes]);

  const netBalance = totalIncomes - totalExpenses;

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setRawImageUri('');
    setFormAmount('');
    setFormCategory(categoriesList[0] || 'Other');
    setFormPaymentMode(PAYMENT_MODES[0]);
    setFormParty('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormReceiptUrl('');
    setFormPrimaryImageId(undefined);
    setShowAddModal(true);
  };

  const handleOpenEdit = (rec: ExpenseRecord | IncomeRecord) => {
    setEditingRecord(rec);
    setRawImageUri('');
    setFormAmount(String(rec.amount));
    setFormCategory(rec.category);
    setFormPaymentMode(rec.paymentMode || PAYMENT_MODES[0]);
    setFormParty(isExpense ? (rec as ExpenseRecord).recipientName || '' : (rec as IncomeRecord).payerName || '');
    setFormDate(rec.date);
    setFormNote(rec.note || '');
    setFormReceiptUrl(rec.receiptUrl || '');
    setFormPrimaryImageId(rec.primaryImageId);
    setShowAddModal(true);
  };

  const handlePickImage = async (useCamera = false) => {
    try {
      const bizId = activeBizId || '';
      const isDemoMode = !bizId || bizId === 'a0000000-0000-0000-0000-000000000001';
      if (!isDemoMode) {
        const limitCheck = await checkMobileBillUploadLimit(bizId);
        if (!limitCheck.allowed) {
          Alert.alert(
            ne ? 'दैनिक अपलोड सीमा पुग्यो' : 'Daily Upload Limit Reached',
            limitCheck.message || (ne ? 'तपाईंले आजको बिल अपलोड सीमा पार गर्नुभएको छ।' : 'You have reached your daily bill upload limit.')
          );
          return;
        }
      }

      const res = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.7,
          });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        // Keep the raw file URI for R2 upload; use it for preview too
        setRawImageUri(asset.uri);
        setFormReceiptUrl(asset.uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleSave = async () => {
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert(ne ? 'त्रुटि' : 'Validation Error', ne ? 'कृपया मान्य रकम प्रविष्ट गर्नुहोस्।' : 'Please enter a valid amount.');
      return;
    }
    if (!formCategory) {
      Alert.alert(ne ? 'त्रुटि' : 'Validation Error', ne ? 'कृपया शीर्षक चयन गर्नुहोस्।' : 'Please select a category.');
      return;
    }

    const bizId = activeBizId || '';
    const isDemoMode = !bizId || bizId === 'a0000000-0000-0000-0000-000000000001';
    const pendingImageUri = rawImageUri;
    const isEdit = !!editingRecord;
    const currentEditingRecord = editingRecord;
    const currentCategory = formCategory;
    const currentPaymentMode = formPaymentMode;
    const currentDate = formDate;
    const currentParty = formParty.trim();
    const currentNote = formNote.trim();
    const currentPrimaryImageId = formPrimaryImageId;
    const currentReceiptUrl = formReceiptUrl;

    // Immediately dismiss modal & clear inputs (0ms UI latency, 120fps smooth)
    setShowAddModal(false);
    setRawImageUri('');
    setFormAmount('');
    setFormParty('');
    setFormNote('');
    setFormReceiptUrl('');
    setFormPrimaryImageId(undefined);
    setEditingRecord(null);

    try {
      if (isEdit && currentEditingRecord) {
        // Update existing record immediately with optimistic receipt preview
        const baseUpdates: Partial<ExpenseRecord & IncomeRecord> = {
          category: currentCategory,
          amount: amt,
          paymentMode: currentPaymentMode,
          date: currentDate,
          note: currentNote || undefined,
        };

        if (pendingImageUri) {
          baseUpdates.receiptUrl = pendingImageUri;
        } else if (!currentPrimaryImageId && !currentReceiptUrl) {
          baseUpdates.primaryImageId = undefined;
          baseUpdates.receiptUrl = undefined;
        }

        if (isExpense) {
          (baseUpdates as any).recipientName = currentParty || undefined;
          await editExpense(currentEditingRecord.id, baseUpdates);
        } else {
          (baseUpdates as any).payerName = currentParty || undefined;
          await editIncome(currentEditingRecord.id, baseUpdates);
        }

        // Background R2 upload if a new photo was selected
        if (pendingImageUri && !isDemoMode && bizId) {
          uploadBillImage({
            rawImageUri: pendingImageUri,
            billId: currentEditingRecord.id,
            businessId: bizId,
          }).then((uploadRes) => {
            if (isExpense) {
              editExpense(currentEditingRecord.id, { primaryImageId: uploadRes.imageId });
            } else {
              editIncome(currentEditingRecord.id, { primaryImageId: uploadRes.imageId });
            }
          }).catch((uploadErr) => {
            console.warn('Background receipt upload failed (edit):', uploadErr);
          });
        }
      } else {
        // Add new record immediately with optimistic local receipt preview
        let newRecord: ExpenseRecord | IncomeRecord;

        if (isExpense) {
          newRecord = await addExpense({
            category: currentCategory,
            amount: amt,
            paymentMode: currentPaymentMode,
            date: currentDate,
            recipientName: currentParty || undefined,
            note: currentNote || undefined,
            receiptUrl: pendingImageUri || undefined,
          });
        } else {
          newRecord = await addIncome({
            category: currentCategory,
            amount: amt,
            paymentMode: currentPaymentMode,
            date: currentDate,
            payerName: currentParty || undefined,
            note: currentNote || undefined,
            receiptUrl: pendingImageUri || undefined,
          });
        }

        // Background R2 upload if receipt photo is present
        if (pendingImageUri && !isDemoMode && bizId) {
          uploadBillImage({
            rawImageUri: pendingImageUri,
            billId: newRecord.id,
            businessId: bizId,
          }).then((uploadRes) => {
            if (isExpense) {
              editExpense(newRecord.id, { primaryImageId: uploadRes.imageId });
            } else {
              editIncome(newRecord.id, { primaryImageId: uploadRes.imageId });
            }
          }).catch((uploadErr) => {
            console.warn('Background receipt upload failed (create):', uploadErr);
          });
        }
      }
    } catch (err: any) {
      console.warn('Error saving record:', err);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      ne ? 'मेटाउने निश्चित गर्नुहोस्' : 'Confirm Deletion',
      ne
        ? `के तपाईं यो ${isExpense ? 'खर्च' : 'आम्दानी'} प्रविष्टि (${name}) मेटाउन निश्चित हुनुहुन्छ?`
        : `Are you sure you want to delete this ${isExpense ? 'expense' : 'income'} entry (${name})?`,
      [
        { text: ne ? 'रद्द' : 'Cancel', style: 'cancel' },
        {
          text: ne ? 'मेटाउनुहोस्' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isExpense) {
              await deleteExpense(id);
            } else {
              await deleteIncome(id);
            }
          },
        },
      ]
    );
  };

  const handleAddCustomCat = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (isExpense) {
      await addExpenseCategory(trimmed);
    } else {
      await addIncomeCategory(trimmed);
    }
    setNewCategoryName('');
  };

  const dateFilterLabels: Record<DateFilterType, { en: string; ne: string }> = {
    today: { en: 'Today', ne: 'आज' },
    yesterday: { en: 'Yesterday', ne: 'हिजो' },
    week: { en: 'This Week', ne: 'यो हप्ता' },
    month: { en: 'This Month', ne: 'यो महिना' },
    year: { en: 'This Year', ne: 'यो वर्ष' },
    all: { en: 'All Time', ne: 'सबै' },
    custom: { en: 'Custom Date', ne: 'आफ्नो मिति' },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Top Header Segment Strip */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.borderGlass,
          },
        ]}
      >
        <View style={[styles.segmentContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'expense' && {
                backgroundColor: '#EF4444',
                shadowColor: '#EF4444',
                shadowOpacity: 0.3,
                shadowRadius: 5,
              },
            ]}
            onPress={() => {
              setActiveTab('expense');
              setSelectedCategory('All');
            }}
          >
            <Feather
              name="arrow-up-right"
              size={14}
              color={activeTab === 'expense' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'expense' ? '#FFFFFF' : theme.colors.textMuted },
              ]}
            >
              {ne ? 'खर्च (Expenses)' : 'Expenses'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'income' && {
                backgroundColor: '#10B981',
                shadowColor: '#10B981',
                shadowOpacity: 0.3,
                shadowRadius: 5,
              },
            ]}
            onPress={() => {
              setActiveTab('income');
              setSelectedCategory('All');
            }}
          >
            <Feather
              name="arrow-down-left"
              size={14}
              color={activeTab === 'income' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'income' ? '#FFFFFF' : theme.colors.textMuted },
              ]}
            >
              {ne ? 'आम्दानी (Income)' : 'Income'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Financial Overview Strip */}
      <View style={styles.kpiContainer}>
        <View
          style={[
            styles.kpiSummaryCard,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          {/* Main highlight */}
          <View style={styles.kpiMainCol}>
            <View style={styles.kpiTagRow}>
              <View
                style={[
                  styles.kpiStatusDot,
                  { backgroundColor: isExpense ? '#EF4444' : '#10B981' },
                ]}
              />
              <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
                {isExpense
                  ? (ne ? 'अवधि खर्च' : 'PERIOD EXPENSE')
                  : (ne ? 'अवधि आम्दानी' : 'PERIOD INCOME')}
              </Text>
            </View>
            <Text style={[styles.kpiMainValue, { color: isExpense ? '#EF4444' : '#10B981' }]}>
              Rs. {periodTotal.toLocaleString()}
            </Text>
          </View>

          {/* Divider */}
          <View style={[styles.kpiDivider, { backgroundColor: theme.colors.borderGlass }]} />

          {/* Secondary stats */}
          <View style={styles.kpiSubCol}>
            <View style={styles.kpiSubRow}>
              <Text style={[styles.kpiSubLabel, { color: theme.colors.textMuted }]}>
                {ne ? 'जम्मा आम्दानी' : 'Total Inflow'}
              </Text>
              <Text style={[styles.kpiSubValue, { color: '#10B981' }]}>
                Rs. {totalIncomes.toLocaleString()}
              </Text>
            </View>
            <View style={styles.kpiSubRow}>
              <Text style={[styles.kpiSubLabel, { color: theme.colors.textMuted }]}>
                {ne ? 'कुल बचत' : 'Net Balance'}
              </Text>
              <Text
                style={[
                  styles.kpiSubValue,
                  { color: netBalance >= 0 ? '#10B981' : '#EF4444' },
                ]}
              >
                {netBalance >= 0 ? '+ ' : '- '}Rs. {Math.abs(netBalance).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Consolidated Compact Utility Bar: Search, Date Filter & Categories */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <Feather name="search" size={14} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder={ne ? (isExpense ? 'खर्च वा नाम खोज्नुहोस्...' : 'आम्दानी खोज्नुहोस्...') : `Search ${isExpense ? 'expenses' : 'incomes'}...`}
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Feather name="x" size={14} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Compact Date Filter Button - Saves full screen row */}
        <TouchableOpacity
          style={[
            styles.compactDateBtn,
            {
              backgroundColor: dateFilter !== 'month'
                ? isExpense ? 'rgba(239, 68, 68, 0.14)' : 'rgba(16, 185, 129, 0.14)'
                : theme.colors.card,
              borderColor: dateFilter !== 'month'
                ? isExpense ? '#EF4444' : '#10B981'
                : theme.colors.borderGlass,
            },
          ]}
          onPress={() => setShowDateFilterSheet(true)}
          activeOpacity={0.8}
        >
          <Feather
            name="calendar"
            size={12}
            color={
              dateFilter !== 'month'
                ? isExpense ? '#EF4444' : '#10B981'
                : theme.colors.primary
            }
          />
          <Text
            style={[
              styles.compactDateBtnText,
              {
                color:
                  dateFilter !== 'month'
                    ? isExpense ? '#EF4444' : '#10B981'
                    : theme.colors.textPrimary,
                fontWeight: dateFilter !== 'month' ? '800' : '600',
              },
            ]}
            numberOfLines={1}
          >
            {dateFilterLabels[dateFilter][ne ? 'ne' : 'en']}
          </Text>
          <Feather
            name="chevron-down"
            size={11}
            color={
              dateFilter !== 'month'
                ? isExpense ? '#EF4444' : '#10B981'
                : theme.colors.textMuted
            }
          />
        </TouchableOpacity>

        {/* Manage Categories Shortcut */}
        <TouchableOpacity
          style={[styles.manageCatBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass }]}
          onPress={() => setShowCategoryModal(true)}
          activeOpacity={0.8}
        >
          <Feather name="tag" size={13} color={theme.colors.textPrimary} />
          <Text style={[styles.manageCatText, { color: theme.colors.textPrimary }]}>
            {ne ? 'शीर्षक' : 'Cats'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryRow}
      >
        <TouchableOpacity
          style={[
            styles.catChip,
            selectedCategory === 'All'
              ? styles.catChipActive
              : { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
          onPress={() => setSelectedCategory('All')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.catChipText,
              { color: selectedCategory === 'All' ? '#FFFFFF' : theme.colors.textSecondary },
              selectedCategory === 'All' && styles.catChipTextActive,
            ]}
          >
            {ne ? 'सबै' : 'All Categories'}
          </Text>
        </TouchableOpacity>

        {categoriesList.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catChip,
                isSelected
                  ? styles.catChipActive
                  : { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.85}
            >
              {isSelected && (
                <Feather name="check" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              )}
              <Text
                style={[
                  styles.catChipText,
                  { color: isSelected ? '#FFFFFF' : theme.colors.textSecondary },
                  isSelected && styles.catChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Records List */}
      <ScrollView
        style={styles.listScroll}
        contentContainerStyle={styles.listContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {filteredRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconBox,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Feather
                name={isExpense ? 'trending-down' : 'trending-up'}
                size={32}
                color={theme.colors.textMuted}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {ne ? (isExpense ? 'कुनै खर्च दर्ता छैन' : 'कुनै आम्दानी दर्ता छैन') : (isExpense ? 'No expenses recorded in this period' : 'No incomes recorded in this period')}
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              {ne ? `"+ ${isExpense ? 'खर्च' : 'आम्दानी'}" थिच्नुहोस् वा मिति परिवर्तन गर्नुहोस्` : `Tap the "+ ${isExpense ? 'Expense' : 'Income'}" button to record entries.`}
            </Text>
          </View>
        ) : (
          filteredRecords.map((item) => {
            const party = isExpense
              ? (item as any).recipientName
              : (item as any).payerName;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                onPress={() => setSelectedDetailRecord(item)}
                style={[
                  styles.recordCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
              >
                <View style={styles.recordLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: isExpense
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(16, 185, 129, 0.12)',
                      },
                    ]}
                  >
                    <Feather
                      name={isExpense ? 'arrow-up-right' : 'arrow-down-left'}
                      size={18}
                      color={isExpense ? '#EF4444' : '#10B981'}
                    />
                  </View>

                  <View style={styles.recordInfo}>
                    <Text style={[styles.recordCategory, { color: theme.colors.textPrimary }]}>
                      {item.category}
                    </Text>
                    {party && (
                      <Text style={[styles.recordParty, { color: theme.colors.textSecondary }]}>
                        {ne ? (isExpense ? 'पाउने: ' : 'दिने: ') : (isExpense ? 'To: ' : 'From: ')}{party}
                      </Text>
                    )}
                    {item.note && (
                      <Text style={[styles.recordNote, { color: theme.colors.textMuted }]} numberOfLines={1}>
                        {item.note}
                      </Text>
                    )}
                    <View style={styles.recordMetaRow}>
                      <Text style={[styles.recordDate, { color: theme.colors.textMuted }]}>
                        {item.date}
                      </Text>
                      <View
                        style={[
                          styles.modeBadge,
                          { backgroundColor: theme.colors.surface },
                        ]}
                      >
                        <Text style={[styles.modeBadgeText, { color: theme.colors.textMuted }]}>
                          {item.paymentMode}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.recordRight}>
                  {/* Receipt thumbnail */}
                  {item.receiptUrl || item.primaryImageId ? (
                    <TouchableOpacity
                      onPress={() => setPreviewRecord({ receiptUrl: item.receiptUrl, primaryImageId: item.primaryImageId })}
                      style={styles.receiptThumb}
                    >
                      <BillImageViewer
                        imageUri={item.receiptUrl}
                        primaryImageId={item.primaryImageId}
                        businessId={activeBizId}
                        style={styles.receiptThumbImg}
                        containerStyle={styles.receiptThumb}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : null}

                  <Text
                    style={[
                      styles.recordAmount,
                      { color: isExpense ? '#EF4444' : '#10B981' },
                    ]}
                  >
                    {isExpense ? '−' : '+'}Rs. {Number(item.amount).toLocaleString()}
                  </Text>

                  <View style={styles.actionButtonsRow}>
                    {/* Edit Button */}
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenEdit(item)}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-2" size={14} color={theme.colors.primary} />
                    </TouchableOpacity>

                    {/* Delete Button */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item.id, item.category)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.fabBtn, styles.fabExpenseBtn]}
          onPress={() => {
            setActiveTab('expense');
            handleOpenAdd();
          }}
          activeOpacity={0.88}
        >
          <Feather name="plus" size={15} color="#FFFFFF" />
          <Text style={styles.fabBtnText}>{ne ? 'खर्च' : 'Expense'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabBtn, styles.fabIncomeBtn]}
          onPress={() => {
            setActiveTab('income');
            handleOpenAdd();
          }}
          activeOpacity={0.88}
        >
          <Feather name="plus" size={15} color="#FFFFFF" />
          <Text style={styles.fabBtnText}>{ne ? 'आम्दानी' : 'Income'}</Text>
        </TouchableOpacity>
      </View>

      {/* Add / Edit Transaction Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                {editingRecord
                  ? (ne ? 'प्रविष्टि सम्पादन' : 'Edit Entry')
                  : (isExpense ? (ne ? 'खर्च थप्नुहोस्' : 'Add Expense') : (ne ? 'आम्दानी थप्नुहोस्' : 'Add Income'))}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Category Picker */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                    {isExpense ? (ne ? 'खर्च शीर्षक *' : 'Category *') : (ne ? 'आम्दानी स्रोत *' : 'Source *')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowCategoryModal(true)}>
                    <Text style={styles.addCatLink}>+ {ne ? 'नयाँ शीर्षक' : 'New Cat'}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPickerScroll}>
                  {categoriesList.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPickerChip,
                        formCategory === cat && {
                          backgroundColor: isExpense ? '#EF4444' : '#10B981',
                          borderColor: isExpense ? '#EF4444' : '#10B981',
                        },
                      ]}
                      onPress={() => setFormCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catPickerText,
                          { color: formCategory === cat ? '#FFFFFF' : theme.colors.textSecondary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Amount Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                  {ne ? 'रकम (रु.) *' : 'Amount (NPR) *'}
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    styles.amountInput,
                    { color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  value={formAmount}
                  onChangeText={setFormAmount}
                />
              </View>

              {/* Recipient / Payer */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                  {isExpense
                    ? (ne ? 'पाउने व्यक्ति / फर्म' : 'Paid To (Recipient)')
                    : (ne ? 'दिने व्यक्ति / फर्म' : 'Received From (Payer)')}
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass },
                  ]}
                  placeholder={ne ? 'जस्तै: घरबेटी, ड्राइभर, विक्रेता...' : 'e.g. Landlord, Staff, Supplier...'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={formParty}
                  onChangeText={setFormParty}
                />
              </View>

              {/* Payment Mode */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                  {ne ? 'भुक्तानी माध्यम' : 'Payment Mode'}
                </Text>
                <View style={styles.paymentModesGrid}>
                  {PAYMENT_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.payModeBtn,
                        formPaymentMode === mode
                          ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                          : { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
                      ]}
                      onPress={() => setFormPaymentMode(mode)}
                    >
                      <Text
                        style={[
                          styles.payModeText,
                          { color: formPaymentMode === mode ? '#FFFFFF' : theme.colors.textSecondary },
                        ]}
                      >
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                  {ne ? 'मिति *' : 'Date *'}
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass },
                  ]}
                  value={formDate}
                  onChangeText={setFormDate}
                />
              </View>

              {/* Notes */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                  {ne ? 'कैफियत / टिप्पणी (वैकल्पिक)' : 'Notes / Remarks (Optional)'}
                </Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass },
                  ]}
                  placeholder={ne ? 'थप विवरण लेख्नुहोस्...' : 'Add additional details...'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={formNote}
                  onChangeText={setFormNote}
                />
              </View>

              {/* Receipt Attachment */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                  {ne ? 'बिल वा रसिदको फोटो (वैकल्पिक)' : 'Receipt / Bill Photo (Optional)'}
                </Text>
                <View style={styles.imagePickerRow}>
                  <TouchableOpacity
                    style={[styles.imgActionBtn, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handlePickImage(true)}
                  >
                    <Feather name="camera" size={16} color={theme.colors.textPrimary} />
                    <Text style={[styles.imgActionText, { color: theme.colors.textPrimary }]}>Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.imgActionBtn, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handlePickImage(false)}
                  >
                    <Feather name="image" size={16} color={theme.colors.textPrimary} />
                    <Text style={[styles.imgActionText, { color: theme.colors.textPrimary }]}>Gallery</Text>
                  </TouchableOpacity>

                  {rawImageUri ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: rawImageUri }} style={styles.receiptPreviewImg} />
                      <TouchableOpacity
                        style={styles.removeImgBtn}
                        onPress={() => {
                          setRawImageUri('');
                          setFormReceiptUrl('');
                        }}
                      >
                        <Feather name="x" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : formPrimaryImageId || formReceiptUrl ? (
                    <View style={styles.previewContainer}>
                      <BillImageViewer
                        imageUri={formReceiptUrl}
                        primaryImageId={formPrimaryImageId}
                        businessId={activeBizId}
                        style={styles.receiptPreviewImg}
                        containerStyle={styles.receiptPreviewImg}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImgBtn}
                        onPress={() => {
                          setFormReceiptUrl('');
                          setFormPrimaryImageId(undefined);
                        }}
                      >
                        <Feather name="x" size={12} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { borderColor: theme.colors.borderGlass }]}
                onPress={() => setShowAddModal(false)}
                disabled={isUploading}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>
                  {ne ? 'रद्द' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  isExpense ? styles.saveExpenseBtn : styles.saveIncomeBtn,
                  isUploading && { opacity: 0.7 },
                ]}
                onPress={handleSave}
                disabled={isUploading}
              >
                {isUploading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>
                      {uploadStatusText || (ne ? 'अपलोड हुँदैछ...' : 'Saving...')}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingRecord
                      ? (ne ? 'अपडेट गर्नुहोस्' : 'Update Record')
                      : (isExpense ? (ne ? 'खर्च सेभ गर्नुहोस्' : 'Save Expense') : (ne ? 'आम्दानी सेभ गर्नुहोस्' : 'Save Income'))}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Filter Selection Sheet Modal */}
      <Modal
        visible={showDateFilterSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDateFilterSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDateFilterSheet(false)}
          />
          <View
            style={[
              styles.modalCard,
              styles.dateFilterCard,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: theme.colors.borderGlass }]} />
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.borderGlass }]}>
              <View style={styles.dateFilterHeaderGroup}>
                <View style={[styles.dateFilterIconCircle, { backgroundColor: isExpense ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)' }]}>
                  <Feather name="calendar" size={16} color={isExpense ? '#EF4444' : '#10B981'} />
                </View>
                <View style={styles.dateFilterHeaderText}>
                  <Text
                    style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {ne ? 'समय अवधि छनोट' : 'Select Time Period'}
                  </Text>
                  <Text
                    style={[styles.dateFilterSubtitle, { color: theme.colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {ne ? 'कारोबार फिल्टर गर्न दायरा रोज्नुहोस्' : 'Filter records by date range'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowDateFilterSheet(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.dateFilterScroll}
              contentContainerStyle={styles.dateFilterList}
              showsVerticalScrollIndicator={false}
            >
              {(['today', 'yesterday', 'week', 'month', 'year', 'all', 'custom'] as DateFilterType[]).map((f) => {
                const isSelected = dateFilter === f;
                const iconName: keyof typeof Feather.glyphMap =
                  f === 'today' ? 'clock' :
                  f === 'yesterday' ? 'rotate-ccw' :
                  f === 'week' ? 'calendar' :
                  f === 'month' ? 'calendar' :
                  f === 'year' ? 'activity' :
                  f === 'all' ? 'layers' : 'sliders';

                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.dateFilterOptionItem,
                      {
                        backgroundColor: isSelected
                          ? isExpense
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(16, 185, 129, 0.12)'
                          : isDark
                          ? '#18181A'
                          : '#F8FAFC',
                        borderColor: isSelected
                          ? isExpense ? '#EF4444' : '#10B981'
                          : theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => {
                      setDateFilter(f);
                      setShowDateFilterSheet(false);
                      if (f === 'custom') {
                        setTimeout(() => setShowCustomDateModal(true), 200);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.dateFilterOptionLabel}>
                      <Feather
                        name={iconName}
                        size={15}
                        color={
                          isSelected
                            ? isExpense ? '#EF4444' : '#10B981'
                            : theme.colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.dateFilterOptionText,
                          {
                            color: isSelected
                              ? isExpense ? '#EF4444' : '#10B981'
                              : theme.colors.textPrimary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {dateFilterLabels[f][ne ? 'ne' : 'en']}
                      </Text>
                    </View>
                    {isSelected && (
                      <Feather
                        name="check"
                        size={16}
                        color={isExpense ? '#EF4444' : '#10B981'}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Date Modal */}
      <Modal
        visible={showCustomDateModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCustomDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.customDateCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                {ne ? 'आफ्नो मिति छान्नुहोस्' : 'Custom Date Range'}
              </Text>
              <TouchableOpacity onPress={() => setShowCustomDateModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.customDateBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                  {ne ? 'सुरु मिति (From Date):' : 'Start Date (YYYY-MM-DD):'}
                </Text>
                <TextInput
                  style={[styles.formInput, { color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                  value={customStartDate}
                  onChangeText={setCustomStartDate}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>
                  {ne ? 'अन्तिम मिति (To Date):' : 'End Date (YYYY-MM-DD):'}
                </Text>
                <TextInput
                  style={[styles.formInput, { color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                />
              </View>

              <TouchableOpacity
                style={[styles.applyFilterBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setDateFilter('custom');
                  setShowCustomDateModal(false);
                }}
              >
                <Text style={styles.applyFilterText}>{ne ? 'लागू गर्नुहोस्' : 'Apply Filter'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Manager Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                {isExpense
                  ? (ne ? 'खर्च शीर्षकहरू व्यवस्थापन' : 'Manage Expense Categories')
                  : (ne ? 'आम्दानी स्रोतहरू व्यवस्थापन' : 'Manage Income Categories')}
              </Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.catManagerBody}>
              {/* Add Input */}
              <View style={styles.addCatRow}>
                <TextInput
                  style={[styles.addCatInput, { color: theme.colors.textPrimary, borderColor: theme.colors.borderGlass }]}
                  placeholder={ne ? 'नयाँ शीर्षकको नाम...' : 'New category name...'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
                <TouchableOpacity
                  style={[styles.addCatSubmitBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleAddCustomCat}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.addCatSubmitText}>{ne ? 'थप्नुहोस्' : 'Add'}</Text>
                </TouchableOpacity>
              </View>

              {/* Custom categories list */}
              <Text style={[styles.catSectionTitle, { color: theme.colors.textMuted }]}>
                {ne ? 'तपाईंले थपेका शीर्षकहरू' : 'Custom Defined Categories'}
              </Text>
              <ScrollView style={styles.catListScroll}>
                {(isExpense ? customExpenseCategories : customIncomeCategories).length === 0 ? (
                  <Text style={[styles.emptyCatText, { color: theme.colors.textMuted }]}>
                    {ne ? 'कुनै पनि आफ्नै शीर्षक थपिएको छैन।' : 'No custom categories yet.'}
                  </Text>
                ) : (
                  (isExpense ? customExpenseCategories : customIncomeCategories).map((c) => (
                    <View key={c} style={[styles.catItemRow, { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.catItemName, { color: theme.colors.textPrimary }]}>{c}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (isExpense) deleteExpenseCategory(c);
                          else deleteIncomeCategory(c);
                        }}
                      >
                        <Feather name="trash-2" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <Text style={[styles.catSectionTitle, { color: theme.colors.textMuted, marginTop: 16 }]}>
                  {ne ? 'प्रणालीका डिफल्ट शीर्षकहरू' : 'Default System Categories'}
                </Text>
                <View style={styles.defaultChipsWrap}>
                  {(isExpense ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES).map((c) => (
                    <View key={c} style={[styles.defaultChip, { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.defaultChipText, { color: theme.colors.textSecondary }]}>{c}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      {/* Transaction Details Modal */}
      <Modal
        visible={!!selectedDetailRecord}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDetailRecord(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedDetailRecord(null)}
          />
          <View style={[styles.detailModalCard, { backgroundColor: theme.colors.card }]}>
            {selectedDetailRecord && (() => {
              const rec = selectedDetailRecord;
              const isRecExpense = 'recipientName' in rec || isExpense;
              const partyName = isRecExpense ? (rec as any).recipientName : (rec as any).payerName;
              const hasReceipt = Boolean(rec.receiptUrl || rec.primaryImageId);

              return (
                <>
                  <View style={[styles.modalHeader, { paddingHorizontal: 20, paddingVertical: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: 12,
                          backgroundColor: isRecExpense ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: isRecExpense ? '#EF4444' : '#10B981',
                          }}
                        >
                          {isRecExpense ? (ne ? 'खर्च प्रविष्टि' : 'Expense Entry') : (ne ? 'आम्दानी प्रविष्टि' : 'Income Entry')}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedDetailRecord(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                      <Feather name="x" size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}>
                    {/* Amount Banner */}
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 18,
                        backgroundColor: theme.colors.surface,
                        borderRadius: 12,
                        marginBottom: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 28,
                          fontWeight: '800',
                          color: isRecExpense ? '#EF4444' : '#10B981',
                        }}
                      >
                        {isRecExpense ? '−' : '+'}Rs. {Number(rec.amount).toLocaleString()}
                      </Text>
                      <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 4 }}>
                        📅 {rec.date}
                      </Text>
                    </View>

                    {/* Details Table */}
                    <View style={{ gap: 12, marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>{ne ? 'शीर्षक / वर्ग' : 'Category'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                          <Feather name="tag" size={12} color={theme.colors.primary} />
                          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{rec.category}</Text>
                        </View>
                      </View>

                      {partyName ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>
                            {isRecExpense ? (ne ? 'पाउने व्यक्ति/संस्था' : 'Paid To') : (ne ? 'दिने व्यक्ति/संस्था' : 'Received From')}
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{partyName}</Text>
                        </View>
                      ) : null}

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: theme.colors.textMuted }}>{ne ? 'भुक्तानी माध्यम' : 'Payment Mode'}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary }}>{rec.paymentMode || 'Cash'}</Text>
                      </View>

                      {rec.note ? (
                        <View style={{ marginTop: 4 }}>
                          <Text style={{ fontSize: 13, color: theme.colors.textMuted, marginBottom: 4 }}>{ne ? 'कैफियत / विवरण' : 'Note / Description'}</Text>
                          <View style={{ backgroundColor: theme.colors.surface, padding: 10, borderRadius: 8 }}>
                            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 }}>{rec.note}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>

                    {/* Receipt / Bill Image Section */}
                    <View style={{ marginTop: 8, marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {ne ? 'संलग्न बिल / रसिद' : 'Attached Receipt / Bill'}
                        </Text>
                        {hasReceipt ? (
                          <TouchableOpacity
                            onPress={() => setPreviewRecord({ receiptUrl: rec.receiptUrl, primaryImageId: rec.primaryImageId })}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          >
                            <Feather name="maximize-2" size={13} color={theme.colors.primary} />
                            <Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: '600' }}>
                              {ne ? 'पूरा हेर्नुहोस्' : 'View Full'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {hasReceipt ? (
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => setPreviewRecord({ receiptUrl: rec.receiptUrl, primaryImageId: rec.primaryImageId })}
                          style={{
                            borderRadius: 12,
                            overflow: 'hidden',
                            borderWidth: 1,
                            borderColor: theme.colors.borderGlass,
                            backgroundColor: theme.colors.surface,
                            height: 220,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <BillImageViewer
                            imageUri={rec.receiptUrl}
                            primaryImageId={rec.primaryImageId}
                            businessId={activeBizId}
                            style={{ width: '100%', height: '100%' }}
                            containerStyle={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      ) : (
                        <View
                          style={{
                            padding: 16,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderStyle: 'dashed',
                            borderColor: theme.colors.borderGlass,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: theme.colors.surface,
                          }}
                        >
                          <Feather name="image" size={24} color={theme.colors.textMuted} style={{ marginBottom: 6 }} />
                          <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
                            {ne ? 'यस कारोबारमा कुनै रसिद संलग्न गरिएको छैन' : 'No receipt attached to this transaction'}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Bottom Actions Row */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 12,
                          borderRadius: 8,
                          backgroundColor: theme.colors.primary,
                        }}
                        onPress={() => {
                          const currentRec = rec;
                          setSelectedDetailRecord(null);
                          handleOpenEdit(currentRec);
                        }}
                      >
                        <Feather name="edit-2" size={15} color="#FFFFFF" />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                          {ne ? 'सम्पादन' : 'Edit'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 12,
                          borderRadius: 8,
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          borderWidth: 1,
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                        }}
                        onPress={() => {
                          const currentRec = rec;
                          setSelectedDetailRecord(null);
                          handleDelete(currentRec.id, currentRec.category);
                        }}
                      >
                        <Feather name="trash-2" size={15} color="#EF4444" />
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF4444' }}>
                          {ne ? 'मेटाउनुहोस्' : 'Delete'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewRecord}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewRecord(null)}
      >
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalTopBar}>
            <TouchableOpacity
              style={styles.closeImageBtn}
              onPress={() => setPreviewRecord(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.downloadImageBtn}
              onPress={() => {
                if (previewRecord) {
                  downloadBillImage({
                    imageUri: previewRecord.receiptUrl,
                    primaryImageId: previewRecord.primaryImageId,
                    businessId: activeBizId,
                    title: 'receipt',
                  });
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="download" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {previewRecord ? (
            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
              maximumZoomScale={5}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
            >
              <BillImageViewer
                imageUri={previewRecord.receiptUrl}
                primaryImageId={previewRecord.primaryImageId}
                businessId={activeBizId}
                style={styles.fullPreviewImage}
                containerStyle={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                resizeMode="contain"
              />
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  kpiContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  kpiSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1,
  },
  kpiMainCol: {
    flex: 1.25,
    justifyContent: 'center',
  },
  kpiTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  kpiStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiMainValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
  },
  kpiSubCol: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  kpiSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiSubLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  kpiSubValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  compactDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  compactDateBtnText: {
    fontSize: 11.5,
  },
  dateFilterCard: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    maxHeight: '80%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  dateFilterHeaderGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateFilterHeaderText: {
    flex: 1,
  },
  dateFilterIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFilterSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  dateFilterScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  dateFilterList: {
    padding: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 7,
  },
  dateFilterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  dateFilterOptionLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateFilterOptionText: {
    flexShrink: 1,
    fontSize: 12.5,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
  },
  manageCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
  },
  manageCatText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  categoryScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 6,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
  },
  catChipActive: {
    backgroundColor: '#FF4500',
    borderColor: '#FF4500',
  },
  catChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 14,
  },
  catChipTextActive: {
    color: '#FFFFFF',
  },
  listScroll: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 90,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordCategory: {
    fontSize: 14,
    fontWeight: '700',
  },
  recordParty: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  recordNote: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  recordDate: {
    fontSize: 11,
    fontFamily: 'System',
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  recordRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recordAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'System',
  },
  receiptThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#666',
  },
  receiptThumbImg: {
    width: '100%',
    height: '100%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    padding: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  fabExpenseBtn: {
    backgroundColor: '#EF4444',
  },
  fabIncomeBtn: {
    backgroundColor: '#10B981',
  },
  fabBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  detailModalCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  addCatLink: {
    fontSize: 11,
    color: '#FF4500',
    fontWeight: '600',
  },
  formInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
  },
  catPickerScroll: {
    flexDirection: 'row',
  },
  catPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 6,
  },
  catPickerText: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 14,
  },
  paymentModesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  payModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
  },
  payModeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  imagePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  imgActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  imgActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 6,
    overflow: 'hidden',
  },
  receiptPreviewImg: {
    width: '100%',
    height: '100%',
  },
  removeImgBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    padding: 2,
    borderRadius: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveExpenseBtn: {
    backgroundColor: '#EF4444',
  },
  saveIncomeBtn: {
    backgroundColor: '#10B981',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  customDateCard: {
    marginHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
    borderRadius: 16,
  },
  customDateBody: {
    padding: 16,
    gap: 12,
  },
  applyFilterBtn: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  applyFilterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  catManagerBody: {
    padding: 16,
  },
  addCatRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  addCatInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addCatSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
  },
  addCatSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  catSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  catListScroll: {
    maxHeight: 250,
  },
  emptyCatText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  catItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  catItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  defaultChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  defaultChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalTopBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 46,
    paddingBottom: 14,
    backgroundColor: '#141414',
    zIndex: 10,
  },
  closeImageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadImageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
  },
});
