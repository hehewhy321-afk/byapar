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
import { PaymentMode } from '../types';
import { AnimatedPressable } from '../components/common/AnimatedPressable';

export const SalesHubScreen: React.FC = () => {
  const {
    invoices,
    quotations,
    salesReturns,
    paymentInRecords,
    parties,
    accounts,
    createPaymentIn,
    createQuotation,
    createSalesReturn,
    setActiveTab,
    theme,
    themeMode,
  } = useApp();

  const isDark = themeMode === 'dark';

  const [activeSubTab, setActiveSubTab] = useState<
    'invoices' | 'payment_in' | 'quotations' | 'returns'
  >('invoices');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showPaymentInModal, setShowPaymentInModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Payment In Form
  const [payPartyId, setPayPartyId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('cash');
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || '');
  const [payNotes, setPayNotes] = useState('');

  // Quotation Form
  const [quotePartyName, setQuotePartyName] = useState('');
  const [quotePartyPhone, setQuotePartyPhone] = useState('');
  const [quoteItemName, setQuoteItemName] = useState('');
  const [quoteQty, setQuoteQty] = useState('1');
  const [quoteRate, setQuoteRate] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');

  // Sales Return Form
  const [returnPartyName, setReturnPartyName] = useState('');
  const [returnItemName, setReturnItemName] = useState('');
  const [returnQty, setReturnQty] = useState('1');
  const [returnRate, setReturnRate] = useState('');
  const [returnRefund, setReturnRefund] = useState('');
  const [returnReason, setReturnReason] = useState('');

  // Filtered Lists
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.partyName && inv.partyName.toLowerCase().includes(q))
    );
  }, [invoices, searchQuery]);

  const filteredPaymentsIn = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return paymentInRecords;
    return paymentInRecords.filter((p) => p.partyName.toLowerCase().includes(q));
  }, [paymentInRecords, searchQuery]);

  const filteredQuotations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return quotations;
    return quotations.filter(
      (qt) =>
        qt.quotationNumber.toLowerCase().includes(q) ||
        qt.partyName.toLowerCase().includes(q)
    );
  }, [quotations, searchQuery]);

  const filteredReturns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return salesReturns;
    return salesReturns.filter(
      (sr) =>
        sr.returnNumber.toLowerCase().includes(q) ||
        sr.partyName.toLowerCase().includes(q)
    );
  }, [salesReturns, searchQuery]);

  // Actions
  const handleRecordPaymentIn = async () => {
    const amt = parseFloat(payAmount);
    if (!payPartyId) {
      Alert.alert('Validation Error', 'Please select a customer.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid received amount.');
      return;
    }

    const party = parties.find((p) => p.id === payPartyId);
    await createPaymentIn({
      partyId: payPartyId,
      partyName: party ? party.name : 'Unknown Customer',
      amount: amt,
      paymentMode: payMode,
      accountId: payAccountId || undefined,
      date: new Date().toISOString().split('T')[0],
      notes: payNotes || undefined,
    });

    setShowPaymentInModal(false);
    setPayPartyId('');
    setPayAmount('');
    setPayNotes('');
  };

  const handleCreateQuotation = async () => {
    const qty = parseFloat(quoteQty) || 1;
    const rate = parseFloat(quoteRate) || 0;
    if (!quotePartyName.trim() || !quoteItemName.trim() || rate <= 0) {
      Alert.alert('Validation Error', 'Please enter customer name, item name, and price.');
      return;
    }

    const total = qty * rate;
    const seq = (quotations.length + 1).toString().padStart(4, '0');
    await createQuotation({
      quotationNumber: `EST-${new Date().getFullYear()}-${seq}`,
      partyName: quotePartyName.trim(),
      partyPhone: quotePartyPhone.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      totalAmount: total,
      notes: quoteNotes || undefined,
      items: [
        {
          id: Math.random().toString(),
          itemName: quoteItemName.trim(),
          quantity: qty,
          unitPrice: rate,
          totalAmount: total,
        },
      ],
    });

    setShowQuotationModal(false);
    setQuotePartyName('');
    setQuotePartyPhone('');
    setQuoteItemName('');
    setQuoteRate('');
    setQuoteNotes('');
  };

  const handleCreateReturn = async () => {
    const qty = parseFloat(returnQty) || 1;
    const rate = parseFloat(returnRate) || 0;
    const refund = parseFloat(returnRefund) || 0;
    if (!returnPartyName.trim() || !returnItemName.trim() || rate <= 0) {
      Alert.alert('Validation Error', 'Please enter customer name, item name, and price.');
      return;
    }

    const total = qty * rate;
    const seq = (salesReturns.length + 1).toString().padStart(4, '0');
    await createSalesReturn({
      returnNumber: `SR-${new Date().getFullYear()}-${seq}`,
      partyName: returnPartyName.trim(),
      date: new Date().toISOString().split('T')[0],
      totalAmount: total,
      refundAmount: refund,
      creditAmount: Math.max(0, total - refund),
      reason: returnReason || undefined,
      items: [
        {
          id: Math.random().toString(),
          itemName: returnItemName.trim(),
          quantity: qty,
          unitPrice: rate,
          totalAmount: total,
        },
      ],
    });

    setShowReturnModal(false);
    setReturnPartyName('');
    setReturnItemName('');
    setReturnRate('');
    setReturnRefund('');
    setReturnReason('');
  };

  const totalSales = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Search & Header Action Row */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: theme.colors.card,
            borderBottomColor: theme.colors.borderGlass,
          },
        ]}
      >
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderGlass,
            },
          ]}
        >
          <Feather name="search" size={15} color={theme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search voucher or customer..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {activeSubTab === 'invoices' && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setActiveTab('pos')}
            activeOpacity={0.88}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>POS Sale</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'payment_in' && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: '#10B981' }]}
            onPress={() => setShowPaymentInModal(true)}
            activeOpacity={0.88}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Payment In</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'quotations' && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowQuotationModal(true)}
            activeOpacity={0.88}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Estimate</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'returns' && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: '#EF4444' }]}
            onPress={() => setShowReturnModal(true)}
            activeOpacity={0.88}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Sales Return</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sub-Tabs Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor:
                activeSubTab === 'invoices' ? 'rgba(16, 185, 129, 0.14)' : theme.colors.card,
              borderColor:
                activeSubTab === 'invoices' ? '#10B981' : theme.colors.borderGlass,
            },
          ]}
          onPress={() => setActiveSubTab('invoices')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeSubTab === 'invoices' ? '#10B981' : theme.colors.textSecondary },
              activeSubTab === 'invoices' && styles.tabTextActive,
            ]}
          >
            Invoices ({invoices.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor:
                activeSubTab === 'payment_in' ? 'rgba(16, 185, 129, 0.14)' : theme.colors.card,
              borderColor:
                activeSubTab === 'payment_in' ? '#10B981' : theme.colors.borderGlass,
            },
          ]}
          onPress={() => setActiveSubTab('payment_in')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeSubTab === 'payment_in' ? '#10B981' : theme.colors.textSecondary },
              activeSubTab === 'payment_in' && styles.tabTextActive,
            ]}
          >
            Payments In ({paymentInRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor:
                activeSubTab === 'quotations' ? 'rgba(99, 102, 241, 0.14)' : theme.colors.card,
              borderColor:
                activeSubTab === 'quotations' ? theme.colors.primary : theme.colors.borderGlass,
            },
          ]}
          onPress={() => setActiveSubTab('quotations')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeSubTab === 'quotations' ? theme.colors.primary : theme.colors.textSecondary,
              },
              activeSubTab === 'quotations' && styles.tabTextActive,
            ]}
          >
            Estimates ({quotations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor:
                activeSubTab === 'returns' ? 'rgba(239, 68, 68, 0.14)' : theme.colors.card,
              borderColor:
                activeSubTab === 'returns' ? '#EF4444' : theme.colors.borderGlass,
            },
          ]}
          onPress={() => setActiveSubTab('returns')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeSubTab === 'returns' ? '#EF4444' : theme.colors.textSecondary },
              activeSubTab === 'returns' && styles.tabTextActive,
            ]}
          >
            Returns ({salesReturns.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Main Content List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. INVOICES */}
        {activeSubTab === 'invoices' && (
          <>
            {filteredInvoices.map((inv) => (
              <View
                key={inv.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                      {inv.invoiceNumber}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                      {inv.partyName || 'Cash Customer'} • {new Date(inv.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                      Rs. {Number(inv.total).toLocaleString()}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            inv.paymentMode === 'cash'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(99, 102, 241, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: inv.paymentMode === 'cash' ? '#10B981' : theme.colors.primary,
                          },
                        ]}
                      >
                        {inv.paymentMode.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
            {filteredInvoices.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="file-text" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No sales invoices recorded.
                </Text>
              </View>
            )}
          </>
        )}

        {/* 2. PAYMENTS IN */}
        {activeSubTab === 'payment_in' && (
          <>
            {filteredPaymentsIn.map((pay) => (
              <View
                key={pay.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                      {pay.partyName}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                      {pay.date} • Mode: {pay.paymentMode.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                    + Rs. {Number(pay.amount).toLocaleString()}
                  </Text>
                </View>
                {pay.notes && (
                  <Text style={[styles.cardNote, { color: theme.colors.textSecondary }]}>
                    Note: {pay.notes}
                  </Text>
                )}
              </View>
            ))}
            {filteredPaymentsIn.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="download" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No payment-in receipts found.
                </Text>
              </View>
            )}
          </>
        )}

        {/* 3. ESTIMATES / QUOTATIONS */}
        {activeSubTab === 'quotations' && (
          <>
            {filteredQuotations.map((qt) => (
              <View
                key={qt.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                      {qt.quotationNumber}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                      {qt.partyName} • {qt.date}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: theme.colors.primary }]}>
                    Rs. {Number(qt.totalAmount).toLocaleString()}
                  </Text>
                </View>
                {qt.notes && (
                  <Text style={[styles.cardNote, { color: theme.colors.textSecondary }]}>
                    {qt.notes}
                  </Text>
                )}
              </View>
            ))}
            {filteredQuotations.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="clipboard" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No quotations created.
                </Text>
              </View>
            )}
          </>
        )}

        {/* 4. SALES RETURNS */}
        {activeSubTab === 'returns' && (
          <>
            {filteredReturns.map((sr) => (
              <View
                key={sr.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                      {sr.returnNumber}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                      {sr.partyName} • {sr.date}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#EF4444' }]}>
                    - Rs. {Number(sr.totalAmount).toLocaleString()}
                  </Text>
                </View>
                {sr.reason && (
                  <Text style={[styles.cardNote, { color: theme.colors.textSecondary }]}>
                    Reason: {sr.reason}
                  </Text>
                )}
              </View>
            ))}
            {filteredReturns.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="corner-up-left" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No sales returns registered.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* PAYMENT IN MODAL */}
      <Modal
        visible={showPaymentInModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentInModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#0B0F19' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#CBD5E1',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Record Payment Received
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentInModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                Customer *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {parties.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.partyChip,
                      {
                        backgroundColor:
                          payPartyId === p.id ? theme.colors.primary : theme.colors.surface,
                        borderColor:
                          payPartyId === p.id ? theme.colors.primary : theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setPayPartyId(p.id)}
                  >
                    <Text
                      style={[
                        styles.partyChipText,
                        { color: payPartyId === p.id ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                Amount (Rs.) *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                Payment Mode
              </Text>
              <View style={styles.modeRow}>
                {(['cash', 'fonepay', 'bank', 'credit'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.modeBtn,
                      {
                        backgroundColor:
                          payMode === m ? theme.colors.primary : theme.colors.surface,
                        borderColor:
                          payMode === m ? theme.colors.primary : theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setPayMode(m)}
                  >
                    <Text
                      style={[
                        styles.modeBtnText,
                        { color: payMode === m ? '#FFFFFF' : theme.colors.textSecondary },
                      ]}
                    >
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                Notes
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                placeholder="Optional notes..."
                placeholderTextColor={theme.colors.textMuted}
                value={payNotes}
                onChangeText={setPayNotes}
              />

              <AnimatedPressable
                style={[styles.modalSubmitBtn, { backgroundColor: '#10B981', marginTop: 16 }]}
                onPress={handleRecordPaymentIn}
                activeScale={0.96}
              >
                <Text style={styles.modalSubmitText}>Save Payment</Text>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QUOTATION MODAL */}
      <Modal
        visible={showQuotationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuotationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#0B0F19' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#CBD5E1',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Create Estimate / Quotation
              </Text>
              <TouchableOpacity onPress={() => setShowQuotationModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                Customer Name *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                placeholder="e.g. Ramesh Giri"
                placeholderTextColor={theme.colors.textMuted}
                value={quotePartyName}
                onChangeText={setQuotePartyName}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Item Name *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                placeholder="e.g. Rice 25kg"
                placeholderTextColor={theme.colors.textMuted}
                value={quoteItemName}
                onChangeText={setQuoteItemName}
              />

              <View style={styles.inputSplitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                    Qty
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.textPrimary,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                    keyboardType="numeric"
                    value={quoteQty}
                    onChangeText={setQuoteQty}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                    Rate (Rs.) *
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.textPrimary,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={quoteRate}
                    onChangeText={setQuoteRate}
                  />
                </View>
              </View>

              <AnimatedPressable
                style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.primary, marginTop: 18 }]}
                onPress={handleCreateQuotation}
                activeScale={0.96}
              >
                <Text style={styles.modalSubmitText}>Generate Estimate</Text>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SALES RETURN MODAL */}
      <Modal
        visible={showReturnModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReturnModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#0B0F19' : '#FFFFFF',
                borderColor: isDark ? '#1E293B' : '#CBD5E1',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Record Sales Return
              </Text>
              <TouchableOpacity onPress={() => setShowReturnModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                Customer Name *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                placeholder="e.g. Sita Thapa"
                placeholderTextColor={theme.colors.textMuted}
                value={returnPartyName}
                onChangeText={setReturnPartyName}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Returned Item Name *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                placeholder="e.g. Broken packaging item"
                placeholderTextColor={theme.colors.textMuted}
                value={returnItemName}
                onChangeText={setReturnItemName}
              />

              <View style={styles.inputSplitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                    Qty
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.textPrimary,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                    keyboardType="numeric"
                    value={returnQty}
                    onChangeText={setReturnQty}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                    Rate (Rs.) *
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.textPrimary,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={returnRate}
                    onChangeText={setReturnRate}
                  />
                </View>
              </View>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Reason
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.borderGlass,
                  },
                ]}
                placeholder="Reason for return..."
                placeholderTextColor={theme.colors.textMuted}
                value={returnReason}
                onChangeText={setReturnReason}
              />

              <AnimatedPressable
                style={[styles.modalSubmitBtn, { backgroundColor: '#EF4444', marginTop: 18 }]}
                onPress={handleCreateReturn}
                activeScale={0.96}
              >
                <Text style={styles.modalSubmitText}>Save Sales Return</Text>
              </AnimatedPressable>
            </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardNote: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  partyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  partyChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  inputSplitRow: {
    flexDirection: 'row',
  },
  modalSubmitBtn: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
