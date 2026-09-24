/**
 * BYAPAR (व्यापार) - Fonepay EMVCo Dynamic QR Engine
 * Follows EMVCo Merchant-Presented Mode Specifications used by Fonepay in Nepal.
 */

export function computeCrc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    crc ^= c << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function parseEmvcoQr(payload: string): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!payload || typeof payload !== 'string') return tags;

  let index = 0;
  while (index < payload.length - 4) {
    const tag = payload.substring(index, index + 2);
    const lenStr = payload.substring(index + 2, index + 4);
    const len = parseInt(lenStr, 10);
    if (isNaN(len) || len < 0) break;

    const value = payload.substring(index + 4, index + 4 + len);
    tags[tag] = value;
    index += 4 + len;
  }
  return tags;
}

export interface DynamicFonepayQrOptions {
  baseQrPayload?: string;
  merchantId?: string;
  merchantName?: string;
  amount: number;
  invoiceNumber?: string;
  city?: string;
  pan?: string;
}

export function buildDynamicFonepayPayload(options: DynamicFonepayQrOptions): string {
  const {
    baseQrPayload,
    merchantId,
    merchantName = 'Byapar Kirana',
    amount,
    invoiceNumber,
    city = 'Kathmandu',
    pan,
  } = options;

  const formattedAmount = Math.max(0, amount).toFixed(2);

  // If merchant uploaded an existing static Fonepay QR string, adapt it dynamically
  if (baseQrPayload && baseQrPayload.startsWith('000201')) {
    try {
      const parsed = parseEmvcoQr(baseQrPayload);

      // Force dynamic point of initiation
      parsed['01'] = '12';

      // Ensure NPR currency
      parsed['53'] = '524';

      // Inject exact amount
      parsed['54'] = formattedAmount;

      // Ensure country code
      if (!parsed['58']) parsed['58'] = 'NP';

      // Inject invoice number in additional data tag 62
      if (invoiceNumber) {
        const subtag = formatTlv('01', invoiceNumber);
        parsed['62'] = subtag;
      }

      // Reconstruct payload in order excluding Tag 63 (CRC)
      let reconstructed = '';
      const standardOrder = [
        '00', '01', '02', '03', '04', '05', '26', '27', '28', '29', '30',
        '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62',
      ];

      for (const t of standardOrder) {
        if (parsed[t]) {
          reconstructed += formatTlv(t, parsed[t]);
        }
      }

      // Any remaining tags not in standard order (excluding 63)
      for (const [k, v] of Object.entries(parsed)) {
        if (!standardOrder.includes(k) && k !== '63') {
          reconstructed += formatTlv(k, v);
        }
      }

      // Calculate new CRC-16
      const payloadForCrc = `${reconstructed}6304`;
      const crc = computeCrc16Ccitt(payloadForCrc);
      return `${payloadForCrc}${crc}`;
    } catch (e) {
      console.warn('Failed to parse uploaded QR payload, falling back to standard generator:', e);
    }
  }

  // Standard Fonepay EMVCo construction
  let payload = '';
  payload += formatTlv('00', '01'); // Format Indicator
  payload += formatTlv('01', '12'); // Point of Initiation: Dynamic

  // Tag 26: Fonepay Merchant Account Information
  const mId = merchantId || pan || '9800000000';
  const tag26Value = formatTlv('00', 'NP.FONEPAY') + formatTlv('01', mId);
  payload += formatTlv('26', tag26Value);

  payload += formatTlv('52', '5411'); // Merchant Category: Grocery / Retail
  payload += formatTlv('53', '524');  // Currency: NPR
  payload += formatTlv('54', formattedAmount); // Exact Transaction Amount
  payload += formatTlv('58', 'NP');   // Country: Nepal
  payload += formatTlv('59', merchantName.slice(0, 25)); // Merchant Name
  payload += formatTlv('60', city.slice(0, 15));         // Merchant City

  // Tag 62: Additional Data Field (Invoice / Reference)
  if (invoiceNumber) {
    const sub62 = formatTlv('01', invoiceNumber.slice(0, 25));
    payload += formatTlv('62', sub62);
  }

  // Tag 63: CRC16 Checksum
  const payloadWithTag63Header = `${payload}6304`;
  const crc = computeCrc16Ccitt(payloadWithTag63Header);
  return `${payloadWithTag63Header}${crc}`;
}
