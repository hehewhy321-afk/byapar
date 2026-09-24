import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { bills, addBill, deleteBill, setActiveTab, currentBusiness, setShowSubscriptionModal, type BillItem } from '../../db/localDb';
import { formatNepaliCurrency } from '@byapar/core';
import { checkBillUploadLimit } from '../../services/planLimits';
import { IconBillGallery, IconUpload, IconFileText, IconEye, IconTrash, IconX, IconPlus, IconSearch } from '../icons';

export const BillGalleryView: Component = () => {
  const [showUploadModal, setShowUploadModal] = createSignal(false);
  const [previewBill, setPreviewBill] = createSignal<BillItem | null>(null);
  const [selectedCategory, setSelectedCategory] = createSignal('All');
  const [searchQuery, setSearchQuery] = createSignal('');

  // Form State
  const [vendorName, setVendorName] = createSignal('');
  const [invoiceNumber, setInvoiceNumber] = createSignal('');
  const [amount, setAmount] = createSignal<number>(0);
  const [billDate, setBillDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = createSignal('Inventory Purchase');
  const [notes, setNotes] = createSignal('');
  const [imagePreview, setImagePreview] = createSignal<string>('');

  const categories = ['All', 'Inventory Purchase', 'Utilities', 'Rent', 'Transport', 'Repairs', 'Other'];

  const filteredBills = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    const cat = selectedCategory();
    return bills.filter((b) => {
      const matchesCat = cat === 'All' || b.category === cat;
      const matchesSearch = !q || (b.vendorName || b.title || '').toLowerCase().includes(q) || (b.invoiceNumber || '').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  });

  const handleFileUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        setImagePreview(loadEvt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBill = (e: Event) => {
    e.preventDefault();
    if (!vendorName() || !amount()) return;

    addBill({
      vendorName: vendorName().trim(),
      invoiceNumber: invoiceNumber().trim() || `VCH-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: amount(),
      billDate: billDate(),
      category: category(),
      notes: notes().trim() || undefined,
      imageUrl: imagePreview() || undefined,
    });

    setShowUploadModal(false);
    // Reset Form
    setVendorName('');
    setInvoiceNumber('');
    setAmount(0);
    setBillDate(new Date().toISOString().split('T')[0]);
    setCategory('Inventory Purchase');
    setNotes('');
    setImagePreview('');
  };

  const handleOpenUploadModal = async () => {
    const check = await checkBillUploadLimit(currentBusiness.id);
    if (!check.allowed) {
      alert(check.message);
      setShowSubscriptionModal(true);
      return;
    }
    setShowUploadModal(true);
  };

  return (
    <div class="p-6 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400"
            onClick={() => setActiveTab('dashboard')}
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">Bill Gallery & Vouchers</h1>
            <p class="text-xs text-gray-400 dark:text-neutral-400">Organize and search your purchase tax bills, invoices and expense receipts</p>
          </div>
        </div>

        <button class="btn-primary flex items-center gap-2" onClick={handleOpenUploadModal}>
          <IconPlus class="w-4 h-4" />
          <span>Upload Bill / Voucher</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div class="stat-card flex flex-wrap items-center justify-between gap-3 !p-3">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <For each={categories}>
            {(cat) => (
              <button
                class={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory() === cat
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            )}
          </For>
        </div>

        <div class="w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search bills by vendor or invoice #..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="input-field text-xs pl-8"
          />
          <IconSearch class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Bills Grid */}
      <Show
        when={filteredBills().length > 0}
        fallback={
          <div class="stat-card text-center py-16 flex flex-col items-center">
            <div class="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-3">
              <IconBillGallery class="w-8 h-8" />
            </div>
            <p class="text-sm font-bold text-gray-800 dark:text-white mb-1">No bills uploaded yet</p>
            <p class="text-xs text-gray-400 dark:text-neutral-400 max-w-sm mb-4">
              Upload vendor bills, tax invoices, electricity or rent receipts to keep a digital record for tax audits.
            </p>
            <button class="btn-primary text-xs flex items-center gap-2" onClick={() => setShowUploadModal(true)}>
              <IconPlus class="w-4 h-4" />
              <span>Upload Your First Bill</span>
            </button>
          </div>
        }
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <For each={filteredBills()}>
            {(bill) => (
              <div class="stat-card !p-0 overflow-hidden flex flex-col justify-between group hover:border-brand-500/50 transition-all">
                {/* Image or Placeholder Thumbnail */}
                <div
                  class="h-36 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-neutral-900 dark:to-black border-b border-gray-100 dark:border-neutral-800 flex items-center justify-center cursor-pointer relative overflow-hidden"
                  onClick={() => setPreviewBill(bill)}
                >
                  <Show
                    when={bill.imageUrl}
                    fallback={
                      <div class="text-center p-4 flex flex-col items-center">
                        <IconFileText class="w-8 h-8 text-gray-400 dark:text-neutral-500 mb-1" />
                        <span class="text-[10px] font-mono text-gray-400 dark:text-neutral-500 font-bold uppercase">{bill.invoiceNumber}</span>
                      </div>
                    }
                  >
                    <img src={bill.imageUrl} alt={bill.invoiceNumber} class="w-full h-full object-cover group-hover:scale-105 transition duration-200" />
                  </Show>
                  <span class="absolute top-2 right-2 text-[9px] bg-white/90 dark:bg-black/80 backdrop-blur-sm text-gray-700 dark:text-neutral-200 px-2 py-0.5 rounded-full font-bold shadow-sm border border-transparent dark:border-neutral-700">
                    {bill.category}
                  </span>
                </div>

                {/* Details */}
                <div class="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 class="font-bold text-xs text-gray-900 dark:text-white line-clamp-1 mb-0.5">{bill.vendorName}</h4>
                    <p class="text-[10px] font-mono text-gray-400 dark:text-neutral-400 mb-2">Inv #{bill.invoiceNumber} • {bill.billDate}</p>
                    <Show when={bill.notes}>
                      <p class="text-[11px] text-gray-500 dark:text-neutral-300 line-clamp-2 bg-gray-50 dark:bg-neutral-900 p-1.5 rounded-md mb-2 border border-gray-100 dark:border-neutral-800">{bill.notes}</p>
                    </Show>
                  </div>

                  <div class="pt-2 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                    <span class="text-sm font-black text-emerald-600 dark:text-emerald-400 font-heading">
                      {formatNepaliCurrency(bill.amount)}
                    </span>
                    <div class="flex items-center gap-1">
                      <button
                        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                        title="View bill"
                        onClick={() => setPreviewBill(bill)}
                      >
                        <IconEye class="w-3.5 h-3.5" />
                      </button>
                      <button
                        class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                        title="Delete bill"
                        onClick={() => deleteBill(bill.id)}
                      >
                        <IconTrash class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Upload Modal */}
      <Show when={showUploadModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowUploadModal(false)}>
          <div class="modal-content !max-w-lg p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="font-bold text-base text-gray-900 dark:text-white">Upload Purchase Bill or Voucher</h3>
              <button onClick={() => setShowUploadModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} class="space-y-3.5">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Vendor / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Himalayan Beverage, Nepal Telecom"
                  value={vendorName()}
                  onInput={(e) => setVendorName(e.currentTarget.value)}
                  class="input-field"
                  autofocus
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Invoice / Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-1049"
                    value={invoiceNumber()}
                    onInput={(e) => setInvoiceNumber(e.currentTarget.value)}
                    class="input-field font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Bill Amount (NPR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount() || ''}
                    onInput={(e) => setAmount(Number(e.currentTarget.value))}
                    class="input-field font-mono font-bold"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={billDate()}
                    onInput={(e) => setBillDate(e.currentTarget.value)}
                    class="input-field text-xs font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Expense Category</label>
                  <select
                    value={category()}
                    onChange={(e) => setCategory(e.currentTarget.value)}
                    class="input-field text-xs"
                  >
                    <option value="Inventory Purchase">Inventory Purchase</option>
                    <option value="Utilities">Utilities (Electricity/Water)</option>
                    <option value="Rent">Shop Rent</option>
                    <option value="Transport">Transport & Freight</option>
                    <option value="Repairs">Shop Repairs & Maintenance</option>
                    <option value="Other">Other Expenses</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Bill Image / Photo Receipt</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  class="block w-full text-xs text-gray-500 dark:text-neutral-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 dark:file:bg-neutral-900 file:text-brand-700 dark:file:text-brand-400 hover:file:bg-brand-100 dark:hover:file:bg-neutral-800 cursor-pointer"
                />
                <Show when={imagePreview()}>
                  <div class="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-800">
                    <img src={imagePreview()} alt="Preview" class="w-full h-full object-cover" />
                    <button
                      type="button"
                      class="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                      onClick={() => setImagePreview('')}
                    >
                      <IconX class="w-3 h-3" />
                    </button>
                  </div>
                </Show>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via Fonepay Dynamic QR from counter"
                  value={notes()}
                  onInput={(e) => setNotes(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div class="pt-3 flex gap-2 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  class="btn-outline flex-1 justify-center text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary flex-1 justify-center text-xs"
                >
                  Save Bill Record
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Bill Zoom / Preview Modal */}
      <Show when={previewBill()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setPreviewBill(null)}>
          <div class="modal-content !max-w-lg p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <div>
                <h3 class="font-bold text-base text-gray-900 dark:text-white">{previewBill()?.vendorName}</h3>
                <p class="text-xs text-gray-400 dark:text-neutral-400 font-mono">Invoice #{previewBill()?.invoiceNumber} • {previewBill()?.billDate}</p>
              </div>
              <button onClick={() => setPreviewBill(null)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <Show when={previewBill()?.imageUrl}>
              <div class="rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800 mb-4 max-h-80 flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
                <img src={previewBill()?.imageUrl} alt={previewBill()?.invoiceNumber} class="max-h-80 object-contain w-full" />
              </div>
            </Show>

            <div class="space-y-2 text-xs text-gray-600 dark:text-neutral-300 mb-4">
              <div class="flex justify-between py-1 border-b border-gray-50 dark:border-neutral-800">
                <span>Category:</span>
                <span class="font-bold text-gray-800 dark:text-white">{previewBill()?.category}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-gray-50 dark:border-neutral-800">
                <span>Total Amount:</span>
                <span class="font-black text-emerald-600 dark:text-emerald-400 text-sm">{formatNepaliCurrency(previewBill()?.amount || 0)}</span>
              </div>
              <Show when={previewBill()?.notes}>
                <div class="py-1">
                  <span class="block text-gray-400 dark:text-neutral-400 mb-0.5">Notes:</span>
                  <p class="bg-gray-50 dark:bg-neutral-900 p-2 rounded-lg text-gray-700 dark:text-neutral-200 border border-gray-100 dark:border-neutral-800">{previewBill()?.notes}</p>
                </div>
              </Show>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
              <button class="btn-outline text-xs" onClick={() => setPreviewBill(null)}>Close</button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
