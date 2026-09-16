import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Alert, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Theme } from '../../theme';
import { useApp } from '../../context/AppContext';
import { Invoice } from '../../types';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { FadeInView } from '../common/FadeInView';

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<Props> = ({ invoice, onClose }) => {
  const { store, theme, themeMode } = useApp();
  const styles = useMemo(() => createStyles(theme, themeMode), [theme, themeMode]);

  if (!invoice) return null;

  const handlePrint = () => {
    Alert.alert('Bluetooth Printer', `Printing to ${store.paperWidth} thermal printer...`);
  };

  const handleWhatsAppShare = () => {
    const text = `*${store.name}*\nTax Invoice: #${invoice.invoiceNumber}\nDate: ${invoice.date}\nTotal: Rs. ${invoice.total.toLocaleString()}\nThank you for shopping with us!`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', 'WhatsApp is not installed on this device.');
    });
  };

  return (
    <Modal visible={invoice !== null} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
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
