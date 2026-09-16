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
import { BankAccount, AccountTransaction } from '../types';
import { Theme, ThemeMode } from '../theme';

export const AccountsScreen: React.FC = () => {
  const {
    accounts,
    accountTransactions,
    addAccount,
    editAccount,
    deleteAccount,
    depositMoney,
    withdrawMoney,
    transferMoney,
    theme,
    themeMode,
  } = useApp();

  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);

  const [activeTab, setActiveTab] = useState<'accounts' | 'history'>('accounts');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  // Modals
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [showMoneyModal, setShowMoneyModal] = useState(false);
  const [moneyAction, setMoneyAction] = useState<'deposit' | 'withdraw' | 'transfer'>('deposit');
  const [targetAccount, setTargetAccount] = useState<BankAccount | null>(null);

  // Account Form
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'cash' | 'bank' | 'wallet'>('bank');
  const [accNumber, setAccNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [branch, setBranch] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // Money Action Form
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneyCategory, setMoneyCategory] = useState('');
  const [moneyNotes, setMoneyNotes] = useState('');
  const [transferToAccountId, setTransferToAccountId] = useState('');

  // Total balance calculations
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  }, [accounts]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let list = [...accountTransactions];
    if (selectedAccountId !== 'all') {
      list = list.filter(
        (t) => t.accountId === selectedAccountId || t.toAccountId === selectedAccountId
      );
    }
    return list;
  }, [accountTransactions, selectedAccountId]);

  const openAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('bank');
    setAccNumber('');
    setBankName('');
    setBranch('');
    setOpeningBalance('');
    setShowAddAccountModal(true);
  };

  const openEditAccount = (acc: BankAccount) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.accountType);
    setAccNumber(acc.accountNumber || '');
    setBankName(acc.bankName || '');
    setBranch(acc.branch || '');
    setOpeningBalance(acc.balance.toString());
    setShowAddAccountModal(true);
  };

  const openMoneyModal = (acc: BankAccount, action: 'deposit' | 'withdraw' | 'transfer') => {
    setTargetAccount(acc);
    setMoneyAction(action);
    setMoneyAmount('');
    setMoneyCategory('');
    setMoneyNotes('');
    const otherAccounts = accounts.filter((a) => a.id !== acc.id);
    setTransferToAccountId(otherAccounts[0]?.id || '');
    setShowMoneyModal(true);
  };

  const handleSaveAccount = async () => {
    if (!accName.trim()) {
      Alert.alert('Validation Error', 'Account name is required.');
      return;
    }

    if (editingAccount) {
      await editAccount(editingAccount.id, {
        name: accName.trim(),
        accountType: accType,
        accountNumber: accNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        branch: branch.trim() || undefined,
      });
    } else {
      await addAccount({
        name: accName.trim(),
        accountType: accType,
        accountNumber: accNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        branch: branch.trim() || undefined,
        balance: parseFloat(openingBalance) || 0,
      });
    }
    setShowAddAccountModal(false);
  };

  const handleDeleteAccount = (acc: BankAccount) => {
    Alert.alert('Delete Account', `Are you sure you want to delete "${acc.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAccount(acc.id);
        },
      },
    ]);
  };

  const handleExecuteMoneyAction = async () => {
    if (!targetAccount) return;
    const amount = parseFloat(moneyAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    if (moneyAction === 'deposit') {
      await depositMoney(targetAccount.id, amount, moneyCategory, moneyNotes, today);
    } else if (moneyAction === 'withdraw') {
      if (amount > targetAccount.balance) {
        Alert.alert('Insufficient Balance', 'Account does not have enough funds.');
        return;
      }
      await withdrawMoney(targetAccount.id, amount, moneyCategory, moneyNotes, today);
    } else if (moneyAction === 'transfer') {
      if (!transferToAccountId) {
        Alert.alert('Error', 'Please select destination account.');
        return;
      }
      if (amount > targetAccount.balance) {
        Alert.alert('Insufficient Balance', 'Account does not have enough funds to transfer.');
        return;
      }
      await transferMoney(targetAccount.id, transferToAccountId, amount, moneyNotes, today);
    }

    setShowMoneyModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Top Banner Card */}
      <View style={styles.bannerCard}>
        <View>
          <Text style={styles.bannerSubtitle}>Total Liquid Balance</Text>
          <Text style={styles.bannerAmount}>Rs. {totalBalance.toLocaleString()}</Text>
          <Text style={styles.bannerInfo}>{accounts.length} Active Accounts / Wallets</Text>
        </View>

        <TouchableOpacity style={styles.addAccountBtn} onPress={openAddAccount}>
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addAccountBtnText}>Add Account</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'accounts' && styles.tabActive]}
          onPress={() => setActiveTab('accounts')}
        >
          <Feather
            name="credit-card"
            size={16}
            color={activeTab === 'accounts' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'accounts' && styles.tabTextActive]}>
            Accounts ({accounts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Feather
            name="clock"
            size={16}
            color={activeTab === 'history' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Transaction History ({accountTransactions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'accounts' ? (
        <ScrollView contentContainerStyle={styles.scrollList} showsVerticalScrollIndicator={false}>
          {accounts.map((acc) => (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={styles.accountTitleRow}>
                  <View
                    style={[
                      styles.accountIconBadge,
                      acc.accountType === 'cash'
                        ? styles.badgeCash
                        : acc.accountType === 'wallet'
                        ? styles.badgeWallet
                        : styles.badgeBank,
                    ]}
                  >
                    <Feather
                      name={
                        acc.accountType === 'cash'
                          ? 'dollar-sign'
                          : acc.accountType === 'wallet'
                          ? 'smartphone'
                          : 'archive'
                      }
                      size={18}
                      color="#FFFFFF"
                    />
                  </View>
                  <View>
                    <Text style={styles.accountName}>{acc.name}</Text>
                    <Text style={styles.accountDetails}>
                      {acc.bankName ? `${acc.bankName} • ` : ''}
                      {acc.accountNumber || acc.accountType.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.accountActionsRow}>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => openEditAccount(acc)}
                  >
                    <Feather name="edit-2" size={15} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => handleDeleteAccount(acc)}
                  >
                    <Feather name="trash-2" size={15} color={themeMode === 'dark' ? '#FF4D4F' : '#DC2626'} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Balance */}
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceValue}>Rs. {acc.balance.toLocaleString()}</Text>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActionsContainer}>
                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.btnDeposit]}
                  onPress={() => openMoneyModal(acc, 'deposit')}
                >
                  <Feather name="arrow-down-left" size={14} color={themeMode === 'dark' ? '#10B981' : '#059669'} />
                  <Text style={styles.btnDepositText}>+ Add Money</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.btnWithdraw]}
                  onPress={() => openMoneyModal(acc, 'withdraw')}
                >
                  <Feather name="arrow-up-right" size={14} color={themeMode === 'dark' ? '#FF4D4F' : '#DC2626'} />
                  <Text style={styles.btnWithdrawText}>- Reduce Money</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.btnTransfer]}
                  onPress={() => openMoneyModal(acc, 'transfer')}
                >
                  <Feather name="repeat" size={14} color={themeMode === 'dark' ? '#3B82F6' : '#2563EB'} />
                  <Text style={styles.btnTransferText}>Transfer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.historyContainer}>
          {/* Account Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPills}
          >
            <TouchableOpacity
              style={[
                styles.pill,
                selectedAccountId === 'all' && styles.pillActive,
              ]}
              onPress={() => setSelectedAccountId('all')}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedAccountId === 'all' && styles.pillTextActive,
                ]}
              >
                All Accounts
              </Text>
            </TouchableOpacity>

            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.pill,
                  selectedAccountId === acc.id && styles.pillActive,
                ]}
                onPress={() => setSelectedAccountId(acc.id)}
              >
                <Text
                  style={[
                    styles.pillText,
                    selectedAccountId === acc.id && styles.pillTextActive,
                  ]}
                >
                  {acc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Transactions List */}
          <ScrollView contentContainerStyle={styles.txList} showsVerticalScrollIndicator={false}>
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={40} color={theme.colors.textMuted} />
                <Text style={styles.emptyStateText}>No transaction history found</Text>
              </View>
            ) : (
              filteredTransactions.map((tx) => {
                const isPositive = tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in';
                return (
                  <View key={tx.id} style={styles.txCard}>
                    <View style={styles.txLeft}>
                      <View
                        style={[
                          styles.txIconBadge,
                          isPositive ? styles.badgeGreen : styles.badgeRed,
                        ]}
                      >
                        <Feather
                          name={isPositive ? 'arrow-down-left' : 'arrow-up-right'}
                          size={16}
                          color={isPositive ? (themeMode === 'dark' ? '#10B981' : '#059669') : (themeMode === 'dark' ? '#FF4D4F' : '#DC2626')}
                        />
                      </View>
                      <View>
                        <Text style={styles.txTitle}>
                          {tx.transactionType === 'transfer_in' || tx.transactionType === 'transfer_out'
                            ? `Transfer: ${tx.accountName || ''} ➔ ${tx.toAccountName || ''}`
                            : tx.category || tx.transactionType.toUpperCase()}
                        </Text>
                        <Text style={styles.txDate}>{tx.dateAd}</Text>
                        {tx.notes ? <Text style={styles.txNotes}>{tx.notes}</Text> : null}
                      </View>
                    </View>

                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmount,
                          isPositive ? styles.amountGreen : styles.amountRed,
                        ]}
                      >
                        {isPositive ? '+' : '-'} Rs. {tx.amount.toLocaleString()}
                      </Text>
                      <Text style={styles.txBalanceAfter}>
                        Bal: Rs. {tx.balanceAfter.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      )}

      {/* MODAL: Add / Edit Account */}
      <Modal visible={showAddAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddAccountModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.fieldLabel}>Account Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Main Cash Drawer, Nabil Bank"
                placeholderTextColor={theme.colors.textMuted}
                value={accName}
                onChangeText={setAccName}
              />

              <Text style={styles.fieldLabel}>Account Type</Text>
              <View style={styles.typeRow}>
                {(['cash', 'bank', 'wallet'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, accType === type && styles.typeBtnActive]}
                    onPress={() => setAccType(type)}
                  >
                    <Text
                      style={[styles.typeBtnText, accType === type && styles.typeBtnTextActive]}
                    >
                      {type.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {accType !== 'cash' && (
                <>
                  <Text style={styles.fieldLabel}>Account Number</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="01234567890"
                    placeholderTextColor={theme.colors.textMuted}
                    value={accNumber}
                    onChangeText={setAccNumber}
                  />

                  <Text style={styles.fieldLabel}>Bank / Wallet Provider</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Nabil Bank, eSewa, Khalti"
                    placeholderTextColor={theme.colors.textMuted}
                    value={bankName}
                    onChangeText={setBankName}
                  />

                  <Text style={styles.fieldLabel}>Branch Location</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. New Road"
                    placeholderTextColor={theme.colors.textMuted}
                    value={branch}
                    onChangeText={setBranch}
                  />
                </>
              )}

              {!editingAccount && (
                <>
                  <Text style={styles.fieldLabel}>Opening Balance (Rs.)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    value={openingBalance}
                    onChangeText={setOpeningBalance}
                  />
                </>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAccount}>
                <Text style={styles.saveBtnText}>
                  {editingAccount ? 'Save Changes' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: Money Management (Deposit, Withdraw, Transfer) */}
      <Modal visible={showMoneyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {moneyAction === 'deposit'
                  ? `Add Money to ${targetAccount?.name}`
                  : moneyAction === 'withdraw'
                  ? `Reduce Money from ${targetAccount?.name}`
                  : `Transfer from ${targetAccount?.name}`}
              </Text>
              <TouchableOpacity onPress={() => setShowMoneyModal(false)}>
                <Feather name="x" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.fieldLabel}>Amount (Rs.) *</Text>
              <TextInput
                style={[styles.fieldInput, styles.amountInput]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={moneyAmount}
                onChangeText={setMoneyAmount}
                autoFocus
              />

              {moneyAction === 'transfer' ? (
                <>
                  <Text style={styles.fieldLabel}>Transfer To Account *</Text>
                  <View style={styles.typeRow}>
                    {accounts
                      .filter((a) => a.id !== targetAccount?.id)
                      .map((dest) => (
                        <TouchableOpacity
                          key={dest.id}
                          style={[
                            styles.typeBtn,
                            transferToAccountId === dest.id && styles.typeBtnActive,
                          ]}
                          onPress={() => setTransferToAccountId(dest.id)}
                        >
                          <Text
                            style={[
                              styles.typeBtnText,
                              transferToAccountId === dest.id && styles.typeBtnTextActive,
                            ]}
                          >
                            {dest.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Category / Reason</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. Cash Injection, Owner Withdrawal, Sales Deposit"
                    placeholderTextColor={theme.colors.textMuted}
                    value={moneyCategory}
                    onChangeText={setMoneyCategory}
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Remarks / Notes</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Optional notes"
                placeholderTextColor={theme.colors.textMuted}
                value={moneyNotes}
                onChangeText={setMoneyNotes}
              />

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  moneyAction === 'deposit'
                    ? styles.btnGreen
                    : moneyAction === 'withdraw'
                    ? styles.btnRed
                    : styles.btnBlue,
                ]}
                onPress={handleExecuteMoneyAction}
              >
                <Text style={styles.saveBtnText}>
                  {moneyAction === 'deposit'
                    ? 'Confirm Deposit'
                    : moneyAction === 'withdraw'
                    ? 'Confirm Withdrawal'
                    : 'Confirm Transfer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme, themeMode: ThemeMode) => {
  const isDark = themeMode === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    bannerCard: {
      margin: 16,
      padding: 18,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    bannerSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    bannerAmount: {
      fontSize: 24,
      fontWeight: '800',
      color: isDark ? '#10B981' : '#059669',
      marginVertical: 4,
    },
    bannerInfo: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    addAccountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    addAccountBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    tabBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      marginRight: 20,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: theme.colors.primary,
    },
    tabText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    tabTextActive: {
      color: theme.colors.textPrimary,
      fontWeight: '800',
    },
    scrollList: {
      padding: 16,
      gap: 12,
    },
    accountCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 16,
    },
    accountHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    accountTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    accountIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeCash: {
      backgroundColor: '#10B981',
    },
    badgeBank: {
      backgroundColor: '#3B82F6',
    },
    badgeWallet: {
      backgroundColor: '#8B5CF6',
    },
    accountName: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    accountDetails: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    accountActionsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    iconActionBtn: {
      padding: 6,
      borderRadius: 6,
      backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#2A2A2A' : '#E2E8F0',
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
      marginTop: 8,
    },
    balanceLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    balanceValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    quickActionsContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    quickActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    btnDeposit: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
      borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)',
    },
    btnDepositText: {
      color: isDark ? '#10B981' : '#059669',
      fontSize: 11,
      fontWeight: '700',
    },
    btnWithdraw: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.25)',
    },
    btnWithdrawText: {
      color: isDark ? '#FF4D4F' : '#DC2626',
      fontSize: 11,
      fontWeight: '700',
    },
    btnTransfer: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
      borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.25)',
    },
    btnTransferText: {
      color: isDark ? '#3B82F6' : '#2563EB',
      fontSize: 11,
      fontWeight: '700',
    },
    historyContainer: {
      flex: 1,
    },
    filterPills: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    pillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pillText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
    pillTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    txList: {
      padding: 16,
      gap: 10,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 10,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    txCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    txLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    txIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeGreen: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
    },
    badgeRed: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.12)',
    },
    txTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    txDate: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    txNotes: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    txRight: {
      alignItems: 'flex-end',
    },
    txAmount: {
      fontSize: 14,
      fontWeight: '800',
    },
    amountGreen: {
      color: isDark ? '#10B981' : '#059669',
    },
    amountRed: {
      color: isDark ? '#FF4D4F' : '#DC2626',
    },
    txBalanceAfter: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(15, 23, 42, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
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
      color: theme.colors.textPrimary,
    },
    modalForm: {
      gap: 12,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    fieldInput: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: 10,
      paddingHorizontal: 14,
      height: 44,
      color: theme.colors.textPrimary,
      fontSize: 14,
    },
    amountInput: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#10B981' : '#059669',
      textAlign: 'center',
    },
    typeRow: {
      flexDirection: 'row',
      gap: 8,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: 8,
    },
    typeBtnActive: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? 'rgba(255, 69, 0, 0.15)' : 'rgba(255, 69, 0, 0.10)',
    },
    typeBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    typeBtnTextActive: {
      color: theme.colors.primary,
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: 10,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    btnGreen: {
      backgroundColor: isDark ? '#10B981' : '#059669',
    },
    btnRed: {
      backgroundColor: isDark ? '#FF4D4F' : '#DC2626',
    },
    btnBlue: {
      backgroundColor: isDark ? '#3B82F6' : '#2563EB',
    },
    saveBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
};
