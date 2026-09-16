import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../theme';
import { useApp } from '../context/AppContext';
import { Invoice } from '../types';
import { ReceiptModal } from '../components/pos/ReceiptModal';
import { AnimatedPressable } from '../components/common/AnimatedPressable';
import { FadeInView } from '../components/common/FadeInView';
import { EmptyState } from '../components/common/EmptyState';

export const ReportsScreen: React.FC = () => {
  const { invoices, bills, parties, setActiveInvoice, activeInvoice, theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);

  // Financial calculations
  const totalSales = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
  const totalBillsExpense = bills.reduce((acc, b) => acc + (b.amount || 0), 0);
  const totalReceivables = parties
    .filter((p) => p.balance > 0)
    .reduce((acc, p) => acc + p.balance, 0);
  const totalPayables = parties
    .filter((p) => p.balance < 0)
    .reduce((acc, p) => acc + Math.abs(p.balance), 0);

  // Payment channel distribution
  const paymentBreakdown = invoices.reduce(
    (acc, inv) => {
      const mode = inv.paymentMode || 'cash';
      acc[mode] = (acc[mode] || 0) + inv.total;
      return acc;
    },
    {} as Record<string, number>
  );

  const getModeInfo = (mode: string) => {
    switch (mode) {
      case 'fonepay_qr':
        return { label: 'Fonepay QR', color: theme.colors.indigoLight, icon: 'grid' as const };
      case 'card':
        return { label: 'Card / POS', color: theme.colors.blue, icon: 'credit-card' as const };
      case 'credit':
        return { label: 'Khata Credit', color: theme.colors.amber, icon: 'book-open' as const };
      case 'cash':
      default:
        return { label: 'Cash', color: theme.colors.primary, icon: 'dollar-sign' as const };
    }
  };

  const renderInvoiceItem = ({ item, index }: { item: Invoice; index: number }) => {
    const info = getModeInfo(item.paymentMode);
    return (
      <FadeInView delay={Math.min(index * 25, 200)}>
        <AnimatedPressable
          style={styles.invoiceCard}
          onPress={() => setActiveInvoice(item)}
          activeScale={0.97}
        >
          <View style={styles.invHeader}>
            <View style={styles.invLeft}>
              <Text style={styles.invNumber}>#{item.invoiceNumber}</Text>
              <Text style={styles.invParty}>{item.partyName || 'Walk-in Customer'}</Text>
            </View>

            <View style={styles.invRight}>
              <Text style={styles.invAmount}>Rs. {item.total.toLocaleString()}</Text>
              <View style={[styles.modeBadge, { borderColor: info.color, backgroundColor: info.color + '15' }]}>
                <Text style={[styles.modeBadgeText, { color: info.color }]}>{info.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.invFooter}>
            <Text style={styles.invDate}>
              {item.date} • {item.items.length} items
            </Text>
            <View style={styles.receiptLink}>
              <Text style={styles.receiptLinkText}>Receipt</Text>
              <Feather name="chevron-right" size={13} color={theme.colors.primary} />
            </View>
          </View>
        </AnimatedPressable>
      </FadeInView>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderInvoiceItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* HERO REVENUE TILE */}
            <FadeInView style={styles.heroRevenueCard}>
              <Text style={styles.heroLabel}>GROSS REVENUE</Text>
              <Text style={styles.heroAmount}>Rs. {totalSales.toLocaleString()}</Text>
              <Text style={styles.heroSub}>{invoices.length} invoices generated</Text>
            </FadeInView>

            {/* METRIC GRID TILES */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>RECEIVABLES</Text>
                <Text style={[styles.metricVal, { color: theme.colors.primary }]}>
                  Rs. {totalReceivables.toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>Pending due</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>PAYABLES</Text>
                <Text style={[styles.metricVal, { color: theme.colors.danger }]}>
                  Rs. {totalPayables.toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>Supplier due</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>EXPENSES</Text>
                <Text style={[styles.metricVal, { color: theme.colors.amber }]}>
                  Rs. {totalBillsExpense.toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>{bills.length} bills archived</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>NET ESTIMATE</Text>
                <Text style={[styles.metricVal, { color: theme.colors.primary }]}>
                  Rs. {Math.max(0, totalSales - totalBillsExpense).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>Revenue − Expenses</Text>
              </View>
            </View>

            {/* PAYMENT DISTRIBUTION */}
            <View style={styles.distributionCard}>
              <Text style={styles.sectionTitle}>Sales By Channel</Text>
              <View style={styles.channelList}>
                {['cash', 'fonepay_qr', 'credit', 'card'].map((mode) => {
                  const amount = paymentBreakdown[mode] || 0;
                  const pct = totalSales > 0 ? Math.round((amount / totalSales) * 100) : 0;
                  const info = getModeInfo(mode);
                  return (
                    <View key={mode} style={styles.channelItem}>
                      <View style={styles.channelTop}>
                        <View style={styles.channelNameRow}>
                          <View style={[styles.dot, { backgroundColor: info.color }]} />
                          <Text style={styles.channelName}>{info.label}</Text>
                        </View>
                        <Text style={styles.channelAmount}>
                          Rs. {amount.toLocaleString()} ({pct}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${pct}%`, backgroundColor: info.color },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* AUDIT REGISTER HEADER */}
            <View style={styles.registerHeader}>
              <Text style={styles.sectionTitle}>Sales Register</Text>
              <Text style={styles.registerCount}>{invoices.length} transactions</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="bar-chart-2"
            title="No sales recorded"
            subtitle="Completed sales at checkout will automatically generate entries here"
          />
        }
      />

      {/* RECEIPT MODAL */}
      <ReceiptModal
        invoice={activeInvoice}
        onClose={() => setActiveInvoice(null)}
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
    listContent: {
      padding: theme.spacing.md,
      paddingBottom: 40,
      gap: 8,
    },
    headerSection: {
      marginBottom: theme.spacing.md,
    },
    heroRevenueCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: theme.spacing.lg,
      marginBottom: 10,
    },
    heroLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    heroAmount: {
      fontSize: 26,
      fontWeight: '900',
      color: theme.colors.textPrimary,
      marginTop: 4,
    },
    heroSub: {
      fontSize: 11,
      color: theme.colors.primary,
      marginTop: 3,
      fontWeight: '600',
    },
    metricsGrid: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    metricCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 12,
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    metricVal: {
      fontSize: 15,
      fontWeight: '900',
      marginTop: 4,
    },
    metricSub: {
      fontSize: 10,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    distributionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: theme.spacing.lg,
      marginVertical: 6,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    channelList: {
      gap: 10,
    },
    channelItem: {
      gap: 6,
    },
    channelTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    channelNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    channelName: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    channelAmount: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: themeMode === 'dark' ? '#222222' : '#E2E8F0',
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    registerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      marginBottom: 4,
    },
    registerCount: {
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    invoiceCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 12,
    },
    invHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    invLeft: {
      flex: 1,
    },
    invNumber: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    invParty: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    invRight: {
      alignItems: 'flex-end',
    },
    invAmount: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.colors.textPrimary,
    },
    modeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      marginTop: 4,
    },
    modeBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    invFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderGlass,
    },
    invDate: {
      fontSize: 10,
      color: theme.colors.textMuted,
    },
    receiptLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    receiptLinkText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.primary,
    },
  });
