import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import { bills, addBill, updateBillPrimaryImage, deleteBill, setActiveTab, currentBusiness, setShowSubscriptionModal, type BillItem } from '../../db/localDb';
import { isAuthenticated } from '../../db/auth';
import { formatNepaliCurrency } from '@byapar/core';
import { checkBillUploadLimit } from '../../services/planLimits';
import { uploadBillImageWeb } from '../../services/billImageUploadService';
import { compressWebImage, WebCompressedImageResult } from '../../services/imageCompressionService';
import { BillImageViewer } from '../bills/BillImageViewer';
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
  
  // Image & Upload Processing State
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [compressedResult, setCompressedResult] = createSignal<WebCompressedImageResult | null>(null);
  const [imagePreview, setImagePreview] = createSignal<string>('');
  const [isCompressing, setIsCompressing] = createSignal<boolean>(false);
  const [isUploading, setIsUploading] = createSignal<boolean>(false);
  const [uploadProgress, setUploadProgress] = createSignal<number>(0);
  const [uploadStatusText, setUploadStatusText] = createSignal<string>('');
  const [uploadError, setUploadError] = createSignal<string>('');

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

  const handleFileUpload = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsCompressing(true);
    setUploadError('');

    try {
      const res = await compressWebImage(file);
      setCompressedResult(res);
      setImagePreview(res.previewUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setUploadError('Failed to process image. Please try another file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearImage = () => {
    setImagePreview('');
    setSelectedFile(null);
    setCompressedResult(null);
    setUploadError('');
  };

  const handleSaveBill = async (e: Event) => {
    e.preventDefault();
    if (!vendorName() || !amount() || isUploading() || isCompressing()) return;

    setIsUploading(true);
    setUploadError('');
    setUploadProgress(10);
    setUploadStatusText('Preparing record...');

    try {
      const isDemoMode = currentBusiness.id === 'a0000000-0000-0000-0000-000000000001' || !isAuthenticated();
      const newBillId = crypto.randomUUID();
      const trimmedVendor = vendorName().trim();
      const genInvoice = invoiceNumber().trim() || `VCH-${Math.floor(1000 + Math.random() * 9000)}`;
      const comp = compressedResult();

      if (isDemoMode) {
        // In local demo / guest mode, save instantly with preview URL
        await addBill({
          id: newBillId,
          vendorName: trimmedVendor,
          invoiceNumber: genInvoice,
          amount: amount(),
          billDate: billDate(),
          category: category(),
          notes: notes().trim() || undefined,
          imageUrl: comp?.previewUrl,
        });
      } else {
        // 1. Insert the bill record first so the row exists in Supabase PostgreSQL
        setUploadStatusText('Creating bill record...');
        await addBill({
          id: newBillId,
          vendorName: trimmedVendor,
          invoiceNumber: genInvoice,
          amount: amount(),
          billDate: billDate(),
          category: category(),
          notes: notes().trim() || undefined,
        });

        // 2. If an image is selected, upload directly to Cloudflare R2
        if (comp) {
          setUploadStatusText('Uploading receipt to Cloudflare R2...');
          const uploadRes = await uploadBillImageWeb({
            fileOrBlob: comp, // passes already compressed result directly - no 2x compression!
            businessId: currentBusiness.id,
            billId: newBillId,
            onProgress: (p) => {
              setUploadProgress(p);
              if (p < 30) setUploadStatusText(`Preparing session (${p}%)...`);
              else if (p < 85) setUploadStatusText(`Uploading receipt (${p}%)...`);
              else setUploadStatusText('Verifying size & integrity...');
            },
          });

          // 3. Link confirmed primary image
          await updateBillPrimaryImage(newBillId, uploadRes.imageId);
        }
      }

      setShowUploadModal(false);
      // Reset Form
      setVendorName('');
      setInvoiceNumber('');
      setAmount(0);
      setBillDate(new Date().toISOString().split('T')[0]);
      setCategory('Inventory Purchase');
      setNotes('');
      handleClearImage();
    } catch (err: any) {
      console.error('Failed to save bill:', err);
      setUploadError(err.message || 'Failed to save bill and upload image.');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
      setUploadProgress(0);
    }
  };

  const handleOpenUploadModal = async () => {
    const check = await checkBillUploadLimit(currentBusiness.id);
    if (!check.allowed) {
      alert(check.message);
      setShowSubscriptionModal(true);
      return;
    }
    handleClearImage();
    setShowUploadModal(true);
  };

  return (
    <div class="p-6 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
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
            <button class="btn-primary text-xs flex items-center gap-2" onClick={handleOpenUploadModal}>
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
                    when={bill.imageUrl || bill.primaryImageId}
                    fallback={
                      <div class="text-center p-4 flex flex-col items-center">
                        <IconFileText class="w-8 h-8 text-gray-400 dark:text-neutral-500 mb-1" />
                        <span class="text-[10px] font-mono text-gray-400 dark:text-neutral-500 font-bold uppercase">{bill.invoiceNumber}</span>
                      </div>
                    }
                  >
                    <BillImageViewer
                      imageUrl={bill.imageUrl}
                      primaryImageId={bill.primaryImageId}
                      businessId={currentBusiness.id}
                      alt={bill.invoiceNumber}
                      class="w-full h-full group-hover:scale-105 transition duration-200"
                    />
                  </Show>
                  <span class="absolute top-2 right-2 text-[9px] bg-white/90 dark:bg-black/80 backdrop-blur-sm text-gray-700 dark:text-neutral-200 px-2 py-0.5 rounded-full font-bold shadow-sm border border-transparent dark:border-neutral-700 z-10">
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
        <div class="modal-overlay animate-fade-in" onClick={() => !isUploading() && setShowUploadModal(false)}>
          <div class="modal-content !max-w-lg p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="font-bold text-base text-gray-900 dark:text-white">Upload Purchase Bill or Voucher</h3>
              <button
                disabled={isUploading()}
                onClick={() => setShowUploadModal(false)}
                class="text-gray-400 hover:text-gray-600 dark:hover:text-white disabled:opacity-50"
              >
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <Show when={uploadError()}>
              <div class="p-3 mb-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                {uploadError()}
              </div>
            </Show>

            <Show when={currentBusiness.id === 'a0000000-0000-0000-0000-000000000001' || !isAuthenticated()}>
              <div class="p-2.5 mb-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <span>💡</span>
                <span>You are in local demo mode. Bill receipt will be saved locally. Sign in to your business store to sync directly to private Cloudflare R2 storage.</span>
              </div>
            </Show>

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
                  disabled={isUploading()}
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
                    disabled={isUploading()}
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
                    disabled={isUploading()}
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
                    disabled={isUploading()}
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Expense Category</label>
                  <select
                    value={category()}
                    onChange={(e) => setCategory(e.currentTarget.value)}
                    class="input-field text-xs"
                    disabled={isUploading()}
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
                  disabled={isUploading() || isCompressing()}
                  class="block w-full text-xs text-gray-500 dark:text-neutral-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 dark:file:bg-neutral-900 file:text-brand-700 dark:file:text-brand-400 hover:file:bg-brand-100 dark:hover:file:bg-neutral-800 cursor-pointer disabled:opacity-50"
                />

                <Show when={isCompressing()}>
                  <p class="text-[11px] text-brand-600 dark:text-brand-400 mt-1 flex items-center gap-1.5 animate-pulse">
                    <span class="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    Optimizing & downscaling receipt...
                  </p>
                </Show>

                <Show when={compressedResult() && imagePreview()}>
                  <div class="mt-2.5 flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800">
                    <div class="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 dark:border-neutral-800 shrink-0">
                      <img src={imagePreview()} alt="Preview" class="w-full h-full object-cover" />
                      <button
                        type="button"
                        disabled={isUploading()}
                        class="absolute top-0.5 right-0.5 bg-black/70 hover:bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px]"
                        onClick={handleClearImage}
                        title="Remove image"
                      >
                        <IconX class="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div class="text-[11px] space-y-0.5">
                      <div class="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span>✓ Receipt Optimized (WebP)</span>
                      </div>
                      <p class="text-gray-500 dark:text-neutral-400">
                        Size: {(compressedResult()!.fileSizeBytes / 1024).toFixed(0)} KB
                        <Show when={selectedFile()}>
                          {' '}(down from {(selectedFile()!.size / 1024).toFixed(0)} KB)
                        </Show>
                      </p>
                      <p class="text-[10px] text-gray-400 dark:text-neutral-500">
                        Dimensions: {compressedResult()!.width} × {compressedResult()!.height} px
                      </p>
                    </div>
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
                  disabled={isUploading()}
                />
              </div>

              <Show when={isUploading()}>
                <div class="space-y-1.5 p-3 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 text-xs">
                  <div class="flex items-center justify-between text-brand-700 dark:text-brand-300 font-semibold">
                    <span class="flex items-center gap-1.5">
                      <span class="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      {uploadStatusText()}
                    </span>
                    <span>{uploadProgress()}%</span>
                  </div>
                  <div class="w-full bg-brand-200 dark:bg-brand-900 rounded-full h-1.5 overflow-hidden">
                    <div
                      class="bg-brand-600 dark:bg-brand-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress()}%` }}
                    />
                  </div>
                </div>
              </Show>

              <div class="pt-3 flex gap-2 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  disabled={isUploading()}
                  onClick={() => setShowUploadModal(false)}
                  class="btn-outline flex-1 justify-center text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading() || isCompressing()}
                  class="btn-primary flex-1 justify-center text-xs disabled:opacity-50 flex items-center gap-2"
                >
                  <Show when={isUploading()} fallback={<span>Save Bill Record</span>}>
                    <span class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </Show>
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

            <Show when={previewBill()?.imageUrl || previewBill()?.primaryImageId}>
              <div class="rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800 mb-4 max-h-80 flex items-center justify-center bg-gray-50 dark:bg-neutral-900">
                <BillImageViewer
                  imageUrl={previewBill()?.imageUrl}
                  primaryImageId={previewBill()?.primaryImageId}
                  businessId={currentBusiness.id}
                  alt={previewBill()?.invoiceNumber}
                  class="max-h-80 w-full"
                  imgClass="max-h-80 object-contain w-full"
                />
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
