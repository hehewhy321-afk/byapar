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

export async function createMobileEdgeShortlink(params: {
  business_name: string;
  business_phone?: string;
  business_pan?: string;
  business_address?: string;
  customer_name?: string;
  customer_phone?: string;
  invoice_id?: string;
  bill_number?: string;
  items: Array<{ name: string; qty: number; rate: number; total: number; unit?: string }>;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  grand_total: number;
  currency?: string;
  payment_mode?: string;
  payment_status?: string;
}): Promise<{ success: boolean; short_url?: string; slug?: string }> {
  try {
    const workerUrl =
      process.env.EXPO_PUBLIC_EDGE_SHORTLINK_URL ||
      'https://byapar-edge-shortlinks.hehewhy-321.workers.dev';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${workerUrl}/api/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { success: false };
    }

    const data = await res.json() as any;
    return {
      success: true,
      short_url: data.short_url,
      slug: data.slug,
    };
  } catch (err) {
    console.warn('[WhatsAppService] Edge shortlink generation bypassed:', err);
    return { success: false };
  }
}

export async function buildMobileWhatsAppInvoiceMessage(
  invoice: {
    invoiceNumber: string;
    date: string;
    total: number;
    paymentMode: string;
    partyName?: string;
    items?: Array<{ name: string; qty: number; price: number }>;
  },
  store: {
    name: string;
    phone?: string;
    panNumber?: string;
    address?: string;
  },
  customerPhone?: string
): Promise<string> {
  let link = '';
  try {
    const shortlink = await createMobileEdgeShortlink({
      business_name: store.name,
      business_phone: store.phone,
      business_pan: store.panNumber,
      business_address: store.address,
      customer_name: invoice.partyName || 'Customer',
      customer_phone: customerPhone || '',
      bill_number: invoice.invoiceNumber,
      items: (invoice.items || []).map((i) => ({
        name: i.name,
        qty: i.qty,
        rate: i.price,
        total: i.qty * i.price,
      })),
      subtotal: invoice.total,
      grand_total: invoice.total,
      currency: 'Rs.',
      payment_mode: invoice.paymentMode,
      payment_status: 'paid',
    });

    if (shortlink.success && shortlink.short_url) {
      link = `\n📄 *Digital Bill Link:* ${shortlink.short_url}`;
    }
  } catch (_) {}

  // Format line items
  const itemsList = (invoice.items || [])
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.name}*\n   Qty: ${item.qty} × Rs. ${item.price.toLocaleString()} = Rs. ${(item.qty * item.price).toLocaleString()}`
    )
    .join('\n');

  const itemsSection = itemsList ? `\n*Items Ordered:*\n${itemsList}\n` : '';

  return (
    `*${store.name || 'Store Receipt'}*\n` +
    `Invoice #: ${invoice.invoiceNumber}\n` +
    `Date: ${invoice.date}\n` +
    (invoice.partyName ? `Customer: ${invoice.partyName}\n` : '') +
    `--------------------------------\n` +
    itemsSection +
    `--------------------------------\n` +
    `*Total Amount: Rs. ${invoice.total.toLocaleString()}*\n` +
    `Payment Mode: ${(invoice.paymentMode || 'CASH').toUpperCase()}\n` +
    link +
    `\n\nThank you for shopping with us!`
  );
}

export async function sendWhatsAppInvoice(
  invoice: {
    invoiceNumber: string;
    date: string;
    total: number;
    paymentMode: string;
    partyName?: string;
    items?: Array<{ name: string; qty: number; price: number }>;
  },
  store: {
    name: string;
    phone?: string;
    panNumber?: string;
    address?: string;
  },
  customerPhone?: string
): Promise<boolean> {
  const text = await buildMobileWhatsAppInvoiceMessage(invoice, store, customerPhone);
  const encoded = encodeURIComponent(text);

  let nativeUrl = `whatsapp://send?text=${encoded}`;
  let webUrl = `https://wa.me/?text=${encoded}`;

  if (customerPhone && customerPhone.trim().length > 0) {
    const normalized = normalizeNepalPhone(customerPhone.trim());
    nativeUrl = `whatsapp://send?phone=${normalized}&text=${encoded}`;
    webUrl = `https://wa.me/${normalized}?text=${encoded}`;
  }

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

