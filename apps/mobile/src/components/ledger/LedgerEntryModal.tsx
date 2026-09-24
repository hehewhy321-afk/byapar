import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { Party, LedgerEntry } from '../../types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';

interface Props {
  visible: boolean;
  party: Party | null;
  initialType?: 'credit' | 'payment';
  editingEntry?: LedgerEntry | null;
  onClose: () => void;
  onSave: (data: { type: 'credit' | 'payment'; amount: number; note: string }) => void;
}

export const LedgerEntryModal: React.FC<Props> = ({
  visible,
  party,
  initialType = 'credit',
  editingEntry,
  onClose,
  onSave,
}) => {
  const { theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const [type, setType] = useState<'credit' | 'payment'>(initialType);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      if (editingEntry) {
        setType(editingEntry.type);
        setAmount(editingEntry.amount ? editingEntry.amount.toString() : '');
        setNote(editingEntry.note || '');
      } else {
        setType(initialType);
        setAmount('');
        setNote('');
      }
    }
  }, [visible, editingEntry, initialType]);

  if (!party) return null;

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid amount greater than zero.');
      return;
    }

    onSave({
      type,
      amount: amt,
      note: note.trim() || (type === 'credit' ? 'Credit recorded' : 'Payment received'),
    });

    setAmount('');
    setNote('');
    onClose();
  };

  const isCredit = type === 'credit';
  const isDark = themeMode === 'dark';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <FadeInView duration={240} translateY={20} style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>
                {editingEntry ? 'Edit Transaction' : isCredit ? 'Record: Give Credit' : 'Record: Got Payment'}
              </Text>
              <Text style={styles.sub}>{party.name} • {party.phone || 'No phone'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
              <Feather name="x" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* TYPE TOGGLE */}
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeBtn, isCredit && styles.creditBtnActive]}
              onPress={() => setType('credit')}
              activeOpacity={0.85}
            >
              <Feather
                name="plus-circle"
                size={16}
                color={isCredit ? '#FFFFFF' : '#EF4444'}
              />
              <Text style={[styles.typeText, isCredit && styles.typeTextActive]}>
                Give Credit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeBtn, !isCredit && styles.paymentBtnActive]}
              onPress={() => setType('payment')}
              activeOpacity={0.85}
            >
              <Feather
                name="check-circle"
                size={16}
                color={!isCredit ? '#FFFFFF' : '#10B981'}
              />
              <Text style={[styles.typeText, !isCredit && styles.paymentTextActive]}>
                Got Payment
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Amount (Rs.) *</Text>
          <TextInput
            style={[
              styles.input,
              styles.amountInput,
              { borderColor: isCredit ? '#EF4444' : '#10B981' },
            ]}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor={theme.colors.textMuted}
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Note / Details</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2 bags rice, monthly clearance"
            placeholderTextColor={theme.colors.textMuted}
            value={note}
            onChangeText={setNote}
          />

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: isCredit ? '#EF4444' : '#10B981' }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.saveText}>
                {editingEntry ? 'Update Record' : isCredit ? 'Record Credit' : 'Record Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </FadeInView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme, themeMode: 'dark' | 'light') => {
  const isDark = themeMode === 'dark';
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: theme.spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    heading: {
      fontSize: 17,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    sub: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#222222' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1C1C1C' : '#F1F5F9',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#2A2A2A' : '#E2E8F0',
      padding: 4,
      marginBottom: 14,
      gap: 6,
    },
    typeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 42,
      paddingVertical: 10,
      borderRadius: 8,
      gap: 6,
    },
    creditBtnActive: {
      backgroundColor: '#EF4444',
    },
    paymentBtnActive: {
      backgroundColor: '#10B981',
    },
    typeText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#D1D5DB' : '#475569',
    },
    typeTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    paymentTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    label: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
      marginTop: 6,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.textPrimary,
      fontSize: 14,
      marginBottom: 10,
    },
    amountInput: {
      fontSize: 22,
      fontWeight: '800',
      borderWidth: 1.5,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 14,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.md,
      backgroundColor: isDark ? '#222222' : '#E2E8F0',
    },
    cancelText: {
      color: theme.colors.textPrimary,
      fontWeight: '600',
      fontSize: 13,
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.md,
      gap: 6,
    },
    saveText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 13,
    },
  });
};
