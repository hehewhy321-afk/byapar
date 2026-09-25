import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { Party } from '../../types';
import { FadeInView } from '../common/FadeInView';

interface Props {
  visible: boolean;
  party: Party | null;
  onClose: () => void;
}

export const PartyReminderModal: React.FC<Props> = ({ visible, party, onClose }) => {
  const { theme, themeMode, language, addReminder } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const isDark = themeMode === 'dark';
  const ne = language === 'ne';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('10:00');
  const [reminderType, setReminderType] = useState<'payment_reminder' | 'task_reminder' | 'event_reminder'>('payment_reminder');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible && party) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      setTitle(ne ? `${party.name} - भुक्तानी रिमाइन्डर` : `Payment reminder for ${party.name}`);
      setAmount(party.balance > 0 ? party.balance.toString() : '');
      setDueDate(tomorrowStr);
      setDueTime('10:00');
      setReminderType('payment_reminder');
      setNote(party.balance > 0 ? `Outstanding balance: Rs. ${party.balance.toLocaleString()}` : '');
    }
  }, [visible, party, ne]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(ne ? 'आवश्यक' : 'Required', ne ? 'कृपया रिमाइन्डर शीर्षक राख्नुहोस्।' : 'Please enter a reminder title.');
      return;
    }
    if (!dueDate.trim()) {
      Alert.alert(ne ? 'आवश्यक' : 'Required', ne ? 'कृपया मिति राख्नुहोस्।' : 'Please enter a due date.');
      return;
    }

    try {
      await addReminder({
        partyId: party?.id,
        partyName: party?.name,
        title: title.trim(),
        amount: amount ? Number(amount) : undefined,
        dueDate: dueDate.trim(),
        dueTime: dueTime.trim() || undefined,
        reminderType,
        note: note.trim() || undefined,
        status: 'upcoming',
      });
      onClose();
      Alert.alert(ne ? 'सफल' : 'Success', ne ? 'रिमाइन्डर सफलतापूर्वक सेभ भयो।' : 'Reminder scheduled successfully.');
    } catch {
      Alert.alert(ne ? 'त्रुटि' : 'Error', ne ? 'रिमाइन्डर सेभ गर्न सकिएन।' : 'Failed to save reminder.');
    }
  };

  if (!party) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <FadeInView duration={240} translateY={20} style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{ne ? 'रिमाइन्डर सेट गर्नुहोस्' : 'Set Reminder'}</Text>
              <Text style={styles.subtitle}>{party.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Reminder Type Select */}
            <Text style={styles.label}>{ne ? 'रिमाइन्डर प्रकार' : 'Reminder Type'}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  reminderType === 'payment_reminder' && styles.typeBtnActivePayment,
                ]}
                onPress={() => setReminderType('payment_reminder')}
              >
                <Feather
                  name="dollar-sign"
                  size={14}
                  color={reminderType === 'payment_reminder' ? '#10B981' : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    reminderType === 'payment_reminder' && styles.typeBtnTextActive,
                  ]}
                >
                  {ne ? 'भुक्तानी' : 'Payment'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  reminderType === 'task_reminder' && styles.typeBtnActiveTask,
                ]}
                onPress={() => setReminderType('task_reminder')}
              >
                <Feather
                  name="check-square"
                  size={14}
                  color={reminderType === 'task_reminder' ? '#3B82F6' : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    reminderType === 'task_reminder' && styles.typeBtnTextActive,
                  ]}
                >
                  {ne ? 'कार्य' : 'Task'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  reminderType === 'event_reminder' && styles.typeBtnActiveEvent,
                ]}
                onPress={() => setReminderType('event_reminder')}
              >
                <Feather
                  name="calendar"
                  size={14}
                  color={reminderType === 'event_reminder' ? '#8B5CF6' : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    reminderType === 'event_reminder' && styles.typeBtnTextActive,
                  ]}
                >
                  {ne ? 'कार्यक्रम' : 'Event'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={styles.label}>{ne ? 'शीर्षक *' : 'Title *'}</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={ne ? 'रिमाइन्डर शीर्षक...' : 'Reminder title...'}
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Date and Time Row */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>{ne ? 'मिति *' : 'Due Date *'}</Text>
                <TextInput
                  style={styles.input}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>{ne ? 'समय' : 'Due Time'}</Text>
                <TextInput
                  style={styles.input}
                  value={dueTime}
                  onChangeText={setDueTime}
                  placeholder="HH:MM"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Amount */}
            <Text style={styles.label}>{ne ? 'रकम (वैकल्पिक रु.)' : 'Amount (Optional NPR)'}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Notes */}
            <Text style={styles.label}>{ne ? 'कैफियत / नोट' : 'Note (Optional)'}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={2}
              placeholder={ne ? 'कुनै अतिरिक्त विवरण...' : 'Additional notes...'}
              placeholderTextColor={theme.colors.textMuted}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>{ne ? 'रद्द गर्नुहोस्' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{ne ? 'सेभ गर्नुहोस्' : 'Save Reminder'}</Text>
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
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      overflow: 'hidden',
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
    },
    body: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 16,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
      marginBottom: 6,
      marginTop: 10,
    },
    input: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: theme.colors.textPrimary,
    },
    textArea: {
      minHeight: 60,
      textAlignVertical: 'top',
    },
    row: {
      flexDirection: 'row',
    },
    typeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 4,
    },
    typeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    },
    typeBtnActivePayment: {
      borderColor: '#10B981',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
    },
    typeBtnActiveTask: {
      borderColor: '#3B82F6',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
    },
    typeBtnActiveEvent: {
      borderColor: '#8B5CF6',
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
    },
    typeBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    typeBtnTextActive: {
      color: theme.colors.textPrimary,
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
      gap: 10,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    saveBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
    },
    saveBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
};
