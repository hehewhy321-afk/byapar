import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { Party, LedgerEntry } from '../../types';

interface Props {
  visible: boolean;
  party: Party | null;
  entries: LedgerEntry[];
  onClose: () => void;
}

export const PartyStatementReportModal: React.FC<Props> = ({
  visible,
  party,
  entries,
  onClose,
}) => {
  const { theme, themeMode, language, store } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);
  const isDark = themeMode === 'dark';
  const ne = language === 'ne';

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');


  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (dateFilter === 'all') return entries;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return entries.filter((e) => {
      const d = e.date || '';
      if (!d) return true;
      if (dateFilter === 'today') return d === todayStr;
      if (dateFilter === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return d === y.toISOString().split('T')[0];
      }
      if (dateFilter === 'week') {
        const w = new Date(now);
        w.setDate(w.getDate() - 7);
        return d >= w.toISOString().split('T')[0] && d <= todayStr;
      }
      if (dateFilter === 'month') {
        const m = new Date(now);
        m.setMonth(m.getMonth() - 1);
        return d >= m.toISOString().split('T')[0] && d <= todayStr;
      }
      return true;
    });
  }, [entries, dateFilter]);

  const totals = useMemo(() => {
    let creditTotal = 0;
    let paymentTotal = 0;
    for (const e of filteredEntries) {
      if (e.type === 'credit') {
        creditTotal += e.amount;
      } else {
        paymentTotal += e.amount;
      }
    }
    return {
      creditTotal,
      paymentTotal,
      net: creditTotal - paymentTotal,
    };
  }, [filteredEntries]);

  const generateStatementHtml = () => {
    if (!party) return '';
    const bizName = store?.name || 'Byapar Retail Store';
    const bizAddress = store?.address || 'Nepal';
    const bizPhone = store?.phone || '';
    const bizPan = store?.panNumber ? `• PAN/VAT: ${store?.panNumber}` : '';

    let running = 0;
    const rowsHtml = filteredEntries
      .map((e, idx) => {
        if (e.type === 'credit') {
          running += e.amount;
        } else {
          running -= e.amount;
        }
        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px; font-family: monospace;">${e.date}</td>
            <td style="padding: 8px; font-weight: bold; color: ${e.type === 'credit' ? '#dc2626' : '#16a34a'};">
              ${e.type === 'credit' ? 'Credit Given' : 'Payment Received'}
            </td>
            <td style="padding: 8px;">${e.note || '—'}</td>
            <td style="padding: 8px; text-align: right; color: #dc2626; font-family: monospace;">
              ${e.type === 'credit' ? 'Rs. ' + e.amount.toLocaleString() : '—'}
            </td>
            <td style="padding: 8px; text-align: right; color: #16a34a; font-family: monospace;">
              ${e.type === 'payment' ? 'Rs. ' + e.amount.toLocaleString() : '—'}
            </td>
            <td style="padding: 8px; text-align: right; font-weight: bold; font-family: monospace;">
              Rs. ${running.toLocaleString()}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 16px; }
            .biz-title { font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0; }
            .statement-badge { display: inline-block; background: #f3f4f6; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db; }
            .party-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
            .summary-grid { display: flex; gap: 12px; margin-bottom: 20px; }
            .summary-box { flex: 1; border-radius: 8px; padding: 10px; text-align: center; }
            .table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .table th { background: #f3f4f6; text-align: left; padding: 8px; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #d1d5db; }
            .footer-sig { margin-top: 48px; display: flex; justify-content: space-between; font-size: 11px; }
            .sig-box { width: 160px; text-align: center; border-top: 1px solid #9ca3af; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="biz-title">${bizName}</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563;">${bizAddress}</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #4b5563;">Phone: ${bizPhone} ${bizPan}</p>
            </div>
            <div style="text-align: right;">
              <span class="statement-badge">ACCOUNT STATEMENT</span>
              <p style="margin: 6px 0 0 0; font-size: 11px; font-family: monospace; color: #4b5563;">Date: ${new Date().toISOString().split('T')[0]}</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 600; color: #4b5563;">Period: ${dateFilter.toUpperCase()}</p>
            </div>
          </div>

          <div class="party-card">
            <div>
              <strong style="font-size: 14px;">${party.name}</strong>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563;">Phone: ${party.phone || 'N/A'}</p>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #4b5563;">Address: ${party.address || 'N/A'}</p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: bold;">Current Balance</span>
              <div style="font-size: 18px; font-weight: 900; margin-top: 2px;">
                Rs. ${Math.abs(party.balance).toLocaleString()}
              </div>
              <span style="font-size: 10px; font-weight: bold; color: ${party.balance > 0 ? '#16a34a' : '#dc2626'};">
                ${party.balance >= 0 ? '(RECEIVABLE / लिन बाँकी)' : '(PAYABLE / दिन बाँकी)'}
              </span>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-box" style="background: #fef2f2; border: 1px solid #fecaca;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #dc2626;">Total Credit Given</span>
              <div style="font-size: 15px; font-weight: 900; color: #b91c1c; margin-top: 4px;">
                Rs. ${totals.creditTotal.toLocaleString()}
              </div>
            </div>
            <div class="summary-box" style="background: #f0fdf4; border: 1px solid #bbf7d0;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #16a34a;">Total Payment Received</span>
              <div style="font-size: 15px; font-weight: 900; color: #15803d; margin-top: 4px;">
                Rs. ${totals.paymentTotal.toLocaleString()}
              </div>
            </div>
            <div class="summary-box" style="background: #eff6ff; border: 1px solid #bfdbfe;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #2563eb;">Net Movement</span>
              <div style="font-size: 15px; font-weight: 900; color: #1d4ed8; margin-top: 4px;">
                Rs. ${Math.abs(totals.net).toLocaleString()}
              </div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Remarks</th>
                <th style="text-align: right;">Credit Out</th>
                <th style="text-align: right;">Payment In</th>
                <th style="text-align: right;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="6" style="padding: 24px; text-align: center; color: #9ca3af;">No transaction records found for this period.</td></tr>'}
            </tbody>
          </table>

          <div class="footer-sig">
            <div class="sig-box">
              Customer Signature
            </div>
            <div style="color: #9ca3af; font-family: monospace; font-size: 9px; align-self: center;">
              Generated via Byapar Retail OS
            </div>
            <div class="sig-box">
              Authorized Signature & Seal
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      const html = generateStatementHtml();
      await Print.printAsync({ html });
    } catch {
      Alert.alert(ne ? 'त्रुटि' : 'Error', ne ? 'प्रिन्ट गर्न सकिएन।' : 'Failed to print document.');
    }
  };

  const handleWhatsAppShare = () => {
    if (!party) return;
    const phone = party.phone ? `977${party.phone}` : '';
    const text = encodeURIComponent(
      `*Account Statement - ${store?.name || 'Byapar Store'}*\n` +
      `Customer: ${party.name}\n` +
      `Period: ${dateFilter.toUpperCase()}\n\n` +
      `• Total Credit (Outflow): Rs. ${totals.creditTotal.toLocaleString()}\n` +
      `• Total Received (Inflow): Rs. ${totals.paymentTotal.toLocaleString()}\n` +
      `*Current Outstanding: Rs. ${Math.abs(party.balance).toLocaleString()}* (${party.balance >= 0 ? 'To Receive' : 'Settled'})\n\n` +
      `Thank you for doing business with ${store?.name || 'Byapar Store'}!`
    );
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${text}`).catch(() => {
      Linking.openURL(`https://wa.me/${phone}?text=${text}`);
    });
  };

  const handleShare = async () => {
    if (!party) return;
    const text =
      `Account Statement for ${party.name}\n` +
      `Store: ${store?.name || 'Byapar Store'}\n` +
      `Total Credit: Rs. ${totals.creditTotal.toLocaleString()}\n` +
      `Total Received: Rs. ${totals.paymentTotal.toLocaleString()}\n` +
      `Current Balance: Rs. ${Math.abs(party.balance).toLocaleString()}`;
    await Share.share({
      message: text,
      title: `${party.name} Statement`,
    });
  };

  if (!party) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        {/* Top Navbar */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={onClose} style={styles.navBtn}>
            <Feather name="arrow-left" size={18} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.navTitle} numberOfLines={1}>
              {ne ? 'खाता स्टेटमेन्ट (A4)' : 'Account Statement (A4)'}
            </Text>
            <Text style={styles.navSub} numberOfLines={1}>
              {party.name} • {party.phone || 'No phone'}
            </Text>
          </View>
          <View style={styles.navActions}>
            <TouchableOpacity onPress={handlePrint} style={styles.actionIconBtn} activeOpacity={0.8}>
              <Feather name="printer" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleWhatsAppShare} style={styles.actionIconBtnWa} activeOpacity={0.8}>
              <Feather name="message-circle" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.actionIconBtn} activeOpacity={0.8}>
              <Feather name="share-2" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Filter Pills */}
        <View style={styles.filterBar}>
          {(['all', 'today', 'yesterday', 'week', 'month'] as const).map((t) => {
            const isActive = dateFilter === t;
            const label =
              t === 'all'
                ? (ne ? 'सबै' : 'All')
                : t === 'today'
                ? (ne ? 'आज' : 'Today')
                : t === 'yesterday'
                ? (ne ? 'हिजो' : 'Yesterday')
                : t === 'week'
                ? (ne ? 'यो हप्ता' : 'This Week')
                : (ne ? 'यो महिना' : 'This Month');
            return (
              <TouchableOpacity
                key={t}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setDateFilter(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Scrollable Statement Preview */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Shop Header */}
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizName}>{store?.name || 'Byapar Store'}</Text>
                <Text style={styles.bizInfo}>{store?.address || 'Nepal'}</Text>
                <Text style={styles.bizInfo}>
                  Phone: {store?.phone || 'N/A'} {store?.panNumber ? `• PAN: ${store?.panNumber}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>STATEMENT</Text>
                </View>
                <Text style={styles.dateText}>{new Date().toISOString().split('T')[0]}</Text>
              </View>
            </View>

            {/* Customer Box */}
            <View style={styles.partyBox}>
              <View>
                <Text style={styles.partyName}>{party.name}</Text>
                <Text style={styles.partyInfo}>Phone: {party.phone || 'N/A'}</Text>
                <Text style={styles.partyInfo}>Address: {party.address || 'N/A'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
                <Text
                  style={[
                    styles.balanceVal,
                    party.balance >= 0 ? styles.textGreen : styles.textRed,
                  ]}
                >
                  Rs. {Math.abs(party.balance).toLocaleString()}
                </Text>
                <Text style={styles.balanceStatus}>
                  {party.balance >= 0 ? (ne ? 'लिन बाँकी' : 'Receivable') : (ne ? 'दिन बाँकी' : 'Payable')}
                </Text>
              </View>
            </View>

            {/* Summary Metrics */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.metricRed]}>
                <Text style={styles.metricLabel}>{ne ? 'सामान उधारो' : 'Total Credit'}</Text>
                <Text style={[styles.metricVal, styles.textRed]}>
                  Rs. {totals.creditTotal.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.metricCard, styles.metricGreen]}>
                <Text style={styles.metricLabel}>{ne ? 'भुक्तानी प्राप्त' : 'Total Paid'}</Text>
                <Text style={[styles.metricVal, styles.textGreen]}>
                  Rs. {totals.paymentTotal.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.metricCard, styles.metricBlue]}>
                <Text style={styles.metricLabel}>{ne ? 'फरक' : 'Net Movement'}</Text>
                <Text style={[styles.metricVal, styles.textBlue]}>
                  Rs. {Math.abs(totals.net).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Ledger Transactions */}
            <Text style={styles.tableTitle}>{ne ? 'लेनदेन विवरण' : 'Ledger Entries'}</Text>
            {filteredEntries.map((e) => (
              <View key={e.id} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={[
                        styles.entryTypeTag,
                        e.type === 'credit' ? styles.textRed : styles.textGreen,
                      ]}
                    >
                      {e.type === 'credit' ? (ne ? 'उधारो' : 'Credit') : (ne ? 'भुक्तानी' : 'Payment')}
                    </Text>
                    <Text style={styles.entryDate}>{e.date}</Text>
                  </View>
                  {e.note ? <Text style={styles.entryNote}>{e.note}</Text> : null}
                </View>
                <Text
                  style={[
                    styles.entryAmount,
                    e.type === 'credit' ? styles.textRed : styles.textGreen,
                  ]}
                >
                  {e.type === 'credit' ? '+ ' : '− '}Rs. {e.amount.toLocaleString()}
                </Text>
              </View>
            ))}

            {filteredEntries.length === 0 && (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>
                  {ne ? 'छानिएको मितिमा कुनै लेनदेन छैन।' : 'No transactions recorded for this period.'}
                </Text>
              </View>
            )}
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme, themeMode: 'dark' | 'light') => {
  const isDark = themeMode === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    topNav: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 48,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
      backgroundColor: theme.colors.card,
    },
    navBtn: {
      padding: 6,
    },
    navTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    navSub: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    navActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    actionIconBtn: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: theme.colors.primary,
    },
    actionIconBtnWa: {
      padding: 8,
      borderRadius: 10,
      backgroundColor: '#10B981',
    },
    filterBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
      gap: 6,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
    },
    filterChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textSecondary,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
      padding: 16,
    },
    sheetCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 18,
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
      paddingBottom: 14,
    },
    bizName: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.colors.textPrimary,
      textTransform: 'uppercase',
    },
    bizInfo: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    },
    badgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.textSecondary,
      letterSpacing: 0.5,
    },
    dateText: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    partyBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderGlass,
      padding: 12,
      marginVertical: 14,
    },
    partyName: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.colors.textPrimary,
    },
    partyInfo: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    balanceLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    balanceVal: {
      fontSize: 16,
      fontWeight: '900',
      marginTop: 2,
    },
    balanceStatus: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    metricCard: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    metricRed: {
      borderColor: 'rgba(239, 68, 68, 0.3)',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    metricGreen: {
      borderColor: 'rgba(16, 185, 129, 0.3)',
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    metricBlue: {
      borderColor: 'rgba(59, 130, 246, 0.3)',
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    metricLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    metricVal: {
      fontSize: 13,
      fontWeight: '900',
      marginTop: 4,
    },
    tableTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    entryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderGlass,
    },
    entryTypeTag: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    entryDate: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: theme.colors.textMuted,
    },
    entryNote: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    entryAmount: {
      fontSize: 13,
      fontWeight: '800',
    },
    textGreen: {
      color: '#10B981',
    },
    textRed: {
      color: '#EF4444',
    },
    textBlue: {
      color: '#3B82F6',
    },
  });
};
