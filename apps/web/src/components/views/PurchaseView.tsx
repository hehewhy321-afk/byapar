import { createSignal, createMemo, For, Show } from 'solid-js';
import {
  purchaseBills,
  purchaseReturns,
  paymentRecords,
  parties,
  items,
  accounts,
  createPurchaseBill,
  createPurchaseReturn,
  createPaymentOut,
  PaymentMode,
  PurchaseBill,
  PurchaseReturn,
} from '../../db/localDb';
import {
  IconPurchase,
  IconSearch,
  IconPlus,
  IconReceipt,
  IconTruck,
  IconEye,
} from '../icons';

export function PurchaseView() {
  const [activeSubTab, setActiveSubTab] = createSignal<'bills' | 'payment_out' | 'returns'>('bills');
  const [searchTerm, setSearchTerm] = createSignal('');

  // Modals
  const [showBillModal, setShowBillModal] = createSignal(false);
  const [showPaymentOutModal, setShowPaymentOutModal] = createSignal(false);
  const [showReturnModal, setShowReturnModal] = createSignal(false);
  const [selectedBill, setSelectedBill] = createSignal<PurchaseBill | null>(null);

  // New Purchase Bill Form State
  const [billSupplierName, setBillSupplierName] = createSignal('');
  const [billSupplierId, setBillSupplierId] = createSignal('');
  const [billSupplierPhone, setBillSupplierPhone] = createSignal('');
  const [billDate, setBillDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [billPaymentMode, setBillPaymentMode] = createSignal<PaymentMode>('cash');
  const [billPaidAmount, setBillPaidAmount] = createSignal(0);
  const [billNotes, setBillNotes] = createSignal('');
  const [billItems, setBillItems] = createSignal<{
    id: string;
    itemId?: string;
    itemName: string;
    quantity: number;
    costPrice: number;
    totalAmount: number;
  }[]>([
    { id: crypto.randomUUID(), itemName: '', quantity: 1, costPrice: 0, totalAmount: 0 },
  ]);

  // Payment Out Form State
  const [outPartyId, setOutPartyId] = createSignal('');
  const [outAmount, setOutAmount] = createSignal<number>(0);
  const [outMode, setOutMode] = createSignal<PaymentMode>('cash');
  const [outAccountId, setOutAccountId] = createSignal(accounts[0]?.id || '');
  const [outNotes, setOutNotes] = createSignal('');
  const [outDate, setOutDate] = createSignal(new Date().toISOString().split('T')[0]);

  // Purchase Return Form State
  const [returnSupplierName, setReturnSupplierName] = createSignal('');
  const [returnSupplierId, setReturnSupplierId] = createSignal('');
  const [returnReason, setReturnReason] = createSignal('');
  const [returnRefund, setReturnRefund] = createSignal(0);
  const [returnItems, setReturnItems] = createSignal<{
    id: string;
    itemId?: string;
    itemName: string;
    quantity: number;
    costPrice: number;
    totalAmount: number;
  }[]>([
    { id: crypto.randomUUID(), itemName: '', quantity: 1, costPrice: 0, totalAmount: 0 },
  ]);

  // Filtered lists
  const filteredBills = createMemo(() => {
    const q = searchTerm().toLowerCase().trim();
    if (!q) return purchaseBills;
    return purchaseBills.filter(
      (b) =>
        b.billNumber.toLowerCase().includes(q) ||
        b.supplierName.toLowerCase().includes(q) ||
        (b.supplierPhone && b.supplierPhone.includes(q))
    );
  });

  const filteredPaymentsOut = createMemo(() => {
    const list = paymentRecords.filter((p) => p.type === 'out');
    const q = searchTerm().toLowerCase().trim();
    if (!q) return list;
    return list.filter((p) => p.partyName.toLowerCase().includes(q) || (p.notes && p.notes.toLowerCase().includes(q)));
  });

  const filteredReturns = createMemo(() => {
    const q = searchTerm().toLowerCase().trim();
    if (!q) return purchaseReturns;
    return purchaseReturns.filter(
      (pr) =>
        pr.returnNumber.toLowerCase().includes(q) ||
        pr.supplierName.toLowerCase().includes(q) ||
        (pr.reason && pr.reason.toLowerCase().includes(q))
    );
  });

  // Bill Item Helpers
  function addBillItem() {
    setBillItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), itemName: '', quantity: 1, costPrice: 0, totalAmount: 0 },
    ]);
  }

  function updateBillItem(index: number, key: string, val: any) {
    setBillItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [key]: val };
      if (key === 'quantity' || key === 'costPrice') {
        item.totalAmount = (item.quantity || 0) * (item.costPrice || 0);
      }
      copy[index] = item;
      return copy;
    });
  }

  function removeBillItem(index: number) {
    if (billItems().length <= 1) return;
    setBillItems((prev) => prev.filter((_, i) => i !== index));
  }

  const billTotal = createMemo(() => {
    return billItems().reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  });

  // Return Item Helpers
  function addReturnItem() {
    setReturnItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), itemName: '', quantity: 1, costPrice: 0, totalAmount: 0 },
    ]);
  }

  function updateReturnItem(index: number, key: string, val: any) {
    setReturnItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [key]: val };
      if (key === 'quantity' || key === 'costPrice') {
        item.totalAmount = (item.quantity || 0) * (item.costPrice || 0);
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

  // Actions
  async function handleCreateBill(e: Event) {
    e.preventDefault();
    const validItems = billItems().filter((it) => it.itemName.trim().length > 0 && it.totalAmount > 0);
    if (validItems.length === 0 || !billSupplierName()) return;

    const total = billTotal();
    const paid = Math.min(billPaidAmount(), total);
    const due = Math.max(0, total - paid);
    const seq = (purchaseBills.length + 1).toString().padStart(4, '0');

    await createPurchaseBill({
      billNumber: `BILL-${new Date().getFullYear()}-${seq}`,
      supplierId: billSupplierId() || undefined,
      supplierName: billSupplierName(),
      supplierPhone: billSupplierPhone() || undefined,
      date: billDate(),
      subtotal: total,
      taxAmount: 0,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: due,
      paymentMode: billPaymentMode(),
      status: due === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      notes: billNotes() || undefined,
      items: validItems,
    });

    setShowBillModal(false);
    setBillSupplierName('');
    setBillSupplierPhone('');
    setBillSupplierId('');
    setBillPaidAmount(0);
    setBillNotes('');
    setBillItems([{ id: crypto.randomUUID(), itemName: '', quantity: 1, costPrice: 0, totalAmount: 0 }]);
  }

  async function handleCreatePaymentOut(e: Event) {
    e.preventDefault();
    if (!outPartyId() || outAmount() <= 0) return;

    await createPaymentOut({
      partyId: outPartyId(),
      amount: outAmount(),
      paymentMode: outMode(),
      accountId: outAccountId() || undefined,
      notes: outNotes(),
      date: outDate(),
    });

    setShowPaymentOutModal(false);
    setOutPartyId('');
    setOutAmount(0);
    setOutNotes('');
  }

  async function handleCreateReturn(e: Event) {
    e.preventDefault();
    const validItems = returnItems().filter((it) => it.itemName.trim().length > 0 && it.totalAmount > 0);
    if (validItems.length === 0 || !returnSupplierName()) return;

    const seq = (purchaseReturns.length + 1).toString().padStart(4, '0');
    await createPurchaseReturn({
      returnNumber: `PR-${new Date().getFullYear()}-${seq}`,
      supplierId: returnSupplierId() || undefined,
      supplierName: returnSupplierName(),
      date: new Date().toISOString().split('T')[0],
      totalAmount: returnTotal(),
      refundAmount: returnRefund(),
      reason: returnReason() || undefined,
      items: validItems,
    });

    setShowReturnModal(false);
    setReturnSupplierName('');
    setReturnSupplierId('');
    setReturnReason('');
    setReturnRefund(0);
    setReturnItems([{ id: crypto.randomUUID(), itemName: '', quantity: 1, costPrice: 0, totalAmount: 0 }]);
  }

  return (
    <div class="space-y-6">
      {/* Header Bar */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <div class="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <IconPurchase class="w-6 h-6" />
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Purchase Management</h1>
          </div>
          <p class="text-sm text-gray-500 dark:text-neutral-400 mt-1">
            Record supplier purchase bills, payments to vendors, and purchase returns with inventory auto-restock.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Show when={activeSubTab() === 'bills'}>
            <button
              onClick={() => setShowBillModal(true)}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2"
            >
              <IconPlus class="w-4 h-4" />
              <span>New Purchase Bill</span>
            </button>
          </Show>

          <Show when={activeSubTab() === 'payment_out'}>
            <button
              onClick={() => setShowPaymentOutModal(true)}
              class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2"
            >
              <IconPlus class="w-4 h-4" />
              <span>Record Payment Out</span>
            </button>
          </Show>

          <Show when={activeSubTab() === 'returns'}>
            <button
              onClick={() => setShowReturnModal(true)}
              class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-rose-900/30 flex items-center gap-2"
            >
              <IconPlus class="w-4 h-4" />
              <span>New Purchase Return</span>
            </button>
          </Show>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div class="flex items-center gap-2 border-b border-gray-200 dark:border-neutral-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('bills')}
          class={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeSubTab() === 'bills'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-sm'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-900'
          }`}
        >
          <IconReceipt class="w-4 h-4" />
          <span>Purchase Bills</span>
          <span class="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300">
            {purchaseBills.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('payment_out')}
          class={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            activeSubTab() === 'payment_out'
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-sm'
              : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-neutral-900'
          }`}
        >
          <IconTruck class="w-4 h-4" />
          <span>Payment Out</span>
          <span class="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300">
            {paymentRecords.filter((p) => p.type === 'out').length}
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
          <IconPurchase class="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>Purchase Return</span>
          <span class="ml-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300">
            {purchaseReturns.length}
          </span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div class="relative">
        <IconSearch class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-500" />
        <input
          type="text"
          placeholder="Search by bill number, supplier name, phone..."
          value={searchTerm()}
          onInput={(e) => setSearchTerm(e.currentTarget.value)}
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:outline-none focus:border-blue-500/50 text-sm transition-all shadow-sm"
        />
      </div>

      {/* Tab 1: Purchase Bills */}
      <Show when={activeSubTab() === 'bills'}>
        <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-700 dark:text-neutral-300">
              <thead class="bg-gray-50 dark:bg-neutral-900/60 border-b border-gray-200 dark:border-neutral-800 text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Bill #</th>
                  <th class="px-5 py-3.5">Supplier</th>
                  <th class="px-5 py-3.5">Date</th>
                  <th class="px-5 py-3.5 text-right">Total</th>
                  <th class="px-5 py-3.5 text-right">Paid</th>
                  <th class="px-5 py-3.5 text-right">Due</th>
                  <th class="px-5 py-3.5 text-center">Status</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-neutral-900">
                <For
                  each={filteredBills()}
                  fallback={
                    <tr>
                      <td colspan="8" class="px-5 py-12 text-center text-gray-400 dark:text-neutral-500">
                        No purchase bills recorded. Click "New Purchase Bill" to add incoming stock.
                      </td>
                    </tr>
                  }
                >
                  {(bill) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td class="px-5 py-4 font-mono font-medium text-blue-600 dark:text-blue-400">{bill.billNumber}</td>
                      <td class="px-5 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">{bill.supplierName}</div>
                        <Show when={bill.supplierPhone}>
                          <div class="text-xs text-gray-400 dark:text-neutral-500">{bill.supplierPhone}</div>
                        </Show>
                      </td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400">{bill.date}</td>
                      <td class="px-5 py-4 text-right font-semibold text-gray-900 dark:text-white">
                        Rs. {bill.totalAmount.toLocaleString()}
                      </td>
                      <td class="px-5 py-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        Rs. {bill.paidAmount.toLocaleString()}
                      </td>
                      <td class="px-5 py-4 text-right font-medium">
                        <span class={bill.dueAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-neutral-500'}>
                          Rs. {bill.dueAmount.toLocaleString()}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-center">
                        <span
                          class={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            bill.status === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                              : bill.status === 'partial'
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
                          }`}
                        >
                          {bill.status === 'paid' ? 'PAID' : bill.status === 'partial' ? 'PARTIAL' : 'DUE'}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedBill(bill)}
                          class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-600 hover:text-gray-900 dark:text-neutral-300 dark:hover:text-white transition-colors"
                          title="View Bill Details"
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

      {/* Tab 2: Payment Out */}
      <Show when={activeSubTab() === 'payment_out'}>
        <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-700 dark:text-neutral-300">
              <thead class="bg-gray-50 dark:bg-neutral-900/60 border-b border-gray-200 dark:border-neutral-800 text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Supplier Name</th>
                  <th class="px-5 py-3.5">Date</th>
                  <th class="px-5 py-3.5">Mode</th>
                  <th class="px-5 py-3.5">Notes</th>
                  <th class="px-5 py-3.5 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-neutral-900">
                <For
                  each={filteredPaymentsOut()}
                  fallback={
                    <tr>
                      <td colspan="5" class="px-5 py-12 text-center text-gray-400 dark:text-neutral-500">
                        No payments to suppliers recorded yet. Click "Record Payment Out".
                      </td>
                    </tr>
                  }
                >
                  {(pay) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td class="px-5 py-4 font-medium text-gray-900 dark:text-white">{pay.partyName}</td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400">{pay.date}</td>
                      <td class="px-5 py-4">
                        <span class="inline-flex px-2 py-0.5 rounded text-xs uppercase font-mono bg-blue-50 dark:bg-neutral-900 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-neutral-800">
                          {pay.paymentMode}
                        </span>
                      </td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400 text-xs">{pay.notes || '—'}</td>
                      <td class="px-5 py-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        - Rs. {pay.amount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* Tab 3: Purchase Returns */}
      <Show when={activeSubTab() === 'returns'}>
        <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-700 dark:text-neutral-300">
              <thead class="bg-gray-50 dark:bg-neutral-900/60 border-b border-gray-200 dark:border-neutral-800 text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3.5">Return #</th>
                  <th class="px-5 py-3.5">Supplier</th>
                  <th class="px-5 py-3.5">Date</th>
                  <th class="px-5 py-3.5">Reason</th>
                  <th class="px-5 py-3.5 text-right">Refund Amount</th>
                  <th class="px-5 py-3.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-neutral-900">
                <For
                  each={filteredReturns()}
                  fallback={
                    <tr>
                      <td colspan="6" class="px-5 py-12 text-center text-gray-400 dark:text-neutral-500">
                        No purchase returns recorded. Click "New Purchase Return" to return goods.
                      </td>
                    </tr>
                  }
                >
                  {(pr) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/30 transition-colors">
                      <td class="px-5 py-4 font-mono font-medium text-rose-600 dark:text-rose-400">{pr.returnNumber}</td>
                      <td class="px-5 py-4 font-medium text-gray-900 dark:text-white">{pr.supplierName}</td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400">{pr.date}</td>
                      <td class="px-5 py-4 text-gray-500 dark:text-neutral-400 text-xs">{pr.reason || '—'}</td>
                      <td class="px-5 py-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        Rs. {pr.refundAmount.toLocaleString()}
                      </td>
                      <td class="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">
                        Rs. {pr.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* MODAL: New Purchase Bill */}
      <Show when={showBillModal()}>
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Add Purchase Bill (Inward Stock)</h2>
              <button
                onClick={() => setShowBillModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBill} class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Supplier *</label>
                  <select
                    required
                    value={billSupplierName()}
                    onChange={(e) => {
                      const sel = parties.find((p) => p.name === e.currentTarget.value);
                      setBillSupplierName(e.currentTarget.value);
                      setBillSupplierId(sel?.id || '');
                      setBillSupplierPhone(sel?.phone || '');
                    }}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Supplier --</option>
                    <For each={parties.filter((p) => p.partyType === 'supplier')}>
                      {(p) => <option value={p.name}>{p.name}</option>}
                    </For>
                  </select>
                </div>

                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={billDate()}
                    onInput={(e) => setBillDate(e.currentTarget.value)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div class="border border-gray-200 dark:border-neutral-800 rounded-xl p-3 bg-gray-50/70 dark:bg-neutral-900/40 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Purchase Items</span>
                  <button
                    type="button"
                    onClick={addBillItem}
                    class="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-700 dark:text-neutral-200 rounded text-xs flex items-center gap-1 border border-gray-200 dark:border-transparent transition-colors"
                  >
                    <IconPlus class="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div class="space-y-2">
                  <For each={billItems()}>
                    {(it, idx) => (
                      <div class="flex items-center gap-2">
                        <select
                          value={it.itemName}
                          onChange={(e) => {
                            const sel = items.find((i) => i.name === e.currentTarget.value);
                            updateBillItem(idx(), 'itemName', e.currentTarget.value);
                            if (sel) {
                              updateBillItem(idx(), 'itemId', sel.id);
                              updateBillItem(idx(), 'costPrice', sel.costPrice || 0);
                            }
                          }}
                          class="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs"
                        >
                          <option value="">-- Select or type item --</option>
                          <For each={items}>
                            {(i) => <option value={i.name}>{i.name} (Stock: {i.currentStock})</option>}
                          </For>
                        </select>
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          required
                          value={it.quantity}
                          onInput={(e) => updateBillItem(idx(), 'quantity', parseFloat(e.currentTarget.value) || 0)}
                          class="w-16 px-2 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs font-mono text-right"
                        />
                        <input
                          type="number"
                          placeholder="Cost"
                          min="0"
                          required
                          value={it.costPrice}
                          onInput={(e) => updateBillItem(idx(), 'costPrice', parseFloat(e.currentTarget.value) || 0)}
                          class="w-24 px-2 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs font-mono text-right"
                        />
                        <div class="w-24 px-2 py-1.5 font-mono text-xs text-right text-blue-600 dark:text-blue-400 font-medium">
                          Rs. {it.totalAmount.toLocaleString()}
                        </div>
                        <Show when={billItems().length > 1}>
                          <button
                            type="button"
                            onClick={() => removeBillItem(idx())}
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
                  <span>Total Bill Amount:</span>
                  <span class="ml-3 text-blue-600 dark:text-blue-400 font-mono">Rs. {billTotal().toLocaleString()}</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Paid Amount (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={billPaidAmount() || ''}
                    onInput={(e) => setBillPaidAmount(parseFloat(e.currentTarget.value) || 0)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Payment Mode</label>
                  <select
                    value={billPaymentMode()}
                    onChange={(e) => setBillPaymentMode(e.currentTarget.value as PaymentMode)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="fonepay">FonePay / QR</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={billNotes()}
                  onInput={(e) => setBillNotes(e.currentTarget.value)}
                  placeholder="e.g., Delivery challan # or remarks"
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div class="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-blue-900/30"
                >
                  Save Bill & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* MODAL: Record Payment Out */}
      <Show when={showPaymentOutModal()}>
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Record Supplier Payment Out</h2>
              <button
                onClick={() => setShowPaymentOutModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePaymentOut} class="space-y-4">
              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Select Supplier *</label>
                <select
                  required
                  value={outPartyId()}
                  onChange={(e) => setOutPartyId(e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select Supplier --</option>
                  <For each={parties.filter((p) => p.partyType === 'supplier')}>
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
                  value={outAmount() || ''}
                  onInput={(e) => setOutAmount(parseFloat(e.currentTarget.value) || 0)}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white font-mono text-base focus:outline-none focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Payment Mode</label>
                  <select
                    value={outMode()}
                    onChange={(e) => setOutMode(e.currentTarget.value as PaymentMode)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="fonepay">FonePay / QR</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Paid From Account</label>
                  <select
                    value={outAccountId()}
                    onChange={(e) => setOutAccountId(e.currentTarget.value)}
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
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
                  value={outDate()}
                  onInput={(e) => setOutDate(e.currentTarget.value)}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Notes / Reference</label>
                <input
                  type="text"
                  value={outNotes()}
                  onInput={(e) => setOutNotes(e.currentTarget.value)}
                  placeholder="e.g., Cheque # or Bank transfer ref"
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div class="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentOutModal(false)}
                  class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-blue-900/30"
                >
                  Save Payment Out
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* MODAL: Purchase Return */}
      <Show when={showReturnModal()}>
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl w-full max-w-2xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-gray-900 dark:text-white">Create Purchase Return (Debit Note)</h2>
              <button
                onClick={() => setShowReturnModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReturn} class="space-y-4">
              <div>
                <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Supplier *</label>
                <select
                  required
                  value={returnSupplierName()}
                  onChange={(e) => {
                    const sel = parties.find((p) => p.name === e.currentTarget.value);
                    setReturnSupplierName(e.currentTarget.value);
                    setReturnSupplierId(sel?.id || '');
                  }}
                  class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Select Supplier --</option>
                  <For each={parties.filter((p) => p.partyType === 'supplier')}>
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
                        <select
                          value={it.itemName}
                          onChange={(e) => {
                            const sel = items.find((i) => i.name === e.currentTarget.value);
                            updateReturnItem(idx(), 'itemName', e.currentTarget.value);
                            if (sel) {
                              updateReturnItem(idx(), 'itemId', sel.id);
                              updateReturnItem(idx(), 'costPrice', sel.costPrice || 0);
                            }
                          }}
                          class="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-950 border border-gray-300 dark:border-neutral-800 rounded text-gray-900 dark:text-white text-xs"
                        >
                          <option value="">-- Select Item --</option>
                          <For each={items}>
                            {(i) => <option value={i.name}>{i.name}</option>}
                          </For>
                        </select>
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
                          placeholder="Rate"
                          min="0"
                          required
                          value={it.costPrice}
                          onInput={(e) => updateReturnItem(idx(), 'costPrice', parseFloat(e.currentTarget.value) || 0)}
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
                  <span>Total Returned:</span>
                  <span class="ml-3 text-rose-600 dark:text-rose-400 font-mono">Rs. {returnTotal().toLocaleString()}</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Refund Received (Rs.)</label>
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
                  <label class="block text-xs text-gray-600 dark:text-neutral-400 mb-1">Reason for Return</label>
                  <input
                    type="text"
                    value={returnReason()}
                    onInput={(e) => setReturnReason(e.currentTarget.value)}
                    placeholder="e.g., Damaged on arrival"
                    class="w-full px-3 py-2 bg-gray-50 dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>
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
                  Issue Debit Note
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* MODAL: Bill Details Viewer */}
      <Show when={selectedBill()}>
        <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div class="flex items-center justify-between border-b border-gray-200 dark:border-neutral-800 pb-3">
              <div>
                <h3 class="text-base font-bold text-gray-900 dark:text-white">Purchase Bill Details</h3>
                <p class="text-xs font-mono text-blue-600 dark:text-blue-400">{selectedBill()?.billNumber}</p>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                class="text-gray-400 hover:text-gray-600 dark:text-neutral-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-neutral-400">Supplier:</span>
                <span class="text-gray-900 dark:text-white font-medium">{selectedBill()?.supplierName}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-neutral-400">Date:</span>
                <span class="text-gray-800 dark:text-neutral-200">{selectedBill()?.date}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-neutral-400">Payment Mode:</span>
                <span class="text-gray-800 dark:text-neutral-200 uppercase font-mono">{selectedBill()?.paymentMode}</span>
              </div>

              <div class="border-t border-b border-gray-200 dark:border-neutral-800 py-2 space-y-1.5">
                <div class="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase">Items Inward</div>
                <For each={selectedBill()?.items || []}>
                  {(it) => (
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
                <div class="flex justify-between font-bold text-sm text-gray-900 dark:text-white pt-1">
                  <span>Grand Total:</span>
                  <span class="font-mono text-blue-600 dark:text-blue-400">Rs. {selectedBill()?.totalAmount?.toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-gray-700 dark:text-neutral-300">
                  <span>Paid:</span>
                  <span class="font-mono text-emerald-600 dark:text-emerald-400">Rs. {selectedBill()?.paidAmount?.toLocaleString()}</span>
                </div>
                <div class="flex justify-between text-gray-700 dark:text-neutral-300">
                  <span>Due:</span>
                  <span class="font-mono text-amber-600 dark:text-amber-400">Rs. {selectedBill()?.dueAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-3">
              <button
                onClick={() => setSelectedBill(null)}
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
