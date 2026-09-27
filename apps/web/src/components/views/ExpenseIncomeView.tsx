import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  expenses,
  incomes,
  addExpense,
  updateExpense,
  deleteExpense,
  addIncome,
  updateIncome,
  deleteIncome,
  customExpenseCategories,
  customIncomeCategories,
  addExpenseCategory,
  deleteExpenseCategory,
  addIncomeCategory,
  deleteIncomeCategory,
  setActiveTab,
  currentBusiness,
  type ExpenseRecord,
  type IncomeRecord,
} from '../../db/localDb';
import { isAuthenticated } from '../../db/auth';
import { formatNepaliCurrency } from '@byapar/core';
import { currentLang } from '../../services/i18n';
import { compressWebImage, WebCompressedImageResult } from '../../services/imageCompressionService';
import { uploadBillImageWeb } from '../../services/billImageUploadService';
import { BillImageViewer } from '../bills/BillImageViewer';
import { checkBillUploadLimit } from '../../services/planLimits';
import {
  IconExpense,
  IconIncome,
  IconPlus,
  IconTrash,
  IconX,
  IconEdit,
  IconSearch,
  IconCheck,
} from '../icons';

const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent', 'Salary', 'Utilities', 'Transport', 'Supplies', 'Food', 'Marketing', 'Packaging', 'Maintenance', 'Tax / License', 'Other'
];

const DEFAULT_INCOME_SOURCES = [
  'Sales', 'Service Fee', 'Commission', 'Interest', 'Rental Income', 'Cashback / Discount', 'Asset Sale', 'Other'
];

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Fonepay QR', 'eSewa', 'Khalti', 'ConnectIPS', 'Cheque'];

type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

interface ExpenseIncomeViewProps {
  type: 'expense' | 'income';
}

