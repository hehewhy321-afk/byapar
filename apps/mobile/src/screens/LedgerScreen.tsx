import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../theme';
import { useApp } from '../context/AppContext';
import { Party, LedgerEntry } from '../types';
import { PartyFormModal } from '../components/ledger/PartyFormModal';
import { LedgerEntryModal } from '../components/ledger/LedgerEntryModal';
import { WhatsAppReminderModal } from '../components/ledger/WhatsAppReminderModal';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { FadeInView } from '../components/common/FadeInView';
import { EmptyState } from '../components/common/EmptyState';

export const LedgerScreen: React.FC = () => {
  const {
    parties,
    ledgerEntries,
    addParty,
    editParty,
    deleteParty,
    addLedgerEntry,
    editLedgerEntry,
    deleteLedgerEntry,
    selectedPartyId,
    setSelectedPartyId,
    theme,
    themeMode,
  } = useApp();

  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'supplier'>('all');
  const [partyModalVisible, setPartyModalVisible] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);

  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [entryModalType, setEntryModalType] = useState<'credit' | 'payment'>('credit');
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

  const [whatsappModalVisible, setWhatsappModalVisible] = useState(false);
  const [activeWaParty, setActiveWaParty] = useState<Party | null>(null);

  const selectedParty = parties.find((p) => p.id === selectedPartyId) || null;

  const totalReceivable = parties
    .filter((p) => p.balance > 0)
    .reduce((acc, p) => acc + p.balance, 0);

  const totalPayable = parties
    .filter((p) => p.balance < 0)
    .reduce((acc, p) => acc + Math.abs(p.balance), 0);

  const filteredParties = parties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.address && p.address.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesType;
  });

  const partyEntries = selectedParty
    ? ledgerEntries.filter((e) => e.partyId === selectedParty.id)
    : [];

  const handleOpenAddParty = () => {
    setEditingParty(null);
    setPartyModalVisible(true);
  };

  const handleOpenEditParty = (party: Party) => {
    setEditingParty(party);
    setPartyModalVisible(true);
  };

  const handleDeleteParty = (party: Party) => {
    Alert.alert(
      'Delete Contact',
      `Delete "${party.name}"? All transaction records will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteParty(party.id);
            if (selectedPartyId === party.id) setSelectedPartyId(null);
          },
        },
      ]
    );
  };

  const handleSaveParty = async (data: Omit<Party, 'id' | 'balance'>) => {
    if (editingParty) {
      await editParty(editingParty.id, data);
    } else {
      await addParty(data);
    }
  };

  const handleSaveEntry = async (data: { type: 'credit' | 'payment'; amount: number; note: string }) => {
    if (!selectedParty) return;
    if (editingEntry) {
      await editLedgerEntry(editingEntry.id, {
        type: data.type,
        amount: data.amount,
        note: data.note,
      });
      setEditingEntry(null);
    } else {
      await addLedgerEntry({
        partyId: selectedParty.id,
        date: new Date().toISOString().split('T')[0],
        type: data.type,
        amount: data.amount,
        note: data.note,
      });
    }
  };

  const handleDeleteEntry = (entry: LedgerEntry) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this Rs. ${entry.amount.toLocaleString()} ${entry.type} record? This will update the contact balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteLedgerEntry(entry.id);
          },
        },
      ]
    );
  };

  const openWhatsAppModal = (party: Party) => {
    setActiveWaParty(party);
    setWhatsappModalVisible(true);
  };

  if (selectedParty) {
    const isReceivable = selectedParty.balance >= 0;
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.detailNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setSelectedPartyId(null)}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={16} color={theme.colors.textPrimary} />
            <Text style={styles.backText}>Contacts</Text>
          </TouchableOpacity>

          <View style={styles.detailNavActions}>
            <TouchableOpacity
              style={styles.navActionBtn}
              onPress={() => handleOpenEditParty(selectedParty)}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={14} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navActionBtn, styles.navActionDelete]}
              onPress={() => handleDeleteParty(selectedParty)}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={14} color={theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* HERO BALANCE CARD */}
        <FadeInView style={styles.heroCardWrapper}>
          <View style={styles.heroCard}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {selectedParty.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{selectedParty.name}</Text>
              <Text style={styles.heroPhone}>
                {selectedParty.phone ? selectedParty.phone : 'No Phone'} • {selectedParty.type}
              </Text>
            </View>

            <View style={styles.heroBalanceCol}>
              <Text style={styles.heroBalanceLabel}>
                {isReceivable ? 'TO RECEIVE' : 'TO PAY'}
              </Text>
              <Text
                style={[
                  styles.heroBalanceVal,
                  isReceivable ? styles.textGreen : styles.textRed,
                ]}
              >
                Rs. {Math.abs(selectedParty.balance).toLocaleString()}
              </Text>
            </View>
          </View>
        </FadeInView>

        {/* QUICK ACTIONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.creditBtn]}
            onPress={() => {
              setEntryModalType('credit');
              setEditingEntry(null);
              setEntryModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Feather name="plus-circle" size={16} color="#FFFFFF" />
            <Text style={styles.creditBtnText}>Give Credit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.paymentBtn]}
            onPress={() => {
              setEntryModalType('payment');
              setEditingEntry(null);
              setEntryModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Feather name="check-circle" size={16} color="#FFFFFF" />
            <Text style={styles.paymentBtnText}>Got Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.waBtn]}
            onPress={() => openWhatsAppModal(selectedParty)}
            activeOpacity={0.85}
          >
            <Feather name="message-circle" size={16} color="#FFFFFF" />
            <Text style={styles.waBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* TIMELINE */}
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Transaction History</Text>
          <Text style={styles.timelineCount}>{partyEntries.length} entries</Text>
        </View>

        <FlatList
          data={partyEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.timelineList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.timelineItem}>
              <View
                style={[
                  styles.timelineDot,
                  item.type === 'credit' ? styles.dotRed : styles.dotGreen,
                ]}
              />
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeaderLine}>
                  <Text style={styles.timelineType}>
                    {item.type === 'credit' ? 'Credit Given' : 'Payment Received'}
                  </Text>
                  <Text style={styles.timelineDate}>{item.date}</Text>
                </View>
                {item.note ? <Text style={styles.timelineNote}>{item.note}</Text> : null}
              </View>

              <View style={styles.timelineRight}>
                <Text
                  style={[
                    styles.timelineAmount,
                    item.type === 'credit' ? styles.textRed : styles.textGreen,
                  ]}
                >
                  {item.type === 'credit' ? '+ ' : '− '}Rs. {item.amount.toLocaleString()}
                </Text>

                <View style={styles.timelineActions}>
                  <TouchableOpacity
                    style={styles.timelineActionBtn}
                    onPress={() => {
                      setEditingEntry(item);
                      setEntryModalType(item.type);
                      setEntryModalVisible(true);
                    }}
                  >
                    <Feather name="edit-2" size={12} color={theme.colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.timelineActionBtn, styles.timelineDeleteBtn]}
                    onPress={() => handleDeleteEntry(item)}
                  >
                    <Feather name="trash-2" size={12} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="book"
              title="No entries yet"
              subtitle="Record credit given or cash payments received"
            />
          }
        />

        <LedgerEntryModal
          visible={entryModalVisible}
          party={selectedParty}
          initialType={entryModalType}
          editingEntry={editingEntry}
          onClose={() => {
            setEntryModalVisible(false);
            setEditingEntry(null);
          }}
          onSave={handleSaveEntry}
        />

        <WhatsAppReminderModal
          visible={whatsappModalVisible}
          party={activeWaParty || selectedParty}
          onClose={() => setWhatsappModalVisible(false)}
        />

        <PartyFormModal
          visible={partyModalVisible}
          party={editingParty}
          onClose={() => setPartyModalVisible(false)}
          onSave={handleSaveParty}
        />
      </View>
    );
  }

  // ALL CONTACTS LIST VIEW
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* SUMMARY HERO BAR */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>RECEIVABLE</Text>
          <Text style={[styles.summaryVal, styles.textGreen]}>
            Rs. {totalReceivable.toLocaleString()}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>PAYABLE</Text>
          <Text style={[styles.summaryVal, styles.textRed]}>
            Rs. {totalPayable.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* SEARCH AND FILTERS */}
      <View style={styles.filterSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Feather name="search" size={15} color={theme.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contact or phone..."
              placeholderTextColor={theme.colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x-circle" size={15} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.addPartyBtn} onPress={handleOpenAddParty} activeOpacity={0.85}>
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.addPartyText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* PILLS */}
        <View style={styles.chipsRow}>
          {(['all', 'customer', 'supplier'] as const).map((t) => {
            const isActive = filterType === t;
            const label = t === 'all' ? 'All' : t === 'customer' ? 'Customers' : 'Suppliers';
            return (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, isActive && styles.typeChipActive]}
                onPress={() => setFilterType(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* CONTACTS LIST */}
      <FlatList
        data={filteredParties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }: { item: Party; index: number }) => {
          const isReceivable = item.balance >= 0;
          return (
            <FadeInView delay={Math.min(index * 25, 200)}>
              <TouchableOpacity
                style={styles.partyCard}
                onPress={() => setSelectedPartyId(item.id)}
                activeOpacity={0.85}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.partyMain}>
                  <View style={styles.nameRow}>
                    <Text style={styles.partyName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {item.type === 'customer' ? 'CUST' : 'SUPP'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.partyPhone}>{item.phone || 'No phone'}</Text>
                </View>

                <View style={styles.balanceCol}>
                  <Text
                    style={[
                      styles.balanceAmount,
                      isReceivable ? styles.textGreen : styles.textRed,
                    ]}
                  >
                    Rs. {Math.abs(item.balance).toLocaleString()}
                  </Text>
                  <Text style={styles.balanceSub}>
                    {isReceivable ? 'Due' : 'Payable'}
                  </Text>
                </View>
              </TouchableOpacity>
            </FadeInView>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="No contacts found"
            subtitle="Add customers and suppliers to track balances"
          />
        }
      />

      <PartyFormModal
        visible={partyModalVisible}
        party={editingParty}
        onClose={() => setPartyModalVisible(false)}
        onSave={handleSaveParty}
      />
    </View>
  );
};

const createStyles = (theme: Theme, themeMode: 'dark' | 'light') => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    summaryBar: {
      flexDirection: 'row',
      padding: theme.spacing.md,
      gap: 12,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.lg,
      padding: 14,
    },
    summaryLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.textMuted,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    summaryVal: {
      fontSize: 18,
      fontWeight: '900',
    },
    filterSection: {
      paddingHorizontal: theme.spacing.md,
      marginBottom: 10,
      gap: 10,
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 12,
      height: 40,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 13,
      padding: 0,
    },
    addPartyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      height: 40,
      paddingHorizontal: 14,
      borderRadius: theme.borderRadius.md,
      gap: 6,
    },
    addPartyText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 13,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    typeChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    typeChipActive: {
      backgroundColor: theme.colors.primaryBg,
      borderColor: theme.colors.primary,
    },
    typeChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    typeChipTextActive: {
      color: theme.colors.primary,
      fontWeight: '800',
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 40,
      gap: 8,
    },
    partyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.lg,
      padding: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primaryBg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.primary,
    },
    partyMain: {
      flex: 1,
      marginRight: 8,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    partyName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    typeBadge: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    typeBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.textMuted,
    },
    partyPhone: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    balanceCol: {
      alignItems: 'flex-end',
    },
    balanceAmount: {
      fontSize: 14,
      fontWeight: '800',
    },
    balanceSub: {
      fontSize: 10,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    textGreen: {
      color: '#10B981',
    },
    textRed: {
      color: '#EF4444',
    },
    detailNav: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    backText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    detailNavActions: {
      flexDirection: 'row',
      gap: 8,
    },
    navActionBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navActionDelete: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    heroCardWrapper: {
      padding: theme.spacing.md,
    },
    heroCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.xl,
      padding: 14,
    },
    heroAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primaryBg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    heroAvatarText: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.colors.primary,
    },
    heroInfo: {
      flex: 1,
    },
    heroName: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    heroPhone: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    heroBalanceCol: {
      alignItems: 'flex-end',
    },
    heroBalanceLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    heroBalanceVal: {
      fontSize: 18,
      fontWeight: '900',
      marginTop: 2,
    },
    actionRow: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      gap: 8,
      marginBottom: 14,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 42,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      gap: 6,
    },
    creditBtn: {
      backgroundColor: '#EF4444',
      borderColor: '#DC2626',
    },
    paymentBtn: {
      backgroundColor: '#10B981',
      borderColor: '#059669',
    },
    waBtn: {
      backgroundColor: '#25D366',
      borderColor: '#16A34A',
    },
    creditBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    paymentBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    waBtnText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      marginBottom: 8,
    },
    timelineTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    timelineCount: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    timelineList: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 40,
    },
    timelineItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.md,
      padding: 12,
      marginBottom: 8,
    },
    timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 10,
    },
    dotRed: {
      backgroundColor: '#EF4444',
    },
    dotGreen: {
      backgroundColor: '#10B981',
    },
    timelineContent: {
      flex: 1,
    },
    timelineHeaderLine: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    timelineType: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    timelineDate: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
    timelineNote: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    timelineRight: {
      alignItems: 'flex-end',
      marginLeft: 10,
    },
    timelineAmount: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 4,
    },
    timelineActions: {
      flexDirection: 'row',
      gap: 6,
    },
    timelineActionBtn: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: theme.colors.surface,
    },
    timelineDeleteBtn: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
  });
};
