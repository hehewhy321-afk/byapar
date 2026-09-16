import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { Party } from '../../types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';

interface Props {
  visible: boolean;
  party: Party | null;
  onClose: () => void;
  onSave: (data: Omit<Party, 'id' | 'balance'>) => void;
}

export const PartyFormModal: React.FC<Props> = ({ visible, party, onClose, onSave }) => {
  const { theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<'customer' | 'supplier'>('customer');

  useEffect(() => {
    if (party) {
      setName(party.name);
      setPhone(party.phone);
      setAddress(party.address || '');
      setType(party.type);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setType('customer');
    }
  }, [party, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a contact name.');
      return;
    }

    onSave({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      type,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <FadeInView duration={240} translateY={20} style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>{party ? 'Edit Contact' : 'New Contact'}</Text>
              <Text style={styles.sub}>Ledger & Khata records</Text>
            </View>
            <AnimatedPressable onPress={onClose} style={styles.closeBtn} activeScale={0.85}>
              <Feather name="x" size={16} color={theme.colors.textMuted} />
            </AnimatedPressable>
          </View>

          {/* TYPE TOGGLE */}
          <View style={styles.typeRow}>
            {(['customer', 'supplier'] as const).map((t) => {
              const isActive = type === t;
              return (
                <AnimatedPressable
                  key={t}
                  style={[styles.typeBtn, isActive && styles.typeBtnActive]}
                  onPress={() => setType(t)}
                  activeScale={0.94}
                >
                  <Text style={[styles.typeText, isActive && styles.typeTextActive]}>
                    {t === 'customer' ? 'Customer' : 'Supplier'}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ram Shrestha"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Mobile Phone (WhatsApp)</Text>
          <TextInput
            style={styles.input}
            placeholder="98XXXXXXXX"
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textMuted}
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.label}>Address / Landmark</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Asan, Kathmandu"
            placeholderTextColor={theme.colors.textMuted}
            value={address}
            onChangeText={setAddress}
          />

          <View style={styles.actions}>
            <AnimatedPressable style={styles.cancelBtn} onPress={onClose} activeScale={0.92}>
              <Text style={styles.cancelText}>Cancel</Text>
            </AnimatedPressable>

            <AnimatedPressable style={styles.saveBtn} onPress={handleSave} activeScale={0.94}>
              <Feather name="check" size={15} color="#FFFFFF" />
              <Text style={styles.saveText}>{party ? 'Update' : 'Save Contact'}</Text>
            </AnimatedPressable>
          </View>
        </FadeInView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme, themeMode: 'dark' | 'light') =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: themeMode === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: theme.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    heading: {
      fontSize: theme.typography.lg,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    sub: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 1,
    },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeRow: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 3,
      marginBottom: 10,
    },
    typeBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: theme.borderRadius.sm,
    },
    typeBtnActive: {
      backgroundColor: theme.colors.primary,
    },
    typeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    typeTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    label: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 5,
      marginTop: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.base,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.card,
    },
    cancelText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    saveBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.primary,
      shadowColor: '#FF4500',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 4,
    },
    saveText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });
