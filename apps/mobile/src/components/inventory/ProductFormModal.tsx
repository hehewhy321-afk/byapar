import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';
import { CATEGORY_PRESETS } from '@byapar/core';

interface Props {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (data: Omit<Product, 'id'>) => void;
}

const DEFAULT_CATEGORIES = ['Grains', 'Oil & Ghee', 'Spices', 'Dairy', 'Snacks', 'Household', 'General'];
const UNITS = ['Pcs', 'Kg', 'Ltr', 'Box', 'Bag', 'Pack'];

export const ProductFormModal: React.FC<Props> = ({ visible, product, onClose, onSave }) => {
  const { theme, themeMode, store, categories } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);

  const dynamicCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c) => c.name);
    }
    const bizType = store.businessType || 'general';
    return CATEGORY_PRESETS[bizType] || DEFAULT_CATEGORIES;
  }, [categories, store.businessType]);

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('General');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('Pcs');

  useEffect(() => {
    if (product) {
      setName(product.name);
      setBarcode(product.barcode);
      setCategory(product.category);
      setCostPrice(product.costPrice.toString());
      setSalePrice(product.salePrice.toString());
      setStock(product.stock.toString());
      setUnit(product.unit);
    } else {
      setName('');
      setBarcode(Date.now().toString().slice(-8));
      setCategory('General');
      setCostPrice('');
      setSalePrice('');
      setStock('');
      setUnit('Pcs');
    }
  }, [product, visible]);

  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const margin = sale > 0 && cost > 0 ? sale - cost : 0;
  const marginPercent = cost > 0 && sale > cost ? Math.round((margin / cost) * 100) : 0;

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a product name.');
      return;
    }
    if (sale <= 0) {
      Alert.alert('Required', 'Please enter a valid selling price.');
      return;
    }

    const stk = parseInt(stock, 10) || 0;

    onSave({
      name: name.trim(),
      barcode: barcode.trim() || Date.now().toString().slice(-8),
      category: category.trim() || 'General',
      costPrice: cost,
      salePrice: sale,
      stock: stk,
      unit: unit.trim() || 'Pcs',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <FadeInView duration={240} translateY={20} style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.heading}>{product ? 'Edit Item' : 'New Item'}</Text>
              <Text style={styles.sub}>SKU: {barcode}</Text>
            </View>
            <AnimatedPressable onPress={onClose} style={styles.closeBtn} activeScale={0.85}>
              <Feather name="x" size={18} color={theme.colors.textMuted} />
            </AnimatedPressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
            {/* NAME */}
            <Text style={styles.label}>Item Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Basmati Rice 25kg"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* CATEGORY */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.label}>Category</Text>
              {store.businessType && (
                <Text style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: '600' }}>
                  {store.businessType.toUpperCase()} SUGGESTIONS
                </Text>
              )}
            </View>
            <TextInput
              style={[styles.input, { marginBottom: 8 }]}
              placeholder="e.g. Rice & Grains"
              placeholderTextColor={theme.colors.textMuted}
              value={category}
              onChangeText={setCategory}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {dynamicCategories.map((cat) => {
                const isActive = category.toLowerCase() === cat.toLowerCase();
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

            {/* PRICES */}
            <View style={styles.row}>
              <View style={styles.flexOne}>
                <Text style={styles.label}>Selling Price (Rs.) *</Text>
                <TextInput
                  style={[styles.input, { borderColor: theme.colors.primary }]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textMuted}
                  value={salePrice}
                  onChangeText={setSalePrice}
                />
              </View>

              <View style={[styles.flexOne, { marginLeft: 10 }]}>
                <Text style={styles.label}>Cost Price (Rs.)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textMuted}
                  value={costPrice}
                  onChangeText={setCostPrice}
                />
              </View>
            </View>

            {/* MARGIN INDICATOR */}
            {sale > 0 && cost > 0 && (
              <View style={styles.marginPill}>
                <Feather name="trending-up" size={13} color={theme.colors.primary} />
                <Text style={styles.marginText}>
                  Profit Margin: Rs. {margin.toLocaleString()} ({marginPercent}%)
                </Text>
              </View>
            )}

            {/* STOCK & UNIT */}
            <View style={styles.row}>
              <View style={styles.flexOne}>
                <Text style={styles.label}>Opening Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textMuted}
                  value={stock}
                  onChangeText={setStock}
                />
              </View>

              <View style={[styles.flexOne, { marginLeft: 10 }]}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.unitRow}>
                  {UNITS.slice(0, 3).map((u) => (
                    <AnimatedPressable
                      key={u}
                      style={[styles.unitPill, unit === u && styles.unitPillActive]}
                      onPress={() => setUnit(u)}
                      activeScale={0.92}
                    >
                      <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>
                        {u}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </View>
            </View>

            {/* BARCODE */}
            <Text style={styles.label}>Barcode / SKU</Text>
            <TextInput
              style={styles.input}
              placeholder="Barcode"
              placeholderTextColor={theme.colors.textMuted}
              value={barcode}
              onChangeText={setBarcode}
            />
          </ScrollView>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <AnimatedPressable style={styles.cancelBtn} onPress={onClose} activeScale={0.92}>
              <Text style={styles.cancelText}>Cancel</Text>
            </AnimatedPressable>

            <AnimatedPressable style={styles.saveBtn} onPress={handleSave} activeScale={0.94}>
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.saveText}>{product ? 'Update' : 'Save Item'}</Text>
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
      maxHeight: '85%',
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
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
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
      marginBottom: 6,
      marginTop: 10,
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
    row: {
      flexDirection: 'row',
    },
    flexOne: {
      flex: 1,
    },
    marginPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeMode === 'dark' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(22, 163, 74, 0.12)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.sm,
      gap: 6,
      marginTop: 8,
    },
    marginText: {
      fontSize: 12,
      fontWeight: '700',
      color: themeMode === 'dark' ? '#22C55E' : '#16A34A',
    },
    unitRow: {
      flexDirection: 'row',
      gap: 4,
    },
    unitPill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    unitPillActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    unitText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    unitTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.md,
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
