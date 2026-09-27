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
  Linking,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Theme } from '../theme';
import { useApp } from '../context/AppContext';
import { BillImage } from '../types';
import { BillCollectorModal } from '../components/bills/BillCollectorModal';
import { BillImageViewer } from '../components/bills/BillImageViewer';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { checkMobileBillUploadLimit } from '../services/planLimits';
import { downloadBillImage } from '../services/imageDownloadService';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { FadeInView } from '../components/common/FadeInView';
import { EmptyState } from '../components/common/EmptyState';

const CATEGORIES = ['All', 'Inventory', 'Utilities', 'Rent', 'Packaging', 'Logistics', 'Other'];

export const BillArchiveScreen: React.FC = () => {
  const { bills, addBill, deleteBill, theme, themeMode, activeBizId, refreshData } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCollectorOpen, setIsCollectorOpen] = useState(false);
  const [collectorInitialImage, setCollectorInitialImage] = useState<string>('');
  const [previewBill, setPreviewBill] = useState<BillImage | null>(null);
  const [fullScreenBill, setFullScreenBill] = useState<BillImage | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  const handleDirectCapture = async () => {
    try {
      // 1. Check Daily Bill Upload Limit
      const limitCheck = await checkMobileBillUploadLimit(activeBizId);
      if (!limitCheck.allowed) {
        Alert.alert(
          'Daily Upload Limit Reached',
          limitCheck.message || 'You have reached your daily bill upload limit.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade Plan', onPress: () => setShowSubModal(true) },
          ]
        );
        return;
      }

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
        setCollectorInitialImage(result.assets[0].uri);
        setIsCollectorOpen(true);
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e.message || 'Could not open camera');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      // 1. Check Daily Bill Upload Limit
      const limitCheck = await checkMobileBillUploadLimit(activeBizId);
      if (!limitCheck.allowed) {
        Alert.alert(
          'Daily Upload Limit Reached',
          limitCheck.message || 'You have reached your daily bill upload limit.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade Plan', onPress: () => setShowSubModal(true) },
          ]
        );
        return;
      }

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
        setCollectorInitialImage(result.assets[0].uri);
        setIsCollectorOpen(true);
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e.message || 'Could not open gallery');
    }
  };

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (e) {
      console.warn('[BillArchiveScreen] Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownloadBill = async (bill: BillImage) => {
    setIsDownloading(true);
    try {
      await downloadBillImage({
        imageUri: bill.imageUri,
        primaryImageId: bill.primaryImageId,
        businessId: activeBizId,
        title: bill.title || 'bill_receipt',
      });
    } catch (err: any) {
      Alert.alert('Download Error', err?.message || 'Failed to download bill image');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* OVERVIEW HERO BANNER */}
      <View style={styles.heroBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroLabel}>DIGITIZED EXPENSES</Text>
          <Text style={styles.heroAmount}>Rs. {totalExpense.toLocaleString()}</Text>
          <Text style={styles.heroSub}>{bills.length} bills archived</Text>
        </View>

        <View style={styles.heroBtnGroup}>
          <AnimatedPressable
            style={styles.galleryBtn}
            onPress={handlePickFromGallery}
            activeScale={0.92}
          >
            <Feather name="folder" size={14} color={theme.colors.textPrimary} />
            <Text style={styles.galleryBtnText}>Gallery</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.collectBtn}
            onPress={handleDirectCapture}
            activeScale={0.92}
          >
            <Feather name="camera" size={14} color="#FFFFFF" />
            <Text style={styles.collectBtnText}>Capture</Text>
          </AnimatedPressable>
        </View>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
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

              {item.imageUri || item.primaryImageId ? (
                <View style={styles.thumbWrapper}>
                  <BillImageViewer
                    bill={item}
                    businessId={activeBizId}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                  {/* <View style={styles.scanBadge}>
                    <Feather name="shield" size={11} color={theme.colors.emerald} />
                    <Text style={styles.scanBadgeText}>Verified Scan</Text>
                  </View> */}
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
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Feather name="file-text" size={26} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              No bills collected
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.textMuted }]}>
              Capture receipts and invoices to keep your records audit-ready
            </Text>
            <View style={styles.emptyBtnRow}>
              <AnimatedPressable
                style={styles.galleryBtn}
                onPress={handlePickFromGallery}
                activeScale={0.92}
              >
                <Feather name="folder" size={14} color={theme.colors.textPrimary} />
                <Text style={styles.galleryBtnText}>Select from Files</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.collectBtn}
                onPress={handleDirectCapture}
                activeScale={0.92}
              >
                <Feather name="camera" size={14} color="#FFFFFF" />
                <Text style={styles.collectBtnText}>Take Photo</Text>
              </AnimatedPressable>
            </View>
          </View>
        }
      />

      {/* COLLECTOR MODAL */}
      <BillCollectorModal
        visible={isCollectorOpen}
        initialImageUri={collectorInitialImage}
        onClose={() => {
          setIsCollectorOpen(false);
          setCollectorInitialImage('');
        }}
        onSave={addBill}
      />

      {/* SUBSCRIPTION MODAL */}
      <SubscriptionModal
        visible={showSubModal}
        onClose={() => setShowSubModal(false)}
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
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setPreviewBill(null)}
            />
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

              {previewBill.imageUri || previewBill.primaryImageId ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setFullScreenBill(previewBill)}
                  style={styles.previewImageWrapper}
                >
                  <BillImageViewer
                    bill={previewBill}
                    businessId={activeBizId}
                    style={styles.previewFullImage}
                    resizeMode="contain"
                  />
                  {/* <View style={styles.imageZoomHintBadge}>
                    <Feather name="maximize-2" size={11} color="#FFFFFF" />
                    <Text style={styles.imageZoomHintText}>Tap to View Full</Text>
                  </View> */}
                </TouchableOpacity>
              ) : null}

              {previewBill.notes ? (
                <View style={styles.previewNotesBox}>
                  <Text style={styles.previewNotesLabel}>Notes:</Text>
                  <Text style={styles.previewNotesContent}>{previewBill.notes}</Text>
                </View>
              ) : null}

              <View style={styles.previewActionsRow}>
                <AnimatedPressable
                  style={[styles.previewActionBtn, styles.previewDownloadBtn]}
                  onPress={() => handleDownloadBill(previewBill)}
                  activeScale={0.94}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Feather name="download" size={16} color={theme.colors.primary} />
                  )}
                  <Text style={styles.previewDownloadText}>Download</Text>
                </AnimatedPressable>

                <AnimatedPressable
                  style={[styles.previewActionBtn, styles.previewViewFullBtn]}
                  onPress={() => setFullScreenBill(previewBill)}
                  activeScale={0.94}
                >
                  <Feather name="maximize-2" size={16} color={theme.colors.primaryText} />
                  <Text style={styles.previewViewFullText}>View Full</Text>
                </AnimatedPressable>
              </View>
            </FadeInView>
          </View>
        </Modal>
      )}

      {/* FULL-SCREEN ACTUAL SIZE IMAGE VIEWER MODAL */}
      {fullScreenBill && (
        <Modal
          visible={!!fullScreenBill}
          transparent={false}
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setFullScreenBill(null)}
        >
          <View style={styles.fullScreenModal}>
            <SafeAreaView style={styles.fullScreenHeader}>
              <TouchableOpacity
                style={styles.fullScreenCloseBtn}
                onPress={() => setFullScreenBill(null)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={styles.fullScreenTitle} numberOfLines={1}>
                  {fullScreenBill.title}
                </Text>
                <Text style={styles.fullScreenSub} numberOfLines={1}>
                  Rs. {fullScreenBill.amount.toLocaleString()} • {fullScreenBill.vendorName}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.fullScreenDownloadBtn}
                onPress={() => handleDownloadBill(fullScreenBill)}
                disabled={isDownloading}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="download" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </SafeAreaView>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.fullScreenScrollContent}
              maximumZoomScale={5}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
            >
              <BillImageViewer
                bill={fullScreenBill}
                businessId={activeBizId}
                style={styles.actualFullImage}
                containerStyle={styles.actualFullImageContainer}
                resizeMode="contain"
              />
            </ScrollView>

            <View style={styles.fullScreenFooter}>
              <Text style={styles.fullScreenHint}>Pinch with two fingers to zoom in/out • Actual size</Text>
            </View>
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
    heroBtnGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    galleryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: theme.borderRadius.lg,
      gap: 5,
    },
    galleryBtnText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    collectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: theme.borderRadius.lg,
      gap: 5,
      shadowColor: '#FF4500',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    collectBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
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
    previewActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    previewActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: theme.borderRadius.md,
      gap: 8,
    },
    previewDownloadBtn: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
    },
    previewDownloadText: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    previewViewFullBtn: {
      backgroundColor: theme.colors.primary,
    },
    previewViewFullText: {
      color: theme.colors.primaryText,
      fontSize: 13,
      fontWeight: '800',
    },
    imageZoomHintBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    imageZoomHintText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '600',
    },
    fullScreenModal: {
      flex: 1,
      backgroundColor: '#0A0A0A',
    },
    fullScreenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 42,
      paddingBottom: 14,
      backgroundColor: '#141414',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#262626',
    },
    fullScreenCloseBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullScreenTitle: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    fullScreenSub: {
      color: '#A3A3A3',
      fontSize: 12,
      marginTop: 2,
    },
    fullScreenDownloadBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullScreenScrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actualFullImageContainer: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actualFullImage: {
      width: '100%',
      height: '100%',
    },
    fullScreenFooter: {
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: '#141414',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#262626',
    },
    fullScreenHint: {
      color: '#A3A3A3',
      fontSize: 11,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 45,
      paddingHorizontal: 20,
    },
    emptyIconBox: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '800',
      marginBottom: 4,
      textAlign: 'center',
    },
    emptySub: {
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      maxWidth: 260,
    },
    emptyBtnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 16,
    },
  });
