import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { invoices, khataEntries, currentBusiness, settings } from '../db/localDb';
import { formatNepaliCurrency, Invoice } from '@byapar/core';
import { ReceiptModal } from './ReceiptModal';
import { IconPrinter } from './icons';

export const ReportsView: Component = () => {
  const [selectedInvoice, setSelectedInvoice] = createSignal<Invoice | null>(null);

  const totalSalesRevenue = createMemo(() => invoices.reduce((acc, inv) => acc + inv.totalAmount, 0));
  const totalPaidRevenue = createMemo(() => invoices.reduce((acc, inv) => acc + inv.paidAmount, 0));
  const totalCreditIssued = createMemo(() => invoices.reduce((acc, inv) => acc + inv.dueAmount, 0));
  const fonepayRevenue = createMemo(() =>
    invoices.filter((inv) => inv.paymentMode === 'fonepay_qr').reduce((acc, inv) => acc + inv.paidAmount, 0)
  );

  return (
    <div class="p-4 space-y-5 animate-fade-in">
      {/* Revenue Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="stat-card">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">Total Revenue (GTV)</span>
          <span class="text-2xl font-black text-gray-900 dark:text-white mt-1 block">{formatNepaliCurrency(totalSalesRevenue())}</span>
          <span class="text-[11px] text-gray-400 dark:text-neutral-500">{invoices.length} invoices issued</span>
        </div>
        <div class="stat-card">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">Cash Inflow</span>
          <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{formatNepaliCurrency(totalPaidRevenue())}</span>
          <span class="text-[11px] text-emerald-500">Realized cash received</span>
        </div>
        <div class="stat-card">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">Fonepay Digital QR</span>
          <span class="text-2xl font-black text-red-500 dark:text-red-400 mt-1 block">{formatNepaliCurrency(fonepayRevenue())}</span>
          <span class="text-[11px] text-gray-400 dark:text-neutral-500">Via dynamic QR banking</span>
        </div>
        <div class="stat-card">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold block uppercase">Credit Sales</span>
          <span class="text-2xl font-black text-amber-500 mt-1 block">{formatNepaliCurrency(totalCreditIssued())}</span>
          <span class="text-[11px] text-amber-400/80">Outstanding receivables</span>
        </div>
      </div>

      {/* CBMS Banner */}
      <div class="stat-card bg-gradient-to-r from-brand-50 to-white dark:from-neutral-900 dark:to-black border-brand-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4 !p-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 class="font-bold text-gray-900 dark:text-white text-sm">Nepal IRD Real-time CBMS Module</h3>
            <span class="text-[10px] bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 px-2 py-0.5 rounded-full font-bold">Schedule-13</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            All issued tax invoices are encrypted and preserved with real-time sync to Nepal IRD CBMS cloud.
          </p>
        </div>
        <div class="flex items-center gap-2 font-mono text-xs text-gray-600 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800">
          <span>PAN / VAT:</span>
          <span class="font-bold text-brand-600 dark:text-brand-400">{currentBusiness.pan}</span>
        </div>
      </div>

      {/* Invoices Table */}
      <div class="stat-card overflow-hidden !p-0">
        <div class="p-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
          <h3 class="font-bold text-sm text-gray-900 dark:text-white">Sales Invoices Register</h3>
          <span class="text-xs text-gray-400 dark:text-neutral-500 font-medium">Total: {invoices.length}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-50 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 uppercase font-semibold text-[10px] border-b border-gray-100 dark:border-neutral-800">
              <tr>
                <th class="p-3">Invoice #</th>
                <th class="p-3">Date</th>
                <th class="p-3">Customer</th>
                <th class="p-3">Payment</th>
                <th class="p-3 text-right">Total</th>
                <th class="p-3 text-right">Credit Due</th>
                <th class="p-3 text-center">CBMS</th>
                <th class="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-neutral-800/60 text-gray-600 dark:text-neutral-300">
              <For each={invoices}>
                {(inv) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition">
                    <td class="p-3 font-mono font-bold text-gray-900 dark:text-white">{inv.invoiceNumber}</td>
                    <td class="p-3 font-mono text-gray-400 dark:text-neutral-400">
                      {settings.calendar === 'BS' ? inv.invoiceDateBs : inv.invoiceDateAd}
                    </td>
                    <td class="p-3 font-medium text-gray-700 dark:text-neutral-200">{inv.partyName || 'Counter Customer'}</td>
                    <td class="p-3">
                      <span class="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td class="p-3 text-right font-black text-brand-600 dark:text-brand-400">{formatNepaliCurrency(inv.totalAmount)}</td>
                    <td class="p-3 text-right">
                      {inv.dueAmount > 0 ? (
                        <span class="font-bold text-red-500 dark:text-red-400">{formatNepaliCurrency(inv.dueAmount)}</span>
                      ) : (
                        <span class="text-gray-300 dark:text-neutral-600 font-mono">-</span>
                      )}
                    </td>
                    <td class="p-3 text-center">
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                        {inv.cbmsStatus}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        class="btn-outline text-[10px] py-1 px-2.5 flex items-center gap-1 mx-auto"
                      >
                        <IconPrinter class="w-3 h-3" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                )}
              </For>

              {invoices.length === 0 && (
                <tr>
                  <td colspan={8} class="p-8 text-center text-gray-400 dark:text-neutral-500 text-xs">
                    No invoices recorded yet. Start billing items from POS.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <Show when={selectedInvoice()}>
        {(inv) => (
          <ReceiptModal
            invoice={inv()}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </Show>
    </div>
  );
};
