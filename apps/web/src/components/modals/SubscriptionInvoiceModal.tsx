import { Component, Show } from 'solid-js';
import { SubscriptionHistoryItem } from '../../services/subscriptionService';
import { currentBusiness } from '../../db/localDb';
import { IconCheck, IconX, IconCrown } from '../icons';

export const SubscriptionInvoiceModal: Component<{
  transaction: SubscriptionHistoryItem | null;
  onClose: () => void;
}> = (props) => {
  const t = () => props.transaction;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Show when={t()}>
      <div
        class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in print:p-0 print:bg-white print:static"
        onClick={props.onClose}
      >
        <div
          class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-4 text-neutral-800 dark:text-neutral-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action Header - Hidden on Print */}
          <div class="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 mb-6 print:hidden">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF4500] flex items-center justify-center font-bold">
                <IconCrown size={18} />
              </div>
              <div>
                <h3 class="font-bold text-sm text-neutral-900 dark:text-white font-heading">
                  Subscription Tax Invoice
                </h3>
                <p class="text-[11px] text-neutral-400">
                  Official digital receipt for tax & audit compliance
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                class="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 shadow-sm"
              >
                <span>🖨️ Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={props.onClose}
                class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <IconX size={18} />
              </button>
            </div>
          </div>

          {/* Printable Invoice Container */}
          <div class="space-y-6 print:space-y-4">
            {/* Header Section */}
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xl font-black tracking-tight text-[#FF4500] font-heading">
                    BYAPAR CLOUD
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    TAX INVOICE
                  </span>
                </div>
                <p class="text-xs text-neutral-500">Byapar Technologies Nepal Pvt. Ltd.</p>
                <p class="text-xs text-neutral-500">Kathmandu, Nepal • PAN/VAT: 609823412</p>
                <p class="text-xs text-neutral-500">Support: support@byapar.app | +977-1-5912345</p>
              </div>

              <div class="text-left sm:text-right font-mono text-xs space-y-1">
                <div class="text-neutral-400 text-[11px]">INVOICE NO:</div>
                <div class="font-bold text-neutral-900 dark:text-white text-sm">
                  INV-BYAPAR-{t()?.id.slice(0, 8).toUpperCase()}
                </div>
                <div class="text-neutral-400 text-[11px] mt-1">DATE OF ISSUE:</div>
                <div class="text-neutral-700 dark:text-neutral-300">
                  {new Date(t()?.createdAt || Date.now()).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>
            </div>

            {/* Billed To / Merchant Info */}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <span class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  Billed To (Merchant)
                </span>
                <div class="font-bold text-neutral-900 dark:text-white text-sm mt-0.5">
                  {currentBusiness.name || t()?.businessName}
                </div>
                <div class="text-neutral-500 mt-0.5">
                  Owner: {currentBusiness.ownerName || 'Verified Merchant'}
                </div>
                <div class="text-neutral-500">
                  PAN / VAT: {currentBusiness.pan || 'Unregistered Dukan'}
                </div>
                <div class="text-neutral-500">
                  Address: {currentBusiness.address || 'Nepal'}
                </div>
              </div>

              <div class="sm:text-right">
                <span class="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  Payment Verification
                </span>
                <div class="mt-1 flex items-center gap-1.5 sm:justify-end">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs">
                    {t()?.status === 'completed' ? 'PAID IN FULL' : t()?.status}
                  </span>
                </div>
                <div class="text-neutral-500 font-mono mt-1">
                  Gateway: {t()?.gateway === 'esewa' ? 'eSewa ePay (v2)' : t()?.gateway}
                </div>
                <div class="text-neutral-500 font-mono text-[11px] truncate max-w-xs sm:ml-auto">
                  Ref #: {t()?.transactionCode || t()?.transactionUuid}
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 uppercase text-[10px] tracking-wider">
                    <th class="py-2.5 px-3">Description</th>
                    <th class="py-2.5 px-3 text-center">Cycle</th>
                    <th class="py-2.5 px-3 text-right">Base Price</th>
                    <th class="py-2.5 px-3 text-right">Discount</th>
                    <th class="py-2.5 px-3 text-right">Net Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium">
                  <tr>
                    <td class="py-3 px-3">
                      <div class="font-bold text-neutral-900 dark:text-white">
                        Byapar Cloud SaaS - {t()?.planName}
                      </div>
                      <div class="text-[11px] text-neutral-400">
                        Includes POS billing, Khata ledger, IRD sync, and WhatsApp tools
                      </div>
                    </td>
                    <td class="py-3 px-3 text-center uppercase font-mono text-[11px]">
                      {t()?.billingCycle}
                    </td>
                    <td class="py-3 px-3 text-right font-mono">
                      रु {((t()?.amount || 0) + (t()?.discountAmount || 0)).toLocaleString()}
                    </td>
                    <td class="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {t()?.discountAmount && t()!.discountAmount! > 0
                        ? `-रु ${t()!.discountAmount!.toLocaleString()}`
                        : '—'}
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white">
                      रु {t()?.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div class="flex justify-end pt-3">
              <div class="w-full sm:w-64 space-y-1.5 text-xs">
                <div class="flex justify-between text-neutral-500">
                  <span>Subtotal:</span>
                  <span class="font-mono">
                    रु {((t()?.amount || 0) + (t()?.discountAmount || 0)).toLocaleString()}
                  </span>
                </div>
                <Show when={t()?.discountAmount && t()!.discountAmount! > 0}>
                  <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount ({t()?.promoCode || 'Promo'}):</span>
                    <span class="font-mono">-रु {t()?.discountAmount?.toLocaleString()}</span>
                  </div>
                </Show>
                <div class="flex justify-between text-neutral-500">
                  <span>VAT / Tax (0% Exempt Software):</span>
                  <span class="font-mono">रु 0.00</span>
                </div>
                <div class="border-t border-neutral-200 dark:border-neutral-800 pt-2 flex justify-between font-extrabold text-sm text-[#FF4500]">
                  <span>Total Paid:</span>
                  <span class="font-heading">रु {t()?.amount.toLocaleString()} NPR</span>
                </div>
              </div>
            </div>

            {/* Verification Footer & Digital Signature */}
            <div class="pt-6 border-t border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[11px] text-neutral-400">
              <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <IconCheck size={12} />
                </div>
                <span>
                  Electronically verified by eSewa Nepal Payment Network.
                </span>
              </div>
              <div class="font-mono text-[10px]">
                Auth Token: {t()?.transactionUuid}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
