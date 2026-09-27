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
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
    refreshData,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.warn('[PurchaseHubScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

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
  const [billReceiptUri, setBillReceiptUri] = useState('');
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const handlePickReceipt = async (useCamera = false) => {
    try {
      const res = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.6,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            quality: 0.6,
            base64: true,
          });

      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setBillReceiptUri(uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

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
      subtotal: total,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: Math.max(0, total - paid),
      status: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      paymentMode: billMode,
      receiptUrl: billReceiptUri || undefined,
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
    setBillReceiptUri('');
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
      type: 'out',
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
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
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {b.billNumber}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      {b.supplierName} • {b.date}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                    {b.receiptUrl ? (
                      <TouchableOpacity
                        style={styles.cardReceiptBtn}
                        onPress={() => setPreviewImageUri(b.receiptUrl!)}
                        activeOpacity={0.8}
                      >
                        <Feather name="file-text" size={10} color={theme.colors.primary} />
                        <Text style={[styles.cardReceiptText, { color: theme.colors.primary }]}>View Slip</Text>
                      </TouchableOpacity>
                    ) : null}
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
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {pay.partyName}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      {pay.date} • Mode: {pay.paymentMode.toUpperCase()}{pay.notes ? ` • ${pay.notes}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#EF4444' }]}>
                    - Rs. {Number(pay.amount).toLocaleString()}
                  </Text>
                </View>
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
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {pr.returnNumber}
                    </Text>
                    <Text style={[styles.cardSub, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      {pr.supplierName} • {pr.date}{pr.reason ? ` • ${pr.reason}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.cardAmount, { color: '#10B981' }]}>
                    + Rs. {Number(pr.totalAmount).toLocaleString()}
                  </Text>
                </View>
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
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowBillModal(false)}
          />
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

              <Text style={[styles.modalLabel, { color: theme.colors.textSecondary, marginTop: 10 }]}>
                Attach Bill / Receipt Photo (Optional)
              </Text>
              <View style={styles.receiptContainer}>
                {billReceiptUri ? (
                  <View style={styles.receiptThumbWrapper}>
                    <Image source={{ uri: billReceiptUri }} style={styles.receiptThumb} />
                    <TouchableOpacity
                      style={styles.receiptRemoveBtn}
                      onPress={() => setBillReceiptUri('')}
                      activeOpacity={0.8}
                    >
                      <Feather name="x" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.receiptPickerBtns}>
                    <TouchableOpacity
                      style={[styles.pickerBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass }]}
                      onPress={() => handlePickReceipt(true)}
                      activeOpacity={0.8}
                    >
                      <Feather name="camera" size={14} color={theme.colors.primary} />
                      <Text style={[styles.pickerBtnText, { color: theme.colors.textPrimary }]}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pickerBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass }]}
                      onPress={() => handlePickReceipt(false)}
                      activeOpacity={0.8}
                    >
                      <Feather name="image" size={14} color={theme.colors.primary} />
                      <Text style={[styles.pickerBtnText, { color: theme.colors.textPrimary }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

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
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPaymentOutModal(false)}
          />
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
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowReturnModal(false)}
          />
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

      {/* RECEIPT PREVIEW MODAL */}
      <Modal
        visible={!!previewImageUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setPreviewImageUri(null)} />
          <View style={[styles.imagePreviewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.borderGlass }]}>
            <View style={[styles.imagePreviewHeader, { borderBottomColor: theme.colors.borderGlass }]}>
              <Text style={[styles.imagePreviewTitle, { color: theme.colors.textPrimary }]}>Purchase Bill Slip</Text>
              <TouchableOpacity onPress={() => setPreviewImageUri(null)}>
                <Feather name="x" size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {previewImageUri ? (
              <View style={[styles.imagePreviewWrapper, { backgroundColor: isDark ? '#000000' : '#F8FAFC' }]}>
                <Image source={{ uri: previewImageUri }} style={styles.imagePreviewFull} resizeMode="contain" />
              </View>
            ) : null}
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
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
  },
  headerBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 14,
  },
  tabTextActive: {
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 40,
    gap: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  cardAmount: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  cardNote: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 9.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  partyChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    lineHeight: 14,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  inputSplitRow: {
    flexDirection: 'row',
  },
  modalSubmitBtn: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cardReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  cardReceiptText: {
    fontSize: 10,
    fontWeight: '700',
  },
  receiptContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  receiptThumbWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  receiptThumb: {
    width: '100%',
    height: '100%',
  },
  receiptRemoveBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptPickerBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 15,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
  },
  pickerBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 14,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imagePreviewCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  imagePreviewTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: 350,
    borderRadius: 10,
    overflow: 'hidden',
  },
  imagePreviewFull: {
    width: '100%',
    height: '100%',
  },
});
