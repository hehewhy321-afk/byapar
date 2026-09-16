import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { BillImage } from '../../types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<BillImage, 'id'>) => void;
}

const CATEGORIES: BillImage['category'][] = [
  'Inventory',
  'Utilities',
  'Rent',
  'Packaging',
  'Logistics',
  'Other',
];

const PRESET_SAMPLE_RECEIPTS = [
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
];

export const BillCollectorModal: React.FC<Props> = ({ visible, onClose, onSave }) => {
  const { theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<BillImage['category']>('Inventory');
  const [imageUri, setImageUri] = useState(PRESET_SAMPLE_RECEIPTS[0]);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a bill title or invoice number.');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Required', 'Please enter a valid amount.');
      return;
    }

    onSave({
      title: title.trim(),
      vendorName: vendorName.trim() || 'General Vendor',
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      category,
      imageUri,
      notes: notes.trim(),
    });

    setTitle('');
    setVendorName('');
    setAmount('');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <FadeInView duration={240} translateY={20} style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>Collect Bill Scan</Text>
              <Text style={styles.sub}>Archive vendor invoice or receipt</Text>
            </View>
            <AnimatedPressable onPress={onClose} style={styles.closeBtn} activeScale={0.85}>
              <Feather name="x" size={16} color={theme.colors.textMuted} />
            </AnimatedPressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
            {/* TITLE */}
            <Text style={styles.label}>Bill Title / Invoice # *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rice Batch Purchase #402"
              placeholderTextColor={theme.colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* VENDOR & AMOUNT */}
            <View style={styles.row}>
              <View style={styles.flexOne}>
                <Text style={styles.label}>Vendor / Payee</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chaudhary Traders"
                  placeholderTextColor={theme.colors.textMuted}
                  value={vendorName}
                  onChangeText={setVendorName}
                />
              </View>

              <View style={[styles.flexOne, { marginLeft: 10 }]}>
                <Text style={styles.label}>Amount (Rs.) *</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.emerald }]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* CATEGORY CHIPS */}
            <Text style={styles.label}>Expense Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {CATEGORIES.map((cat) => {
                const isActive = category === cat;
                return (
                  <AnimatedPressable
                    key={cat}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                    activeScale={0.92}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat}</Text>
                  </AnimatedPressable>
                );
              })}
            </ScrollView>

            {/* RECEIPT IMAGE PREVIEWS / ATTACHMENT */}
            <Text style={styles.label}>Attached Scan</Text>
            <View style={styles.imageSelectorBox}>
              <Image source={{ uri: imageUri }} style={styles.selectedImg} resizeMode="cover" />
              <View style={styles.sampleThumbRow}>
                {PRESET_SAMPLE_RECEIPTS.map((uri, idx) => (
                  <AnimatedPressable
                    key={idx}
                    style={[styles.thumbOption, imageUri === uri && styles.thumbOptionActive]}
                    onPress={() => setImageUri(uri)}
                    activeScale={0.9}
                  >
                    <Image source={{ uri }} style={styles.thumbMini} />
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            {/* NOTES */}
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cash paid at delivery, tax invoice included"
              placeholderTextColor={theme.colors.textMuted}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <AnimatedPressable style={styles.cancelBtn} onPress={onClose} activeScale={0.92}>
              <Text style={styles.cancelText}>Cancel</Text>
            </AnimatedPressable>

            <AnimatedPressable style={styles.saveBtn} onPress={handleSave} activeScale={0.94}>
              <Feather name="check" size={15} color="#FFFFFF" />
              <Text style={styles.saveText}>Save Bill</Text>
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
      maxHeight: '88%',
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
    formScroll: {
      paddingVertical: 4,
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
    row: {
      flexDirection: 'row',
    },
    flexOne: {
      flex: 1,
    },
    chipsRow: {
      gap: 6,
      paddingVertical: 4,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      marginRight: 6,
    },
    chipActive: {
      backgroundColor: theme.colors.primaryBg,
      borderColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    chipTextActive: {
      color: theme.colors.primary,
      fontWeight: '800',
    },
    imageSelectorBox: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 8,
      gap: 8,
    },
    selectedImg: {
      width: '100%',
      height: 110,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surface,
    },
    sampleThumbRow: {
      flexDirection: 'row',
      gap: 8,
    },
    thumbOption: {
      width: 44,
      height: 36,
      borderRadius: 6,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    thumbOptionActive: {
      borderColor: theme.colors.primary,
    },
    thumbMini: {
      width: '100%',
      height: '100%',
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
      paddingHorizontal: 20,
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
