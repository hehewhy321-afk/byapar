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

export const PurchaseHubScreen: React.FC = () => {
  const {
    purchaseBills,
    purchaseReturns,
    paymentOutRecords,
    parties,
    accounts,
    createPurchaseBill,
    createPurchaseReturn,
    createPaymentOut,
    theme,
    themeMode,
  } = useApp();

  const isDark = themeMode === 'dark';

  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'payment_out' | 'returns'>('bills');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentOutModal, setShowPaymentOutModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Bill Form
  const [billSupplierName, setBillSupplierName] = useState('');
  const [billSupplierPhone, setBillSupplierPhone] = useState('');
  const [billItemName, setBillItemName] = useState('');
  const [billQty, setBillQty] = useState('1');
  const [billCost, setBillCost] = useState('');
  const [billPaid, setBillPaid] = useState('');
  const [billMode, setBillMode] = useState<PaymentMode>('cash');

  // Payment Out Form
  const [outPartyId, setOutPartyId] = useState('');
  const [outAmount, setOutAmount] = useState('');
  const [outMode, setOutMode] = useState<PaymentMode>('cash');
  const [outAccountId, setOutAccountId] = useState(accounts[0]?.id || '');
  const [outNotes, setOutNotes] = useState('');

  // Purchase Return Form
  const [returnSupplierName, setReturnSupplierName] = useState('');
  const [returnItemName, setReturnItemName] = useState('');
  const [returnQty, setReturnQty] = useState('1');
  const [returnCost, setReturnCost] = useState('');
  const [returnRefund, setReturnRefund] = useState('');
  const [returnReason, setReturnReason] = useState('');

  // Filtered lists
  const filteredBills = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return purchaseBills;
    return purchaseBills.filter(
      (b) =>
        b.billNumber.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q)
    );
  }, [purchaseBills, searchQuery]);

  const filteredPaymentsOut = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return paymentOutRecords;
    return paymentOutRecords.filter((p) => p.partyName.toLowerCase().includes(q));
  }, [paymentOutRecords, searchQuery]);

  const filteredReturns = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return purchaseReturns;
    return purchaseReturns.filter(
      (pr) =>
        pr.returnNumber.toLowerCase().includes(q) ||
        pr.supplierName.toLowerCase().includes(q)
    );
  }, [purchaseReturns, searchQuery]);

  // Actions
  const handleCreateBill = async () => {
    const qty = parseFloat(billQty) || 1;
    const cost = parseFloat(billCost) || 0;
    const paid = parseFloat(billPaid) || 0;
    if (!billSupplierName.trim() || !billItemName.trim() || cost <= 0) {
      Alert.alert('Validation Error', 'Please enter supplier name, item name, and item cost.');
      return;
    }

    const total = qty * cost;
    const seq = (purchaseBills.length + 1).toString().padStart(4, '0');
    await createPurchaseBill({
      billNumber: `BILL-${new Date().getFullYear()}-${seq}`,
      supplierName: billSupplierName.trim(),
      supplierPhone: billSupplierPhone.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      totalAmount: total,
      paidAmount: paid,
      paymentMode: billMode,
      items: [
        {
          id: Math.random().toString(),
          itemName: billItemName.trim(),
          quantity: qty,
          purchaseCost: cost,
          totalAmount: total,
        },
      ],
    });

    setShowBillModal(false);
    setBillSupplierName('');
    setBillSupplierPhone('');
    setBillItemName('');
    setBillCost('');
    setBillPaid('');
  };

  const handleRecordPaymentOut = async () => {
    const amt = parseFloat(outAmount);
    if (!outPartyId) {
      Alert.alert('Validation Error', 'Please select a supplier.');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    const party = parties.find((p) => p.id === outPartyId);
    await createPaymentOut({
      partyId: outPartyId,
      partyName: party ? party.name : 'Unknown Supplier',
      amount: amt,
      paymentMode: outMode,
      accountId: outAccountId || undefined,
      date: new Date().toISOString().split('T')[0],
      notes: outNotes || undefined,
    });

    setShowPaymentOutModal(false);
    setOutPartyId('');
    setOutAmount('');
    setOutNotes('');
  };

  const handleCreateReturn = async () => {
    const qty = parseFloat(returnQty) || 1;
    const cost = parseFloat(returnCost) || 0;
    const refund = parseFloat(returnRefund) || 0;
    if (!returnSupplierName.trim() || !returnItemName.trim() || cost <= 0) {
      Alert.alert('Validation Error', 'Please enter supplier name, item name, and cost.');
      return;
    }

    const total = qty * cost;
    const seq = (purchaseReturns.length + 1).toString().padStart(4, '0');
    await createPurchaseReturn({
      returnNumber: `PR-${new Date().getFullYear()}-${seq}`,
      supplierName: returnSupplierName.trim(),
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
          purchaseCost: cost,
          totalAmount: total,
        },
      ],
    });

    setShowReturnModal(false);
    setReturnSupplierName('');
    setReturnItemName('');
    setReturnCost('');
    setReturnRefund('');
    setReturnReason('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Header Bar */}
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
            placeholder="Search bill # or supplier..."
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

        {activeSubTab === 'bills' && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowBillModal(true)}
            activeOpacity={0.88}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Purchase Bill</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'payment_out' && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: '#EF4444' }]}
            onPress={() => setShowPaymentOutModal(true)}
            activeOpacity={0.88}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Payment Out</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'returns' && (
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: '#F59E0B' }]}
            onPress={() => setShowReturnModal(true)}
            activeOpacity={0.88}
          >
            <Feather name="plus" size={15} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Debit Note</Text>
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
                activeSubTab === 'bills' ? 'rgba(99, 102, 241, 0.14)' : theme.colors.card,
              borderColor:
                activeSubTab === 'bills' ? theme.colors.primary : theme.colors.borderGlass,
            },
          ]}
          onPress={() => setActiveSubTab('bills')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeSubTab === 'bills' ? theme.colors.primary : theme.colors.textSecondary,
              },
              activeSubTab === 'bills' && styles.tabTextActive,
            ]}
          >
            Bills In ({purchaseBills.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor:
                activeSubTab === 'payment_out' ? 'rgba(239, 68, 68, 0.14)' : theme.colors.card,
              borderColor:
                activeSubTab === 'payment_out' ? '#EF4444' : theme.colors.borderGlass,
            },
          ]}
          onPress={() => setActiveSubTab('payment_out')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeSubTab === 'payment_out' ? '#EF4444' : theme.colors.textSecondary },
              activeSubTab === 'payment_out' && styles.tabTextActive,
            ]}
          >
            Payments Out ({paymentOutRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor:
                activeSubTab === 'returns' ? 'rgba(245, 158, 11, 0.14)' : theme.colors.card,
              borderColor:
                activeSubTab === 'returns' ? '#F59E0B' : theme.colors.borderGlass,
            },
          ]}
          onPress={() => setActiveSubTab('returns')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeSubTab === 'returns' ? '#F59E0B' : theme.colors.textSecondary },
              activeSubTab === 'returns' && styles.tabTextActive,
            ]}
          >
            Returns ({purchaseReturns.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Main Content List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. BILLS */}
        {activeSubTab === 'bills' && (
          <>
            {filteredBills.map((b) => (
              <View
                key={b.id}
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
                      {b.billNumber}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                      {b.supplierName} • {b.date}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: '#EF4444' }]}>
                      Rs. {Number(b.totalAmount).toLocaleString()}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            b.paidAmount >= b.totalAmount
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: b.paidAmount >= b.totalAmount ? '#10B981' : '#EF4444',
                          },
                        ]}
                      >
                        {b.paidAmount >= b.totalAmount ? 'PAID' : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
            {filteredBills.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="truck" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No purchase bills recorded.
                </Text>
              </View>
            )}
          </>
        )}

        {/* 2. PAYMENTS OUT */}
        {activeSubTab === 'payment_out' && (
          <>
            {filteredPaymentsOut.map((pay) => (
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
                  <Text style={[styles.cardAmount, { color: '#EF4444' }]}>
                    - Rs. {Number(pay.amount).toLocaleString()}
                  </Text>
                </View>
                {pay.notes && (
                  <Text style={[styles.cardNote, { color: theme.colors.textSecondary }]}>
                    Note: {pay.notes}
                  </Text>
                )}
              </View>
            ))}
            {filteredPaymentsOut.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="upload" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No payment-out records found.
                </Text>
              </View>
            )}
          </>
        )}

        {/* 3. PURCHASE RETURNS */}
        {activeSubTab === 'returns' && (
          <>
            {filteredReturns.map((pr) => (
              <View
                key={pr.id}
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
                      {pr.returnNumber}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]}>
                      {pr.supplierName} • {pr.date}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                    + Rs. {Number(pr.totalAmount).toLocaleString()}
                  </Text>
                </View>
                {pr.reason && (
                  <Text style={[styles.cardNote, { color: theme.colors.textSecondary }]}>
                    Reason: {pr.reason}
                  </Text>
                )}
              </View>
            ))}
            {filteredReturns.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="corner-up-left" size={36} color={theme.colors.textMuted} />
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                  No purchase returns recorded.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* CREATE BILL MODAL */}
      <Modal
        visible={showBillModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBillModal(false)}
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
                Record Purchase Bill
              </Text>
              <TouchableOpacity onPress={() => setShowBillModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                Supplier / Vendor *
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
                placeholder="e.g. Kathmandu Distributors"
                placeholderTextColor={theme.colors.textMuted}
                value={billSupplierName}
                onChangeText={setBillSupplierName}
              />

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Item Purchased *
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
                placeholder="e.g. Cooking Oil Box"
                placeholderTextColor={theme.colors.textMuted}
                value={billItemName}
                onChangeText={setBillItemName}
              />

              <View style={styles.inputSplitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                    Quantity
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
                    value={billQty}
                    onChangeText={setBillQty}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                    Cost / Unit (Rs.) *
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
                    value={billCost}
                    onChangeText={setBillCost}
                  />
                </View>
              </View>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Paid Amount (Rs.)
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
                placeholder="0.00 (leave empty if full credit)"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={billPaid}
                onChangeText={setBillPaid}
              />

              <AnimatedPressable
                style={[styles.modalSubmitBtn, { backgroundColor: theme.colors.primary, marginTop: 18 }]}
                onPress={handleCreateBill}
                activeScale={0.96}
              >
                <Text style={styles.modalSubmitText}>Save Purchase Bill</Text>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PAYMENT OUT MODAL */}
      <Modal
        visible={showPaymentOutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentOutModal(false)}
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
                Record Payment Given
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentOutModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                Supplier / Party *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {parties.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.partyChip,
                      {
                        backgroundColor:
                          outPartyId === p.id ? '#EF4444' : theme.colors.surface,
                        borderColor:
                          outPartyId === p.id ? '#EF4444' : theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setOutPartyId(p.id)}
                  >
                    <Text
                      style={[
                        styles.partyChipText,
                        { color: outPartyId === p.id ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                Amount Paid (Rs.) *
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
                value={outAmount}
                onChangeText={setOutAmount}
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
                          outMode === m ? '#EF4444' : theme.colors.surface,
                        borderColor:
                          outMode === m ? '#EF4444' : theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setOutMode(m)}
                  >
                    <Text
                      style={[
                        styles.modeBtnText,
                        { color: outMode === m ? '#FFFFFF' : theme.colors.textSecondary },
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
                placeholder="Payment reference, cheque number..."
                placeholderTextColor={theme.colors.textMuted}
                value={outNotes}
                onChangeText={setOutNotes}
              />

              <AnimatedPressable
                style={[styles.modalSubmitBtn, { backgroundColor: '#EF4444', marginTop: 18 }]}
                onPress={handleRecordPaymentOut}
                activeScale={0.96}
              >
                <Text style={styles.modalSubmitText}>Save Payment Out</Text>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PURCHASE RETURN MODAL */}
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
                Record Purchase Return (Debit Note)
              </Text>
              <TouchableOpacity onPress={() => setShowReturnModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
                Supplier Name *
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
                placeholder="e.g. Wholesale Nepal"
                placeholderTextColor={theme.colors.textMuted}
                value={returnSupplierName}
                onChangeText={setReturnSupplierName}
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
                placeholder="e.g. Expired stock"
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
                    Cost / Unit (Rs.) *
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
                    value={returnCost}
                    onChangeText={setReturnCost}
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
                placeholder="Reason for return to supplier..."
                placeholderTextColor={theme.colors.textMuted}
                value={returnReason}
                onChangeText={setReturnReason}
              />

              <AnimatedPressable
                style={[styles.modalSubmitBtn, { backgroundColor: '#F59E0B', marginTop: 18 }]}
                onPress={handleCreateReturn}
                activeScale={0.96}
              >
                <Text style={styles.modalSubmitText}>Save Purchase Return</Text>
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
