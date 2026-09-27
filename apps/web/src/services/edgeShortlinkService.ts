import { Invoice } from '@byapar/core';
import { currentBusiness } from '../db/localDb';

export interface ShortlinkResponse {
  success: boolean;
  short_url?: string;
  slug?: string;
  error?: string;
}

const EDGE_WORKER_URL =
  import.meta.env.VITE_EDGE_SHORTLINK_URL || 'https://pay.byapar.com';

/**
 * Creates an edge-cached digital receipt shortlink via Cloudflare Worker + D1
 */
export async function createEdgeInvoiceShortlink(invoice: Invoice): Promise<ShortlinkResponse> {
  try {
    const payload = {
      business_id: currentBusiness.id,
      business_name: currentBusiness.name || 'My Store',
      business_phone: currentBusiness.phone,
      business_pan: currentBusiness.pan,
      business_address: currentBusiness.address,
      customer_name: (invoice as any).customerName || invoice.partyName || 'Customer',
      customer_phone: (invoice as any).customerPhone || invoice.partyPhone || '',
      invoice_id: invoice.id,
      bill_number: invoice.invoiceNumber,
      items: (invoice.items || []).map((i) => ({
        name: i.itemName,
        qty: i.quantity,
        rate: i.unitPrice,
        total: i.totalAmount,
        unit: (i as any).unit || '',
      })),
      subtotal: invoice.subtotal || invoice.totalAmount,
      tax_amount: invoice.taxAmount || 0,
      discount_amount: invoice.discountAmount || 0,
      grand_total: invoice.totalAmount,
      currency: 'Rs.',
      payment_mode: invoice.paymentMode || 'cash',
      payment_status: invoice.dueAmount > 0 ? 'due' : 'paid',
    };

    // Timeout after 2.5 seconds to guarantee fast WhatsApp dispatch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${EDGE_WORKER_URL}/api/shorten`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    const data = await res.json() as any;
    return {
      success: true,
      short_url: data.short_url,
      slug: data.slug,
    };
  } catch (err: any) {
    // If worker is offline or not yet deployed, fallback gracefully
    console.warn('[EdgeShortlinks] Shortlink creation bypassed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Builds standard WhatsApp message with optional Cloudflare edge digital receipt link
 */
export async function buildWhatsAppInvoiceMessage(invoice: Invoice): Promise<string> {
  let link = '';
  try {
    const shortlink = await createEdgeInvoiceShortlink(invoice);
    if (shortlink.success && shortlink.short_url) {
      link = `\n📄 *Digital Bill Link:* ${shortlink.short_url}`;
    }
  } catch (_) {}

  return (
    `*${currentBusiness.name || 'Store Receipt'}*\n` +
    `Invoice #: ${invoice.invoiceNumber}\n` +
    `Date: ${invoice.invoiceDateAd || new Date().toISOString().split('T')[0]}\n` +
    `Total Amount: Rs. ${invoice.totalAmount}\n` +
    `Payment: ${invoice.paymentMode.toUpperCase()}\n` +
    (invoice.dueAmount > 0 ? `*Balance Due: Rs. ${invoice.dueAmount}*\n` : '') +
    link +
    `\nThank you for shopping with us!`
  );
}
