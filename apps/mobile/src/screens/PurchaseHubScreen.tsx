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
  } = useApp();

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
      Alert.alert('Validation Error', 'Please enter supplier name, item name, and cost.');
      return;
    }

    const total = qty * cost;
    const due = Math.max(0, total - paid);
    const seq = (purchaseBills.length + 1).toString().padStart(4, '0');

    await createPurchaseBill({
      billNumber: `BILL-${new Date().getFullYear()}-${seq}`,
      supplierName: billSupplierName.trim(),
      supplierPhone: billSupplierPhone.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
      subtotal: total,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: due,
      paymentMode: billMode,
      status: due === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      items: [
        {
          id: Math.random().toString(),
          itemName: billItemName.trim(),
          quantity: qty,
          costPrice: cost,
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

  const handleCreatePaymentOut = async () => {
    const amt = parseFloat(outAmount);
    if (!outPartyId || !amt || amt <= 0) {
      Alert.alert('Validation Error', 'Please select a supplier and enter an amount.');
      return;
    }

    const party = parties.find((p) => p.id === outPartyId);
    await createPaymentOut({
      type: 'out',
      partyId: outPartyId,
      partyName: party?.name || 'Supplier',
      amount: amt,
      paymentMode: outMode,
      accountId: outAccountId || undefined,
      notes: outNotes,
      date: new Date().toISOString().split('T')[0],
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
      reason: returnReason || undefined,
      items: [
        {
          id: Math.random().toString(),
          itemName: returnItemName.trim(),
          quantity: qty,
          costPrice: cost,
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
    <View style={styles.container}>
      {/* Search & Header Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bills, suppliers..."
            placeholderTextColor="#555"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {activeSubTab === 'bills' && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowBillModal(true)}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Add Bill</Text>
          </TouchableOpacity>
        )}

        {activeSubTab === 'payment_out' && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setShowPaymentOutModal(true)}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.headerBtnText}>Pay Out</Text>
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
          style={[styles.tab, activeSubTab === 'bills' && styles.tabActive]}
          onPress={() => setActiveSubTab('bills')}
        >
          <Text style={[styles.tabText, activeSubTab === 'bills' && styles.tabTextActive]}>
            Purchase Bills ({purchaseBills.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeSubTab === 'payment_out' && styles.tabActive]}
          onPress={() => setActiveSubTab('payment_out')}
        >
          <Text style={[styles.tabText, activeSubTab === 'payment_out' && styles.tabTextActive]}>
            Payment Out ({paymentOutRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeSubTab === 'returns' && styles.tabActive]}
          onPress={() => setActiveSubTab('returns')}
        >
          <Text style={[styles.tabText, activeSubTab === 'returns' && styles.tabTextActive]}>
            Purchase Return ({purchaseReturns.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tab 1: Purchase Bills */}
      {activeSubTab === 'bills' && (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredBills.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="truck" size={40} color="#444" />
              <Text style={styles.emptyText}>No purchase bills recorded</Text>
            </View>
          ) : (
            filteredBills.map((b) => (
              <View key={b.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{b.billNumber}</Text>
                    <Text style={styles.cardSubtitle}>
                      {b.supplierName} • {b.date}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#3B82F6' }]}>
                    Rs. {b.totalAmount.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.modeBadge,
                      b.status === 'paid' ? styles.badgeGreen : styles.badgeAmber,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modeBadgeText,
                        b.status === 'paid' ? { color: '#10B981' } : { color: '#F59E0B' },
                      ]}
                    >
                      {b.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.dueText}>
                    {b.dueAmount > 0 ? `Due: Rs. ${b.dueAmount.toLocaleString()}` : 'Paid in Full'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Tab 2: Payment Out */}
      {activeSubTab === 'payment_out' && (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredPaymentsOut.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="credit-card" size={40} color="#444" />
              <Text style={styles.emptyText}>No payment out records</Text>
            </View>
          ) : (
            filteredPaymentsOut.map((p) => (
              <View key={p.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{p.partyName}</Text>
                    <Text style={styles.cardSubtitle}>
                      {p.date} • {p.paymentMode.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#FF4D4F' }]}>
                    - Rs. {p.amount.toLocaleString()}
                  </Text>
                </View>
                {p.notes ? <Text style={styles.notesText}>{p.notes}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Tab 3: Purchase Returns */}
      {activeSubTab === 'returns' && (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredReturns.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="corner-up-left" size={40} color="#444" />
              <Text style={styles.emptyText}>No purchase returns recorded</Text>
            </View>
          ) : (
            filteredReturns.map((pr) => (
              <View key={pr.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{pr.returnNumber}</Text>
                    <Text style={styles.cardSubtitle}>
                      {pr.supplierName} • {pr.date}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                    Refund: Rs. {pr.refundAmount.toLocaleString()}
                  </Text>
                </View>
                {pr.reason ? <Text style={styles.notesText}>Reason: {pr.reason}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL: New Purchase Bill */}
      <Modal visible={showBillModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Purchase Bill</Text>
              <TouchableOpacity onPress={() => setShowBillModal(false)}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Select Supplier *</Text>
              <View style={styles.pickerContainer}>
                {parties
                  .filter((p) => p.type === 'supplier')
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.pickerOption,
                        billSupplierName === p.name && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        setBillSupplierName(p.name);
                        setBillSupplierPhone(p.phone || '');
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          billSupplierName === p.name && styles.pickerOptionTextActive,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <Text style={styles.label}>Supplier Name (if new)</Text>
              <TextInput
                style={styles.input}
                placeholder="Vendor or Distributor Name"
                placeholderTextColor="#555"
                value={billSupplierName}
                onChangeText={setBillSupplierName}
              />

              <Text style={styles.label}>Item / Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Product purchased"
                placeholderTextColor="#555"
                value={billItemName}
                onChangeText={setBillItemName}
              />

              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={billQty}
                    onChangeText={setBillQty}
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.label}>Cost Price (Rs.) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={billCost}
                    onChangeText={setBillCost}
                  />
                </View>
              </View>

              <Text style={styles.label}>Amount Paid (Rs.)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={billPaid}
                onChangeText={setBillPaid}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateBill}>
                <Text style={styles.submitBtnText}>Save Purchase & Restock</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: Payment Out */}
      <Modal visible={showPaymentOutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment Out</Text>
              <TouchableOpacity onPress={() => setShowPaymentOutModal(false)}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Select Supplier *</Text>
              <View style={styles.pickerContainer}>
                {parties
                  .filter((p) => p.type === 'supplier')
                  .map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.pickerOption,
                        outPartyId === p.id && styles.pickerOptionActive,
                      ]}
                      onPress={() => setOutPartyId(p.id)}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          outPartyId === p.id && styles.pickerOptionTextActive,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <Text style={styles.label}>Amount Paid (Rs.) *</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={outAmount}
                onChangeText={setOutAmount}
              />

              <Text style={styles.label}>Paid From Account</Text>
              <View style={styles.pickerContainer}>
                {accounts.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.pickerOption,
                      outAccountId === a.id && styles.pickerOptionActive,
                    ]}
                    onPress={() => setOutAccountId(a.id)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        outAccountId === a.id && styles.pickerOptionTextActive,
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
                placeholder="e.g. Cheque # or Bank Transfer"
                placeholderTextColor="#555"
                value={outNotes}
                onChangeText={setOutNotes}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#3B82F6' }]}
                onPress={handleCreatePaymentOut}
              >
                <Text style={styles.submitBtnText}>Save Payment Out</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: Purchase Return */}
      <Modal visible={showReturnModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Purchase Return (Debit Note)</Text>
              <TouchableOpacity onPress={() => setShowReturnModal(false)}>
                <Feather name="x" size={20} color="#888" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.label}>Supplier Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Supplier Name"
                placeholderTextColor="#555"
                value={returnSupplierName}
                onChangeText={setReturnSupplierName}
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
                  <Text style={styles.label}>Cost per Unit (Rs.) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#555"
                    keyboardType="numeric"
                    value={returnCost}
                    onChangeText={setReturnCost}
                  />
                </View>
              </View>

              <Text style={styles.label}>Refund Received (Rs.)</Text>
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
                placeholder="e.g. Expired, damaged goods"
                placeholderTextColor="#555"
                value={returnReason}
                onChangeText={setReturnReason}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#FF4D4F' }]}
                onPress={handleCreateReturn}
              >
                <Text style={styles.submitBtnText}>Issue Debit Note</Text>
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
    backgroundColor: '#3B82F6',
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888888',
  },
  tabTextActive: {
    color: '#3B82F6',
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
  badgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888888',
  },
  dueText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
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
    color: '#3B82F6',
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
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  pickerOptionText: {
    fontSize: 11,
    color: '#888888',
  },
  pickerOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#3B82F6',
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