export const ExpenseIncomeView: Component<ExpenseIncomeViewProps> = (props) => {
  const isExpense = () => props.type === 'expense';

  // Filters state
  const [dateFilter, setDateFilter] = createSignal<DateFilterType>('month');
  const [customStartDate, setCustomStartDate] = createSignal('');
  const [customEndDate, setCustomEndDate] = createSignal('');
  const [showCustomDateModal, setShowCustomDateModal] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedCategory, setSelectedCategory] = createSignal('All');

  // Form / Edit state
  const [showModal, setShowModal] = createSignal(false);
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [formCategory, setFormCategory] = createSignal('');
  const [formAmount, setFormAmount] = createSignal<number>(0);
  const [formPaymentMode, setFormPaymentMode] = createSignal('Cash');
  const [formDate, setFormDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [formParty, setFormParty] = createSignal('');
  const [formNote, setFormNote] = createSignal('');
  const [formReceiptUrl, setFormReceiptUrl] = createSignal('');
  const [formPrimaryImageId, setFormPrimaryImageId] = createSignal<string | undefined>(undefined);

  // Upload & compression state
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [compressedResult, setCompressedResult] = createSignal<WebCompressedImageResult | null>(null);
  const [isCompressing, setIsCompressing] = createSignal<boolean>(false);
  const [isUploading, setIsUploading] = createSignal<boolean>(false);
  const [uploadProgress, setUploadProgress] = createSignal<number>(0);
  const [uploadStatusText, setUploadStatusText] = createSignal<string>('');
  const [uploadError, setUploadError] = createSignal<string>('');

  // Category Manager modal
  const [showCategoryModal, setShowCategoryModal] = createSignal(false);
  const [newCatName, setNewCatName] = createSignal('');

  // Image preview modal
  const [previewImageUrl, setPreviewImageUrl] = createSignal<string | null>(null);
  const [previewRecord, setPreviewRecord] = createSignal<{ primaryImageId?: string; receiptUrl?: string; title?: string } | null>(null);

  // Full Details modal
  const [selectedDetailRecord, setSelectedDetailRecord] = createSignal<ExpenseRecord | IncomeRecord | null>(null);

  // Categories list (defaults + user custom)
  const allCategories = createMemo(() => {
    if (isExpense()) {
      return [...DEFAULT_EXPENSE_CATEGORIES, ...customExpenseCategories];
    } else {
      return [...DEFAULT_INCOME_SOURCES, ...customIncomeCategories];
    }
  });

  // Calculate Date bounds for filtering
  const isDateInFilter = (dateStr: string) => {
    if (!dateStr) return false;
    const filter = dateFilter();
    if (filter === 'all') return true;

    const itemDate = new Date(dateStr);
    itemDate.setHours(0, 0, 0, 0);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === 'today') {
      return itemDate.getTime() === today.getTime();
    }

    if (filter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return itemDate.getTime() === yesterday.getTime();
    }

    if (filter === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return itemDate >= startOfWeek && itemDate <= today;
    }

    if (filter === 'month') {
      return itemDate.getFullYear() === today.getFullYear() && itemDate.getMonth() === today.getMonth();
    }

    if (filter === 'year') {
      return itemDate.getFullYear() === today.getFullYear();
    }

    if (filter === 'custom') {
      if (!customStartDate()) return true;
      const start = new Date(customStartDate());
      start.setHours(0, 0, 0, 0);
      const end = customEndDate() ? new Date(customEndDate()) : new Date();
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    }

    return true;
  };

  // Filtered & Sorted records
  const filteredRecords = createMemo(() => {
    const raw = isExpense() ? expenses : incomes;
    const q = searchQuery().toLowerCase().trim();
    const cat = selectedCategory();

    return [...raw]
      .filter((rec) => {
        const d = (rec as any).date;
        if (!isDateInFilter(d)) return false;

        const recCat = isExpense() ? (rec as ExpenseRecord).category : (rec as IncomeRecord).source;
        if (cat !== 'All' && recCat !== cat) return false;

        if (q) {
          const party = isExpense() ? (rec as ExpenseRecord).recipientName || '' : (rec as IncomeRecord).payerName || '';
          const note = rec.note || '';
          const match =
            recCat.toLowerCase().includes(q) ||
            party.toLowerCase().includes(q) ||
            note.toLowerCase().includes(q) ||
            rec.paymentMode.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  const totalAmount = createMemo(() => {
    return filteredRecords().reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormCategory(allCategories()[0] || '');
    setFormAmount(0);
    setFormPaymentMode('Cash');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormParty('');
    setFormNote('');
    setFormReceiptUrl('');
    setFormPrimaryImageId(undefined);
    handleClearImage();
    setShowModal(true);
  };

  const handleOpenEdit = (rec: ExpenseRecord | IncomeRecord) => {
    setEditingId(rec.id);
    if (isExpense()) {
      const e = rec as ExpenseRecord;
      setFormCategory(e.category);
      setFormParty(e.recipientName || '');
    } else {
      const i = rec as IncomeRecord;
      setFormCategory(i.source);
      setFormParty(i.payerName || '');
    }
    setFormAmount(rec.amount);
    setFormPaymentMode(rec.paymentMode);
    setFormDate(rec.date);
    setFormNote(rec.note || '');
    setFormReceiptUrl(rec.receiptUrl || '');
    setFormPrimaryImageId(rec.primaryImageId);
    handleClearImage();
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!formCategory() || formAmount() <= 0) return;

    const isDemoMode = currentBusiness.id === 'a0000000-0000-0000-0000-000000000001' || !isAuthenticated();
    const comp = compressedResult();

    if (comp && !isDemoMode) {
      const limitCheck = await checkBillUploadLimit(currentBusiness.id);
      if (!limitCheck.allowed) {
        alert(limitCheck.message || 'Daily bill upload limit reached');
        return;
      }
    }

    setIsUploading(true);
    setUploadError('');
    setUploadProgress(10);
    setUploadStatusText('Preparing record...');

    try {
      if (editingId()) {
        // Edit existing
        const baseUpdates: any = {
          amount: formAmount(),
          paymentMode: formPaymentMode(),
          date: formDate(),
          note: formNote().trim() || undefined,
        };

        if (isExpense()) {
          baseUpdates.category = formCategory();
          baseUpdates.recipientName = formParty().trim() || undefined;
        } else {
          baseUpdates.source = formCategory();
          baseUpdates.payerName = formParty().trim() || undefined;
        }

        // If user removed the existing receipt image
        if (!comp && !formPrimaryImageId() && !formReceiptUrl()) {
          baseUpdates.primaryImageId = undefined;
          baseUpdates.receiptUrl = undefined;
        }

        if (isExpense()) {
          await updateExpense(editingId()!, baseUpdates);
        } else {
          await updateIncome(editingId()!, baseUpdates);
        }

        // If a new image was selected, upload it
        if (comp && !isDemoMode) {
          setUploadStatusText('Uploading receipt to cloud...');
          const uploadRes = await uploadBillImageWeb({
            fileOrBlob: comp,
            businessId: currentBusiness.id,
            onProgress: (p) => {
              setUploadProgress(p);
              if (p < 30) setUploadStatusText(`Preparing session (${p}%)...`);
              else if (p < 85) setUploadStatusText(`Uploading receipt (${p}%)...`);
              else setUploadStatusText('Verifying integrity...');
            },
          });
          // Link uploaded image to the record
          if (isExpense()) {
            await updateExpense(editingId()!, { primaryImageId: uploadRes.imageId });
          } else {
            await updateIncome(editingId()!, { primaryImageId: uploadRes.imageId });
          }
        } else if (comp && isDemoMode) {
          // Demo mode: save preview URL as receiptUrl
          if (isExpense()) {
            await updateExpense(editingId()!, { receiptUrl: comp.previewUrl });
          } else {
            await updateIncome(editingId()!, { receiptUrl: comp.previewUrl });
          }
        }
      } else {
        // Create new
        const newId = crypto.randomUUID();

        if (isExpense()) {
          setUploadStatusText('Creating expense record...');
          await addExpense({
            id: newId,
            category: formCategory(),
            amount: formAmount(),
            paymentMode: formPaymentMode(),
            date: formDate(),
            recipientName: formParty().trim() || undefined,
            note: formNote().trim() || undefined,
            receiptUrl: (isDemoMode && comp) ? comp.previewUrl : undefined,
          });
        } else {
          setUploadStatusText('Creating income record...');
          await addIncome({
            id: newId,
            source: formCategory(),
            amount: formAmount(),
            paymentMode: formPaymentMode(),
            date: formDate(),
            payerName: formParty().trim() || undefined,
            note: formNote().trim() || undefined,
            receiptUrl: (isDemoMode && comp) ? comp.previewUrl : undefined,
          });
        }

        // Upload image to R2 if selected and authenticated
        if (comp && !isDemoMode) {
          setUploadStatusText('Uploading receipt to cloud...');
          const uploadRes = await uploadBillImageWeb({
            fileOrBlob: comp,
            businessId: currentBusiness.id,
            onProgress: (p) => {
              setUploadProgress(p);
              if (p < 30) setUploadStatusText(`Preparing session (${p}%)...`);
              else if (p < 85) setUploadStatusText(`Uploading receipt (${p}%)...`);
              else setUploadStatusText('Verifying integrity...');
            },
          });
          // Link uploaded image to the record
          if (isExpense()) {
            await updateExpense(newId, { primaryImageId: uploadRes.imageId });
          } else {
            await updateIncome(newId, { primaryImageId: uploadRes.imageId });
          }
        }
      }

      setShowModal(false);
      handleClearImage();
    } catch (err: any) {
      console.error('Failed to save record:', err);
      setUploadError(err.message || 'Failed to save record and upload image.');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmMsg = currentLang() === 'ne'
      ? `के तपाईं यो ${isExpense() ? 'खर्च' : 'आम्दानी'} मेटाउन निश्चित हुनुहुन्छ?`
      : `Are you sure you want to delete this ${isExpense() ? 'expense' : 'income'} entry (${name})?`;

    if (window.confirm(confirmMsg)) {
      if (isExpense()) {
        await deleteExpense(id);
      } else {
        await deleteIncome(id);
      }
    }
  };

  /** Compress image on file selection (same pattern as BillGalleryView) */
  const handleFileSelect = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsCompressing(true);
    setUploadError('');

    try {
      const res = await compressWebImage(file);
      setCompressedResult(res);
      setFormReceiptUrl(res.previewUrl);
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setUploadError('Failed to process image. Please try another file.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setCompressedResult(null);
    setUploadError('');
  };

  const handleAddCategory = (e: Event) => {
    e.preventDefault();
    const name = newCatName().trim();
    if (!name) return;
    if (isExpense()) {
      addExpenseCategory(name);
    } else {
      addIncomeCategory(name);
    }
    setNewCatName('');
  };

  const dateFilterLabels: Record<DateFilterType, { en: string; ne: string }> = {
    today: { en: 'Today', ne: 'आज' },
    yesterday: { en: 'Yesterday', ne: 'हिजो' },
    week: { en: 'This Week', ne: 'यो हप्ता' },
    month: { en: 'This Month', ne: 'यो महिना' },
    year: { en: 'This Year', ne: 'यो वर्ष' },
    all: { en: 'All Time', ne: 'सबै' },
    custom: { en: 'Custom Date', ne: 'आफ्नो मिति' },
  };

  return (
    <div class="p-4 sm:p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span class={`p-2 rounded-xl ${isExpense() ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'}`}>
                {isExpense() ? <IconExpense class="w-5 h-5" /> : <IconIncome class="w-5 h-5" />}
              </span>
              <span>{isExpense() ? (currentLang() === 'ne' ? 'खर्च व्यवस्थापन' : 'Expenses Management') : (currentLang() === 'ne' ? 'आम्दानी व्यवस्थापन' : 'Income Management')}</span>
            </h1>
            <p class="text-xs text-gray-400 dark:text-neutral-400 mt-0.5">
              {isExpense()
                ? (currentLang() === 'ne' ? 'पसलको दैनिक तथा मासिक खर्चहरूको हिसाब' : 'Track and manage operational store expenditures')
                : (currentLang() === 'ne' ? 'बिक्री बाहेकका अन्य आम्दानी तथा सेवा शुल्क' : 'Track miscellaneous revenues and service incomes')}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            class="btn-outline text-xs flex items-center gap-1.5 py-2 px-3"
            onClick={() => setShowCategoryModal(true)}
          >
            <span>🏷️</span>
            <span>{currentLang() === 'ne' ? 'शीर्षक व्यवस्थापन' : 'Manage Categories'}</span>
          </button>

          <button
            class={`flex items-center gap-2 shadow-lg py-2.5 px-4 font-bold text-xs rounded-xl ${
              isExpense() ? 'btn-danger shadow-red-500/20' : 'btn-primary shadow-emerald-500/20'
            }`}
            onClick={handleOpenAdd}
          >
            <IconPlus class="w-4 h-4" />
            <span>{isExpense() ? (currentLang() === 'ne' ? '+ खर्च थप्नुहोस्' : '+ Add Expense') : (currentLang() === 'ne' ? '+ आम्दानी थप्नुहोस्' : '+ Add Income')}</span>
          </button>
        </div>
      </div>

      {/* KPI & Summary Hero Bar */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Metric Card */}
        <div class="stat-card border-l-4 !border-l-primary flex items-center justify-between p-5">
          <div>
            <span class="text-xs font-semibold text-gray-400 dark:text-neutral-400 uppercase tracking-wider">
              {isExpense() ? (currentLang() === 'ne' ? 'कुल खर्च (फिल्टर)' : 'Total Expenses') : (currentLang() === 'ne' ? 'कुल आम्दानी (फिल्टर)' : 'Total Income')}
            </span>
            <p class={`text-2xl sm:text-3xl font-extrabold mt-1 font-mono ${isExpense() ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatNepaliCurrency(totalAmount())}
            </p>
            <p class="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
              {filteredRecords().length} {currentLang() === 'ne' ? 'लेनदेनहरू रेकर्ड' : 'entries in selected period'}
            </p>
          </div>
          <div class={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isExpense() ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
          }`}>
            {isExpense() ? <IconExpense class="w-6 h-6" /> : <IconIncome class="w-6 h-6" />}
          </div>
        </div>

        {/* Selected Period Card */}
        <div class="stat-card flex items-center justify-between p-5">
          <div>
            <span class="text-xs font-semibold text-gray-400 dark:text-neutral-400 uppercase tracking-wider">
              {currentLang() === 'ne' ? 'समय अवधि' : 'Active Date Range'}
            </span>
            <p class="text-base font-bold text-gray-900 dark:text-white mt-1">
              {dateFilterLabels[dateFilter()][currentLang() === 'ne' ? 'ne' : 'en']}
            </p>
            <Show when={dateFilter() === 'custom' && customStartDate()}>
              <p class="text-[11px] font-mono text-gray-400 dark:text-neutral-500 mt-1">
                {customStartDate()} {customEndDate() ? `— ${customEndDate()}` : ''}
              </p>
            </Show>
            <Show when={dateFilter() !== 'custom'}>
              <p class="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
                {currentLang() === 'ne' ? 'तलबाट छिटो मिति बदल्नुहोस्' : 'Filter below by day, week, month or custom'}
              </p>
            </Show>
          </div>
          <button
            onClick={() => setShowCustomDateModal(true)}
            class="text-xs text-primary hover:underline font-semibold"
          >
            {currentLang() === 'ne' ? 'मिति छान्नुहोस्' : 'Change Date'}
          </button>
        </div>

        {/* Categories Distribution Summary */}
        <div class="stat-card flex items-center justify-between p-5">
          <div>
            <span class="text-xs font-semibold text-gray-400 dark:text-neutral-400 uppercase tracking-wider">
              {currentLang() === 'ne' ? 'सक्रिय शीर्षक' : 'Active Categories'}
            </span>
            <p class="text-base font-bold text-gray-900 dark:text-white mt-1">
              {allCategories().length} {currentLang() === 'ne' ? 'उपलब्ध शीर्षकहरू' : 'Total Categories'}
            </p>
            <p class="text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
              {isExpense() ? customExpenseCategories.length : customIncomeCategories.length} {currentLang() === 'ne' ? 'आफ्नै थपेका' : 'custom defined'}
            </p>
          </div>
          <button
            onClick={() => setShowCategoryModal(true)}
            class="text-xs text-primary hover:underline font-semibold"
          >
            {currentLang() === 'ne' ? '+ नयाँ शीर्षक' : '+ New Category'}
          </button>
        </div>
      </div>

      {/* Date Filter Strip Pills */}
      <div class="stat-card !p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['today', 'yesterday', 'week', 'month', 'year', 'all', 'custom'] as DateFilterType[]).map((f) => (
            <button
              class={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                dateFilter() === f
                  ? isExpense()
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
              }`}
              onClick={() => {
                setDateFilter(f);
                if (f === 'custom') setShowCustomDateModal(true);
              }}
            >
              {dateFilterLabels[f][currentLang() === 'ne' ? 'ne' : 'en']}
            </button>
          ))}
        </div>

        {/* Search & Category Filter inline */}
        <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search Input */}
          <div class="relative flex-1 md:w-56">
            <IconSearch class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={currentLang() === 'ne' ? 'खोज्नुहोस्...' : 'Search records...'}
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="input-field !py-1.5 !pl-9 text-xs"
            />
            <Show when={searchQuery()}>
              <button
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setSearchQuery('')}
              >
                <IconX class="w-3.5 h-3.5" />
              </button>
            </Show>
          </div>

          {/* Category Dropdown */}
          <select
            class="input-field !py-1.5 text-xs w-auto"
            value={selectedCategory()}
            onChange={(e) => setSelectedCategory(e.currentTarget.value)}
          >
            <option value="All">{currentLang() === 'ne' ? 'सबै शीर्षकहरू' : 'All Categories'}</option>
            <For each={allCategories()}>
              {(cat) => <option value={cat}>{cat}</option>}
            </For>
          </select>
        </div>
      </div>

      {/* Records List Table / Cards */}
      <Show
        when={filteredRecords().length > 0}
        fallback={
          <div class="stat-card text-center py-16 flex flex-col items-center">
            <div class={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${
              isExpense() ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
            }`}>
              {isExpense() ? <IconExpense class="w-8 h-8" /> : <IconIncome class="w-8 h-8" />}
            </div>
            <p class="text-sm font-semibold text-gray-700 dark:text-white mb-1">
              {isExpense()
                ? (currentLang() === 'ne' ? 'यो अवधिमा कुनै खर्च रेकर्ड छैन' : 'No expenses recorded in this period')
                : (currentLang() === 'ne' ? 'यो अवधिमा कुनै आम्दानी रेकर्ड छैन' : 'No income recorded in this period')}
            </p>
            <p class="text-xs text-gray-400 dark:text-neutral-500 mb-4 max-w-sm">
              {currentLang() === 'ne'
                ? 'माथिको मिति फिल्टर परिवर्तन गर्नुहोस् वा नयाँ प्रविष्टि थप्नुहोस्।'
                : 'Try adjusting the date filters above or add a new transaction entry.'}
            </p>
            <button
              class={`flex items-center gap-1.5 text-xs ${isExpense() ? 'btn-danger' : 'btn-primary'}`}
              onClick={handleOpenAdd}
            >
              <IconPlus class="w-3.5 h-3.5" />
              <span>{isExpense() ? (currentLang() === 'ne' ? 'खर्च थप्नुहोस्' : 'Add Expense') : (currentLang() === 'ne' ? 'आम्दानी थप्नुहोस्' : 'Add Income')}</span>
            </button>
          </div>
        }
      >
        <div class="space-y-2.5">
          <For each={filteredRecords()}>
            {(rec) => {
              const cat = isExpense() ? (rec as ExpenseRecord).category : (rec as IncomeRecord).source;
              const party = isExpense() ? (rec as ExpenseRecord).recipientName : (rec as IncomeRecord).payerName;
              return (
                <div
                  class="stat-card flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:border-primary/40 transition-colors !p-4 cursor-pointer"
                  onClick={() => setSelectedDetailRecord(rec)}
                >
                  {/* Left info */}
                  <div class="flex items-center gap-3.5 min-w-[200px]">
                    <div class={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold uppercase shrink-0 ${
                      isExpense()
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {cat.substring(0, 2)}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-gray-900 dark:text-white">{cat}</span>
                        <Show when={party}>
                          <span class="text-[11px] bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 px-2 py-0.5 rounded-md font-medium">
                            {party}
                          </span>
                        </Show>
                      </div>
                      <div class="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 dark:text-neutral-500 mt-1">
                        <span class="font-mono">{rec.date}</span>
                        <span>•</span>
                        <span class="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 text-[10px] font-semibold">
                          {rec.paymentMode}
                        </span>
                        <Show when={rec.note}>
                          <span>•</span>
                          <span class="italic text-gray-500 dark:text-neutral-400">{rec.note}</span>
                        </Show>
                      </div>
                    </div>
                  </div>

                  {/* Right actions & amount */}
                  <div class="flex items-center gap-4 ml-auto sm:ml-0">
                    {/* Receipt thumbnail if uploaded */}
                    <Show when={rec.primaryImageId || (rec.receiptUrl && !rec.receiptUrl.startsWith('file://') && !rec.receiptUrl.startsWith('content://'))}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewRecord({
                            primaryImageId: rec.primaryImageId,
                            receiptUrl: rec.receiptUrl,
                            title: isExpense() ? (rec as ExpenseRecord).category : (rec as IncomeRecord).source,
                          });
                        }}
                        class="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700 hover:opacity-80 transition relative shrink-0"
                        title="Click to view receipt photo"
                      >
                        <BillImageViewer
                          primaryImageId={rec.primaryImageId}
                          imageUrl={rec.receiptUrl}
                          class="w-full h-full"
                          imgClass="w-full h-full object-cover"
                        />
                      </button>
                    </Show>

                    <div class="text-right">
                      <span class={`text-base font-extrabold font-mono ${
                        isExpense() ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isExpense() ? '−' : '+'} {formatNepaliCurrency(rec.amount)}
                      </span>
                    </div>

                    <div class="flex items-center gap-1">
                      {/* Edit Button */}
                      <button
                        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(rec);
                        }}
                        title="Edit entry"
                      >
                        <IconEdit class="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(rec.id, cat);
                        }}
                        title="Delete entry"
                      >
                        <IconTrash class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* Add / Edit Transaction Modal */}
      <Show when={showModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div
            class="modal-content max-w-lg bg-white dark:bg-black border border-gray-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 class="text-lg font-heading font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{editingId() ? (currentLang() === 'ne' ? 'प्रविष्टि सम्पादन' : 'Edit Entry') : (isExpense() ? (currentLang() === 'ne' ? 'खर्च थप्नुहोस्' : 'Add Expense') : (currentLang() === 'ne' ? 'आम्दानी थप्नुहोस्' : 'Add Income'))}</span>
              </h2>
              <button onClick={() => setShowModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} class="p-6 space-y-4">
              {/* Category & Party Row */}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300">
                      {isExpense() ? (currentLang() === 'ne' ? 'खर्च शीर्षक *' : 'Category *') : (currentLang() === 'ne' ? 'स्रोत *' : 'Source *')}
                    </label>
                    <button
                      type="button"
                      class="text-[11px] text-primary hover:underline font-medium"
                      onClick={() => setShowCategoryModal(true)}
                    >
                      + {currentLang() === 'ne' ? 'नयाँ' : 'New'}
                    </button>
                  </div>
                  <select
                    class="input-field"
                    value={formCategory()}
                    onChange={(e) => setFormCategory(e.currentTarget.value)}
                    required
                  >
                    <option value="">— Select Category —</option>
                    <For each={allCategories()}>
                      {(c) => <option value={c}>{c}</option>}
                    </For>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1.5">
                    {isExpense()
                      ? (currentLang() === 'ne' ? 'पाउने व्यक्ति / फर्म' : 'Paid To (Recipient)')
                      : (currentLang() === 'ne' ? 'दिने व्यक्ति / फर्म' : 'Received From (Payer)')}
                  </label>
                  <input
                    type="text"
                    class="input-field"
                    placeholder="e.g. Landlord, Driver, Vendor..."
                    value={formParty()}
                    onInput={(e) => setFormParty(e.currentTarget.value)}
                  />
                </div>
              </div>

              {/* Amount & Date Row */}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1.5">
                    {currentLang() === 'ne' ? 'रकम (रु.) *' : 'Amount (NPR) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    class="input-field font-mono font-bold text-base"
                    placeholder="0.00"
                    value={formAmount() || ''}
                    onInput={(e) => setFormAmount(Number(e.currentTarget.value))}
                  />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1.5">
                    {currentLang() === 'ne' ? 'मिति *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    class="input-field font-mono"
                    value={formDate()}
                    onInput={(e) => setFormDate(e.currentTarget.value)}
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1.5">
                  {currentLang() === 'ne' ? 'भुक्तानी माध्यम' : 'Payment Mode'}
                </label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <For each={PAYMENT_MODES}>
                    {(mode) => (
                      <button
                        type="button"
                        class={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center ${
                          formPaymentMode() === mode
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-gray-50 dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-100'
                        }`}
                        onClick={() => setFormPaymentMode(mode)}
                      >
                        {mode}
                      </button>
                    )}
                  </For>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1.5">
                  {currentLang() === 'ne' ? 'कैफियत / विवरण (वैकल्पिक)' : 'Notes / Remarks (Optional)'}
                </label>
                <input
                  type="text"
                  class="input-field"
                  placeholder="e.g. Electricity bill for Shrawan, shop maintenance..."
                  value={formNote()}
                  onInput={(e) => setFormNote(e.currentTarget.value)}
                />
              </div>

              {/* Receipt Image Upload */}
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1.5">
                  {currentLang() === 'ne' ? 'बिल वा रसिदको फोटो (वैकल्पिक)' : 'Receipt / Bill Photo (Optional)'}
                </label>

                {/* Show existing image if editing a record with primaryImageId */}
                <Show when={!compressedResult() && formPrimaryImageId()}>
                  <div class="mb-2 flex items-center gap-2">
                    <div class="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700">
                      <BillImageViewer
                        primaryImageId={formPrimaryImageId()}
                        class="w-full h-full"
                        imgClass="w-full h-full object-cover"
                      />
                    </div>
                    <span class="text-[11px] text-gray-500 dark:text-neutral-400">
                      {currentLang() === 'ne' ? 'हालको रसिद फोटो' : 'Current receipt photo'}
                    </span>
                    <button
                      type="button"
                      class="text-xs text-red-500 hover:text-red-700 ml-auto font-medium"
                      onClick={() => { setFormPrimaryImageId(undefined); setFormReceiptUrl(''); }}
                    >
                      {currentLang() === 'ne' ? 'हटाउनुहोस्' : 'Remove'}
                    </button>
                  </div>
                </Show>

                <div class="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isCompressing() || isUploading()}
                    class="text-xs file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-gray-100 dark:file:bg-neutral-800 file:text-gray-700 dark:file:text-neutral-300 file:font-semibold file:cursor-pointer hover:file:bg-gray-200"
                  />

                  {/* Compression spinner */}
                  <Show when={isCompressing()}>
                    <div class="flex items-center gap-1.5 text-xs text-gray-500">
                      <div class="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      <span>{currentLang() === 'ne' ? 'कम्प्रेस गर्दै...' : 'Compressing...'}</span>
                    </div>
                  </Show>

                  {/* Preview thumbnail of newly selected image */}
                  <Show when={compressedResult() && formReceiptUrl()}>
                    <div class="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-300 dark:border-neutral-700">
                      <img src={formReceiptUrl()} alt="Preview" class="w-full h-full object-cover" />
                      <button
                        type="button"
                        class="absolute top-0 right-0 bg-red-500 text-white rounded-bl p-0.5"
                        onClick={() => { setFormReceiptUrl(''); handleClearImage(); }}
                      >
                        <IconX class="w-3 h-3" />
                      </button>
                    </div>
                  </Show>
                </div>

                {/* Upload progress bar */}
                <Show when={isUploading()}>
                  <div class="mt-2 space-y-1">
                    <div class="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-1.5">
                      <div
                        class={`h-1.5 rounded-full transition-all duration-300 ${isExpense() ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${uploadProgress()}%` }}
                      />
                    </div>
                    <p class="text-[11px] text-gray-500 dark:text-neutral-400">{uploadStatusText()}</p>
                  </div>
                </Show>

                {/* Upload error */}
                <Show when={uploadError()}>
                  <p class="mt-1.5 text-xs text-red-500 font-medium">{uploadError()}</p>
                </Show>
              </div>

              {/* Buttons */}
              <div class="pt-3 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3">
                <button
                  type="button"
                  class="btn-outline"
                  onClick={() => setShowModal(false)}
                >
                  {currentLang() === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  class={isExpense() ? 'btn-danger' : 'btn-primary'}
                  disabled={isUploading() || isCompressing()}
                >
                  <Show when={isUploading()}>
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5 inline-block" />
                  </Show>
                  {isUploading()
                    ? (currentLang() === 'ne' ? 'अपलोड हुँदैछ...' : 'Uploading...')
                    : editingId()
                      ? (currentLang() === 'ne' ? 'अपडेट गर्नुहोस्' : 'Update Record')
                      : (isExpense() ? (currentLang() === 'ne' ? 'खर्च सेभ गर्नुहोस्' : 'Save Expense') : (currentLang() === 'ne' ? 'आम्दानी सेभ गर्नुहोस्' : 'Save Income'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Custom Date Range Picker Modal */}
      <Show when={showCustomDateModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowCustomDateModal(false)}>
          <div
            class="modal-content max-w-sm bg-white dark:bg-black border border-gray-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 class="font-bold text-sm text-gray-900 dark:text-white">
                {currentLang() === 'ne' ? 'आफ्नो मिति छान्नुहोस्' : 'Select Custom Date Range'}
              </h3>
              <button onClick={() => setShowCustomDateModal(false)} class="text-gray-400 hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'सुरु मिति (From Date):' : 'Start Date:'}
                </label>
                <input
                  type="date"
                  class="input-field font-mono"
                  value={customStartDate()}
                  onInput={(e) => setCustomStartDate(e.currentTarget.value)}
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'अन्तिम मिति (To Date):' : 'End Date:'}
                </label>
                <input
                  type="date"
                  class="input-field font-mono"
                  value={customEndDate()}
                  onInput={(e) => setCustomEndDate(e.currentTarget.value)}
                />
              </div>

              <div class="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  class="btn-outline text-xs"
                  onClick={() => setShowCustomDateModal(false)}
                >
                  {currentLang() === 'ne' ? 'रद्द' : 'Cancel'}
                </button>
                <button
                  type="button"
                  class="btn-primary text-xs"
                  onClick={() => {
                    setDateFilter('custom');
                    setShowCustomDateModal(false);
                  }}
                >
                  {currentLang() === 'ne' ? 'लागू गर्नुहोस्' : 'Apply Filter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Category Manager Modal */}
      <Show when={showCategoryModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowCategoryModal(false)}>
          <div
            class="modal-content max-w-md bg-white dark:bg-black border border-gray-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="px-5 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 class="font-bold text-sm text-gray-900 dark:text-white">
                {isExpense()
                  ? (currentLang() === 'ne' ? 'खर्च शीर्षकहरू व्यवस्थापन' : 'Manage Expense Categories')
                  : (currentLang() === 'ne' ? 'आम्दानी स्रोतहरू व्यवस्थापन' : 'Manage Income Categories')}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} class="text-gray-400 hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <div class="p-5 space-y-4">
              {/* Add form */}
              <form onSubmit={handleAddCategory} class="flex gap-2">
                <input
                  type="text"
                  placeholder={currentLang() === 'ne' ? 'नयाँ शीर्षकको नाम...' : 'Add custom category name...'}
                  value={newCatName()}
                  onInput={(e) => setNewCatName(e.currentTarget.value)}
                  class="input-field text-xs flex-1"
                />
                <button type="submit" class="btn-primary text-xs shrink-0">
                  <IconPlus class="w-3.5 h-3.5 inline mr-1" />
                  {currentLang() === 'ne' ? 'थप्नुहोस्' : 'Add'}
                </button>
              </form>

              {/* Current Categories List */}
              <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                <p class="text-[11px] font-bold uppercase text-gray-400 dark:text-neutral-500 mb-1">
                  {currentLang() === 'ne' ? 'तपाईंले थपेका शीर्षकहरू' : 'Your Custom Categories'}
                </p>
                <Show
                  when={(isExpense() ? customExpenseCategories : customIncomeCategories).length > 0}
                  fallback={
                    <p class="text-xs text-gray-400 dark:text-neutral-500 italic py-2">
                      {currentLang() === 'ne' ? 'कुनै पनि आफ्नै शीर्षक थपिएको छैन।' : 'No custom categories created yet.'}
                    </p>
                  }
                >
                  <For each={isExpense() ? customExpenseCategories : customIncomeCategories}>
                    {(cat) => (
                      <div class="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-neutral-900 text-xs">
                        <span class="font-medium text-gray-800 dark:text-neutral-200">{cat}</span>
                        <button
                          class="text-gray-400 hover:text-red-500 p-1"
                          onClick={() => {
                            if (isExpense()) deleteExpenseCategory(cat);
                            else deleteIncomeCategory(cat);
                          }}
                          title="Delete category"
                        >
                          <IconTrash class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </For>
                </Show>

                <p class="text-[11px] font-bold uppercase text-gray-400 dark:text-neutral-500 mt-3 mb-1">
                  {currentLang() === 'ne' ? 'डिफल्ट प्रणाली शीर्षकहरू' : 'Default System Categories'}
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <For each={isExpense() ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_SOURCES}>
                    {(cat) => (
                      <span class="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400">
                        {cat}
                      </span>
                    )}
                  </For>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Full Transaction Details Modal */}
      <Show when={selectedDetailRecord()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setSelectedDetailRecord(null)}>
          <div
            class="modal-content max-w-lg bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-0"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const rec = selectedDetailRecord()!;
              const isRecExpense = () => 'category' in rec || isExpense();
              const cat = isRecExpense() ? (rec as ExpenseRecord).category : (rec as IncomeRecord).source;
              const party = isRecExpense() ? (rec as ExpenseRecord).recipientName : (rec as IncomeRecord).payerName;
              const hasReceipt = Boolean(rec.primaryImageId || (rec.receiptUrl && !rec.receiptUrl.startsWith('file://') && !rec.receiptUrl.startsWith('content://')));

              return (
                <div>
                  {/* Header */}
                  <div class="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        isRecExpense()
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isRecExpense()
                          ? (currentLang() === 'ne' ? 'खर्च प्रविष्टि' : 'Expense Entry')
                          : (currentLang() === 'ne' ? 'आम्दानी प्रविष्टि' : 'Income Entry')}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedDetailRecord(null)}
                      class="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg"
                    >
                      <IconX class="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body */}
                  <div class="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* Amount Banner */}
                    <div class="text-center py-5 bg-gray-50 dark:bg-neutral-800/60 rounded-xl border border-gray-100 dark:border-neutral-800">
                      <div class={`text-3xl font-extrabold font-mono tracking-tight ${
                        isRecExpense() ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isRecExpense() ? '−' : '+'} {formatNepaliCurrency(rec.amount)}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-neutral-400 mt-1 font-mono">
                        📅 {rec.date}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div class="space-y-3 text-sm">
                      <div class="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-neutral-800/80">
                        <span class="text-xs text-gray-500 dark:text-neutral-400 font-medium">
                          {currentLang() === 'ne' ? 'शीर्षक / वर्ग' : 'Category'}
                        </span>
                        <span class="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-lg text-xs">
                          {cat}
                        </span>
                      </div>

                      <Show when={party}>
                        <div class="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-neutral-800/80">
                          <span class="text-xs text-gray-500 dark:text-neutral-400 font-medium">
                            {isRecExpense() ? (currentLang() === 'ne' ? 'पाउने व्यक्ति/संस्था' : 'Paid To') : (currentLang() === 'ne' ? 'दिने व्यक्ति/संस्था' : 'Received From')}
                          </span>
                          <span class="font-semibold text-gray-900 dark:text-white">
                            {party}
                          </span>
                        </div>
                      </Show>

                      <div class="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-neutral-800/80">
                        <span class="text-xs text-gray-500 dark:text-neutral-400 font-medium">
                          {currentLang() === 'ne' ? 'भुक्तानी माध्यम' : 'Payment Mode'}
                        </span>
                        <span class="font-semibold text-gray-900 dark:text-white">
                          {rec.paymentMode}
                        </span>
                      </div>

                      <Show when={rec.note}>
                        <div class="py-1.5 border-b border-gray-100 dark:border-neutral-800/80">
                          <span class="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">
                            {currentLang() === 'ne' ? 'कैफियत / विवरण' : 'Note / Description'}
                          </span>
                          <p class="text-xs text-gray-700 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-800/50 p-2.5 rounded-lg italic">
                            {rec.note}
                          </p>
                        </div>
                      </Show>
                    </div>

                    {/* Receipt / Bill Photo Section */}
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400">
                          {currentLang() === 'ne' ? 'संलग्न बिल / रसिद' : 'Attached Receipt / Bill'}
                        </h4>
                        <Show when={hasReceipt}>
                          <button
                            type="button"
                            class="text-xs text-primary hover:underline font-semibold"
                            onClick={() => setPreviewRecord({
                              primaryImageId: rec.primaryImageId,
                              receiptUrl: rec.receiptUrl,
                              title: cat,
                            })}
                          >
                            {currentLang() === 'ne' ? 'पूरा हेर्नुहोस्' : 'View Full Image'}
                          </button>
                        </Show>
                      </div>

                      <Show
                        when={hasReceipt}
                        fallback={
                          <div class="p-6 rounded-xl border border-dashed border-gray-200 dark:border-neutral-800 text-center bg-gray-50/50 dark:bg-neutral-800/30">
                            <span class="text-xs text-gray-400 dark:text-neutral-500">
                              {currentLang() === 'ne' ? 'यस कारोबारमा कुनै रसिद संलग्न गरिएको छैन' : 'No receipt attached to this transaction'}
                            </span>
                          </div>
                        }
                      >
                        <div
                          class="rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800 bg-black/5 dark:bg-black/40 h-56 flex items-center justify-center cursor-pointer group relative"
                          onClick={() => setPreviewRecord({
                            primaryImageId: rec.primaryImageId,
                            receiptUrl: rec.receiptUrl,
                            title: cat,
                          })}
                          title="Click to view full image"
                        >
                          <BillImageViewer
                            primaryImageId={rec.primaryImageId}
                            imageUrl={rec.receiptUrl}
                            alt={cat}
                            class="w-full h-full"
                            imgClass="w-full h-full object-contain"
                          />
                          <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span class="text-xs text-white bg-black/70 px-3 py-1.5 rounded-full font-medium shadow">
                              {currentLang() === 'ne' ? 'पूरा आकारमा हेर्नुहोस्' : 'Click to expand'}
                            </span>
                          </div>
                        </div>
                      </Show>
                    </div>

                    {/* Bottom Actions */}
                    <div class="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        class="btn-primary flex-1 flex items-center justify-center gap-2 py-2 text-xs"
                        onClick={() => {
                          const target = rec;
                          setSelectedDetailRecord(null);
                          handleOpenEdit(target);
                        }}
                      >
                        <IconEdit class="w-3.5 h-3.5" />
                        <span>{currentLang() === 'ne' ? 'सम्पादन' : 'Edit'}</span>
                      </button>

                      <button
                        type="button"
                        class="btn-danger flex-1 flex items-center justify-center gap-2 py-2 text-xs"
                        onClick={() => {
                          const target = rec;
                          setSelectedDetailRecord(null);
                          handleDelete(target.id, cat);
                        }}
                      >
                        <IconTrash class="w-3.5 h-3.5" />
                        <span>{currentLang() === 'ne' ? 'मेटाउनुहोस्' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </Show>

      {/* Image Preview Modal - Using BillImageViewer for R2 private images */}
      <Show when={previewRecord()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setPreviewRecord(null)}>
          <div
            class="max-w-xl max-h-[85vh] bg-black/90 p-2 rounded-2xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewRecord(null)}
              class="absolute top-4 right-4 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black"
            >
              <IconX class="w-5 h-5" />
            </button>
            <BillImageViewer
              primaryImageId={previewRecord()!.primaryImageId}
              imageUrl={previewRecord()!.receiptUrl}
              alt={previewRecord()!.title || 'Receipt Preview'}
              class="max-h-[80vh] w-full mx-auto"
              imgClass="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      </Show>
    </div>
  );
};
