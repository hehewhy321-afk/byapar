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
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { PaymentMode } from '../types';
import { formatNepaliCurrency } from '@byapar/core';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { sendWhatsAppInvoice } from '../services/whatsapp';

export const SalesHubScreen: React.FC = () => {
  const {
    store,
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
    activeInvoice,
    setActiveInvoice,
    theme,
    themeMode,
    language,
    t,
    refreshData,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.warn('[SalesHubScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const ne = language === 'ne';

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

  // Executive KPI Metrics
  const totalSalesGTV = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  }, [invoices]);

  const totalPaymentsCollected = useMemo(() => {
    const inRecords = paymentInRecords.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const cashSales = invoices
      .filter((inv) => inv.paymentMode !== 'credit')
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    return inRecords + cashSales;
  }, [paymentInRecords, invoices]);

  const totalEstimatesValue = useMemo(() => {
    return quotations.reduce((sum, q) => sum + (Number(q.totalAmount) || 0), 0);
  }, [quotations]);

  const totalReturnsValue = useMemo(() => {
    return salesReturns.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  }, [salesReturns]);

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
      type: 'in',
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
      status: 'draft',
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

  const handleCreateSalesReturn = async () => {
    const qty = parseFloat(returnQty) || 1;
    const rate = parseFloat(returnRate) || 0;
    const refund = parseFloat(returnRefund) || 0;

    if (!returnPartyName.trim() || !returnItemName.trim() || rate <= 0) {
      Alert.alert('Validation Error', 'Please enter customer name, returned item name, and rate.');
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Search & Action Row */}
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
            placeholder="Search invoice # or customer..."
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
            <Text style={styles.headerBtnText}>POS Billing</Text>
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
            <Text style={styles.headerBtnText}>New Quote</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'returns' && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: '#EF4444' }]}
            onPress={() => setShowReturnModal(true)}
            activeOpacity={0.88}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>New Return</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modern Pill Rounded Filter Tabs */}
      <View style={styles.pillFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillFilterRow}
        >
          {/* 1. Invoices */}
          <TouchableOpacity
            style={[
              styles.pillBtn,
              activeSubTab === 'invoices'
                ? styles.pillBtnActive
                : {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
            ]}
            onPress={() => setActiveSubTab('invoices')}
            activeOpacity={0.85}
          >
            <Feather
              name="file-text"
              size={13}
              color={activeSubTab === 'invoices' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.pillBtnText,
                { color: activeSubTab === 'invoices' ? '#FFFFFF' : theme.colors.textPrimary },
                activeSubTab === 'invoices' && styles.pillBtnTextActive,
              ]}
            >
              {ne ? 'बिक्री बिल' : 'Invoices'}
            </Text>
            <View
              style={[
                styles.pillBadge,
                activeSubTab === 'invoices'
                  ? styles.pillBadgeActive
                  : { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.pillBadgeText,
                  { color: activeSubTab === 'invoices' ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {invoices.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 2. Payment In */}
          <TouchableOpacity
            style={[
              styles.pillBtn,
              activeSubTab === 'payment_in'
                ? [styles.pillBtnActive, { backgroundColor: '#10B981', borderColor: '#10B981' }]
                : {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
            ]}
            onPress={() => setActiveSubTab('payment_in')}
            activeOpacity={0.85}
          >
            <Feather
              name="arrow-down-left"
              size={13}
              color={activeSubTab === 'payment_in' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.pillBtnText,
                { color: activeSubTab === 'payment_in' ? '#FFFFFF' : theme.colors.textPrimary },
                activeSubTab === 'payment_in' && styles.pillBtnTextActive,
              ]}
            >
              {ne ? 'भुक्तानी आयो' : 'Payments In'}
            </Text>
            <View
              style={[
                styles.pillBadge,
                activeSubTab === 'payment_in'
                  ? styles.pillBadgeActive
                  : { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.pillBadgeText,
                  { color: activeSubTab === 'payment_in' ? '#10B981' : theme.colors.textSecondary },
                ]}
              >
                {paymentInRecords.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 3. Quotations */}
          <TouchableOpacity
            style={[
              styles.pillBtn,
              activeSubTab === 'quotations'
                ? [styles.pillBtnActive, { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }]
                : {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
            ]}
            onPress={() => setActiveSubTab('quotations')}
            activeOpacity={0.85}
          >
            <Feather
              name="clipboard"
              size={13}
              color={activeSubTab === 'quotations' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.pillBtnText,
                { color: activeSubTab === 'quotations' ? '#FFFFFF' : theme.colors.textPrimary },
                activeSubTab === 'quotations' && styles.pillBtnTextActive,
              ]}
            >
              {ne ? 'कोटेशन' : 'Quotations'}
            </Text>
            <View
              style={[
                styles.pillBadge,
                activeSubTab === 'quotations'
                  ? styles.pillBadgeActive
                  : { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.pillBadgeText,
                  { color: activeSubTab === 'quotations' ? '#F59E0B' : theme.colors.textSecondary },
                ]}
              >
                {quotations.length}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 4. Returns */}
          <TouchableOpacity
            style={[
              styles.pillBtn,
              activeSubTab === 'returns'
                ? [styles.pillBtnActive, { backgroundColor: '#EF4444', borderColor: '#EF4444' }]
                : {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                  },
            ]}
            onPress={() => setActiveSubTab('returns')}
            activeOpacity={0.85}
          >
            <Feather
              name="rotate-ccw"
              size={13}
              color={activeSubTab === 'returns' ? '#FFFFFF' : theme.colors.textMuted}
            />
            <Text
              style={[
                styles.pillBtnText,
                { color: activeSubTab === 'returns' ? '#FFFFFF' : theme.colors.textPrimary },
                activeSubTab === 'returns' && styles.pillBtnTextActive,
              ]}
            >
              {ne ? 'बिक्री फिर्ता' : 'Sales Returns'}
            </Text>
            <View
              style={[
                styles.pillBadge,
                activeSubTab === 'returns'
                  ? styles.pillBadgeActive
                  : { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.pillBadgeText,
                  { color: activeSubTab === 'returns' ? '#EF4444' : theme.colors.textSecondary },
                ]}
              >
                {salesReturns.length}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
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
        {/* 1. INVOICES */}
        {activeSubTab === 'invoices' && (
          <>
            {filteredInvoices.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="file-text" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No sales invoices found
                </Text>
              </View>
            ) : (
              filteredInvoices.map((inv) => (
                <TouchableOpacity
                  key={inv.id}
                  activeOpacity={0.75}
                  onPress={() => setActiveInvoice(inv)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.borderGlass,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.avatarBox, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                          {(inv.partyName || 'C')[0].toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                          {inv.invoiceNumber}
                        </Text>
                        <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                          {inv.partyName || 'Cash Customer'} • {new Date(inv.date).toLocaleDateString()}
                        </Text>
                      </View>
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
                                : inv.paymentMode === 'credit'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(255, 69, 0, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color:
                                inv.paymentMode === 'cash'
                                  ? '#10B981'
                                  : inv.paymentMode === 'credit'
                                  ? '#EF4444'
                                  : theme.colors.primary,
                            },
                          ]}
                        >
                          {inv.paymentMode.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Items Summary Preview */}
                  {inv.items && inv.items.length > 0 && (
                    <View
                      style={[
                        styles.itemsPreviewBox,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
                      ]}
                    >
                      <Text style={[styles.itemsSummaryText, { color: theme.colors.textMuted }]}>
                        {inv.items.map((it) => `${it.qty}x ${it.name}`).join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* Card Bottom Actions */}
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.cardActionBtn,
                        {
                          borderColor: 'rgba(37, 211, 102, 0.3)',
                          backgroundColor: theme.colors.whatsappBg,
                          marginRight: 8,
                        },
                      ]}
                      onPress={async () => {
                        const matchedParty = parties.find(
                          (p) => p.name.trim().toLowerCase() === (inv.partyName || '').trim().toLowerCase()
                        );
                        await sendWhatsAppInvoice(
                          {
                            invoiceNumber: inv.invoiceNumber,
                            date: inv.date,
                            total: inv.total,
                            paymentMode: inv.paymentMode,
                            partyName: inv.partyName,
                            items: inv.items,
                          },
                          {
                            name: store.name,
                            phone: store.phone,
                            panNumber: store.panNumber,
                            address: store.address,
                          },
                          matchedParty?.phone
                        );
                      }}
                    >
                      <Feather name="share-2" size={13} color={theme.colors.whatsapp} />
                      <Text style={[styles.cardActionText, { color: theme.colors.whatsapp }]}>
                        WhatsApp
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardActionBtn, { borderColor: theme.colors.borderGlass }]}
                      onPress={() => setActiveInvoice(inv)}
                    >
                      <Feather name="printer" size={13} color={theme.colors.textSecondary} />
                      <Text style={[styles.cardActionText, { color: theme.colors.textSecondary }]}>
                        View Receipt
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* 2. PAYMENTS IN */}
        {activeSubTab === 'payment_in' && (
          <>
            {filteredPaymentsIn.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="arrow-down-left" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No payment-in vouchers recorded
                </Text>
              </View>
            ) : (
              filteredPaymentsIn.map((pay) => (
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
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.iconCircleSmall, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                        <Feather name="arrow-down-left" size={16} color="#10B981" />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                          {pay.partyName}
                        </Text>
                        <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                          Received • {new Date(pay.date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                        +Rs. {Number(pay.amount).toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: 'rgba(16, 185, 129, 0.12)' },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: '#10B981' }]}>
                          {pay.paymentMode.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {pay.notes ? (
                    <Text style={[styles.cardNote, { color: theme.colors.textMuted }]}>
                      Note: {pay.notes}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </>
        )}

        {/* 3. QUOTATIONS */}
        {activeSubTab === 'quotations' && (
          <>
            {filteredQuotations.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="clipboard" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No quotation estimates created
                </Text>
              </View>
            ) : (
              filteredQuotations.map((qt) => (
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
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.iconCircleSmall, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                        <Feather name="clipboard" size={16} color="#F59E0B" />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                          {qt.quotationNumber}
                        </Text>
                        <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                          {qt.partyName} • {new Date(qt.date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cardAmount, { color: '#F59E0B' }]}>
                        Rs. {Number(qt.totalAmount).toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: '#F59E0B' }]}>
                          ESTIMATE
                        </Text>
                      </View>
                    </View>
                  </View>

                  {qt.items && qt.items.length > 0 && (
                    <View
                      style={[
                        styles.itemsPreviewBox,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
                      ]}
                    >
                      <Text style={[styles.itemsSummaryText, { color: theme.colors.textMuted }]}>
                        {qt.items.map((it) => `${it.quantity}x ${it.itemName} @ Rs. ${it.unitPrice}`).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* 4. SALES RETURNS */}
        {activeSubTab === 'returns' && (
          <>
            {filteredReturns.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="rotate-ccw" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No sales returns registered
                </Text>
              </View>
            ) : (
              filteredReturns.map((sr) => (
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
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.iconCircleSmall, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <Feather name="rotate-ccw" size={16} color="#EF4444" />
                      </View>
                      <View>
                        <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                          {sr.returnNumber}
                        </Text>
                        <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                          {sr.partyName} • {new Date(sr.date).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.cardAmount, { color: '#EF4444' }]}>
                        -Rs. {Number(sr.totalAmount).toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: '#EF4444' }]}>
                          RETURN
                        </Text>
                      </View>
                    </View>
                  </View>

                  {sr.reason ? (
                    <Text style={[styles.cardNote, { color: theme.colors.textMuted }]}>
                      Reason: {sr.reason}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modal: Payment In */}
      <Modal
        visible={showPaymentInModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentInModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPaymentInModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                {ne ? 'भुक्तानी दर्ता गर्नुहोस्' : 'Record Payment Received'}
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentInModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                  {ne ? 'ग्राहक छान्नुहोस् *' : 'Select Customer *'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {parties.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.partyChip,
                      {
                        backgroundColor:
                          payPartyId === p.id ? '#10B981' : theme.colors.card,
                        borderColor:
                          payPartyId === p.id ? '#10B981' : theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setPayPartyId(p.id)}
                  >
                    <Text
                      style={[
                        styles.partyChipText,
                        {
                          color: payPartyId === p.id ? '#FFFFFF' : theme.colors.textPrimary,
                        },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                {ne ? 'प्राप्त रकम (रु.) *' : 'Amount Received *'}
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                value={payAmount}
                onChangeText={setPayAmount}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                Payment Mode
              </Text>
              <View style={styles.modeRow}>
                {(['cash', 'fonepay', 'bank'] as PaymentMode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.modeBtn,
                      {
                        backgroundColor:
                          payMode === m ? '#10B981' : theme.colors.card,
                        borderColor:
                          payMode === m ? '#10B981' : theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setPayMode(m)}
                  >
                    <Text
                      style={[
                        styles.modeBtnText,
                        { color: payMode === m ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                Remarks / Reference
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Bill number, cheque or transaction ID..."
                placeholderTextColor={theme.colors.textMuted}
                value={payNotes}
                onChangeText={setPayNotes}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#10B981', marginTop: 18 }]}
                onPress={handleRecordPaymentIn}
              >
                <Text style={styles.modalSubmitText}>Save Payment Received</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Quotation */}
      <Modal
        visible={showQuotationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuotationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowQuotationModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Create Estimate / Quotation
              </Text>
              <TouchableOpacity onPress={() => setShowQuotationModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
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
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Enter customer name"
                placeholderTextColor={theme.colors.textMuted}
                value={quotePartyName}
                onChangeText={setQuotePartyName}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Phone (Optional)
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                keyboardType="phone-pad"
                placeholder="98XXXXXXXX"
                placeholderTextColor={theme.colors.textMuted}
                value={quotePartyPhone}
                onChangeText={setQuotePartyPhone}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Item / Service Name *
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="e.g. Basmati Rice 25kg"
                placeholderTextColor={theme.colors.textMuted}
                value={quoteItemName}
                onChangeText={setQuoteItemName}
              />

              <View style={[styles.inputSplitRow, { marginTop: 10, gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Qty
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderGlass,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={theme.colors.textMuted}
                    value={quoteQty}
                    onChangeText={setQuoteQty}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Rate (NPR) *
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderGlass,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    value={quoteRate}
                    onChangeText={setQuoteRate}
                  />
                </View>
              </View>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Terms / Notes
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Valid for 7 days..."
                placeholderTextColor={theme.colors.textMuted}
                value={quoteNotes}
                onChangeText={setQuoteNotes}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.primary, marginTop: 18 }]}
                onPress={handleCreateQuotation}
              >
                <Text style={styles.modalSubmitText}>Save & Create Quotation</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Sales Return */}
      <Modal
        visible={showReturnModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReturnModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowReturnModal(false)}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Record Customer Return
              </Text>
              <TouchableOpacity onPress={() => setShowReturnModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textMuted} />
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
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Customer Name"
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
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Item Name"
                placeholderTextColor={theme.colors.textMuted}
                value={returnItemName}
                onChangeText={setReturnItemName}
              />

              <View style={[styles.inputSplitRow, { marginTop: 10, gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Qty
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderGlass,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={theme.colors.textMuted}
                    value={returnQty}
                    onChangeText={setReturnQty}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                    Rate (NPR) *
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderGlass,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    value={returnRate}
                    onChangeText={setReturnRate}
                  />
                </View>
              </View>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Cash Refund Amount (NPR)
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                keyboardType="numeric"
                placeholder="0.00 (leave 0 if credited to account)"
                placeholderTextColor={theme.colors.textMuted}
                value={returnRefund}
                onChangeText={setReturnRefund}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Reason for Return
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.borderGlass,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder="Damaged, expired, incorrect size..."
                placeholderTextColor={theme.colors.textMuted}
                value={returnReason}
                onChangeText={setReturnReason}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#EF4444', marginTop: 18 }]}
                onPress={handleCreateSalesReturn}
              >
                <Text style={styles.modalSubmitText}>Save Sales Return Voucher</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. THERMAL RECEIPT & INVOICE DETAILS MODAL */}
      <ReceiptModal
        invoice={activeInvoice}
        onClose={() => setActiveInvoice(null)}
      />
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchBox: {
    flex: 1,
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
    fontSize: 13,
    padding: 0,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    gap: 5,
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pillFilterWrapper: {
    paddingVertical: 10,
  },
  pillFilterRow: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 6,
  },
  pillBtnActive: {
    backgroundColor: '#FF4500',
    borderColor: '#FF4500',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillBtnTextActive: {
    fontWeight: '800',
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 9999,
  },
  pillBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 14,
    paddingBottom: 25,
    gap: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  iconCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  itemsPreviewBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemsSummaryText: {
    fontSize: 11,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 6,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  cardActionText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardNote: {
    fontSize: 11,
    fontStyle: 'italic',
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
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  chipRow: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  partyChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    paddingVertical: 9,
    borderRadius: 10,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
