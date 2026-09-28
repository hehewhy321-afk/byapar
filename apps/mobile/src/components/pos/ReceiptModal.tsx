import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Alert, Linking, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';
import { sendWhatsAppInvoice } from '../../services/whatsapp';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ invoice, onClose }) => {
  const { store, theme, themeMode, parties } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);

  if (!invoice) return null;

  const generateReceiptHtml = () => {
    const is80 = store.paperWidth === '80mm';
    const paperWidth = is80 ? '78mm' : '56mm';
    const fontSize = is80 ? '13px' : '11px';
    const titleSize = is80 ? '17px' : '14px';

    const itemsHtml = (invoice.items || [])
      .map(
        (it) => `
        <tr>
          <td style="padding: 3px 0; text-align: left; word-break: break-word;">${it.name}</td>
          <td style="padding: 3px 0; text-align: center; white-space: nowrap;">${it.qty}</td>
          <td style="padding: 3px 0; text-align: right; white-space: nowrap;">${it.price.toLocaleString()}</td>
          <td style="padding: 3px 0; text-align: right; white-space: nowrap; font-weight: bold;">${(it.qty * it.price).toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: ${fontSize};
              line-height: 1.25;
              color: #000;
              background: #fff;
              width: ${paperWidth};
              margin: 0 auto;
              padding: 8px 4px;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .store-title {
              font-size: ${titleSize};
              font-weight: 900;
              margin: 0 0 2px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta { font-size: 10px; color: #333; margin: 1px 0; }
            .dashed-line {
              border-bottom: 1px dashed #000;
              margin: 6px 0;
            }
            .double-line {
              border-bottom: 2px solid #000;
              margin: 6px 0;
            }
            .info-table {
              width: 100%;
              font-size: 10px;
              margin: 4px 0;
              border-collapse: collapse;
            }
            .info-table td { padding: 1px 0; }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
              margin: 4px 0;
            }
            .items-table th {
              border-bottom: 1px dashed #000;
              padding: 3px 0;
              font-size: 10px;
              font-weight: bold;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: ${is80 ? '15px' : '13px'};
              font-weight: 900;
              padding: 4px 0;
            }
            .footer-msg {
              font-size: 9px;
              text-align: center;
              margin-top: 8px;
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="center">
            <h1 class="store-title">${store.name || 'STORE RECEIPT'}</h1>
            ${store.address ? `<div class="meta">${store.address}</div>` : ''}
            ${store.phone ? `<div class="meta">Tel: ${store.phone}</div>` : ''}
            ${store.panNumber ? `<div class="meta"><b>PAN / VAT:</b> ${store.panNumber}</div>` : ''}
            <div class="dashed-line"></div>
            <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
              TAX INVOICE / CASH BILL
            </div>
          </div>

          <div class="dashed-line"></div>

          <table class="info-table">
            <tr>
              <td><b>Bill No:</b> ${invoice.invoiceNumber}</td>
              <td style="text-align: right;"><b>Date:</b> ${invoice.date}</td>
            </tr>
            ${
              invoice.partyName
                ? `<tr><td colspan="2"><b>Customer:</b> ${invoice.partyName}</td></tr>`
                : ''
            }
            <tr>
              <td colspan="2"><b>Payment:</b> ${(invoice.paymentMode || 'CASH').toUpperCase()}</td>
            </tr>
          </table>

          <div class="dashed-line"></div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="double-line"></div>

          <div class="total-row">
            <span>TOTAL:</span>
            <span>Rs. ${Number(invoice.total).toLocaleString()}</span>
          </div>

          <div class="dashed-line"></div>

          <div class="footer-msg">
            <div>Thank you for your visit!</div>
            <div>Exchange with valid bill within 7 days.</div>
            <div style="font-family: sans-serif; font-size: 8px; margin-top: 5px; color: #888;">
              POWERED BY BYAPAR SMART POS
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      const html = generateReceiptHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      console.warn('[ReceiptModal] Print error:', err);
      Alert.alert('Print Error', 'Could not complete print job. Please check printer connection.');
    }
  };

  const handleWhatsAppShare = async () => {
    // Find customer phone if available in parties
    const matchedParty = parties.find(
      (p) => p.name.trim().toLowerCase() === (invoice.partyName || '').trim().toLowerCase()
    );
    const customerPhone = matchedParty?.phone || '';

    try {
      await sendWhatsAppInvoice(
        {
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          total: invoice.total,
          paymentMode: invoice.paymentMode,
          partyName: invoice.partyName,
          items: invoice.items,
        },
        {
          name: store.name,
          phone: store.phone,
          panNumber: store.panNumber,
          address: store.address,
        },
        customerPhone
      );
    } catch {
      Alert.alert('WhatsApp', 'Unable to open WhatsApp on this device.');
    }
  };

  return (
    <Modal visible={invoice !== null} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <FadeInView duration={240} translateY={24} style={styles.sheet}>
          {/* RECEIPT PAPER TICKET */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.storeName}>{store.name.toUpperCase()}</Text>
              <Text style={styles.ticketMeta}>{store.address}</Text>
              <Text style={styles.ticketMeta}>PAN/VAT: {store.panNumber}</Text>
            </View>

            <View style={styles.dashedDivider} />

            <View style={styles.infoGrid}>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Invoice #</Text>
                <Text style={styles.infoVal}>{invoice.invoiceNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Date</Text>
                <Text style={styles.infoVal}>{invoice.date}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Customer</Text>
                <Text style={styles.infoVal}>{invoice.partyName || 'Walk-in'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoKey}>Payment</Text>
                <Text style={[styles.infoVal, { textTransform: 'uppercase' }]}>
                  {invoice.paymentMode}
                </Text>
              </View>
            </View>

            <View style={styles.dashedDivider} />

            <ScrollView style={styles.itemsScroll} showsVerticalScrollIndicator={false}>
              {invoice.items.map((it, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text style={styles.itemQty}>x{it.qty}</Text>
                  <Text style={styles.itemPrice}>
                    {(it.price * it.qty).toLocaleString()}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.dashedDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalAmount}>Rs. {invoice.total.toLocaleString()}</Text>
            </View>

            <Text style={styles.thankYou}>Thank you for your visit</Text>
            <Text style={styles.poweredBy}>BYAPAR RETAIL OS</Text>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionsRow}>
            <AnimatedPressable style={styles.printBtn} onPress={handlePrint} activeScale={0.94}>
              <Feather name="printer" size={16} color={theme.colors.textPrimary} />
              <Text style={styles.printText}>Print</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.shareBtn}
              onPress={handleWhatsAppShare}
              activeScale={0.94}
            >
              <Feather name="share-2" size={16} color={theme.colors.whatsapp} />
              <Text style={styles.shareText}>WhatsApp</Text>
            </AnimatedPressable>

            <AnimatedPressable style={styles.doneBtn} onPress={onClose} activeScale={0.94}>
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.doneText}>Done</Text>
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
    backgroundColor: 'rgba(5, 7, 13, 0.85)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  sheet: {
    width: '100%',
    maxHeight: '90%',
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  ticketHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  storeName: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  ticketMeta: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#555',
    marginTop: 2,
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: '#CCC',
    marginVertical: 10,
  },
  infoGrid: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoKey: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#666',
  },
  infoVal: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  itemsScroll: {
    maxHeight: 140,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemName: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#111',
    flex: 2,
  },
  itemQty: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#555',
    flex: 1,
    textAlign: 'center',
  },
  itemPrice: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  totalLabel: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '900',
    color: '#000',
  },
  totalAmount: {
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },
  thankYou: {
    fontFamily: 'monospace',
    fontSize: 11,
    textAlign: 'center',
    color: '#555',
    marginTop: 12,
  },
  poweredBy: {
    fontFamily: 'monospace',
    fontSize: 9,
    textAlign: 'center',
    color: '#888',
    marginTop: 2,
    letterSpacing: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: theme.spacing.md,
  },
  printBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardElevated,
    borderWidth: 1,
    borderColor: theme.colors.borderGlass,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    gap: 6,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.whatsappBg,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    gap: 6,
  },
  doneBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    gap: 6,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  printText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  shareText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.whatsapp,
  },
  doneText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
