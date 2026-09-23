import { Linking } from 'react-native';
import { analytics } from './analyticsService';

export function normalizeNepalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('977') && digits.length === 13) {
    return digits;
  }
  if (digits.length === 10) {
    return `977${digits}`;
  }
  return digits;
}

export function buildWhatsAppReminderMessage(
  customerName: string,
  storeName: string,
  amount: number,
  customTemplate?: string
): string {
  if (customTemplate && customTemplate.trim().length > 0) {
    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return customTemplate
      .replace(/{customer_name}|{name}/gi, customerName)
      .replace(/{store_name}|{store}/gi, storeName)
      .replace(/{amount}|{balance}/gi, amount.toLocaleString())
      .replace(/{date}|{due_date}/gi, today);
  }

  return (
    `Namaste ${customerName},\n\n` +
    `This is a gentle payment reminder from *${storeName}*.\n` +
    `Your current pending ledger balance is *Rs. ${amount.toFixed(2)}*.\n\n` +
    `Kindly settle the amount at your earliest convenience via Fonepay / digital QR or visit our counter.\n\n` +
    `Thank you for your valued business!`
  );
}

export async function sendWhatsAppReminder(
  phone: string,
  customerName: string,
  storeName: string,
  amount: number,
  customTemplate?: string
): Promise<boolean> {
  const normalized = normalizeNepalPhone(phone);
  const text = buildWhatsAppReminderMessage(customerName, storeName, amount, customTemplate);
  const encoded = encodeURIComponent(text);

  analytics.logReminderSent(customerName, amount, 'whatsapp');

  const nativeUrl = `whatsapp://send?phone=${normalized}&text=${encoded}`;
  const webUrl = `https://wa.me/${normalized}?text=${encoded}`;

  try {
    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return true;
    } else {
      await Linking.openURL(webUrl);
      return true;
    }
  } catch {
    await Linking.openURL(webUrl);
    return true;
  }
}
