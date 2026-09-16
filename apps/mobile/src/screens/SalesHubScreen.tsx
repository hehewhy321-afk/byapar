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
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'payment_in' | 'quotations' | 'returns'>('invoices');
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
    if (!payPartyId || !amt || amt <= 0) {
      Alert.alert('Validation Error', 'Please select a customer and enter an amount.');
      return;
    }

    const party = parties.find((p) => p.id === payPartyId);
    await createPaymentIn({
      type: 'in',
      partyId: payPartyId,
      partyName: party?.name || 'Customer',
      amount: amt,
      paymentMode: payMode,
      accountId: payAccountId || undefined,
      notes: payNotes,
      date: new Date().toISOString().split('T')[0],
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
      Alert.alert('Validation Error', 'Please enter customer name, item name, and rate.');
      return;
    }

    const total = qty * rate;
    const seq = (quotations.length + 1).toString().padStart(4, '0');
    await createQuotation({
      quotationNumber: `QT-${new Date().getFullYear()}-${seq}`,
      partyName: quotePartyName.trim(),
      partyPhone: quotePartyPhone.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      totalAmount: total,
      notes: quoteNotes || undefined,
      status: 'sent',
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

  return (
    <View style={styles.container}>
      {/* Search & Header Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice #, customer..."
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {activeSubTab === 'invoices' && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setActiveTab('pos')}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>POS Sale</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'payment_in' && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowPaymentInModal(true)}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Payment</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'quotations' && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowQuotationModal(true)}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Quotation</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'returns' && (
          <TouchableOpacity
            style={[styles.headerBtn, styles.btnRose]}
            onPress={() => setShowReturnModal(true)}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Return</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subtabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        <TouchableOpacity
          style={[styles.tab, activeSubTab === 'invoices' && styles.tabActive]}
          onPress={() => setActiveSubTab('invoices')}
        >
          <Text style={[styles.tabText, activeSubTab === 'invoices' && styles.tabTextActive]}>
            Sales Invoices ({invoices.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeSubTab === 'payment_in' && styles.tabActive]}
          onPress={() => setActiveSubTab('payment_in')}
        >
          <Text style={[styles.tabText, activeSubTab === 'payment_in' && styles.tabTextActive]}>
            Payment In ({paymentInRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeSubTab === 'quotations' && styles.tabActive]}
          onPress={() => setActiveSubTab('quotations')}
        >
          <Text style={[styles.tabText, activeSubTab === 'quotations' && styles.tabTextActive]}>
            Quotations ({quotations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeSubTab === 'returns' && styles.tabActive]}
          onPress={() => setActiveSubTab('returns')}
        >
          <Text style={[styles.tabText, activeSubTab === 'returns' && styles.tabTextActive]}>
            Sales Return ({salesReturns.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tab 1: Invoices */}
      {activeSubTab === 'invoices' && (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredInvoices.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file-text" size={40} color="#444" />
              <Text style={styles.emptyText}>No sales invoices found</Text>
            </View>
          ) : (
            filteredInvoices.map((inv) => (
              <View key={inv.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{inv.invoiceNumber}</Text>
                    <Text style={styles.cardSubtitle}>
                      {inv.partyName || 'Cash Sale'} • {inv.date}
                    </Text>
                  </View>
                  <Text style={styles.cardAmount}>Rs. {inv.total.toLocaleString()}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.modeBadge}>
                    <Text style={styles.modeBadgeText}>{inv.paymentMode.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.itemCountText}>
                    {inv.items.length} {inv.items.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Tab 2: Payment In */}
      {activeSubTab === 'payment_in' && (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredPaymentsIn.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="credit-card" size={40} color="#444" />
              <Text style={styles.emptyText}>No payment in records yet</Text>
            </View>
          ) : (
            filteredPaymentsIn.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{p.partyName}</Text>
                    <Text style={styles.cardSubtitle}>
                      {p.date} • {p.paymentMode.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                    + Rs. {p.amount.toLocaleString()}
                  </Text>
                </View>
                {p.notes ? <Text style={styles.notesText}>{p.notes}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Tab 3: Quotations */}
      {activeSubTab === 'quotations' && (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredQuotations.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="file" size={40} color="#444" />
              <Text style={styles.emptyText}>No price quotations yet</Text>
            </View>
          ) : (
            filteredQuotations.map((qt) => (
              <View key={qt.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{qt.quotationNumber}</Text>
                    <Text style={styles.cardSubtitle}>
                      {qt.partyName} • {qt.date}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#3B82F6' }]}>
                    Rs. {qt.totalAmount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <View style={[styles.modeBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Text style={[styles.modeBadgeText, { color: '#3B82F6' }]}>
                      {qt.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.itemCountText}>
                    {qt.items.length} {qt.items.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Tab 4: Sales Returns */}
      {activeSubTab === 'returns' && (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredReturns.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="corner-down-left" size={40} color="#444" />
              <Text style={styles.emptyText}>No sales return records</Text>
            </View>
          ) : (
            filteredReturns.map((sr) => (
              <View key={sr.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{sr.returnNumber}</Text>
                    <Text style={styles.cardSubtitle}>
                      {sr.partyName} • {sr.date}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#FF4D4F' }]}>
                    Rs. {sr.totalAmount.toLocaleString()}
                  </Text>
                </View>
                {sr.reason ? <Text style={styles.notesText}>Reason: {sr.reason}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL: Record Payment In */}
      <Modal visible={showPaymentInModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Customer Payment In</Text>
              <TouchableOpacity onPress={() => setShowPaymentInModal(false)}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Select Customer *</Text>
              <View style={styles.pickerContainer}>
                {parties
                  .filter((p) => p.type === 'customer')
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.pickerOption,
                        payPartyId === p.id && styles.pickerOptionActive,
                      ]}
                      onPress={() => setPayPartyId(p.id)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          payPartyId === p.id && styles.pickerOptionTextActive,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <Text style={styles.label}>Amount (Rs.) *</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />

              <Text style={styles.label}>Deposit To Account</Text>
              <View style={styles.pickerContainer}>
                {accounts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.pickerOption,
                      payAccountId === a.id && styles.pickerOptionActive,
                    ]}
                    onPress={() => setPayAccountId(a.id)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        payAccountId === a.id && styles.pickerOptionTextActive,
                      ]}
                    >
                      {a.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. FonePay Ref or Receipt #"
                placeholderTextColor="#555"
                value={payNotes}
                onChangeText={setPayNotes}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleRecordPaymentIn}>
                <Text style={styles.submitBtnText}>Save Payment</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: New Quotation */}
      <Modal visible={showQuotationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Price Quotation</Text>
              <TouchableOpacity onPress={() => setShowQuotationModal(false)}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Customer or Company Name"
                placeholderTextColor="#555"
                value={quotePartyName}
                onChangeText={setQuotePartyName}
              />

              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="98XXXXXXXX"
                placeholderTextColor="#555"
                keyboardType="phone-pad"
                value={quotePartyPhone}
                onChangeText={setQuotePartyPhone}
              />

              <Text style={styles.label}>Item Description *</Text>
              <TextInput
                style={styles.input}
                placeholder="Product name or package"
                placeholderTextColor="#555"
                value={quoteItemName}
                onChangeText={setQuoteItemName}
              />

              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={quoteQty}
                    onChangeText={setQuoteQty}
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.label}>Rate per Unit (Rs.) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={quoteRate}
                    onChangeText={setQuoteRate}
                  />
                </View>
              </View>

              <Text style={styles.label}>Terms / Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="Validity or delivery notes"
                placeholderTextColor="#555"
                value={quoteNotes}
                onChangeText={setQuoteNotes}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateQuotation}>
                <Text style={styles.submitBtnText}>Create Quotation</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: Sales Return */}
      <Modal visible={showReturnModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Sales Return (Credit Note)</Text>
              <TouchableOpacity onPress={() => setShowReturnModal(false)}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Customer Name"
                placeholderTextColor="#555"
                value={returnPartyName}
                onChangeText={setReturnPartyName}
              />

              <Text style={styles.label}>Returned Item *</Text>
              <TextInput
                style={styles.input}
                placeholder="Item name"
                placeholderTextColor="#555"
                value={returnItemName}
                onChangeText={setReturnItemName}
              />

              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Qty</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={returnQty}
                    onChangeText={setReturnQty}
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.label}>Price per Unit (Rs.) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={returnRate}
                    onChangeText={setReturnRate}
                  />
                </View>
              </View>

              <Text style={styles.label}>Cash Refund Amount (Rs.)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={returnRefund}
                onChangeText={setReturnRefund}
              />

              <Text style={styles.label}>Reason for Return</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Expired, defective"
                placeholderTextColor="#555"
                value={returnReason}
                onChangeText={setReturnReason}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#FF4D4F' }]}
                onPress={handleCreateReturn}
              >
                <Text style={styles.submitBtnText}>Issue Credit Note</Text>
              </TouchableOpacity>
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
    backgroundColor: '#000000',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
  },
  btnRose: {
    backgroundColor: '#FF4D4F',
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#222222',
  },
  tabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },
  tabTextActive: {
    color: '#10B981',
  },
  listContainer: {
    padding: 16,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#555555',
  },
  card: {
    backgroundColor: '#0d0d0d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f1f1f',
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  modeBadge: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888888',
  },
  itemCountText: {
    fontSize: 11,
    color: '#666666',
  },
  notesText: {
    fontSize: 11,
    color: '#888888',
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0e0e0e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalForm: {
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAAAAA',
  },
  input: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: '#FFFFFF',
    fontSize: 13,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    textAlign: 'center',
  },
  twoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
  },
  pickerOptionActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  pickerOptionText: {
    fontSize: 11,
    color: '#888888',
  },
  pickerOptionTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
