import { Component } from 'solid-js';
import { Invoice } from '@byapar/core';
import { formatNepaliCurrency, toNepaliDigits } from '@byapar/core';
import { currentBusiness, settings } from '../db/localDb';
import { IconPrinter, IconWhatsApp, IconX } from './icons';

import { buildWhatsAppInvoiceMessage } from '../services/edgeShortlinkService';

interface ReceiptModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export const ReceiptModal: Component<ReceiptModalProps> = (props) => {
  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = async () => {
    const rawText = await buildWhatsAppInvoiceMessage(props.invoice);
    const text = encodeURIComponent(rawText);
    const rawPhone = props.invoice.partyPhone || (props.invoice as any).customerPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let waUrl = `https://wa.me/?text=${text}`;
    if (cleanPhone.length >= 10) {
      const phoneParam = cleanPhone.startsWith('977') ? cleanPhone : `977${cleanPhone.slice(-10)}`;
      waUrl = `https://wa.me/${phoneParam}?text=${text}`;
    }
    window.open(waUrl, '_blank');
  };

  const uniqueItems = () => {
    const raw = props.invoice.items || [];
    const seen = new Set<string>();
    const res: typeof raw = [];
    for (const item of raw) {
      const key = `${item.itemId || ''}_${item.itemName}_${item.unitPrice}_${item.quantity}`;
      if (!seen.has(key)) {
        seen.add(key);
        res.push(item);
      }
    }
    return res.length > 0 ? res : raw;
  };

  return (
    <div class="modal-overlay">
      <div class="printable-receipt relative w-full max-w-sm bg-white text-gray-900 rounded-2xl shadow-2xl p-5 font-receipt text-xs max-h-[90vh] overflow-y-auto">
        {/* Controls Header (Hidden during print) */}
        <div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 no-print font-sans">
          <span class="font-bold text-slate-700 text-sm">Thermal Receipt Preview</span>
          <div class="flex items-center gap-2">
            <button
              onClick={handlePrint}
              class="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold flex items-center gap-1.5 text-xs shadow-xs"
            >
              <IconPrinter size={13} />
              <span>Print</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-1.5 text-xs shadow-xs"
            >
              <IconWhatsApp size={13} />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={props.onClose}
              class="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>


        {/* Thermal Receipt Content */}
        <div class="text-center mb-3">
          <h2 class="font-black text-sm tracking-tight">{currentBusiness.name}</h2>
          <p class="text-[10px] text-slate-600">{currentBusiness.address}</p>
          <p class="text-[10px] text-slate-600">Phone: {currentBusiness.phone}</p>
          <p class="font-bold text-[11px] mt-1">PAN / VAT: {currentBusiness.pan}</p>
          <div class="border-b border-dashed border-slate-400 my-2"></div>
          <p class="font-bold uppercase tracking-wider text-[11px]">
            {currentBusiness.isVatRegistered ? 'TAX INVOICE' : 'SALES INVOICE'}
          </p>
        </div>

        {/* Invoice Metadata */}
        <div class="mb-2 text-[10px] space-y-0.5">
          <div class="flex justify-between">
            <span>Invoice #:</span>
            <span class="font-bold">{props.invoice.invoiceNumber}</span>
          </div>
          <div class="flex justify-between">
            <span>Fiscal Year:</span>
            <span>{props.invoice.fiscalYear}</span>
          </div>
          <div class="flex justify-between">
            <span>Date (AD):</span>
            <span>{props.invoice.invoiceDateAd}</span>
          </div>
          <div class="flex justify-between">
            <span>Date (BS):</span>
            <span>{props.invoice.invoiceDateBs}</span>
          </div>
          {props.invoice.partyName && (
            <div class="flex justify-between font-semibold mt-1 pt-1 border-t border-dotted border-slate-300">
              <span>Customer:</span>
              <span>{props.invoice.partyName}</span>
            </div>
          )}
        </div>

        <div class="border-b border-dashed border-slate-400 my-2"></div>

        {/* Items Table */}
        <div class="mb-2">
          <div class="grid grid-cols-12 font-bold pb-1 border-b border-slate-300 text-[10px]">
            <span class="col-span-6">Item Description</span>
            <span class="col-span-2 text-right">Qty</span>
            <span class="col-span-2 text-right">Rate</span>
            <span class="col-span-2 text-right">Total</span>
          </div>

          <div class="divide-y divide-dotted divide-slate-200 text-[10px] my-1">
            {uniqueItems().map((item) => (
              <div class="grid grid-cols-12 py-1">
                <span class="col-span-6 leading-tight">{item.itemName}</span>
                <span class="col-span-2 text-right">{item.quantity}</span>
                <span class="col-span-2 text-right">{item.unitPrice}</span>
                <span class="col-span-2 text-right font-bold">{item.totalAmount}</span>
              </div>
            ))}
          </div>
        </div>

        <div class="border-b border-dashed border-slate-400 my-2"></div>

        {/* Totals */}
        <div class="space-y-1 text-[11px] mb-3">
          <div class="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatNepaliCurrency(props.invoice.subtotal, false)}</span>
          </div>
          {props.invoice.discountAmount > 0 && (
            <div class="flex justify-between text-slate-600">
              <span>Discount:</span>
              <span>-{formatNepaliCurrency(props.invoice.discountAmount, false)}</span>
            </div>
          )}
          {props.invoice.taxAmount > 0 && (
            <div class="flex justify-between text-slate-600">
              <span>13% VAT:</span>
              <span>{formatNepaliCurrency(props.invoice.taxAmount, false)}</span>
            </div>
          )}
          <div class="flex justify-between font-black text-xs pt-1 border-t border-slate-800">
            <span>Total:</span>
            <span>{formatNepaliCurrency(props.invoice.totalAmount)}</span>
          </div>
          <div class="flex justify-between text-[10px] pt-1">
            <span>Payment Mode:</span>
            <span class="font-bold uppercase">{props.invoice.paymentMode}</span>
          </div>
          {props.invoice.dueAmount > 0 && (
            <div class="flex justify-between text-[10px] text-red-600 font-bold">
              <span>Balance Due:</span>
              <span>{formatNepaliCurrency(props.invoice.dueAmount)}</span>
            </div>
          )}
        </div>

        <div class="border-b border-dashed border-slate-400 my-2"></div>

        {/* Footer */}
        <div class="text-center text-[9px] text-slate-600 space-y-0.5">
          <p>Original receipt required for returns & exchanges.</p>
          <p class="font-semibold">Thank you for shopping with us!</p>
          <p class="text-[8px] text-slate-400 mt-2 font-mono">Byapar Smart POS • byapar.app</p>
        </div>
      </div>
    </div>
  );
};
