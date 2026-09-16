import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../theme';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { ProductFormModal } from '../components/inventory/ProductFormModal';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { FadeInView } from '../components/common/FadeInView';
import { EmptyState } from '../components/common/EmptyState';

export const InventoryScreen: React.FC = () => {
  const { products, addProduct, editProduct, deleteProduct, theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const totalStockVal = products.reduce((acc, p) => acc + p.stock * p.costPrice, 0);
  const lowStockCount = products.filter((p) => p.stock <= 10).length;

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setSelectedProduct(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setSelectedProduct(prod);
    setModalVisible(true);
  };

  const handleDelete = (prod: Product) => {
    Alert.alert(
      'Remove Product',
      `Delete "${prod.name}" from catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProduct(prod.id),
        },
      ]
    );
  };

  const handleQuickAdjust = async (prod: Product, delta: number) => {
    const newStock = Math.max(0, prod.stock + delta);
    await editProduct(prod.id, { ...prod, stock: newStock });
  };

  const handleSaveProduct = async (data: Omit<Product, 'id'>) => {
    if (selectedProduct) {
      await editProduct(selectedProduct.id, data);
    } else {
      await addProduct(data);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* KPI METRICS ROW */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>PRODUCTS</Text>
          <Text style={styles.kpiValue}>{products.length}</Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>STOCK VALUE</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.emerald }]}>
            Rs. {totalStockVal.toLocaleString()}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>LOW STOCK</Text>
          <Text
            style={[
              styles.kpiValue,
              { color: lowStockCount > 0 ? theme.colors.amber : theme.colors.textMuted },
            ]}
          >
            {lowStockCount}
          </Text>
        </View>
      </View>

      {/* SEARCH AND ADD BAR */}
      <View style={styles.toolbar}>
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search catalog..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <AnimatedPressable onPress={() => setSearch('')} activeScale={0.85}>
              <Feather name="x-circle" size={15} color={theme.colors.textMuted} />
            </AnimatedPressable>
          )}
        </View>

        <AnimatedPressable style={styles.addBtn} onPress={handleOpenAdd} activeScale={0.92}>
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </AnimatedPressable>
      </View>

      {/* PRODUCT LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }: { item: Product; index: number }) => {
          const isLow = item.stock <= 10;
          return (
            <FadeInView delay={Math.min(index * 25, 200)}>
              <View style={styles.productCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                  </View>
                  <View style={[styles.stockBadge, isLow ? styles.stockBadgeLow : styles.stockBadgeOk]}>
                    <Text style={[styles.stockText, isLow ? styles.stockLow : styles.stockOk]}>
                      {item.stock} {item.unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.bodyRow}>
                  <View style={styles.infoCol}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.pricesRow}>
                      <Text style={styles.priceTag}>
                        Sell: <Text style={styles.priceVal}>Rs. {item.salePrice.toLocaleString()}</Text>
                      </Text>
                      <Text style={styles.costTag}>
                        Cost: Rs. {item.costPrice.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* QUICK ADJUST STEPPER */}
                  <View style={styles.stepperContainer}>
                    <AnimatedPressable
                      style={styles.stepBtn}
                      onPress={() => handleQuickAdjust(item, -1)}
                      activeScale={0.85}
                    >
                      <Feather name="minus" size={13} color={theme.colors.textSecondary} />
                    </AnimatedPressable>
                    <Text style={styles.stepStockVal}>{item.stock}</Text>
                    <AnimatedPressable
                      style={styles.stepBtn}
                      onPress={() => handleQuickAdjust(item, 1)}
                      activeScale={0.85}
                    >
                      <Feather name="plus" size={13} color={theme.colors.emerald} />
                    </AnimatedPressable>
                  </View>
                </View>

                {/* CARD FOOTER ACTIONS */}
                <View style={styles.cardActions}>
                  <Text style={styles.barcodeText}>Barcode: {item.barcode}</Text>
                  <View style={styles.actionBtnsGroup}>
                    <AnimatedPressable
                      style={styles.editAction}
                      onPress={() => handleOpenEdit(item)}
                      activeScale={0.9}
                    >
                      <Feather name="edit-2" size={13} color={theme.colors.indigoLight} />
                      <Text style={styles.editText}>Edit</Text>
                    </AnimatedPressable>

                    <AnimatedPressable
                      style={styles.deleteAction}
                      onPress={() => handleDelete(item)}
                      activeScale={0.9}
                    >
                      <Feather name="trash-2" size={13} color={theme.colors.danger} />
                    </AnimatedPressable>
                  </View>
                </View>
              </View>
            </FadeInView>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="box"
            title="Catalog is empty"
            subtitle="Add items to track prices, barcodes, and stock levels"
            actionLabel="Add First Item"
            onAction={handleOpenAdd}
          />
        }
      />

      <ProductFormModal
        visible={modalVisible}
        product={selectedProduct}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveProduct}
      />
    </View>
  );
};

const createStyles = (theme: Theme, themeMode: 'dark' | 'light') =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    kpiRow: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      gap: 8,
    },
    kpiCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.lg,
      padding: 10,
    },
    kpiLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    kpiValue: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.colors.textPrimary,
      marginTop: 2,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
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
      fontSize: theme.typography.base,
      padding: 0,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.md,
      gap: 6,
      shadowColor: '#FF4500',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    addBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 40,
      gap: 10,
    },
    productCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.lg,
      padding: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    categoryBadge: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    categoryText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    stockBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.full,
    },
    stockBadgeOk: {
      backgroundColor: themeMode === 'dark' ? 'rgba(255, 69, 0, 0.14)' : 'rgba(255, 69, 0, 0.10)',
    },
    stockBadgeLow: {
      backgroundColor: themeMode === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.12)',
    },
    stockText: {
      fontSize: 10,
      fontWeight: '700',
    },
    stockOk: {
      color: theme.colors.primary,
    },
    stockLow: {
      color: theme.colors.amber,
    },
    bodyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    infoCol: {
      flex: 1,
      marginRight: 10,
    },
    productName: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    pricesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    priceTag: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    priceVal: {
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    costTag: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    stepBtn: {
      padding: 6,
    },
    stepStockVal: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      minWidth: 24,
      textAlign: 'center',
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
      paddingTop: 8,
    },
    barcodeText: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
    actionBtnsGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editAction: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primaryBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.borderRadius.sm,
      gap: 4,
    },
    editText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primary,
    },
    deleteAction: {
      backgroundColor: theme.colors.redBg,
      padding: 6,
      borderRadius: theme.borderRadius.sm,
    },
  });
