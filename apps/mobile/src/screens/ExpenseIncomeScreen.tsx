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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { formatNepaliCurrency } from '@byapar/core';
import { AnimatedPressable } from '../components/common/AnimatedPressable';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Utilities',
  'Transport',
  'Supplies',
  'Food',
  'Marketing',
  'Packaging',
  'Other',
];

const INCOME_CATEGORIES = [
  'Sales',
  'Service Fee',
  'Commission',
  'Interest',
  'Rental Income',
  'Cashback / Discount',
  'Other',
];

const PAYMENT_MODES = ['Cash', 'Fonepay QR', 'Bank Transfer', 'eSewa / Khalti', 'Cheque'];

export const ExpenseIncomeScreen: React.FC = () => {
  const {
    expenses,
    incomes,
    addExpense,
    deleteExpense,
    addIncome,
    deleteIncome,
    theme,
    themeMode,
  } = useApp();

  const isDark = themeMode === 'dark';

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formPaymentMode, setFormPaymentMode] = useState(PAYMENT_MODES[0]);
  const [formParty, setFormParty] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');

  const isExpense = activeTab === 'expense';
  const categoriesList = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // Filtered Records
  const filteredRecords = useMemo(() => {
    const list = isExpense ? expenses : incomes;
    const q = searchQuery.toLowerCase().trim();

    return list.filter((r) => {
      const matchCat = selectedCategory === 'All' || r.category === selectedCategory;
      const party = isExpense
        ? (r as any).recipientName || ''
        : (r as any).payerName || '';
      const matchSearch =
        !q ||
        r.category.toLowerCase().includes(q) ||
        (r.note && r.note.toLowerCase().includes(q)) ||
        party.toLowerCase().includes(q);

      return matchCat && matchSearch;
    });
  }, [isExpense, expenses, incomes, searchQuery, selectedCategory]);

  // Totals
  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [expenses]);

  const totalIncomes = useMemo(() => {
    return incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [incomes]);

  const netBalance = totalIncomes - totalExpenses;

  const handleOpenAdd = () => {
    setFormAmount('');
    setFormCategory(categoriesList[0]);
    setFormPaymentMode(PAYMENT_MODES[0]);
    setFormParty('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setShowAddModal(true);
  };

  const handleSave = async () => {
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }
    if (!formCategory) {
      Alert.alert('Validation Error', 'Please select a category.');
      return;
    }

    if (isExpense) {
      await addExpense({
        category: formCategory,
        amount: amt,
        paymentMode: formPaymentMode,
        date: formDate,
        recipientName: formParty.trim() || undefined,
        note: formNote.trim() || undefined,
      });
    } else {
      await addIncome({
        category: formCategory,
        amount: amt,
        paymentMode: formPaymentMode,
        date: formDate,
        payerName: formParty.trim() || undefined,
        note: formNote.trim() || undefined,
      });
    }

    setShowAddModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete this ${isExpense ? 'expense' : 'income'} entry (${name})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Top Header Strip with Segment Switcher & Add Button */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.borderGlass,
          },
        ]}
      >
        {/* Toggle Segments - Full Width */}
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
              Expenses (खर्च)
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
              Income (आम्दानी)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Financial Overview Strip */}
      <View style={styles.kpiContainer}>
        <View
          style={[
            styles.kpiCard,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
            Total Expenses
          </Text>
          <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
            Rs. {totalExpenses.toLocaleString()}
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
            Total Income
          </Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>
            Rs. {totalIncomes.toLocaleString()}
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <Text style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
            Net Cash Flow
          </Text>
          <Text
            style={[
              styles.kpiValue,
              { color: netBalance >= 0 ? '#10B981' : '#EF4444' },
            ]}
          >
            Rs. {netBalance.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
          ]}
        >
          <Feather name="search" size={15} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder={`Search ${isExpense ? 'expenses' : 'incomes'} or recipient...`}
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
            All Categories
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
      <ScrollView contentContainerStyle={styles.listContainer}>
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
              No {isExpense ? 'expenses' : 'incomes'} recorded yet
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              Tap the "+ {isExpense ? 'Expense' : 'Income'}" button above to record your store finances.
            </Text>
          </View>
        ) : (
          filteredRecords.map((item) => {
            const party = isExpense
              ? (item as any).recipientName
              : (item as any).payerName;
            return (
              <View
                key={item.id}
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
                        {isExpense ? 'To: ' : 'From: '} {party}
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
                  <Text
                    style={[
                      styles.recordAmount,
                      { color: isExpense ? '#EF4444' : '#10B981' },
                    ]}
                  >
                    {isExpense ? '-' : '+'}Rs. {Number(item.amount).toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item.id, item.category)}
                  >
                    <Feather name="trash-2" size={14} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Buttons for Expense & Income */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.fabBtn, styles.fabExpenseBtn]}
          onPress={() => {
            setActiveTab('expense');
            handleOpenAdd();
          }}
          activeOpacity={0.88}
        >
          <Feather name="arrow-up-right" size={15} color="#FFFFFF" />
          <Text style={styles.fabBtnText}>Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabBtn, styles.fabIncomeBtn]}
          onPress={() => {
            setActiveTab('income');
            handleOpenAdd();
          }}
          activeOpacity={0.88}
        >
          <Feather name="arrow-down-left" size={15} color="#FFFFFF" />
          <Text style={styles.fabBtnText}>Income</Text>
        </TouchableOpacity>
      </View>

      {/* Add Record Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View
                  style={[
                    styles.modalIconBox,
                    {
                      backgroundColor: isExpense
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                    },
                  ]}
                >
                  <Feather
                    name={isExpense ? 'arrow-up-right' : 'arrow-down-left'}
                    size={18}
                    color={isExpense ? '#EF4444' : '#10B981'}
                  />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  {isExpense ? 'Add Store Expense' : 'Add Other Income'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Amount (रकम NPR) *
                </Text>
                <View
                  style={[
                    styles.amountBox,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.borderGlass },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: theme.colors.primary }]}>Rs.</Text>
                  <TextInput
                    style={[styles.amountInput, { color: theme.colors.textPrimary }]}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    value={formAmount}
                    onChangeText={setFormAmount}
                    autoFocus
                  />
                </View>
              </View>

              {/* Category Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Category (शीर्षक) *
                </Text>
                <View style={styles.chipGrid}>
                  {categoriesList.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.modalChip,
                        formCategory === cat
                          ? {
                              backgroundColor: theme.colors.primary,
                              borderColor: theme.colors.primary,
                            }
                          : {
                              backgroundColor: theme.colors.card,
                              borderColor: theme.colors.borderGlass,
                            },
                      ]}
                      onPress={() => setFormCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          {
                            color: formCategory === cat ? '#FFFFFF' : theme.colors.textSecondary,
                            fontWeight: formCategory === cat ? '700' : '500',
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Recipient / Payer */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  {isExpense ? 'Recipient / Paid To (भुक्तानी पाउने व्यक्ति)' : 'Payer / Received From (दिने व्यक्ति)'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  placeholder={isExpense ? 'e.g. Landlord, Staff, Delivery Rider' : 'e.g. Supplier Rebate, Cash Customer'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={formParty}
                  onChangeText={setFormParty}
                />
              </View>

              {/* Payment Mode */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Payment Mode (भुक्तानी माध्यम)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeRow}>
                  {PAYMENT_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modeChip,
                        formPaymentMode === mode
                          ? {
                              backgroundColor: theme.colors.primary,
                              borderColor: theme.colors.primary,
                            }
                          : {
                              backgroundColor: theme.colors.card,
                              borderColor: theme.colors.borderGlass,
                            },
                      ]}
                      onPress={() => setFormPaymentMode(mode)}
                    >
                      <Text
                        style={[
                          styles.modeChipText,
                          {
                            color: formPaymentMode === mode ? '#FFFFFF' : theme.colors.textSecondary,
                            fontWeight: formPaymentMode === mode ? '700' : '500',
                          },
                        ]}
                      >
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Date */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Date (मिति YYYY-MM-DD)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={formDate}
                  onChangeText={setFormDate}
                />
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Notes / Description (कैफियत)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  placeholder="Optional details or bill references..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={formNote}
                  onChangeText={setFormNote}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.colors.borderGlass }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  { backgroundColor: isExpense ? '#EF4444' : '#10B981' },
                ]}
                onPress={handleSave}
              >
                <Text style={styles.saveBtnText}>Save {isExpense ? 'Expense' : 'Income'}</Text>
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
  headerBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    width: '100%',
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    width: '100%',
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
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  searchRow: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  categoryRow: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    alignItems: 'center',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  catChipActive: {
    backgroundColor: '#FF4500',
    borderColor: '#FF4500',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  catChipTextActive: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 14,
    paddingBottom: 95,
    gap: 8,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    zIndex: 99,
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    gap: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fabExpenseBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  fabIncomeBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  fabBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    flex: 1,
    gap: 12,
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
    fontWeight: '500',
    marginTop: 1,
  },
  recordNote: {
    fontSize: 11,
    marginTop: 1,
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  recordDate: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  modeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  recordRight: {
    alignItems: 'flex-end',
    gap: 8,
    paddingLeft: 8,
  },
  recordAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    lineHeight: 18,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    padding: 0,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalChipText: {
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  modeRow: {
    flexDirection: 'row',
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  modeChipText: {
    fontSize: 12,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
