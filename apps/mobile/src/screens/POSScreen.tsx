import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Product, PaymentMode } from '../types';
import { CheckoutModal } from '../components/pos/CheckoutModal';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { FadeInView } from '../components/common/FadeInView';
import { EmptyState } from '../components/common/EmptyState';
import { analytics } from '../services/analyticsService';

export const POSScreen: React.FC = () => {
  const {
    products,
    categories,
    cart,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    completeCheckout,
    activeInvoice,
    setActiveInvoice,
    theme,
    themeMode,
  } = useApp();

  const dynamicCategories = useMemo(() => {
    const catSet = new Set<string>();
    categories.forEach((c) => { if (c.name) catSet.add(c.name); });
    products.forEach((p) => { if (p.category) catSet.add(p.category); });
    return ['All', ...Array.from(catSet)];
  }, [categories, products]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [cartExpanded, setCartExpanded] = useState(false);

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((acc, item) => acc + item.salePrice * item.qty, 0);
  const totalCartQty = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleCheckout = async (mode: PaymentMode, partyId?: string) => {
    const totalAmount = cartTotal;
    setCheckoutVisible(false);
    setCartExpanded(false);
    await completeCheckout(mode, partyId);
    analytics.logInvoiceCreated('INV-' + Date.now(), totalAmount, mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* SEARCH BAR */}
      <View
        style={[
          styles.searchSection,
          {
            backgroundColor: theme.colors.bg,
            borderBottomColor: theme.colors.borderGlass,
          },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderGlass,
            },
          ]}
        >
          <Feather name="search" size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search items or barcode..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <AnimatedPressable onPress={() => setSearch('')} style={styles.clearSearch} activeScale={0.85}>
              <Feather name="x-circle" size={16} color={theme.colors.textMuted} />
            </AnimatedPressable>
          )}
        </View>

        {/* CATEGORY CHIPS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {dynamicCategories.map((cat) => {
            const isCatActive = selectedCategory === cat;
            return (
              <AnimatedPressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isCatActive ? theme.colors.primaryBg : theme.colors.card,
                    borderColor: isCatActive ? theme.colors.primary : theme.colors.borderGlass,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeScale={0.93}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: isCatActive ? theme.colors.primary : theme.colors.textSecondary,
                      fontWeight: isCatActive ? '800' : '600',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </View>

      {/* PRODUCT GRID */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.rowWrapper}
        contentContainerStyle={[styles.listContent, cart.length > 0 && styles.listContentWithCart]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }: { item: Product; index: number }) => {
          const inCartItem = cart.find((c) => c.id === item.id);
          const isLowStock = item.stock <= 10;
          return (
            <FadeInView delay={Math.min(index * 25, 200)} style={styles.cardWrapper}>
              <View
                style={[
                  styles.productCard,
                  {
                    backgroundColor: inCartItem
                      ? themeMode === 'dark'
                        ? '#171311'
                        : '#FFF8F5'
                      : theme.colors.card,
                    borderColor: inCartItem ? theme.colors.primary : theme.colors.borderGlass,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.categoryTag,
                      {
                        backgroundColor: themeMode === 'dark' ? theme.colors.surface : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: theme.colors.borderGlass,
                      },
                    ]}
                  >
                    <Text style={[styles.categoryTagText, { color: theme.colors.textMuted }]} numberOfLines={1}>
                      {item.category}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.stockPill,
                      isLowStock ? styles.stockPillLow : styles.stockPillOk,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stockPillText,
                        isLowStock ? styles.stockTextLow : styles.stockTextOk,
                      ]}
                    >
                      {item.stock} left
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                  {item.name}
                </Text>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={[styles.priceLabel, { color: theme.colors.textMuted }]}>Price</Text>
                    <Text style={[styles.cardPrice, { color: theme.colors.textPrimary }]}>
                      Rs. {item.salePrice.toLocaleString()}
                    </Text>
                  </View>

                  {/* INTERACTIVE IN-CARD STEPPER OR ADD BUTTON */}
                  {inCartItem ? (
                    <View
                      style={[
                        styles.cardStepper,
                        {
                          backgroundColor: themeMode === 'dark' ? theme.colors.surface : '#F8FAFC',
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <AnimatedPressable
                        style={styles.cardStepBtn}
                        onPress={() => {
                          if (inCartItem.qty <= 1) {
                            removeFromCart(item.id);
                          } else {
                            updateCartQty(item.id, -1);
                          }
                        }}
                        activeScale={0.82}
                      >
                        <Feather
                          name={inCartItem.qty <= 1 ? 'trash-2' : 'minus'}
                          size={13}
                          color={inCartItem.qty <= 1 ? theme.colors.danger : theme.colors.textPrimary}
                        />
                      </AnimatedPressable>

                      <Text style={[styles.cardStepVal, { color: theme.colors.textPrimary }]}>
                        {inCartItem.qty}
                      </Text>

                      <AnimatedPressable
                        style={[styles.cardStepBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => addToCart(item)}
                        activeScale={0.82}
                      >
                        <Feather name="plus" size={13} color="#FFFFFF" />
                      </AnimatedPressable>
                    </View>
                  ) : (
                    <AnimatedPressable
                      style={[styles.addBtnDefault, { backgroundColor: theme.colors.primary }]}
                      onPress={() => addToCart(item)}
                      activeScale={0.88}
                    >
                      <Feather name="plus" size={16} color="#FFFFFF" />
                    </AnimatedPressable>
                  )}
                </View>
              </View>
            </FadeInView>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title="No items found"
            subtitle="Try a different name, category, or barcode"
            actionLabel="Show All Items"
            onAction={() => {
              setSearch('');
              setSelectedCategory('All');
            }}
          />
        }
      />

      {/* EXPANDED CART DRAWER MODAL / SHEET */}
      {cart.length > 0 && cartExpanded && (
        <View style={styles.cartBackdrop}>
          <AnimatedPressable
            style={styles.cartBackdropTouch}
            onPress={() => setCartExpanded(false)}
            activeOpacity={1}
          >
            <View />
          </AnimatedPressable>

          <FadeInView
            duration={220}
            translateY={30}
            style={[
              styles.expandedCartSheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderGlass,
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: theme.colors.borderLight }]} />
            <View style={styles.expandedHeader}>
              <View>
                <Text style={[styles.expandedTitle, { color: theme.colors.textPrimary }]}>
                  Current Cart
                </Text>
                <Text style={[styles.expandedSub, { color: theme.colors.textMuted }]}>
                  {totalCartQty} items
                </Text>
              </View>
              <AnimatedPressable onPress={clearCart} style={styles.clearBtn} activeScale={0.9}>
                <Feather name="trash-2" size={13} color={theme.colors.danger} />
                <Text style={styles.clearBtnText}>Clear All</Text>
              </AnimatedPressable>
            </View>

            <ScrollView style={styles.expandedItemsList} showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View
                  key={item.id}
                  style={[styles.cartRow, { borderBottomColor: theme.colors.borderGlass }]}
                >
                  <View style={styles.cartItemInfo}>
                    <Text
                      style={[styles.cartItemTitle, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.cartItemUnit, { color: theme.colors.textMuted }]}>
                      Rs. {item.salePrice.toLocaleString()} / unit
                    </Text>
                  </View>

                  <View style={styles.cartRowActions}>
                    <View
                      style={[
                        styles.stepper,
                        {
                          backgroundColor: themeMode === 'dark' ? theme.colors.card : '#F1F5F9',
                          borderColor: theme.colors.borderGlass,
                        },
                      ]}
                    >
                      <AnimatedPressable
                        style={styles.stepBtn}
                        onPress={() => {
                          if (item.qty <= 1) {
                            removeFromCart(item.id);
                          } else {
                            updateCartQty(item.id, -1);
                          }
                        }}
                        activeScale={0.85}
                      >
                        <Feather
                          name={item.qty <= 1 ? 'trash-2' : 'minus'}
                          size={12}
                          color={item.qty <= 1 ? theme.colors.danger : theme.colors.textPrimary}
                        />
                      </AnimatedPressable>

                      <Text style={[styles.stepVal, { color: theme.colors.textPrimary }]}>
                        {item.qty}
                      </Text>

                      <AnimatedPressable
                        style={styles.stepBtn}
                        onPress={() => updateCartQty(item.id, 1)}
                        activeScale={0.85}
                      >
                        <Feather name="plus" size={12} color={theme.colors.textPrimary} />
                      </AnimatedPressable>
                    </View>

                    <Text style={[styles.cartRowTotal, { color: theme.colors.primary }]}>
                      Rs. {(item.salePrice * item.qty).toLocaleString()}
                    </Text>

                    {/* DEDICATED DELETE BUTTON ON CART ROW */}
                    <AnimatedPressable
                      style={styles.deleteCartItemBtn}
                      onPress={() => removeFromCart(item.id)}
                      activeScale={0.85}
                    >
                      <Feather name="trash-2" size={15} color={theme.colors.danger} />
                    </AnimatedPressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </FadeInView>
        </View>
      )}

      {/* FLOATING ACTION CART BAR */}
      {cart.length > 0 && (
        <View style={styles.floatingCartContainer}>
          <AnimatedPressable
            style={[
              styles.floatingCartBar,
              {
                backgroundColor: themeMode === 'dark' ? '#141414' : '#FFFFFF',
                borderColor: themeMode === 'dark' ? '#2A2A2A' : '#E5E7EB',
              },
            ]}
            onPress={() => setCheckoutVisible(true)}
            activeScale={0.98}
          >
            <AnimatedPressable
              style={styles.cartBadgeBtn}
              onPress={() => setCartExpanded(!cartExpanded)}
              activeScale={0.9}
            >
              <View
                style={[
                  styles.cartIconCircle,
                  { backgroundColor: theme.colors.primaryBg },
                ]}
              >
                <Feather name="shopping-bag" size={16} color={theme.colors.primary} />
                <View style={[styles.floatingCountBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.floatingCountText}>{totalCartQty}</Text>
                </View>
              </View>
              <View style={styles.cartSummaryCol}>
                <Text style={[styles.cartSummaryLabel, { color: theme.colors.textSecondary }]}>
                  Cart Total
                </Text>
                <Text style={[styles.cartSummaryTotal, { color: theme.colors.textPrimary }]}>
                  Rs. {cartTotal.toLocaleString()}
                </Text>
              </View>
            </AnimatedPressable>

            {/* CHARGE BUTTON IN REDDIT ORANGE WITH HIGH CONTRAST WHITE TEXT */}
            <AnimatedPressable
              style={[styles.payNowBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setCheckoutVisible(true)}
              activeScale={0.94}
            >
              <Text style={styles.payNowText}>Charge</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </AnimatedPressable>
          </AnimatedPressable>
        </View>
      )}

      {/* CHECKOUT MODAL */}
      <CheckoutModal
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        onSelectMode={handleCheckout}
      />

      {/* RECEIPT MODAL */}
      <ReceiptModal
        invoice={activeInvoice}
        onClose={() => setActiveInvoice(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  clearSearch: {
    padding: 4,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContentWithCart: {
    paddingBottom: 110,
  },
  rowWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardWrapper: {
    flex: 0.485,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 142,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 75,
  },
  categoryTagText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stockPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  stockPillOk: {
    backgroundColor: 'rgba(255, 69, 0, 0.12)',
  },
  stockPillLow: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  stockPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  stockTextOk: {
    color: '#FF4500',
  },
  stockTextLow: {
    color: '#F59E0B',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    marginBottom: 1,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  addBtnDefault: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cardStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  cardStepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStepBtnAdd: {
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  cardStepVal: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 18,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  floatingCartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 12,
  },
  cartBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
    flex: 1,
  },
  cartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCountBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  floatingCountText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cartSummaryCol: {
    justifyContent: 'center',
  },
  cartSummaryLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  cartSummaryTotal: {
    fontSize: 16,
    fontWeight: '800',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  payNowText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cartBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  cartBackdropTouch: {
    flex: 1,
  },
  expandedCartSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 90,
    maxHeight: '65%',
    borderTopWidth: 1,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  expandedSub: {
    fontSize: 11,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  expandedItemsList: {
    maxHeight: 240,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  cartItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  cartItemUnit: {
    fontSize: 11,
    marginTop: 2,
  },
  cartRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepBtn: {
    padding: 6,
  },
  stepVal: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  cartRowTotal: {
    fontSize: 13,
    fontWeight: '800',
    minWidth: 70,
    textAlign: 'right',
  },
  deleteCartItemBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
