import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, Alert, ScrollView, Image, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { BillImage } from '../../types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Omit<BillImage, 'id'>) => void;
  initialImageUri?: string;
}

const CATEGORIES: BillImage['category'][] = [
  'Inventory',
  'Utilities',
  'Rent',
  'Packaging',
  'Logistics',
  'Other',
];

export const BillCollectorModal: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
  initialImageUri = '',
}) => {
  const { theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const [title, setTitle] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<BillImage['category']>('Inventory');
  const [imageUri, setImageUri] = useState(initialImageUri);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      if (initialImageUri) {
        setImageUri(initialImageUri);
      }
    } else {
      setImageUri('');
      setTitle('');
      setVendorName('');
      setAmount('');
      setNotes('');
    }
  }, [visible, initialImageUri]);

  const handleCaptureCamera = async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Camera Permission Required',
            'Camera permission has been disabled. Please enable it in Settings to capture bills.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        } else {
          Alert.alert('Permission Denied', 'Camera permission is required to capture bill photos.');
        }
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e.message || 'Could not open camera');
    }
  };

  const handlePickGallery = async () => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Media Permission Required',
            'Photo access has been disabled. Please enable photo access in Settings to select bills.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        } else {
          Alert.alert('Permission Denied', 'Media library access is needed to select bills.');
        }
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e.message || 'Could not open gallery');
    }
  };

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
      imageUri: imageUri || '',
      notes: notes.trim(),
    });

    setTitle('');
    setVendorName('');
    setAmount('');
    setNotes('');
    setImageUri('');
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

            {/* ATTACHED SCAN / IMAGE PICKER */}
            <Text style={styles.label}>Attached Scan / Photo</Text>
            {imageUri ? (
              <View style={styles.imageSelectedBox}>
                <Image source={{ uri: imageUri }} style={styles.selectedImg} resizeMode="contain" />
                <View style={styles.imageControlBar}>
                  <AnimatedPressable
                    style={styles.ctrlBtn}
                    onPress={handleCaptureCamera}
                    activeScale={0.9}
                  >
                    <Feather name="camera" size={13} color={theme.colors.textPrimary} />
                    <Text style={styles.ctrlBtnText}>Retake</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    style={styles.ctrlBtn}
                    onPress={handlePickGallery}
                    activeScale={0.9}
                  >
                    <Feather name="image" size={13} color={theme.colors.textPrimary} />
                    <Text style={styles.ctrlBtnText}>Files / Gallery</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    style={[styles.ctrlBtn, styles.ctrlBtnDanger]}
                    onPress={() => setImageUri('')}
                    activeScale={0.9}
                  >
                    <Feather name="trash-2" size={13} color={theme.colors.danger} />
                    <Text style={[styles.ctrlBtnText, { color: theme.colors.danger }]}>Remove</Text>
                  </AnimatedPressable>
                </View>
              </View>
            ) : (
              <View style={styles.emptyUploadBox}>
                <Feather
                  name="camera"
                  size={26}
                  color={theme.colors.primary}
                  style={{ marginBottom: 4 }}
                />
                <Text style={styles.emptyUploadTitle}>Add Bill or Receipt Photo</Text>
                <Text style={styles.emptyUploadSub}>
                  Take a photo or choose from your device files
                </Text>

                <View style={styles.uploadBtnRow}>
                  <AnimatedPressable
                    style={styles.pickCameraBtn}
                    onPress={handleCaptureCamera}
                    activeScale={0.92}
                  >
                    <Feather name="camera" size={14} color="#FFFFFF" />
                    <Text style={styles.pickCameraBtnText}>Take Photo</Text>
                  </AnimatedPressable>

                  <AnimatedPressable
                    style={styles.pickGalleryBtn}
                    onPress={handlePickGallery}
                    activeScale={0.92}
                  >
                    <Feather name="folder" size={14} color={theme.colors.textPrimary} />
                    <Text style={styles.pickGalleryBtnText}>Files / Gallery</Text>
                  </AnimatedPressable>
                </View>
              </View>
            )}

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
    imageSelectedBox: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 8,
      alignItems: 'center',
    },
    selectedImg: {
      width: '100%',
      height: 140,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surface,
    },
    imageControlBar: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      width: '100%',
      justifyContent: 'center',
    },
    ctrlBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      backgroundColor: theme.colors.surface,
    },
    ctrlBtnDanger: {
      borderColor: 'rgba(239, 68, 68, 0.4)',
    },
    ctrlBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    emptyUploadBox: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderStyle: 'dashed',
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyUploadTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    emptyUploadSub: {
      fontSize: 10,
      color: theme.colors.textMuted,
      marginBottom: 10,
      textAlign: 'center',
    },
    uploadBtnRow: {
      flexDirection: 'row',
      gap: 10,
    },
    pickCameraBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: theme.borderRadius.md,
    },
    pickCameraBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    pickGalleryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: theme.borderRadius.md,
    },
    pickGalleryBtnText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
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
