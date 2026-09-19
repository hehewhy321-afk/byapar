import { createSignal, createMemo, For, Show } from 'solid-js';
import {
  invoices,
  quotations,
  salesReturns,
  paymentRecords,
  parties,
  items,
  accounts,
  createQuotation,
  createSalesReturn,
  createPaymentIn,
  setActiveTab,
  PaymentMode,
  Quotation,
  SalesReturn,
} from '../../db/localDb';
import {
  IconSales,
  IconSearch,
  IconPlus,
  IconReceipt,
  IconCustomer,
  IconCheck,
  IconTrash,
  IconEye,
  IconFilter,
  IconPrint,
} from '../icons';

export function SalesView() {
  const [activeSubTab, setActiveSubTab] = createSignal<'invoices' | 'payment_in' | 'quotations' | 'returns'>('invoices');
  const [searchTerm, setSearchTerm] = createSignal('');

  // Modals
  const [showPaymentInModal, setShowPaymentInModal] = createSignal(false);
  const [showQuotationModal, setShowQuotationModal] = createSignal(false);
  const [showReturnModal, setShowReturnModal] = createSignal(false);
  const [selectedInvoice, setSelectedInvoice] = createSignal<any | null>(null);

  // Payment In Form State
  const [payPartyId, setPayPartyId] = createSignal('');
  const [payAmount, setPayAmount] = createSignal<number>(0);
  const [payMode, setPayMode] = createSignal<PaymentMode>('cash');
  const [payAccountId, setPayAccountId] = createSignal(accounts[0]?.id || '');
  const [payNotes, setPayNotes] = createSignal('');
  const [payDate, setPayDate] = createSignal(new Date().toISOString().split('T')[0]);

  // Quotation Form State
  const [quotePartyName, setQuotePartyName] = createSignal('');
  const [quotePartyPhone, setQuotePartyPhone] = createSignal('');
  const [quotePartyId, setQuotePartyId] = createSignal('');
  const [quoteValidUntil, setQuoteValidUntil] = createSignal('');
  const [quoteNotes, setQuoteNotes] = createSignal('');
  const [quoteItems, setQuoteItems] = createSignal<{
    id: string;
    itemId?: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }[]>([
    { id: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0, totalAmount: 0 },
  ]);

  // Sales Return Form State
  const [returnPartyName, setReturnPartyName] = createSignal('');
  const [returnPartyId, setReturnPartyId] = createSignal('');
  const [returnReason, setReturnReason] = createSignal('');
  const [returnRefund, setReturnRefund] = createSignal(0);
  const [returnCredit, setReturnCredit] = createSignal(0);
  const [returnItems, setReturnItems] = createSignal<{
    id: string;
    itemId?: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }[]>([
    { id: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0, totalAmount: 0 },
  ]);

  // Filtered lists
  const filteredInvoices = createMemo(() => {
    const q = searchTerm().toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.partyName && inv.partyName.toLowerCase().includes(q)) ||
        (inv.partyPhone && inv.partyPhone.includes(q))
    );
  });

  const filteredPaymentsIn = createMemo(() => {
    const list = paymentRecords.filter((p) => p.type === 'in');
    const q = searchTerm().toLowerCase().trim();
    if (!q) return list;
    return list.filter((p) => p.partyName.toLowerCase().includes(q) || (p.notes && p.notes.toLowerCase().includes(q)));
  });

  const filteredQuotations = createMemo(() => {
    const q = searchTerm().toLowerCase().trim();
    if (!q) return quotations;
    return quotations.filter(
      (qt) =>
        qt.quotationNumber.toLowerCase().includes(q) ||
        qt.partyName.toLowerCase().includes(q) ||
        (qt.partyPhone && qt.partyPhone.includes(q))
    );
  });

  const filteredReturns = createMemo(() => {
    const q = searchTerm().toLowerCase().trim();
    if (!q) return salesReturns;
    return salesReturns.filter(
      (sr) =>
        sr.returnNumber.toLowerCase().includes(q) ||
        sr.partyName.toLowerCase().includes(q) ||
        (sr.reason && sr.reason.toLowerCase().includes(q))
    );
  });

  // Quotation Item Helpers
  function addQuoteItem() {
    setQuoteItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0, totalAmount: 0 },
    ]);
  }

  function updateQuoteItem(index: number, key: string, val: any) {
    setQuoteItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [key]: val };
      if (key === 'quantity' || key === 'unitPrice') {
        item.totalAmount = (item.quantity || 0) * (item.unitPrice || 0);
      }
      copy[index] = item;
      return copy;
    });
  }

  function removeQuoteItem(index: number) {
    if (quoteItems().length <= 1) return;
    setQuoteItems((prev) => prev.filter((_, i) => i !== index));
  }

  const quoteTotal = createMemo(() => {
    return quoteItems().reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  });

  // Sales Return Item Helpers
  function addReturnItem() {
    setReturnItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0, totalAmount: 0 },
    ]);
  }

  function updateReturnItem(index: number, key: string, val: any) {
    setReturnItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [key]: val };
      if (key === 'quantity' || key === 'unitPrice') {
        item.totalAmount = (item.quantity || 0) * (item.unitPrice || 0);
      }
      copy[index] = item;
      return copy;
    });
  }

  function removeReturnItem(index: number) {
    if (returnItems().length <= 1) return;
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  }

  const returnTotal = createMemo(() => {
    return returnItems().reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  });

  // Submission Handlers
  async function handleCreatePaymentIn(e: Event) {
    e.preventDefault();
    if (!payPartyId() || payAmount() <= 0) return;

    await createPaymentIn({
      partyId: payPartyId(),
      amount: payAmount(),
      paymentMode: payMode(),
      accountId: payAccountId() || undefined,
      notes: payNotes(),
      date: payDate(),
    });

    setShowPaymentInModal(false);
    setPayPartyId('');
    setPayAmount(0);
    setPayNotes('');
  }

  async function handleCreateQuotation(e: Event) {
    e.preventDefault();
    const validItems = quoteItems().filter((it) => it.itemName.trim().length > 0 && it.totalAmount > 0);
    if (validItems.length === 0 || !quotePartyName()) return;

    const seq = (quotations.length + 1).toString().padStart(4, '0');
    await createQuotation({
      quotationNumber: `QT-${new Date().getFullYear()}-${seq}`,
      partyId: quotePartyId() || undefined,
      partyName: quotePartyName(),
      partyPhone: quotePartyPhone() || undefined,
      date: new Date().toISOString().split('T')[0],
      validUntil: quoteValidUntil() || undefined,
      totalAmount: quoteTotal(),
      notes: quoteNotes() || undefined,
      status: 'sent',
      items: validItems,
    });

    setShowQuotationModal(false);
    setQuotePartyName('');
    setQuotePartyPhone('');
    setQuotePartyId('');
    setQuoteItems([{ id: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0, totalAmount: 0 }]);
  }

  async function handleCreateReturn(e: Event) {
    e.preventDefault();
    const validItems = returnItems().filter((it) => it.itemName.trim().length > 0 && it.totalAmount > 0);
    if (validItems.length === 0 || !returnPartyName()) return;

    const seq = (salesReturns.length + 1).toString().padStart(4, '0');
    await createSalesReturn({
      returnNumber: `SR-${new Date().getFullYear()}-${seq}`,
      partyId: returnPartyId() || undefined,
      partyName: returnPartyName(),
      date: new Date().toISOString().split('T')[0],
      totalAmount: returnTotal(),
      refundAmount: returnRefund(),
      creditAmount: returnCredit() || Math.max(0, returnTotal() - returnRefund()),
      reason: returnReason() || undefined,
      items: validItems,
    });

    setShowReturnModal(false);
    setReturnPartyName('');
    setReturnPartyId('');
    setReturnReason('');
    setReturnRefund(0);
    setReturnCredit(0);
    setReturnItems([{ id: crypto.randomUUID(), itemName: '', quantity: 1, unitPrice: 0, totalAmount: 0 }]);
  }

  return (
    <div class="space-y-6">
      {/* Header Bar */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <IconSales class="w-6 h-6" />
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Sales Management</h1>
          </div>
          <p class="text-sm text-gray-500 dark:text-neutral-400 mt-1">
            Track sales invoices, customer payments, price quotations, and sales return vouchers.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Show when={activeSubTab() === 'invoices'}>
            <button
              onClick={() => setActiveTab('pos')}
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-all shadow-md shadow-emerald-900/20 flex items-center gap-2"
            >
              <IconPlus class="w-4 h-4" />
              <span>Create Sale (POS)</span>
            </button>
          </Show>

          <Show when={activeSubTab() === 'payment_in'}>
            <button
              onClick={() => setShowPaymentInModal(true)}
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-all shadow-md shadow-emerald-900/20 flex items-center gap-2"
            >
              <IconPlus class="w-4 h-4" />
              <span>Record Payment In</span>
            </button>
          </Show>

          <Show when={activeSubTab() === 'quotations'}>
            <button
              onClick={() => setShowQuotationModal(true)}
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-all shadow-md shadow-emerald-900/20 flex items-center gap-2"
            >
              <IconPlus class="w-4 h-4" />
              <span>New Quotation</span>
            </button>
          </Show>

          <Show when={activeSubTab() === 'returns'}>
            <button
              onClick={() => setShowReturnModal(true)}
              class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium text-sm transition-all shadow-md shadow-rose-900/20 flex items-center gap-2"
            >
              <IconPlus class="w-4 h-4" />
              <span>New Sales Return</span>
            </button>
          </Show>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div class="flex items-center gap-2 border-b border-gray-200 dark:border-neutral-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('invoices')}
          class={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeSubTab() === 'invoices'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-900'
          }`}
        >
          <IconReceipt class="w-4 h-4" />
          <span>Sales Invoices</span>
          <span class="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('payment_in')}
          class={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeSubTab() === 'payment_in'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-900'
          }`}
        >
          <IconCustomer class="w-4 h-4" />
          <span>Payment In</span>
          <span class="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
            {paymentRecords.filter((p) => p.type === 'in').length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('quotations')}
          class={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeSubTab() === 'quotations'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-900'
          }`}
        >
          <IconFilter class="w-4 h-4" />
          <span>Quotations</span>
          <span class="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
            {quotations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('returns')}
          class={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeSubTab() === 'returns'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-900'
          }`}
        >
          <IconSales class="w-4 h-4 text-rose-500 dark:text-rose-400" />
          <span>Sales Return</span>
          <span class="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
            {salesReturns.length}
          </span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div class="relative">
        <IconSearch class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500" />
        <input
          type="text"
          placeholder="Search by invoice number, customer name, phone..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all shadow-sm"
        />
      </div>

      {/* Tab 1: Sales Invoices */}
      <Show when={activeSubTab() === 'invoices'}>
        <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-700 dark:text-neutral-300">
              <thead class="bg-gray-50 dark:bg-neutral-900/60 border-b border-gray-200 dark:border-neutral-800 text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Invoice #</th>
                  <th class="px-5 py-3.5">Customer</th>
                  <th class="px-5 py-3.5">Date (AD / BS)</th>
                  <th class="px-5 py-3.5 text-right">Total</th>
                  <th class="px-5 py-3.5 text-right">Paid</th>
                  <th class="px-5 py-3.5 text-right">Due</th>
                  <th class="px-5 py-3.5 text-center">Status</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-neutral-900">
                <For
                  each={filteredInvoices()}
                  fallback={
                    <tr>
                      <td colspan="8" class="px-5 py-12 text-center text-gray-400 dark:text-neutral-500">
                        No sales invoices recorded yet. Click "Create Sale (POS)" to make your first sale.
                      </td>
                    </tr>
                  }
                >
                  {(inv) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td class="px-5 py-4 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {inv.invoiceNumber}
                      </td>
                      <td class="px-5 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">{inv.partyName || 'Cash Customer'}</div>
                        <Show when={inv.partyPhone}>
                          <div class="text-xs text-gray-400 dark:text-neutral-500">{inv.partyPhone}</div>
                        </Show>
                      </td>
                      <td class="px-5 py-4">
                        <div class="text-gray-800 dark:text-neutral-200">{inv.invoiceDateAd}</div>
                        <div class="text-xs text-gray-400 dark:text-neutral-500">{inv.invoiceDateBs}</div>
                      </td>
                      <td class="px-5 py-4 text-right font-semibold text-gray-900 dark:text-white">
                        Rs. {inv.totalAmount.toLocaleString()}
                      </td>
                      <td class="px-5 py-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        Rs. {inv.paidAmount.toLocaleString()}
                      </td>
                      <td class="px-5 py-4 text-right font-medium">
                        <span class={inv.dueAmount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-neutral-500'}>
                          Rs. {inv.dueAmount.toLocaleString()}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-center">
                        <span
                          class={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            inv.status === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                              : inv.status === 'partially_paid'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                          }`}
                        >
                          {inv.status === 'paid' ? 'PAID' : inv.status === 'partially_paid' ? 'PARTIAL' : 'DUE'}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-600 hover:text-gray-900 dark:text-neutral-300 dark:hover:text-white transition-colors"
                          title="View Details"
                        >
                          <IconEye class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* Tab 2: Payment In */}
      <Show when={activeSubTab() === 'payment_in'}>
        <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-700 dark:text-neutral-300">
              <thead class="bg-gray-50 dark:bg-neutral-900/60 border-b border-gray-200 dark:border-neutral-800 text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Customer Name</th>
                  <th class="px-5 py-3.5">Date</th>
                  <th class="px-5 py-3.5">Mode</th>
                  <th class="px-5 py-3.5">Notes</th>
                  <th class="px-5 py-3.5 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-neutral-900">
                <For
                  each={filteredPaymentsIn()}
                  fallback={
                    <tr>
                      <td colspan="5" class="px-5 py-12 text-center text-gray-400 dark:text-neutral-500">
                        No customer payments recorded yet. Click "Record Payment In" to collect credit.
                      </td>
                    </tr>
                  }
                >
                  {(pay) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td class="px-5 py-4 font-medium text-gray-900 dark:text-white">{pay.partyName}</td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400">{pay.date}</td>
                      <td class="px-5 py-4">
                        <span class="inline-flex px-2 py-0.5 rounded text-xs uppercase font-mono bg-emerald-50 dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-neutral-800">
                          {pay.paymentMode}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400 text-xs">{pay.notes || '—'}</td>
                      <td class="px-5 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        + Rs. {pay.amount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* Tab 3: Quotations */}
      <Show when={activeSubTab() === 'quotations'}>
        <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-700 dark:text-neutral-300">
              <thead class="bg-gray-50 dark:bg-neutral-900/60 border-b border-gray-200 dark:border-neutral-800 text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Quotation #</th>
                  <th class="px-5 py-3.5">Customer</th>
                  <th class="px-5 py-3.5">Date</th>
                  <th class="px-5 py-3.5">Valid Until</th>
                  <th class="px-5 py-3.5 text-right">Total</th>
                  <th class="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-neutral-900">
                <For
                  each={filteredQuotations()}
                  fallback={
                    <tr>
                      <td colspan="6" class="px-5 py-12 text-center text-gray-400 dark:text-neutral-500">
                        No quotations created yet. Click "New Quotation" to generate an estimate.
                      </td>
                    </tr>
                  }
                >
                  {(qt) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td class="px-5 py-4 font-mono font-medium text-blue-600 dark:text-blue-400">{qt.quotationNumber}</td>
                      <td class="px-5 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">{qt.partyName}</div>
                        <Show when={qt.partyPhone}>
                          <div class="text-xs text-gray-500 dark:text-neutral-400">{qt.partyPhone}</div>
                        </Show>
                      </td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400">{qt.date}</td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400">{qt.validUntil || '—'}</td>
                      <td class="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">
                        Rs. {qt.totalAmount.toLocaleString()}
                      </td>
                      <td class="px-5 py-4 text-center">
                        <span class="inline-flex px-2.5 py-1 rounded-full text-xs font-medium uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                          {qt.status}
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* Tab 4: Sales Returns */}
      <Show when={activeSubTab() === 'returns'}>
        <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-700 dark:text-neutral-300">
              <thead class="bg-gray-50 dark:bg-neutral-900/60 border-b border-gray-200 dark:border-neutral-800 text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Return #</th>
                  <th class="px-5 py-3.5">Customer</th>
                  <th class="px-5 py-3.5">Date</th>
                  <th class="px-5 py-3.5">Reason</th>
                  <th class="px-5 py-3.5 text-right">Refund Amount</th>
                  <th class="px-5 py-3.5 text-right">Credit Balance</th>
                  <th class="px-5 py-3.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-neutral-900">
                <For
                  each={filteredReturns()}
                  fallback={
                    <tr>
                      <td colspan="7" class="px-5 py-12 text-center text-gray-400 dark:text-neutral-500">
                        No sales return records. Click "New Sales Return" to issue a credit note.
                      </td>
                    </tr>
                  }
                >
                  {(sr) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td class="px-5 py-4 font-mono font-medium text-rose-600 dark:text-rose-400">{sr.returnNumber}</td>
                      <td class="px-5 py-4 font-medium text-gray-900 dark:text-white">{sr.partyName}</td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400">{sr.date}</td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400 text-xs">{sr.reason || '—'}</td>
                      <td class="px-5 py-4 text-right text-rose-600 dark:text-rose-400 font-medium">
                        Rs. {sr.refundAmount.toLocaleString()}
                      </td>
                      <td class="px-5 py-4 text-right text-amber-600 dark:text-amber-400 font-medium">
                        Rs. {sr.creditAmount.toLocaleString()}
                      </td>
                      <td class="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">
                        Rs. {sr.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* MODAL: Record Payment In */}
      <Show when={showPaymentInModal()}>
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Record Customer Payment In</h2>
              <button
                onClick={() => setShowPaymentInModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePaymentIn} class="space-y-4">
              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Select Customer *</label>
                <select
                  required
                  value={payPartyId()}
                  onChange={(e) => setPayPartyId(e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Customer --</option>
                  <For each={parties.filter((p) => p.partyType === 'customer')}>
                    {(p) => (
                      <option value={p.id}>
                        {p.name} (Balance: Rs. {p.currentBalance.toLocaleString()})
                      </option>
                    )}
                  </For>
                </select>
              </div>

              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payAmount() || ''}
                  onInput={(e) => setPayAmount(parseFloat(e.currentTarget.value) || 0)}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white font-mono text-base focus:outline-none focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Payment Mode</label>
                  <select
                    value={payMode()}
                    onChange={(e) => setPayMode(e.currentTarget.value as PaymentMode)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="fonepay">FonePay / QR</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Deposit To Account</label>
                  <select
                    value={payAccountId()}
                    onChange={(e) => setPayAccountId(e.currentTarget.value)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <For each={accounts}>
                      {(acc) => (
                        <option value={acc.id}>
                          {acc.name} (Rs. {acc.balance.toLocaleString()})
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Date</label>
                <input
                  type="date"
                  value={payDate()}
                  onInput={(e) => setPayDate(e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Notes / Reference</label>
                <input
                  type="text"
                  value={payNotes()}
                  onInput={(e) => setPayNotes(e.currentTarget.value)}
                  placeholder="e.g., FonePay Ref #12345 or Cheque #"
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div class="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentInModal(false)}
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-emerald-900/30"
                >
                  Save Payment In
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* MODAL: Create Quotation */}
      <Show when={showQuotationModal()}>
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Create Price Quotation / Estimate</h2>
              <button
                onClick={() => setShowQuotationModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={quotePartyName()}
                    onInput={(e) => setQuotePartyName(e.currentTarget.value)}
                    placeholder="Enter customer or company name"
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Customer Phone</label>
                  <input
                    type="text"
                    value={quotePartyPhone()}
                    onInput={(e) => setQuotePartyPhone(e.currentTarget.value)}
                    placeholder="98XXXXXXXX"
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Valid Until (Expiry Date)</label>
                <input
                  type="date"
                  value={quoteValidUntil()}
                  onInput={(e) => setQuoteValidUntil(e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Items Table */}
              <div class="border border-gray-200 dark:border-neutral-800 rounded-xl p-3 bg-gray-50/70 dark:bg-neutral-900/40 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Quotation Items</span>
                  <button
                    type="button"
                    onClick={addQuoteItem}
                    class="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-200 rounded text-xs flex items-center gap-1 border border-gray-200 dark:border-transparent transition-colors"
                  >
                    <IconPlus class="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div class="space-y-2">
                  <For each={quoteItems()}>
                    {(it, idx) => (
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Item name / description"
                          required
                          value={it.itemName}
                          onInput={(e) => updateQuoteItem(idx(), 'itemName', e.currentTarget.value)}
                          class="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          required
                          value={it.quantity}
                          onInput={(e) => updateQuoteItem(idx(), 'quantity', parseFloat(e.currentTarget.value) || 0)}
                          class="w-16 px-2 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs font-mono text-right"
                        />
                        <input
                          type="number"
                          placeholder="Unit Rate"
                          min="0"
                          required
                          value={it.unitPrice}
                          onInput={(e) => updateQuoteItem(idx(), 'unitPrice', parseFloat(e.currentTarget.value) || 0)}
                          class="w-24 px-2 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs font-mono text-right"
                        />
                        <div class="w-24 px-2 py-1.5 font-mono text-xs text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          Rs. {it.totalAmount.toLocaleString()}
                        </div>
                        <Show when={quoteItems().length > 1}>
                          <button
                            type="button"
                            onClick={() => removeQuoteItem(idx())}
                            class="p-1 text-gray-400 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400"
                          >
                            ✕
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>

                <div class="flex justify-end pt-2 border-t border-gray-200 dark:border-neutral-800 font-semibold text-gray-900 dark:text-white text-sm">
                  <span>Grand Total:</span>
                  <span class="ml-3 text-emerald-600 dark:text-emerald-400 font-mono">Rs. {quoteTotal().toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Notes / Terms</label>
                <textarea
                  value={quoteNotes()}
                  onInput={(e) => setQuoteNotes(e.currentTarget.value)}
                  placeholder="Terms of delivery, payment conditions..."
                  rows="2"
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div class="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowQuotationModal(false)}
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-blue-900/30"
                >
                  Create Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* MODAL: Sales Return */}
      <Show when={showReturnModal()}>
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Create Sales Return (Credit Note)</h2>
              <button
                onClick={() => setShowReturnModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReturn} class="space-y-4">
              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Customer *</label>
                <select
                  required
                  value={returnPartyName()}
                  onChange={(e) => {
                    const sel = parties.find((p) => p.name === e.currentTarget.value);
                    setReturnPartyName(e.currentTarget.value);
                    setReturnPartyId(sel?.id || '');
                  }}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Select Customer --</option>
                  <For each={parties.filter((p) => p.partyType === 'customer')}>
                    {(p) => <option value={p.name}>{p.name}</option>}
                  </For>
                </select>
              </div>

              {/* Items Table */}
              <div class="border border-gray-200 dark:border-neutral-800 rounded-xl p-3 bg-gray-50/70 dark:bg-neutral-900/40 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Returned Items</span>
                  <button
                    type="button"
                    onClick={addReturnItem}
                    class="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-200 rounded text-xs flex items-center gap-1 border border-gray-200 dark:border-transparent transition-colors"
                  >
                    <IconPlus class="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div class="space-y-2">
                  <For each={returnItems()}>
                    {(it, idx) => (
                      <div class="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Item name"
                          required
                          value={it.itemName}
                          onInput={(e) => updateReturnItem(idx(), 'itemName', e.currentTarget.value)}
                          class="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          required
                          value={it.quantity}
                          onInput={(e) => updateReturnItem(idx(), 'quantity', parseFloat(e.currentTarget.value) || 0)}
                          class="w-16 px-2 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs font-mono text-right"
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          min="0"
                          required
                          value={it.unitPrice}
                          onInput={(e) => updateReturnItem(idx(), 'unitPrice', parseFloat(e.currentTarget.value) || 0)}
                          class="w-24 px-2 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs font-mono text-right"
                        />
                        <div class="w-24 px-2 py-1.5 font-mono text-xs text-right text-rose-600 dark:text-rose-400 font-medium">
                          Rs. {it.totalAmount.toLocaleString()}
                        </div>
                        <Show when={returnItems().length > 1}>
                          <button
                            type="button"
                            onClick={() => removeReturnItem(idx())}
                            class="p-1 text-gray-400 hover:text-rose-500 dark:text-neutral-500 dark:hover:text-rose-400"
                          >
                            ✕
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>

                <div class="flex justify-end pt-2 border-t border-gray-200 dark:border-neutral-800 font-semibold text-gray-900 dark:text-white text-sm">
                  <span>Return Total:</span>
                  <span class="ml-3 text-rose-600 dark:text-rose-400 font-mono">Rs. {returnTotal().toLocaleString()}</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Cash Refund (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={returnRefund() || ''}
                    onInput={(e) => setReturnRefund(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Khata Credit (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={returnCredit() || Math.max(0, returnTotal() - returnRefund())}
                    onInput={(e) => setReturnCredit(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Reason for Return</label>
                <input
                  type="text"
                  value={returnReason()}
                  onInput={(e) => setReturnReason(e.currentTarget.value)}
                  placeholder="e.g., Expired goods, defective packaging"
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div class="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-rose-900/30"
                >
                  Issue Credit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* MODAL: Invoice Details Viewer */}
      <Show when={selectedInvoice()}>
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div class="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white">Invoice Details</h3>
                <p class="text-xs font-mono text-emerald-600 dark:text-emerald-400">{selectedInvoice()?.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                class="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-neutral-400">Customer:</span>
                <span class="text-gray-900 dark:text-white font-medium">{selectedInvoice()?.partyName || 'Cash Customer'}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-neutral-400">Date:</span>
                <span class="text-gray-800 dark:text-neutral-200">{selectedInvoice()?.invoiceDateAd} ({selectedInvoice()?.invoiceDateBs})</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-neutral-400">Payment Mode:</span>
                <span class="text-gray-800 dark:text-neutral-200 uppercase font-mono">{selectedInvoice()?.paymentMode}</span>
              </div>

              <div class="border-t border-b border-gray-200 dark:border-neutral-800 py-2 space-y-1.5">
                <div class="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase">Items</div>
                <For each={selectedInvoice()?.items || []}>
                  {(it: any) => (
                    <div class="flex justify-between text-xs">
                      <span class="text-gray-700 dark:text-neutral-300">
                        {it.itemName} × {it.quantity}
                      </span>
                      <span class="font-mono text-gray-900 dark:text-white">Rs. {it.totalAmount.toLocaleString()}</span>
                    </div>
                  )}
                </For>
              </div>

              <div class="space-y-1 text-xs">
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-neutral-400">Subtotal:</span>
                  <span class="font-mono text-gray-700 dark:text-neutral-200">Rs. {selectedInvoice()?.subtotal?.toLocaleString()}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-neutral-400">Discount:</span>
                  <span class="font-mono text-rose-600 dark:text-rose-400">- Rs. {selectedInvoice()?.discountAmount?.toLocaleString()}</span>
                </div>
                <div class="flex justify-between font-bold text-sm text-gray-900 dark:text-white pt-1">
                  <span>Grand Total:</span>
                  <span class="font-mono text-emerald-600 dark:text-emerald-400">Rs. {selectedInvoice()?.totalAmount?.toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-gray-700 dark:text-neutral-300">
                  <span>Paid:</span>
                  <span class="font-mono text-emerald-600 dark:text-emerald-400">Rs. {selectedInvoice()?.paidAmount?.toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-gray-700 dark:text-neutral-300">
                  <span>Due:</span>
                  <span class="font-mono text-amber-600 dark:text-amber-400">Rs. {selectedInvoice()?.dueAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-900 dark:text-white rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
