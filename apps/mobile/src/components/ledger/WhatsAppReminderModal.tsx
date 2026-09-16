import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { Party } from '../../types';
import { useApp } from '../../context/AppContext';
import { sendWhatsAppReminder } from '../../services/whatsapp';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';

interface Props {
  visible: boolean;
  party: Party | null;
  onClose: () => void;
}

type Tone = 'friendly' | 'standard' | 'urgent';

export const WhatsAppReminderModal: React.FC<Props> = ({ visible, party, onClose }) => {
  const { store, theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const [phone, setPhone] = useState('');
  const [tone, setTone] = useState<Tone>('standard');
  const [message, setMessage] = useState('');

  const generateMessage = (currentTone: Tone, p: Party) => {
    const formattedAmount = `Rs. ${Math.abs(p.balance).toLocaleString()}`;
    const storeDisplayName = store.name || 'Byapar Store';
    if (currentTone === 'friendly') {
      return `Namaste ${p.name} ji! 🙏 Just a gentle reminder that your pending balance at ${storeDisplayName} is ${formattedAmount}. Please clear it at your convenience. Thank you!`;
    } else if (currentTone === 'urgent') {
      return `URGENT: Dear ${p.name}, your account at ${storeDisplayName} has an overdue balance of ${formattedAmount}. Kindly settle this immediately to avoid service interruption. Thank you.`;
    } else {
      return `Dear ${p.name}, this is a reminder from ${storeDisplayName} regarding your pending balance of ${formattedAmount}. Please clear the amount at your earliest convenience. Thank you!`;
    }
  };

  useEffect(() => {
    if (party) {
      setPhone(party.phone || '');
      setMessage(generateMessage(tone, party));
    }
  }, [party, store.name, tone, visible]);

  if (!party) return null;

  const handleSend = async () => {
    if (!phone.trim()) {
      Alert.alert('Phone Number Required', 'Please enter a valid mobile number.');
      return;
    }

    try {
      await sendWhatsAppReminder(
        phone.trim(),
        party.name,
        store.name || 'Store',
        party.balance,
        message
      );
      onClose();
    } catch {
      Alert.alert('Error', 'Unable to open WhatsApp on this device.');
    }
  };

  const isDark = themeMode === 'dark';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <FadeInView duration={240} translateY={20} style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.waIconBox}>
              <Feather name="message-circle" size={20} color="#25D366" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.heading}>WhatsApp Payment Reminder</Text>
              <Text style={styles.sub}>{party.name} • {party.phone || 'No phone set'}</Text>
            </View>
            <AnimatedPressable onPress={onClose} style={styles.closeBtn} activeScale={0.85}>
              <Feather name="x" size={18} color={theme.colors.textPrimary} />
            </AnimatedPressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* BALANCE TILE */}
            <View style={styles.balanceTile}>
              <Text style={styles.balanceLabel}>OUTSTANDING BALANCE</Text>
              <Text style={styles.balanceVal}>
                Rs. {Math.abs(party.balance).toLocaleString()} {party.balance > 0 ? '(Due)' : '(Advance)'}
              </Text>
            </View>

            {/* PHONE NUMBER INPUT */}
            <Text style={styles.label}>Recipient Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="98XXXXXXXX"
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.textMuted}
              value={phone}
              onChangeText={setPhone}
            />

            {/* TONE SELECTOR */}
            <Text style={styles.label}>Reminder Tone</Text>
            <View style={styles.toneRow}>
              {(['friendly', 'standard', 'urgent'] as const).map((t) => {
                const isActive = tone === t;
                const label = t === 'friendly' ? 'Gentle' : t === 'standard' ? 'Standard' : 'Urgent';
                return (
                  <AnimatedPressable
                    key={t}
                    style={[styles.toneBtn, isActive && styles.toneBtnActive]}
                    onPress={() => setTone(t)}
                    activeScale={0.92}
                  >
                    <Text style={[styles.toneText, isActive && styles.toneTextActive]}>
                      {label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* BUBBLE PREVIEW */}
            <Text style={styles.label}>Message Preview (Editable)</Text>
            <View style={styles.bubbleContainer}>
              <TextInput
                style={styles.messageInput}
                multiline
                value={message}
                onChangeText={setMessage}
                placeholderTextColor={theme.colors.textMuted}
                textAlignVertical="top"
              />
              <View style={styles.bubbleFooter}>
                <Text style={styles.timeTag}>Preview • Ready to Send via WhatsApp</Text>
              </View>
            </View>
          </ScrollView>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <AnimatedPressable style={styles.cancelBtn} onPress={onClose} activeScale={0.92}>
              <Text style={styles.cancelText}>Cancel</Text>
            </AnimatedPressable>

            <AnimatedPressable style={styles.sendBtn} onPress={handleSend} activeScale={0.94}>
              <Feather name="send" size={15} color="#FFFFFF" />
              <Text style={styles.sendText}>Send on WhatsApp</Text>
            </AnimatedPressable>
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
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    card: {
      backgroundColor: isDark ? '#141414' : '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#262626' : '#E2E8F0',
      padding: 20,
      maxHeight: '85%',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#222222' : '#F1F5F9',
    },
    waIconBox: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(37, 211, 102, 0.15)' : '#DCFCE7',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37, 211, 102, 0.35)' : '#86EFAC',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: {
      flex: 1,
    },
    heading: {
      fontSize: 15,
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
    balanceTile: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? '#1C1C1C' : '#F8FAFC',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#2A2A2A' : '#E2E8F0',
      marginBottom: 12,
    },
    balanceLabel: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    balanceVal: {
      fontSize: 15,
      fontWeight: '900',
      color: isDark ? '#EF4444' : '#DC2626',
    },
    label: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 6,
      marginTop: 8,
    },
    input: {
      backgroundColor: isDark ? '#1C1C1C' : '#F8FAFC',
      borderWidth: 1,
      borderColor: isDark ? '#2A2A2A' : '#CBD5E1',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: theme.colors.textPrimary,
      fontSize: 14,
    },
    toneRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    toneBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: isDark ? '#1C1C1C' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#2A2A2A' : '#E2E8F0',
    },
    toneBtnActive: {
      backgroundColor: '#25D366',
      borderColor: '#25D366',
    },
    toneText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    toneTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    bubbleContainer: {
      backgroundColor: isDark ? '#0D2818' : '#ECFDF5',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(37, 211, 102, 0.3)' : '#A7F3D0',
      marginBottom: 10,
    },
    messageInput: {
      color: isDark ? '#FFFFFF' : '#064E3B',
      fontSize: 13,
      lineHeight: 19,
      minHeight: 80,
      fontWeight: '500',
    },
    bubbleFooter: {
      alignItems: 'flex-end',
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(37, 211, 102, 0.2)' : 'rgba(16, 185, 129, 0.2)',
      paddingTop: 4,
    },
    timeTag: {
      fontSize: 10,
      color: isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(6, 78, 59, 0.7)',
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? '#222222' : '#F1F5F9',
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: isDark ? '#222222' : '#F1F5F9',
    },
    cancelText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    sendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 18,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: '#25D366',
    },
    sendText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
  });
};
