import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { PaymentMode } from '../../types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectMode: (mode: PaymentMode, partyId?: string) => void;
}

export const CheckoutModal: React.FC<Props> = ({ visible, onClose, onSelectMode }) => {
  const { cart, parties, store, theme, themeMode } = useApp();

  const [selectedMode, setSelectedMode] = useState<PaymentMode>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  const cartTotal = cart.reduce((acc, item) => acc + item.salePrice * item.qty, 0);
  const tendered = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, tendered - cartTotal);

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    p.phone.includes(partySearch)
  );

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  const handleConfirm = () => {
    if (selectedMode === 'credit' && !selectedPartyId) {
      return;
    }
    onSelectMode(selectedMode, selectedPartyId || undefined);
    // Reset local states
    setCashTendered('');
    setSelectedPartyId(null);
    setPartySearch('');
    setSelectedMode('cash');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalSheet,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.borderGlass,
            },
          ]}
        >
          {/* SHEET HANDLE */}
          <View style={[styles.dragHandle, { backgroundColor: theme.colors.borderLight }]} />

          {/* TOP HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerLabel, { color: theme.colors.textMuted }]}>
                CHECKOUT
              </Text>
              <Text style={[styles.totalAmount, { color: theme.colors.textPrimary }]}>
                Rs. {cartTotal.toLocaleString()}
              </Text>
            </View>
            <AnimatedPressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.colors.card }]}
              activeScale={0.85}
            >
              <Feather name="x" size={18} color={theme.colors.textMuted} />
            </AnimatedPressable>
          </View>

          {/* PAYMENT MODE SELECTOR TABS */}
          <View
            style={[
              styles.modeTabs,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.borderGlass,
              },
            ]}
          >
            <AnimatedPressable
              style={[
                styles.modeTab,
                selectedMode === 'cash' && [
                  styles.modeTabActive,
                  { backgroundColor: theme.colors.primary },
                ],
              ]}
              onPress={() => setSelectedMode('cash')}
              activeScale={0.96}
            >
              <Feather
                name="dollar-sign"
                size={16}
                color={selectedMode === 'cash' ? '#FFFFFF' : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: selectedMode === 'cash' ? '#FFFFFF' : theme.colors.textSecondary },
                  selectedMode === 'cash' && styles.modeTabTextActive,
                ]}
              >
                Cash
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[
                styles.modeTab,
                selectedMode === 'fonepay_qr' && [
                  styles.modeTabActive,
                  { backgroundColor: theme.colors.primary },
                ],
              ]}
              onPress={() => setSelectedMode('fonepay_qr')}
              activeScale={0.96}
            >
              <Feather
                name="grid"
                size={16}
                color={selectedMode === 'fonepay_qr' ? '#FFFFFF' : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: selectedMode === 'fonepay_qr' ? '#FFFFFF' : theme.colors.textSecondary },
                  selectedMode === 'fonepay_qr' && styles.modeTabTextActive,
                ]}
              >
                Fonepay QR
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={[
                styles.modeTab,
                selectedMode === 'credit' && [
                  styles.modeTabActive,
                  { backgroundColor: theme.colors.primary },
                ],
              ]}
              onPress={() => setSelectedMode('credit')}
              activeScale={0.96}
            >
              <Feather
                name="book-open"
                size={16}
                color={selectedMode === 'credit' ? '#FFFFFF' : theme.colors.textMuted}
              />
              <Text
                style={[
                  styles.modeTabText,
                  { color: selectedMode === 'credit' ? '#FFFFFF' : theme.colors.textSecondary },
                  selectedMode === 'credit' && styles.modeTabTextActive,
                ]}
              >
                Khata Credit
              </Text>
            </AnimatedPressable>
          </View>

          {/* DEDICATED PAYMENT INTERACTIVE CONTENT */}
          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* CASH TENDER VIEW */}
            {selectedMode === 'cash' && (
              <FadeInView duration={200} translateY={10}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                  Cash Received
                </Text>
                <TextInput
                  style={[
                    styles.cashInput,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.borderGlass,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder={`Rs. ${cartTotal.toLocaleString()}`}
                  placeholderTextColor={theme.colors.textMuted}
                  value={cashTendered}
                  onChangeText={setCashTendered}
                />

                {/* QUICK CASH CHIPS */}
                <View style={styles.quickChipsRow}>
                  <AnimatedPressable
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setCashTendered(cartTotal.toString())}
                    activeScale={0.92}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>
                      Exact
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setCashTendered((Math.ceil(cartTotal / 100) * 100).toString())}
                    activeScale={0.92}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>
                      Rs. {Math.ceil(cartTotal / 100) * 100}
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setCashTendered((Math.ceil(cartTotal / 500) * 500).toString())}
                    activeScale={0.92}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>
                      Rs. {Math.ceil(cartTotal / 500) * 500}
                    </Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                    onPress={() => setCashTendered((Math.ceil(cartTotal / 1000) * 1000).toString())}
                    activeScale={0.92}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>
                      Rs. {Math.ceil(cartTotal / 1000) * 1000}
                    </Text>
                  </AnimatedPressable>
                </View>

                {tendered > cartTotal && (
                  <View
                    style={[
                      styles.changeBox,
                      {
                        backgroundColor: theme.colors.primaryBg,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.changeLabel, { color: theme.colors.primary }]}>
                      Return Change
                    </Text>
                    <Text style={[styles.changeAmount, { color: theme.colors.primary }]}>
                      Rs. {changeDue.toLocaleString()}
                    </Text>
                  </View>
                )}
              </FadeInView>
            )}

            {/* FONEPAY QR VIEW */}
            {selectedMode === 'fonepay_qr' && (
              <FadeInView duration={200} translateY={10}>
                <View style={styles.qrContainer}>
                  <View
                    style={[
                      styles.qrCard,
                      {
                        backgroundColor: themeMode === 'dark' ? '#FFFFFF' : '#FFFFFF',
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                  >
                    <View style={styles.qrBrandRow}>
                      <Text style={styles.qrBrandText}>fonepay</Text>
                      <View style={styles.qrStatusPill}>
                        <View style={[styles.qrLiveDot, { backgroundColor: theme.colors.primary }]} />
                        <Text style={[styles.qrLiveText, { color: theme.colors.primary }]}>
                          Active
                        </Text>
                      </View>
                    </View>

                    {/* QR GRAPHIC */}
                    <View style={styles.qrMatrixWrapper}>
                      <View style={styles.qrBox}>
                        <View style={styles.qrCornerTL} />
                        <View style={styles.qrCornerTR} />
                        <View style={styles.qrCornerBL} />
                        <View style={styles.qrCornerBR} />
                        <View style={styles.qrInnerGrid}>
                          <Feather name="maximize" size={72} color="#000000" />
                        </View>
                      </View>
                    </View>

                    <Text style={styles.qrStoreName}>{store.name || 'Store Merchant'}</Text>
                    <Text style={styles.qrAmountDisplay}>Rs. {cartTotal.toLocaleString()}</Text>
                  </View>

                  <Text style={[styles.qrFooterHint, { color: theme.colors.textMuted }]}>
                    Accepts eSewa, Khalti, IME Pay & 50+ Mobile Banking Apps
                  </Text>
                </View>
              </FadeInView>
            )}

            {/* KHATA CREDIT VIEW */}
            {selectedMode === 'credit' && (
              <FadeInView duration={200} translateY={10}>
                <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                  Select Customer
                </Text>
                <View
                  style={[
                    styles.searchBox,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.borderGlass,
                    },
                  ]}
                >
                  <Feather
                    name="search"
                    size={14}
                    color={theme.colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                    placeholder="Search name or phone..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={partySearch}
                    onChangeText={setPartySearch}
                  />
                </View>

                <View style={styles.partiesList}>
                  {filteredParties.slice(0, 5).map((p) => {
                    const isSelected = selectedPartyId === p.id;
                    return (
                      <AnimatedPressable
                        key={p.id}
                        style={[
                          styles.partyItem,
                          {
                            backgroundColor: isSelected ? theme.colors.primaryBg : theme.colors.card,
                            borderColor: isSelected ? theme.colors.primary : theme.colors.borderGlass,
                          },
                        ]}
                        onPress={() => setSelectedPartyId(p.id)}
                        activeScale={0.97}
                      >
                        <View
                          style={[
                            styles.partyAvatar,
                            {
                              backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.partyAvatarText,
                              { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary },
                            ]}
                          >
                            {p.name.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.partyInfo}>
                          <Text style={[styles.partyName, { color: theme.colors.textPrimary }]}>
                            {p.name}
                          </Text>
                          <Text style={[styles.partyPhone, { color: theme.colors.textMuted }]}>
                            {p.phone || 'No phone'}
                          </Text>
                        </View>
                        <View style={styles.partyBalanceCol}>
                          <Text style={[styles.partyBalanceLabel, { color: theme.colors.textMuted }]}>
                            Current Due
                          </Text>
                          <Text style={[styles.partyBalanceVal, { color: theme.colors.danger }]}>
                            Rs. {p.balance.toLocaleString()}
                          </Text>
                        </View>
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {selectedParty && (
                  <View
                    style={[
                      styles.dueSummaryCard,
                      {
                        backgroundColor: themeMode === 'dark' ? '#1E1414' : '#FFF1F2',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                      },
                    ]}
                  >
                    <Text style={styles.dueSummaryTitle}>Updated Due Balance</Text>
                    <Text style={styles.dueSummaryAmount}>
                      Rs. {(selectedParty.balance + cartTotal).toLocaleString()}
                    </Text>
                  </View>
                )}
              </FadeInView>
            )}
          </ScrollView>

          {/* CONFIRM BUTTON - REDDIT ORANGE WITH CRISP WHITE TEXT */}
          <View style={styles.footer}>
            <AnimatedPressable
              style={[
                styles.confirmBtn,
                { backgroundColor: theme.colors.primary },
                selectedMode === 'credit' && !selectedPartyId && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={selectedMode === 'credit' && !selectedPartyId}
              activeScale={0.96}
            >
              <Text style={styles.confirmBtnText}>
                {selectedMode === 'cash'
                  ? `Complete Cash Sale • Rs. ${cartTotal.toLocaleString()}`
                  : selectedMode === 'fonepay_qr'
                  ? `Confirm Fonepay Payment • Rs. ${cartTotal.toLocaleString()}`
                  : selectedParty
                  ? `Add Rs. ${cartTotal.toLocaleString()} to ${selectedParty.name}`
                  : 'Select a customer above'}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  modeTabActive: {
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeTabTextActive: {
    fontWeight: '800',
  },
  bodyScroll: {
    maxHeight: 280,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cashInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  changeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  changeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  changeAmount: {
    fontSize: 18,
    fontWeight: '900',
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  qrCard: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
  },
  qrBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  qrBrandText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E11D48',
    letterSpacing: -0.5,
  },
  qrStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  qrLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  qrLiveText: {
    fontSize: 10,
    fontWeight: '800',
  },
  qrMatrixWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 10,
  },
  qrBox: {
    width: 140,
    height: 140,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrCornerTL: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 28,
    height: 28,
    borderWidth: 4,
    borderColor: '#000000',
  },
  qrCornerTR: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderWidth: 4,
    borderColor: '#000000',
  },
  qrCornerBL: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 28,
    height: 28,
    borderWidth: 4,
    borderColor: '#000000',
  },
  qrCornerBR: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 14,
    height: 14,
    backgroundColor: '#000000',
  },
  qrInnerGrid: {
    opacity: 0.85,
  },
  qrStoreName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    marginTop: 4,
  },
  qrAmountDisplay: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginTop: 2,
  },
  qrFooterHint: {
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  partiesList: {
    gap: 6,
  },
  partyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  partyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  partyAvatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
  },
  partyPhone: {
    fontSize: 11,
    marginTop: 1,
  },
  partyBalanceCol: {
    alignItems: 'flex-end',
  },
  partyBalanceLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  partyBalanceVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  dueSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  dueSummaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  dueSummaryAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#EF4444',
  },
  footer: {
    marginTop: 14,
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnDisabled: {
    opacity: 0.35,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
