export interface InvoiceData {
  slug: string;
  business_name: string;
  business_phone?: string;
  business_pan?: string;
  business_address?: string;
  customer_name?: string;
  customer_phone?: string;
  bill_number?: string;
  items: Array<{ name: string; qty: number; rate: number; total: number; unit?: string }>;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  grand_total: number;
  currency: string;
  payment_mode: string;
  payment_status: string;
  created_at: number;
  qr_payload?: string;
}

export function renderInvoiceHtml(inv: InvoiceData, appOrigin: string): string {
  const dateStr = new Date(inv.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const isPaid = inv.payment_status?.toLowerCase() === 'paid';
  const statusColor = isPaid ? '#10B981' : '#F59E0B';
  const statusBg = isPaid ? '#ECFDF5' : '#FFFBEB';
  const statusLabel = isPaid ? 'PAID / चुक्ता' : 'DUE / बाँकी';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bill #${escapeHtml(inv.bill_number || inv.slug)} - ${escapeHtml(inv.business_name)}</title>
  <meta name="theme-color" content="#292524">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #F8F9FA;
      color: #1F2937;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px 12px 32px;
      -webkit-font-smoothing: antialiased;
    }
    .bill-card {
      width: 100%;
      max-width: 440px;
      background: #FFFFFF;
      border-radius: 20px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #E5E7EB;
      overflow: hidden;
      margin-bottom: 20px;
    }
    .header {
      padding: 24px 20px 18px;
      text-align: center;
      background: linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%);
      border-bottom: 1px dashed #E5E7EB;
      position: relative;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusColor}33;
    }
    .store-name {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      margin-bottom: 4px;
      letter-spacing: -0.3px;
    }
    .store-sub {
      font-size: 12px;
      color: #6B7280;
      line-height: 1.4;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 16px 20px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
      font-size: 12px;
    }
    .meta-item span { color: #6B7280; display: block; font-size: 11px; margin-bottom: 2px; }
    .meta-item strong { color: #111827; font-weight: 600; }
    .items-container {
      padding: 16px 20px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8px 0;
      border-bottom: 1px solid #F3F4F6;
      font-size: 13px;
    }
    .item-row:last-child { border-bottom: none; }
    .item-desc { max-width: 65%; }
    .item-name { font-weight: 600; color: #1F2937; }
    .item-calc { font-size: 11px; color: #6B7280; margin-top: 1px; }
    .item-total { font-weight: 700; color: #111827; }
    .totals-box {
      background: #FAFAFA;
      padding: 16px 20px;
      border-top: 1px dashed #E5E7EB;
      font-size: 13px;
    }
    .tot-row { display: flex; justify-content: space-between; margin-bottom: 6px; color: #6B7280; }
    .grand-tot {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #E5E7EB;
      font-size: 18px;
      font-weight: 800;
      color: #111827;
    }
    .action-btn {
      display: block;
      width: 100%;
      text-align: center;
      padding: 14px;
      background: #25D366;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 14px;
      border-radius: 12px;
      text-decoration: none;
      margin-top: 16px;
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25);
    }
    .secondary-btn {
      display: block;
      width: 100%;
      text-align: center;
      padding: 12px;
      background: #111827;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 13px;
      border-radius: 12px;
      text-decoration: none;
      margin-top: 10px;
    }
    .branding {
      text-align: center;
      font-size: 12px;
      color: #9CA3AF;
    }
    .branding a { color: #4B5563; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="bill-card">
    <div class="header">
      <div class="badge">${statusLabel}</div>
      <h1 class="store-name">${escapeHtml(inv.business_name)}</h1>
      <div class="store-sub">
        ${inv.business_address ? `<div>${escapeHtml(inv.business_address)}</div>` : ''}
        ${inv.business_phone ? `<div>Phone: ${escapeHtml(inv.business_phone)}</div>` : ''}
        ${inv.business_pan ? `<div>PAN/VAT: ${escapeHtml(inv.business_pan)}</div>` : ''}
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span>INVOICE NO.</span>
        <strong>#${escapeHtml(inv.bill_number || inv.slug)}</strong>
      </div>
      <div class="meta-item">
        <span>DATE</span>
        <strong>${dateStr}</strong>
      </div>
      ${inv.customer_name ? `
      <div class="meta-item">
        <span>BILLED TO</span>
        <strong>${escapeHtml(inv.customer_name)}</strong>
      </div>` : ''}
      <div class="meta-item">
        <span>PAYMENT MODE</span>
        <strong>${escapeHtml(inv.payment_mode.toUpperCase())}</strong>
      </div>
    </div>

    <div class="items-container">
      ${inv.items.map(item => `
        <div class="item-row">
          <div class="item-desc">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-calc">${item.qty} ${item.unit || ''} × ${inv.currency} ${item.rate.toFixed(2)}</div>
          </div>
          <div class="item-total">${inv.currency} ${item.total.toFixed(2)}</div>
        </div>
      `).join('')}
    </div>

    <div class="totals-box">
      <div class="tot-row">
        <span>Subtotal</span>
        <span>${inv.currency} ${inv.subtotal.toFixed(2)}</span>
      </div>
      ${inv.discount_amount > 0 ? `
      <div class="tot-row" style="color: #10B981;">
        <span>Discount</span>
        <span>- ${inv.currency} ${inv.discount_amount.toFixed(2)}</span>
      </div>` : ''}
      ${inv.tax_amount > 0 ? `
      <div class="tot-row">
        <span>VAT (13%)</span>
        <span>+ ${inv.currency} ${inv.tax_amount.toFixed(2)}</span>
      </div>` : ''}
      <div class="grand-tot">
        <span>Total Payable</span>
        <span>${inv.currency} ${inv.grand_total.toFixed(2)}</span>
      </div>

      ${!isPaid && inv.business_phone ? `
        <a href="https://wa.me/977${inv.business_phone.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(inv.business_name)},%20I%20am%20inquiring%20about%20bill%20%23${encodeURIComponent(inv.bill_number || inv.slug)}" class="action-btn">
          💬 Confirm / Pay via WhatsApp
        </a>
      ` : ''}

      <a href="${appOrigin}" class="secondary-btn">
        Create Your Free Digital Store on Byapar →
      </a>
    </div>
  </div>

  <div class="branding">
    Powered by <a href="${appOrigin}">Byapar Platform</a> • Nepal's Smart Kirana Operating System
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
