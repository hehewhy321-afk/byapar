import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../theme';
import { useApp } from '../context/AppContext';
import { BillImage } from '../types';
import { BillCollectorModal } from '../components/bills/BillCollectorModal';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { FadeInView } from '../components/common/FadeInView';
import { EmptyState } from '../components/common/EmptyState';

const CATEGORIES = ['All', 'Inventory', 'Utilities', 'Rent', 'Packaging', 'Logistics', 'Other'];

export const BillArchiveScreen: React.FC = () => {
  const { bills, addBill, deleteBill, theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCollectorOpen, setIsCollectorOpen] = useState(false);
  const [previewBill, setPreviewBill] = useState<BillImage | null>(null);

  const filteredBills = bills.filter((b) => {
    const matchesCat = selectedCategory === 'All' || b.category === selectedCategory;
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.notes && b.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalExpense = bills.reduce((acc, b) => acc + (b.amount || 0), 0);

  const confirmDelete = (bill: BillImage) => {
    Alert.alert(
      'Delete Bill',
      `Delete "${bill.title}" (Rs. ${bill.amount.toLocaleString()})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBill(bill.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* OVERVIEW HERO BANNER */}
      <View style={styles.heroBanner}>
        <View>
          <Text style={styles.heroLabel}>DIGITIZED EXPENSES</Text>
          <Text style={styles.heroAmount}>Rs. {totalExpense.toLocaleString()}</Text>
          <Text style={styles.heroSub}>{bills.length} bills archived</Text>
        </View>

        <AnimatedPressable
          style={styles.collectBtn}
          onPress={() => setIsCollectorOpen(true)}
          activeScale={0.92}
        >
          <Feather name="camera" size={16} color="#FFFFFF" />
          <Text style={styles.collectBtnText}>Capture</Text>
        </AnimatedPressable>
      </View>

      {/* SEARCH & FILTERS */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendor, invoice or notes..."
            placeholderTextColor={theme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <AnimatedPressable onPress={() => setSearchQuery('')} activeScale={0.85}>
              <Feather name="x-circle" size={15} color={theme.colors.textMuted} />
            </AnimatedPressable>
          )}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const isActive = selectedCategory === item;
            return (
              <AnimatedPressable
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setSelectedCategory(item)}
                activeScale={0.93}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item}
                </Text>
              </AnimatedPressable>
            );
          }}
        />
      </View>

      {/* BILLS LIST */}
      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }: { item: BillImage; index: number }) => (
          <FadeInView delay={Math.min(index * 30, 240)}>
            <AnimatedPressable
              style={styles.billCard}
              onPress={() => setPreviewBill(item)}
              activeScale={0.97}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerInfo}>
                  <Text style={styles.billTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.vendorName} numberOfLines={1}>
                    {item.vendorName} • {item.date}
                  </Text>
                </View>

                <View style={styles.amountCol}>
                  <Text style={styles.billAmount}>Rs. {item.amount.toLocaleString()}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                </View>
              </View>

              {item.imageUri ? (
                <View style={styles.thumbWrapper}>
                  <Image source={{ uri: item.imageUri }} style={styles.thumbImage} resizeMode="cover" />
                  <View style={styles.scanBadge}>
                    <Feather name="shield" size={11} color={theme.colors.emerald} />
                    <Text style={styles.scanBadgeText}>Verified Scan</Text>
                  </View>
                </View>
              ) : null}

              {item.notes ? (
                <Text style={styles.notesText} numberOfLines={2}>
                  {item.notes}
                </Text>
              ) : null}

              <View style={styles.cardFooter}>
                <View style={styles.tapRow}>
                  <Feather name="maximize-2" size={12} color={theme.colors.textMuted} />
                  <Text style={styles.tapText}>Tap to inspect</Text>
                </View>

                <AnimatedPressable
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(item)}
                  activeScale={0.88}
                >
                  <Feather name="trash-2" size={13} color={theme.colors.danger} />
                </AnimatedPressable>
              </View>
            </AnimatedPressable>
          </FadeInView>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title="No bills collected"
            subtitle="Capture receipts and invoices to keep your records audit-ready"
            actionLabel="Capture Bill"
            onAction={() => setIsCollectorOpen(true)}
          />
        }
      />

      {/* COLLECTOR MODAL */}
      <BillCollectorModal
        visible={isCollectorOpen}
        onClose={() => setIsCollectorOpen(false)}
        onSave={addBill}
      />

      {/* DETAIL PREVIEW MODAL */}
      {previewBill && (
        <Modal
          visible={!!previewBill}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewBill(null)}
        >
          <View style={styles.modalOverlay}>
            <FadeInView duration={240} translateY={20} style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>{previewBill.title}</Text>
                  <Text style={styles.previewVendor}>
                    {previewBill.vendorName} • {previewBill.date}
                  </Text>
                </View>
                <AnimatedPressable
                  style={styles.closePreviewBtn}
                  onPress={() => setPreviewBill(null)}
                  activeScale={0.85}
                >
                  <Feather name="x" size={18} color={theme.colors.textMuted} />
                </AnimatedPressable>
              </View>

              <View style={styles.previewMeta}>
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaLabel}>Amount</Text>
                  <Text style={styles.previewMetaValue}>
                    Rs. {previewBill.amount.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.previewMetaItem}>
                  <Text style={styles.previewMetaLabel}>Category</Text>
                  <Text style={styles.previewMetaValue}>{previewBill.category}</Text>
                </View>
              </View>

              {previewBill.imageUri ? (
                <View style={styles.previewImageWrapper}>
                  <Image
                    source={{ uri: previewBill.imageUri }}
                    style={styles.previewFullImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              {previewBill.notes ? (
                <View style={styles.previewNotesBox}>
                  <Text style={styles.previewNotesLabel}>Notes:</Text>
                  <Text style={styles.previewNotesContent}>{previewBill.notes}</Text>
                </View>
              ) : null}

              <AnimatedPressable
                style={styles.donePreviewBtn}
                onPress={() => setPreviewBill(null)}
                activeScale={0.94}
              >
                <Text style={styles.donePreviewText}>Close</Text>
              </AnimatedPressable>
            </FadeInView>
          </View>
        </Modal>
      )}
    </View>
  );
};

const createStyles = (theme: Theme, themeMode: 'dark' | 'light') =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    heroBanner: {
      backgroundColor: theme.colors.card,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    heroLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    heroAmount: {
      fontSize: 22,
      fontWeight: '900',
      color: theme.colors.primary,
      marginTop: 2,
    },
    heroSub: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 1,
    },
    collectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.lg,
      gap: 6,
      shadowColor: '#FF4500',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    collectBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    filterSection: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 10,
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
    chipsRow: {
      gap: 6,
      paddingBottom: 10,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
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
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: 40,
      gap: 10,
    },
    billCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerInfo: {
      flex: 1,
      marginRight: 10,
    },
    billTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    vendorName: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    amountCol: {
      alignItems: 'flex-end',
    },
    billAmount: {
      fontSize: 15,
      fontWeight: '900',
      color: theme.colors.textPrimary,
    },
    categoryBadge: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      marginTop: 4,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    categoryBadgeText: {
      fontSize: 9,
      color: theme.colors.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    thumbWrapper: {
      marginTop: 10,
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      height: 130,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      position: 'relative',
    },
    thumbImage: {
      width: '100%',
      height: '100%',
    },
    scanBadge: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: themeMode === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.92)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    scanBadgeText: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: '700',
    },
    notesText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 8,
      fontStyle: 'italic',
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
    },
    tapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    tapText: {
      fontSize: 11,
      color: theme.colors.textMuted,
      fontWeight: '500',
    },
    deleteBtn: {
      padding: 6,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.redBg,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: themeMode === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    previewCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: theme.spacing.xl,
      maxHeight: '90%',
    },
    previewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    previewTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    previewVendor: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    closePreviewBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewMeta: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    previewMetaItem: {
      flex: 1,
    },
    previewMetaLabel: {
      fontSize: 9,
      color: theme.colors.textMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    previewMetaValue: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginTop: 2,
    },
    previewImageWrapper: {
      height: 250,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      marginBottom: 12,
    },
    previewFullImage: {
      width: '100%',
      height: '100%',
    },
    previewNotesBox: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      padding: 10,
      marginBottom: 12,
    },
    previewNotesLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    previewNotesContent: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    donePreviewBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    donePreviewText: {
      color: theme.colors.primaryText,
      fontSize: 13,
      fontWeight: '800',
    },
  });
