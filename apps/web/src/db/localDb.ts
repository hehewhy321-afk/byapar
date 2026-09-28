import { createSignal, createMemo, createStore, reconcile } from 'solid-js';
import {
  Item,
  Party,
  Invoice,
  KhataEntry,
  CartItem,
  PaymentMode,
  InvoiceType,
  BusinessType,
  CATEGORY_PRESETS,
} from '@byapar/core';

export type { PaymentMode, BusinessType, InvoiceType, Item, Party, Invoice, KhataEntry, CartItem };
import { adToBs, getNepaliFiscalYear } from '@byapar/core';
import { supabase, currentUser, updateAuthProfile } from './auth';
import { getDefaultRolePermissions, StaffRole } from './permissions';

export interface AppSettings {
  lang: 'ne' | 'en';
  calendar: 'BS' | 'AD';
  thermalPrinterWidth: '58mm' | '80mm';
}

export interface CategoryItem {
  id: string;
  name: string;
  colorCode?: string;
}

// Helper to load from localStorage cache for instant UI rendering
function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`byapar_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ----------------------------------------------------------------------------
// Local State Reactive Stores (Hydrated from Cloud Supabase in Realtime)
// ----------------------------------------------------------------------------
export const [categories, setCategories] = createStore<CategoryItem[]>(loadStored('categories', []));
export const [items, setItems] = createStore<Item[]>(loadStored('items', []));
export const [parties, setParties] = createStore<Party[]>(loadStored('parties', []));
export const [khataEntries, setKhataEntries] = createStore<KhataEntry[]>(loadStored('khata', []));
export const [invoices, setInvoices] = createStore<Invoice[]>(loadStored('invoices', []));
export const [cart, setCart] = createStore<CartItem[]>([]);

// Reminder type
export interface Reminder {
  id: string;
  title: string;
  partyId?: string;
  partyName?: string;
  amount?: number;
  dueDate: string;
  dueTime?: string;
  reminderType?: 'payment_reminder' | 'task_reminder' | 'event_reminder' | 'inventory_alert' | 'custom';
  note?: string;
  status: 'upcoming' | 'completed';
  createdAt: string;
  updatedAt?: string;
}

// Expense / Income types
export interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  paymentMode: string;
  date: string;
  recipientName?: string;
  note?: string;
  receiptUrl?: string;
  primaryImageId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IncomeRecord {
  id: string;
  source: string;
  amount: number;
  paymentMode: string;
  date: string;
  payerName?: string;
  note?: string;
  receiptUrl?: string;
  primaryImageId?: string;
  createdAt: string;
  updatedAt?: string;
}

// Bank Account & Transaction Ledger types
export interface BankAccount {
  id: string;
  name: string;
  accountType: 'cash' | 'bank' | 'wallet';
  accountNumber?: string;
  balance: number;
  bankName?: string;
  branch?: string;
}

export interface AccountTransaction {
  id: string;
  businessId: string;
  accountId: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  transactionType: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  amount: number;
  balanceAfter: number;
  category?: string;
  reference?: string;
  notes?: string;
  dateAd: string;
  dateBs?: string;
  createdAt: string;
}

// Staff Member with Granular Permissions
export interface StaffMember {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  role: StaffRole;
  permissions: Record<string, boolean>;
  isActive: boolean;
  createdAt: string;
}

// Quotation (Estimates)
export interface Quotation {
  id: string;
  businessId: string;
  quotationNumber: string;
  partyId?: string;
  partyName: string;
  partyPhone?: string;
  date: string;
  validUntil?: string;
  totalAmount: number;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'converted';
  items: {
    id: string;
    itemId?: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }[];
  createdAt: string;
}

// Sales Return (Credit Notes)
export interface SalesReturn {
  id: string;
  businessId: string;
  returnNumber: string;
  originalInvoiceId?: string;
  partyId?: string;
  partyName: string;
  date: string;
  totalAmount: number;
  refundAmount: number;
  creditAmount: number;
  reason?: string;
  items: {
    id: string;
    itemId?: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }[];
  createdAt: string;
}

// Purchase Bills
export interface PurchaseBill {
  id: string;
  businessId: string;
  billNumber: string;
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierPan?: string;
  date: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: PaymentMode;
  status: 'paid' | 'unpaid' | 'partial';
  notes?: string;
  receiptUrl?: string;
  items: {
    id: string;
    itemId?: string;
    itemName: string;
    quantity: number;
    costPrice: number;
    totalAmount: number;
  }[];
  createdAt: string;
}

// Purchase Return (Debit Notes)
export interface PurchaseReturn {
  id: string;
  businessId: string;
  returnNumber: string;
  originalBillId?: string;
  supplierId?: string;
  supplierName: string;
  date: string;
  totalAmount: number;
  refundAmount: number;
  reason?: string;
  items: {
    id: string;
    itemId?: string;
    itemName: string;
    quantity: number;
    costPrice: number;
    totalAmount: number;
  }[];
  createdAt: string;
}

// Payment In / Payment Out
export interface PaymentRecord {
  id: string;
  businessId: string;
  type: 'in' | 'out'; // in = from customer, out = to supplier
  partyId: string;
  partyName: string;
  amount: number;
  paymentMode: PaymentMode;
  accountId?: string;
  reference?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'purchase'
  | 'khata'
  | 'inventory'
  | 'accounts'
  | 'expense'
  | 'income'
  | 'staff'
  | 'reports'
  | 'reminders'
  | 'settings'
  | 'bill-gallery'
  | 'notebook'
  | 'business-cards'
  | 'greeting-cards'
  | 'utilities'
  | 'notifications';

// Valid tabs list
export const VALID_TABS: ActiveTab[] = [
  'dashboard',
  'sales',
  'pos',
  'purchase',
  'khata',
  'inventory',
  'accounts',
  'expense',
  'income',
  'staff',
  'reports',
  'reminders',
  'notifications',
  'settings',
  'bill-gallery',
  'notebook',
  'business-cards',
  'greeting-cards',
  'utilities',
];

function getInitialTab(): ActiveTab {
  if (typeof window === 'undefined') return 'dashboard';
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
  if (VALID_TABS.includes(rawHash as ActiveTab)) {
    return rawHash as ActiveTab;
  }
  const stored = localStorage.getItem('byapar_active_tab') as ActiveTab;
  if (stored && VALID_TABS.includes(stored)) {
    return stored;
  }
  return 'dashboard';
}

// Global App Signals
export const [isOnline, setIsOnline] = createSignal<boolean>(true);
const [_activeTab, _setActiveTab] = createSignal<ActiveTab>(getInitialTab());
export const activeTab = _activeTab;
export function setActiveTab(tab: ActiveTab) {
  _setActiveTab(tab);
  if (typeof window !== 'undefined') {
    localStorage.setItem('byapar_active_tab', tab);
    if (window.location.hash !== `#${tab}`) {
      window.history.replaceState(null, '', `#${tab}`);
    }
  }
}
export const [pricingTier, setPricingTier] = createSignal<'retail' | 'wholesale'>('retail');

// Dark mode state - default to clean light theme for best contrast
function initTheme(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('byapar_theme');
  const isDark = stored ? stored === 'dark' : false;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  return isDark;
}

export const [isDarkMode, setIsDarkMode] = createSignal<boolean>(initTheme());

export function toggleDarkMode() {
  const next = !isDarkMode();
  setIsDarkMode(next);
  if (next) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('byapar_theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('byapar_theme', 'light');
  }
}

// Sidebar collapse & mobile drawer signals
export const [isSidebarCollapsed, setIsSidebarCollapsed] = createSignal(loadStored('sidebar_collapsed', false));
export function toggleSidebar() {
  const next = !isSidebarCollapsed();
  setIsSidebarCollapsed(next);
  localStorage.setItem('byapar_sidebar_collapsed', JSON.stringify(next));
}

export const [isMobileSidebarOpen, setIsMobileSidebarOpen] = createSignal(false);
export function toggleMobileSidebar() {
  setIsMobileSidebarOpen((prev) => !prev);
}
export function closeMobileSidebar() {
  setIsMobileSidebarOpen(false);
}

export const [settings, setSettings] = createStore<AppSettings>(
  loadStored('settings', {
    lang: 'en',
    calendar: 'AD',
    thermalPrinterWidth: '80mm',
  })
);

export interface BillItem {
  id: string;
  title?: string;
  type?: string;
  amount: number;
  date?: string;
  image?: string;
  tags?: string[];
  createdAt: string;
  category?: string;
  vendorName?: string;
  invoiceNumber?: string;
  imageUrl?: string;
  billDate?: string;
  notes?: string;
  primaryImageId?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt?: string;
  updatedAt: string;
  color?: string;
  isPinned?: boolean;
}

export const [reminders, setReminders] = createStore<Reminder[]>(loadStored('reminders', []));
export const [expenses, setExpenses] = createStore<ExpenseRecord[]>(loadStored('expenses', []));
export const [incomes, setIncomes] = createStore<IncomeRecord[]>(loadStored('incomes', []));
export const [accounts, setAccounts] = createStore<BankAccount[]>(loadStored('accounts', []));
export const [accountTransactions, setAccountTransactions] = createStore<AccountTransaction[]>(loadStored('account_txs', []));
export const [staffList, setStaffList] = createStore<StaffMember[]>(loadStored('staff', []));

// Vouchers Stores
export const [quotations, setQuotations] = createStore<Quotation[]>(loadStored('quotations', []));
export const [salesReturns, setSalesReturns] = createStore<SalesReturn[]>(loadStored('sales_returns', []));
export const [purchaseBills, setPurchaseBills] = createStore<PurchaseBill[]>(loadStored('purchase_bills', []));
export const [purchaseReturns, setPurchaseReturns] = createStore<PurchaseReturn[]>(loadStored('purchase_returns', []));
export const [paymentRecords, setPaymentRecords] = createStore<PaymentRecord[]>(loadStored('payment_records', []));

export const [bills, setBills] = createStore<BillItem[]>(loadStored('bills', []));
export const [notes, setNotes] = createStore<NoteItem[]>(loadStored('notes', []));
export const [customExpenseCategories, setCustomExpenseCategories] = createStore<string[]>(loadStored('custom_expense_cats', []));
export const [customIncomeCategories, setCustomIncomeCategories] = createStore<string[]>(loadStored('custom_income_cats', []));

// Page routing for unauthenticated users
export type AppPage = 'landing' | 'auth' | 'about' | 'faq' | 'pricing' | 'privacy' | 'terms';
export const VALID_PAGES: AppPage[] = ['landing', 'auth', 'about', 'faq', 'pricing', 'privacy', 'terms'];

function getInitialPage(): AppPage {
  if (typeof window === 'undefined') return 'landing';
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
  if (VALID_PAGES.includes(rawHash as AppPage)) {
    return rawHash as AppPage;
  }
  const stored = localStorage.getItem('byapar_current_page') as AppPage;
  if (stored && VALID_PAGES.includes(stored)) {
    return stored;
  }
  return 'landing';
}

const [_currentPage, _setCurrentPage] = createSignal<AppPage>(getInitialPage());
export const currentPage = _currentPage;
export function setCurrentPage(page: AppPage) {
  _setCurrentPage(page);
  if (typeof window !== 'undefined') {
    localStorage.setItem('byapar_current_page', page);
    if (window.location.hash !== `#${page}`) {
      window.history.replaceState(null, '', `#${page}`);
    }
  }
}

// Window hashchange listener to keep activeTab and currentPage in sync with URL
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (VALID_TABS.includes(rawHash as ActiveTab)) {
      _setActiveTab(rawHash as ActiveTab);
      localStorage.setItem('byapar_active_tab', rawHash);
    } else if (VALID_PAGES.includes(rawHash as AppPage)) {
      _setCurrentPage(rawHash as AppPage);
      localStorage.setItem('byapar_current_page', rawHash);
    }
  });

  // Ensure current active tab is set in hash on load if not present
  const initTab = getInitialTab();
  if (!window.location.hash && initTab && initTab !== 'dashboard') {
    window.history.replaceState(null, '', `#${initTab}`);
  }
}

// Modals Global Signals
export const [showAuthModal, setShowAuthModal] = createSignal(false);
export const [showProfileModal, setShowProfileModal] = createSignal(false);
export const [showChangePasswordModal, setShowChangePasswordModal] = createSignal(false);
export const [showSubscriptionModal, setShowSubscriptionModal] = createSignal(false);
export const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModal] = createSignal(false);
export const [showHelpModal, setShowHelpModal] = createSignal(false);
export const [showTutorialsModal, setShowTutorialsModal] = createSignal(false);
export const [showWhatsNewModal, setShowWhatsNewModal] = createSignal(false);

function getInitialBusiness() {
  let authBiz: any = null;
  try {
    const rawAuth = localStorage.getItem('byapar_auth_user');
    if (rawAuth) {
      const parsed = JSON.parse(rawAuth);
      if (parsed?.businessId && parsed.businessId !== 'a0000000-0000-0000-0000-000000000001') {
        authBiz = {
          id: parsed.businessId,
          name: parsed.businessName || '',
          nameEn: parsed.businessName || '',
          ownerName: parsed.name || '',
          phone: parsed.phone || '',
          pan: parsed.pan || '',
          address: parsed.address || '',
          businessType: (parsed.businessType as BusinessType) || 'general',
          isVatRegistered: !!parsed.pan,
        };
      }
    }
  } catch (e) {}

  const storedBiz: Record<string, any> = loadStored('current_business', {});
  if (storedBiz.name === 'Shrestha Mart & General Store' || storedBiz.name === 'श्री श्रेष्ठ किराना तथा जनरल स्टोर') {
    delete storedBiz.name;
    delete storedBiz.nameEn;
    delete storedBiz.ownerName;
  }

  return {
    id: authBiz?.id || storedBiz.id || 'a0000000-0000-0000-0000-000000000001',
    name: authBiz?.name || storedBiz.name || '',
    nameEn: authBiz?.nameEn || storedBiz.nameEn || storedBiz.name || '',
    ownerName: authBiz?.ownerName || storedBiz.ownerName || '',
    pan: authBiz?.pan || storedBiz.pan || '',
    address: authBiz?.address || storedBiz.address || '',
    phone: authBiz?.phone || storedBiz.phone || '',
    businessType: (authBiz?.businessType || storedBiz.businessType || 'general') as BusinessType,
    isVatRegistered: authBiz?.isVatRegistered ?? storedBiz.isVatRegistered ?? false,
    fonepayQrImage: '',
    fonepayMerchantId: '',
    fonepayMerchantName: '',
    fonepayQrPayload: '',
    ...storedBiz,
    ...(authBiz || {}),
  };
}

export const [currentBusiness, setCurrentBusiness] = createStore(getInitialBusiness());

export function resetAllLocalData() {
  setItems(reconcile([]));
  setParties(reconcile([]));
  setKhataEntries(reconcile([]));
  setInvoices(reconcile([]));
  setAccounts(reconcile([]));
  setAccountTransactions(reconcile([]));
  setStaffList(reconcile([]));
  setCategories(reconcile([]));
  setCurrentBusiness((prev) => ({
    ...prev,
    id: 'a0000000-0000-0000-0000-000000000001',
    name: '',
    nameEn: '',
    ownerName: '',
    pan: '',
    address: '',
    phone: '',
    businessType: 'general' as BusinessType,
    isVatRegistered: false,
  }));
  localStorage.removeItem('byapar_items');
  localStorage.removeItem('byapar_parties');
  localStorage.removeItem('byapar_khata');
  localStorage.removeItem('byapar_invoices');
  localStorage.removeItem('byapar_accounts');
  localStorage.removeItem('byapar_account_txs');
  localStorage.removeItem('byapar_categories');
  localStorage.removeItem('byapar_current_business');
}

export async function updateBusinessProfile(
  data: Partial<typeof currentBusiness>
): Promise<{ success: boolean; error?: string }> {
  const updatedName = data.name !== undefined ? data.name : currentBusiness.name;
  const updatedOwner = data.ownerName !== undefined ? data.ownerName : currentBusiness.ownerName;
  const updatedAddress = data.address !== undefined ? data.address : currentBusiness.address;
  const updatedPhone = data.phone !== undefined ? data.phone : currentBusiness.phone;
  const updatedPan = data.pan !== undefined ? data.pan : currentBusiness.pan;
  const updatedVat = data.isVatRegistered !== undefined ? data.isVatRegistered : currentBusiness.isVatRegistered;

  // 1. Immediately update reactive store with a new merged object to trigger Solid reactivity in all subscribers
  setCurrentBusiness((prev) => ({
    ...prev,
    ...data,
    name: updatedName,
    nameEn: data.nameEn || updatedName,
    ownerName: updatedOwner,
    address: updatedAddress,
    phone: updatedPhone,
    pan: updatedPan,
    isVatRegistered: updatedVat,
  }));
  localStorage.setItem('byapar_current_business', JSON.stringify(currentBusiness));

  // 2. Update currentUser in auth.ts if logged in
  const user = currentUser();
  if (user) {
    updateAuthProfile({
      name: updatedOwner || user.name,
      businessName: updatedName || user.businessName,
      phone: updatedPhone || user.phone,
      address: updatedAddress || user.address,
      pan: updatedPan || user.pan,
    });
  }

  // 3. Supabase Cloud Sync
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const activeUser = sessionData?.session?.user;

    const bizId =
      activeUser && user?.businessId && user.businessId !== 'a0000000-0000-0000-0000-000000000001'
        ? user.businessId
        : currentBusiness.id;

    if (activeUser && bizId && bizId !== 'a0000000-0000-0000-0000-000000000001') {
      const bizPayload: any = {
        name: updatedName,
        owner_name: updatedOwner,
        pan_vat_number: updatedPan,
        phone: updatedPhone,
        address_line: updatedAddress,
        is_vat_registered: updatedVat,
        fonepay_qr_image: data.fonepayQrImage !== undefined ? data.fonepayQrImage : currentBusiness.fonepayQrImage,
        fonepay_merchant_id: data.fonepayMerchantId !== undefined ? data.fonepayMerchantId : currentBusiness.fonepayMerchantId,
        fonepay_merchant_name: data.fonepayMerchantName !== undefined ? data.fonepayMerchantName : currentBusiness.fonepayMerchantName,
        fonepay_qr_payload: data.fonepayQrPayload !== undefined ? data.fonepayQrPayload : currentBusiness.fonepayQrPayload,
      };

      const { error: bizErr } = await supabase.from('businesses').update(bizPayload).eq('id', bizId);
      if (bizErr) console.warn('Supabase business update warning:', bizErr.message);
    }

    if (activeUser) {
      const profileUpdates: any = {
        full_name: updatedOwner || user?.name || activeUser.email?.split('@')[0] || 'Store Owner',
      };
      if (updatedPhone) profileUpdates.phone_number = updatedPhone;

      const { error: profErr } = await supabase.from('profiles').update(profileUpdates).eq('id', activeUser.id);
      if (profErr) console.warn('Supabase profile update warning:', profErr.message);

      await supabase.auth.updateUser({
        data: {
          full_name: updatedOwner,
          business_name: updatedName,
          phone: updatedPhone,
          address: updatedAddress,
          pan: updatedPan,
        },
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error updating business on cloud:', err);
    return { success: false, error: err.message || 'Failed to update cloud profile' };
  }
}

// Notifications computed
export const notifications = createMemo(() => {
  const list: { id: string; title: string; desc: string; type: 'stock' | 'khata' | 'cbms'; time: string }[] = [];
  items
    .filter((i) => i.currentStock <= i.lowStockThreshold)
    .forEach((i) => {
      list.push({
        id: 'stk-' + i.id,
        title: 'Low Stock Warning',
        desc: `${i.name} has only ${i.currentStock} units left (Threshold: ${i.lowStockThreshold})`,
        type: 'stock',
        time: 'Active',
      });
    });
  parties
    .filter((p) => p.currentBalance > 4000)
    .slice(0, 3)
    .forEach((p) => {
      list.push({
        id: 'kht-' + p.id,
        title: 'High Credit Due',
        desc: `${p.name} owes Rs. ${p.currentBalance.toLocaleString()}`,
        type: 'khata',
        time: 'Pending collection',
      });
    });
  list.push({
    id: 'cloud-connected',
    title: 'Cloud Realtime Connected',
    desc: 'Live sync active with project sovpldesvrdbmklpntrx',
    type: 'cbms',
    time: 'Live',
  });
  return list;
});

// ----------------------------------------------------------------------------
// DB Mapping Utilities
// ----------------------------------------------------------------------------
function mapDbItem(row: any): Item {
  return {
    id: row.id,
    businessId: row.business_id,
    categoryId: row.category_id,
    unitId: row.unit_id,
    name: row.name,
    barcode: row.barcode,
    sku: row.sku,
    mrp: Number(row.mrp) || 0,
    sellingPrice: Number(row.selling_price) || 0,
    wholesalePrice: row.wholesale_price ? Number(row.wholesale_price) : undefined,
    purchaseCost: row.purchase_cost ? Number(row.purchase_cost) : undefined,
    currentStock: Number(row.current_stock) || 0,
    lowStockThreshold: Number(row.low_stock_threshold) || 5,
    taxRate: Number(row.tax_rate) || 0,
    isTaxInclusive: row.is_tax_inclusive ?? true,
    imageUrl: row.image_url,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapDbParty(row: any): Party {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    panVatNumber: row.pan_vat_number,
    partyType: row.party_type || 'customer',
    creditLimit: Number(row.credit_limit) || 0,
    duePeriodDays: row.due_period_days || 30,
    openingBalance: Number(row.opening_balance) || 0,
    currentBalance: Number(row.current_balance) || 0,
    address: row.address,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapDbKhata(row: any): KhataEntry {
  return {
    id: row.id,
    businessId: row.business_id,
    partyId: row.party_id,
    partyName: row.parties?.name || row.party_name || '',
    invoiceId: row.invoice_id,
    entryType: row.entry_type,
    amount: Number(row.amount) || 0,
    dateAd: row.date_ad,
    dateBs: row.date_bs,
    notes: row.notes,
    receiptImageUrl: row.receipt_image_url,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function toValidPaymentMode(mode?: string): string {
  const m = (mode || '').toLowerCase();
  if (m === 'fonepay' || m === 'esewa' || m === 'khalti' || m === 'fonepay_qr') return 'fonepay_qr';
  if (m === 'bank' || m === 'bank_transfer') return 'bank_transfer';
  if (m === 'cheque') return 'cheque';
  if (m === 'credit') return 'credit';
  if (m === 'connectips') return 'connectips';
  return 'cash';
}

function mapDbInvoice(row: any): Invoice {
  const rawItems = (row.invoice_items || []).map((ii: any) => ({
    id: ii.id,
    invoiceId: row.id,
    itemId: ii.item_id,
    itemName: ii.item_name,
    quantity: Number(ii.quantity) || 1,
    unitPrice: Number(ii.unit_price) || 0,
    discountAmount: Number(ii.discount_amount) || 0,
    taxRate: Number(ii.tax_rate) || 0,
    taxAmount: Number(ii.tax_amount) || 0,
    totalAmount: Number(ii.total_amount) || 0,
  }));

  // Deduplicate items defensively
  const seenItems = new Set<string>();
  const deduplicatedItems: typeof rawItems = [];
  for (const item of rawItems) {
    const key = `${item.itemId || ''}_${item.itemName}_${item.unitPrice}_${item.quantity}`;
    if (!seenItems.has(key)) {
      seenItems.add(key);
      deduplicatedItems.push(item);
    }
  }

  return {
    id: row.id,
    businessId: row.business_id,
    partyId: row.party_id,
    partyName: row.parties?.name || row.party_name || 'Counter Customer',
    partyPhone: row.parties?.phone || row.party_phone || '',
    invoiceType: row.invoice_type || 'sale',
    invoiceNumber: row.invoice_number,
    fiscalYear: row.fiscal_year,
    invoiceDateAd: row.invoice_date_ad,
    invoiceDateBs: row.invoice_date_bs,
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    taxableAmount: Number(row.taxable_amount) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    roundOff: Number(row.round_off) || 0,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    dueAmount: Number(row.due_amount) || 0,
    status: row.status || 'paid',
    paymentMode: row.payment_mode || 'cash',
    cbmsStatus: row.cbms_status || 'not_applicable',
    notes: row.notes,
    items: deduplicatedItems.length > 0 ? deduplicatedItems : rawItems,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapDbQuotation(row: any): Quotation {
  return {
    id: row.id,
    businessId: row.business_id,
    quotationNumber: row.invoice_number,
    partyId: row.party_id,
    partyName: row.parties?.name || row.party_name || 'Customer',
    partyPhone: row.parties?.phone || row.party_phone || '',
    date: row.invoice_date_ad,
    validUntil: undefined,
    totalAmount: Number(row.total_amount) || 0,
    notes: row.notes,
    status: (row.status as any) || 'draft',
    items: (row.invoice_items || []).map((ii: any) => ({
      id: ii.id,
      itemId: ii.item_id,
      itemName: ii.item_name,
      quantity: Number(ii.quantity) || 1,
      unitPrice: Number(ii.unit_price) || 0,
      totalAmount: Number(ii.total_amount) || 0,
    })),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapDbSalesReturn(row: any): SalesReturn {
  return {
    id: row.id,
    businessId: row.business_id,
    returnNumber: row.invoice_number,
    partyId: row.party_id,
    partyName: row.parties?.name || row.party_name || 'Customer',
    date: row.invoice_date_ad,
    totalAmount: Number(row.total_amount) || 0,
    refundAmount: Number(row.paid_amount) || 0,
    creditAmount: Number(row.due_amount) || 0,
    reason: row.notes,
    items: (row.invoice_items || []).map((ii: any) => ({
      id: ii.id,
      itemId: ii.item_id,
      itemName: ii.item_name,
      quantity: Number(ii.quantity) || 1,
      unitPrice: Number(ii.unit_price) || 0,
      totalAmount: Number(ii.total_amount) || 0,
    })),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapDbPurchaseReturn(row: any): PurchaseReturn {
  return {
    id: row.id,
    businessId: row.business_id,
    returnNumber: row.invoice_number,
    supplierId: row.party_id,
    supplierName: row.parties?.name || row.party_name || 'Supplier',
    date: row.invoice_date_ad,
    totalAmount: Number(row.total_amount) || 0,
    refundAmount: Number(row.paid_amount) || 0,
    reason: row.notes,
    items: (row.invoice_items || []).map((ii: any) => ({
      id: ii.id,
      itemId: ii.item_id,
      itemName: ii.item_name,
      quantity: Number(ii.quantity) || 1,
      costPrice: Number(ii.unit_price) || 0,
      totalAmount: Number(ii.total_amount) || 0,
    })),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapDbPayment(row: any): PaymentRecord {
  const meta = row.payment_metadata || {};
  return {
    id: row.id,
    businessId: row.business_id,
    type: meta.type || (row.reference_id === 'out' ? 'out' : 'in'),
    partyId: row.party_id || '',
    partyName: row.parties?.name || meta.party_name || 'Party',
    amount: Number(row.amount) || 0,
    paymentMode: row.payment_mode || 'cash',
    accountId: meta.account_id || row.reference_id || undefined,
    date: row.payment_date_ad || row.created_at?.split('T')[0],
    notes: meta.notes || row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapDbAccount(row: any): BankAccount {
  const branchLower = (row.branch || '').toLowerCase();
  const nameLower = (row.account_name || '').toLowerCase();
  const isWallet = branchLower.includes('wallet') || nameLower.includes('esewa') || nameLower.includes('khalti') || nameLower.includes('ime pay');
  const isCash = branchLower.includes('cash') || nameLower.includes('cash') || nameLower.includes('drawer') || (!row.branch && !row.bank_name);

  return {
    id: row.id,
    name: row.account_name,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountType: isWallet ? 'wallet' : isCash ? 'cash' : 'bank',
    balance: Number(row.balance) || 0,
    branch: row.branch,
  };
}

function mapDbAccountTx(row: any): AccountTransaction {
  return {
    id: row.id,
    businessId: row.business_id,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    transactionType: row.transaction_type,
    amount: Number(row.amount) || 0,
    balanceAfter: Number(row.balance_after) || 0,
    category: row.category,
    reference: row.reference,
    notes: row.notes,
    dateAd: row.date_ad,
    dateBs: row.date_bs,
    createdAt: row.created_at,
  };
}

function mapDbStaff(row: any): StaffMember {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: (row.role || 'Sales Person') as StaffRole,
    permissions: row.permissions || {},
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

// Helpers for additional cloud tables
function mapDbBill(b: any): BillItem {
  return {
    id: b.id,
    title: b.title || 'Bill',
    vendorName: b.title || 'Vendor',
    amount: Number(b.amount) || 0,
    date: b.bill_date,
    billDate: b.bill_date,
    type: b.bill_type || 'General',
    category: b.bill_type || 'General',
    image: b.image_url || '',
    imageUrl: b.image_url || '',
    primaryImageId: b.primary_image_id || undefined,
    tags: b.tags || [],
    notes: b.notes || '',
    createdAt: b.created_at || new Date().toISOString(),
  };
}

function mapDbExpense(e: any): ExpenseRecord {
  return {
    id: e.id,
    category: e.category || 'Other',
    amount: Number(e.amount) || 0,
    paymentMode: e.payment_mode || 'Cash',
    date: e.date_ad || (e.created_at ? e.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    recipientName: e.recipient_name,
    note: e.notes,
    receiptUrl: e.receipt_url || undefined,
    primaryImageId: e.primary_image_id || undefined,
    createdAt: e.created_at || new Date().toISOString(),
    updatedAt: e.updated_at || undefined,
  };
}

function mapDbIncome(inc: any): IncomeRecord {
  return {
    id: inc.id,
    source: inc.category || 'Other',
    amount: Number(inc.amount) || 0,
    paymentMode: inc.payment_mode || 'Cash',
    date: inc.date_ad || (inc.created_at ? inc.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    payerName: inc.payer_name,
    note: inc.notes,
    receiptUrl: inc.receipt_url || undefined,
    primaryImageId: inc.primary_image_id || undefined,
    createdAt: inc.created_at || new Date().toISOString(),
    updatedAt: inc.updated_at || undefined,
  };
}

function mapDbReminder(r: any): Reminder {
  return {
    id: r.id,
    title: r.title,
    partyId: r.party_id,
    partyName: r.parties?.name,
    amount: Number(r.amount) || 0,
    dueDate: r.due_date_ad || (r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
    status: r.status || 'upcoming',
    note: r.notes || '',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

function mapDbNote(n: any): NoteItem {
  return {
    id: n.id,
    title: n.title,
    content: n.content || '',
    category: n.category || 'General',
    color: n.color || 'emerald',
    isPinned: n.is_pinned ?? false,
    createdAt: n.created_at || new Date().toISOString(),
    updatedAt: n.updated_at || n.created_at || new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// Cloud Supabase Hydration & Realtime Synchronization
// ----------------------------------------------------------------------------
export async function syncFromCloud() {
  const bizId = currentBusiness.id;
  try {
    // 0. Business Profile
    const { data: dbBiz } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', bizId)
      .maybeSingle();

    if (dbBiz) {
      let cloudOwner = dbBiz.owner_name;
      const user = currentUser();
      if (!cloudOwner && user?.id) {
        const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        if (prof?.full_name) cloudOwner = prof.full_name;
      }
      setCurrentBusiness((prev) => ({
        ...prev,
        id: dbBiz.id,
        name: dbBiz.name || prev.name,
        nameEn: dbBiz.name || prev.nameEn,
        ownerName: cloudOwner || prev.ownerName || user?.name || '',
        pan: dbBiz.pan_vat_number || prev.pan,
        address: dbBiz.address_line || prev.address,
        phone: dbBiz.phone || prev.phone,
        businessType: (dbBiz.business_type as BusinessType) || prev.businessType,
        isVatRegistered: dbBiz.is_vat_registered ?? prev.isVatRegistered,
        fonepayQrImage: dbBiz.fonepay_qr_image || prev.fonepayQrImage || '',
        fonepayMerchantId: dbBiz.fonepay_merchant_id || prev.fonepayMerchantId || '',
        fonepayMerchantName: dbBiz.fonepay_merchant_name || prev.fonepayMerchantName || '',
        fonepayQrPayload: dbBiz.fonepay_qr_payload || prev.fonepayQrPayload || '',
      }));
      localStorage.setItem('byapar_current_business', JSON.stringify(currentBusiness));
    }

    // 1. Categories
    const { data: dbCats } = await supabase
      .from('categories')
      .select('*')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (dbCats && dbCats.length > 0) {
      setCategories(reconcile(dbCats.map((c: any) => ({ id: c.id, name: c.name, colorCode: c.color_code }))));
      localStorage.setItem('byapar_categories', JSON.stringify(categories));
    } else {
      try {
        await supabase.rpc('seed_business_categories', {
          p_biz_id: bizId,
          p_type: currentBusiness.businessType || 'general',
        });
        const { data: seededCats } = await supabase
          .from('categories')
          .select('*')
          .eq('business_id', bizId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true });
        if (seededCats && seededCats.length > 0) {
          setCategories(reconcile(seededCats.map((c: any) => ({ id: c.id, name: c.name, colorCode: c.color_code }))));
          localStorage.setItem('byapar_categories', JSON.stringify(categories));
        }
      } catch (seedErr) {
        console.warn('Auto seed categories web non-fatal:', seedErr);
      }
    }

    // 2. Items
    const { data: dbItems } = await supabase
      .from('items')
      .select('*')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbItems) setItems(reconcile(dbItems.map(mapDbItem)));

    // 3. Parties
    const { data: dbParties } = await supabase
      .from('parties')
      .select('*')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbParties) setParties(reconcile(dbParties.map(mapDbParty)));

    // 4. Khata Entries
    const { data: dbKhata } = await supabase
      .from('khata_entries')
      .select('*, parties(name, phone)')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbKhata) setKhataEntries(reconcile(dbKhata.map(mapDbKhata)));

    // 5. Invoices, Quotations, Sales Returns, Purchase Returns
    const { data: dbInvoices } = await supabase
      .from('invoices')
      .select('*, parties(name, phone), invoice_items(*)')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbInvoices) {
      const sales = dbInvoices.filter((r: any) => r.invoice_type === 'sale' || !r.invoice_type);
      setInvoices(reconcile(sales.map(mapDbInvoice)));

      const quotes = dbInvoices.filter((r: any) => r.invoice_type === 'quotation');
      setQuotations(reconcile(quotes.map(mapDbQuotation)));

      const sReturns = dbInvoices.filter((r: any) => r.invoice_type === 'sale_return');
      setSalesReturns(reconcile(sReturns.map(mapDbSalesReturn)));

      const pReturns = dbInvoices.filter((r: any) => r.invoice_type === 'purchase_return');
      setPurchaseReturns(reconcile(pReturns.map(mapDbPurchaseReturn)));
    }

    // 6. Bank Accounts
    const { data: dbAccounts } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('business_id', bizId);

    if (dbAccounts && dbAccounts.length > 0) {
      setAccounts(reconcile(dbAccounts.map(mapDbAccount)));
    } else if (bizId) {
      try {
        const cashId = crypto.randomUUID();
        const { data: createdAcc } = await supabase
          .from('bank_accounts')
          .insert({
            id: cashId,
            business_id: bizId,
            account_name: 'Cash in Hand',
            bank_name: 'Cash Counter',
            account_number: 'CASH-01',
            branch: 'Main Counter',
            balance: 0,
            is_primary: true,
          })
          .select()
          .single();
        if (createdAcc) {
          setAccounts(reconcile([mapDbAccount(createdAcc)]));
        }
      } catch (err) {
        console.warn('Failed to auto-provision cash account:', err);
      }
    }

    // 7. Account Transactions
    const { data: dbTxs } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('business_id', bizId)
      .order('date_ad', { ascending: false });

    if (dbTxs) setAccountTransactions(reconcile(dbTxs.map(mapDbAccountTx)));

    // 8. Staff Members
    const { data: dbStaff } = await supabase
      .from('staff')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });

    if (dbStaff) {
      setStaffList(reconcile(dbStaff.map(mapDbStaff)));
    }

    // 9. Bills & Purchase Bills
    const { data: dbBills } = await supabase
      .from('bills')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });

    if (dbBills) {
      setBills(reconcile(dbBills.map(mapDbBill)));

      const purchaseMapped: PurchaseBill[] = dbBills
        .filter((b: any) => (b.bill_type || '').toLowerCase() === 'purchase')
        .map((b: any) => ({
          id: b.id,
          businessId: b.business_id,
          billNumber: `PB-${b.id.slice(0, 6).toUpperCase()}`,
          supplierName: b.title || 'Supplier',
          date: b.bill_date || b.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          subtotal: Number(b.amount) || 0,
          taxAmount: 0,
          totalAmount: Number(b.amount) || 0,
          paidAmount: Number(b.amount) || 0,
          dueAmount: 0,
          paymentMode: 'cash' as PaymentMode,
          status: 'paid' as const,
          items: [],
          createdAt: b.created_at,
        }));
      if (purchaseMapped.length > 0) {
        setPurchaseBills(reconcile(purchaseMapped));
      }
    }

    // 10. Expenses
    const { data: dbExpenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbExpenses) {
      setExpenses(reconcile(dbExpenses.map(mapDbExpense)));
    }

    // 11. Incomes
    const { data: dbIncomes } = await supabase
      .from('incomes')
      .select('*')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbIncomes) {
      setIncomes(reconcile(dbIncomes.map(mapDbIncome)));
    }

    // 12. Reminders
    const { data: dbReminders } = await supabase
      .from('reminders')
      .select('*, parties(name)')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });

    if (dbReminders) {
      setReminders(reconcile(dbReminders.map(mapDbReminder)));
    }

    // 13. Notes
    const { data: dbNotes } = await supabase
      .from('notes')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });

    if (dbNotes) {
      setNotes(reconcile(dbNotes.map(mapDbNote)));
    }

    // 14. Payments (Payment In & Payment Out)
    const { data: dbPayments } = await supabase
      .from('payments')
      .select('*, parties(name, phone)')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });

    if (dbPayments) {
      setPaymentRecords(reconcile(dbPayments.map(mapDbPayment)));
    }

    persistState();
  } catch (err) {
    console.error('Failed to sync data from cloud:', err);
  }
}

// Subscribe to Supabase Realtime changes
let realtimeSubscription: any = null;

export function initRealtimeSync(targetBizId?: string) {
  if (realtimeSubscription) {
    supabase.removeChannel(realtimeSubscription);
    realtimeSubscription = null;
  }

  const bizId = targetBizId || currentBusiness.id;
  if (!bizId) return;
  const channel = supabase
    .channel(`realtime_biz_${bizId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'businesses', filter: `id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'UPDATE') {
          const b = payload.new as any;
          setCurrentBusiness((prev) => ({
            ...prev,
            id: b.id,
            name: b.name || prev.name,
            nameEn: b.name || prev.nameEn,
            ownerName: b.owner_name || prev.ownerName,
            pan: b.pan_vat_number || prev.pan,
            address: b.address_line || prev.address,
            phone: b.phone || prev.phone,
            businessType: (b.business_type as BusinessType) || prev.businessType,
            isVatRegistered: b.is_vat_registered ?? prev.isVatRegistered,
          }));
          localStorage.setItem('byapar_current_business', JSON.stringify(currentBusiness));
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'categories', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const c = payload.new as any;
          const newCat: CategoryItem = { id: c.id, name: c.name, colorCode: c.color_code };
          setCategories((draft) => {
            if (!draft.some((x) => x.id === newCat.id)) draft.push(newCat);
          });
        } else if (payload.eventType === 'UPDATE') {
          const c = payload.new as any;
          setCategories((draft) => {
            const idx = draft.findIndex((x) => x.id === c.id);
            if (idx >= 0) draft[idx] = { id: c.id, name: c.name, colorCode: c.color_code };
          });
        } else if (payload.eventType === 'DELETE') {
          setCategories((draft) => {
            const idx = draft.findIndex((x) => x.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'items', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newItem = mapDbItem(payload.new);
          setItems((draft) => {
            if (!draft.some((i) => i.id === newItem.id)) draft.unshift(newItem);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbItem(payload.new);
          setItems((draft) => {
            const idx = draft.findIndex((i) => i.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setItems((draft) => {
            const idx = draft.findIndex((i) => i.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'parties', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newParty = mapDbParty(payload.new);
          setParties((draft) => {
            if (!draft.some((p) => p.id === newParty.id)) draft.unshift(newParty);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbParty(payload.new);
          setParties((draft) => {
            const idx = draft.findIndex((p) => p.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setParties((draft) => {
            const idx = draft.findIndex((p) => p.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bank_accounts', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAcc = mapDbAccount(payload.new);
          setAccounts((draft) => {
            if (!draft.some((a) => a.id === newAcc.id)) draft.unshift(newAcc);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbAccount(payload.new);
          setAccounts((draft) => {
            const idx = draft.findIndex((a) => a.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setAccounts((draft) => {
            const idx = draft.findIndex((a) => a.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'account_transactions', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newTx = mapDbAccountTx(payload.new);
          setAccountTransactions((draft) => {
            if (!draft.some((t) => t.id === newTx.id)) draft.unshift(newTx);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'staff', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newStaff = mapDbStaff(payload.new);
          setStaffList((draft) => {
            if (!draft.some((s) => s.id === newStaff.id)) draft.unshift(newStaff);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbStaff(payload.new);
          setStaffList((draft) => {
            const idx = draft.findIndex((s) => s.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setStaffList((draft) => {
            const idx = draft.findIndex((s) => s.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'invoices', filter: `business_id=eq.${bizId}` },
      (payload) => {
        const row = payload.new as any;
        const oldRow = payload.old as any;
        const type = (row?.invoice_type || oldRow?.invoice_type || 'sale').toLowerCase();

        if (type === 'quotation') {
          if (payload.eventType === 'INSERT') {
            const q = mapDbQuotation(row);
            setQuotations((draft) => { if (!draft.some((x) => x.id === q.id)) draft.unshift(q); });
          } else if (payload.eventType === 'UPDATE') {
            const q = mapDbQuotation(row);
            setQuotations((draft) => { const idx = draft.findIndex((x) => x.id === q.id); if (idx >= 0) draft[idx] = q; });
          } else if (payload.eventType === 'DELETE') {
            setQuotations((draft) => { const idx = draft.findIndex((x) => x.id === oldRow.id); if (idx >= 0) draft.splice(idx, 1); });
          }
        } else if (type === 'sale_return') {
          if (payload.eventType === 'INSERT') {
            const sr = mapDbSalesReturn(row);
            setSalesReturns((draft) => { if (!draft.some((x) => x.id === sr.id)) draft.unshift(sr); });
          } else if (payload.eventType === 'UPDATE') {
            const sr = mapDbSalesReturn(row);
            setSalesReturns((draft) => { const idx = draft.findIndex((x) => x.id === sr.id); if (idx >= 0) draft[idx] = sr; });
          } else if (payload.eventType === 'DELETE') {
            setSalesReturns((draft) => { const idx = draft.findIndex((x) => x.id === oldRow.id); if (idx >= 0) draft.splice(idx, 1); });
          }
        } else if (type === 'purchase_return') {
          if (payload.eventType === 'INSERT') {
            const pr = mapDbPurchaseReturn(row);
            setPurchaseReturns((draft) => { if (!draft.some((x) => x.id === pr.id)) draft.unshift(pr); });
          } else if (payload.eventType === 'UPDATE') {
            const pr = mapDbPurchaseReturn(row);
            setPurchaseReturns((draft) => { const idx = draft.findIndex((x) => x.id === pr.id); if (idx >= 0) draft[idx] = pr; });
          } else if (payload.eventType === 'DELETE') {
            setPurchaseReturns((draft) => { const idx = draft.findIndex((x) => x.id === oldRow.id); if (idx >= 0) draft.splice(idx, 1); });
          }
        } else {
          // Default: Sales Invoice
          if (payload.eventType === 'INSERT') {
            const newInv = mapDbInvoice(row);
            setInvoices((draft) => { if (!draft.some((i) => i.id === newInv.id)) draft.unshift(newInv); });
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbInvoice(row);
            setInvoices((draft) => { const idx = draft.findIndex((i) => i.id === updated.id); if (idx >= 0) draft[idx] = updated; });
          } else if (payload.eventType === 'DELETE') {
            setInvoices((draft) => { const idx = draft.findIndex((i) => i.id === oldRow.id); if (idx >= 0) draft.splice(idx, 1); });
          }
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newP = mapDbPayment(payload.new);
          setPaymentRecords((draft) => {
            if (!draft.some((p) => p.id === newP.id)) draft.unshift(newP);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbPayment(payload.new);
          setPaymentRecords((draft) => {
            const idx = draft.findIndex((p) => p.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setPaymentRecords((draft) => {
            const idx = draft.findIndex((p) => p.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'khata_entries', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newKhata = mapDbKhata(payload.new);
          setKhataEntries((draft) => {
            if (!draft.some((k) => k.id === newKhata.id)) draft.unshift(newKhata);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbKhata(payload.new);
          setKhataEntries((draft) => {
            const idx = draft.findIndex((k) => k.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setKhataEntries((draft) => {
            const idx = draft.findIndex((k) => k.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bills', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newBill = mapDbBill(payload.new);
          setBills((draft) => {
            const idx = draft.findIndex((b) => b.id === newBill.id);
            if (idx >= 0) draft[idx] = newBill;
            else draft.unshift(newBill);
          });
          if (((payload.new as any).bill_type || '').toLowerCase() === 'purchase') {
            const row = payload.new as any;
            const pb: PurchaseBill = {
              id: row.id,
              businessId: row.business_id,
              billNumber: `PB-${row.id.slice(0, 6).toUpperCase()}`,
              supplierName: row.title || 'Supplier',
              date: row.bill_date || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              subtotal: Number(row.amount) || 0,
              taxAmount: 0,
              totalAmount: Number(row.amount) || 0,
              paidAmount: Number(row.amount) || 0,
              dueAmount: 0,
              paymentMode: 'cash' as PaymentMode,
              status: 'paid' as const,
              items: [],
              createdAt: row.created_at,
            };
            setPurchaseBills((draft) => {
              const idx = draft.findIndex((b) => b.id === pb.id);
              if (idx >= 0) draft[idx] = pb;
              else draft.unshift(pb);
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbBill(payload.new);
          setBills((draft) => {
            const idx = draft.findIndex((b) => b.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
            else draft.unshift(updated);
          });
        } else if (payload.eventType === 'DELETE') {
          setBills((draft) => {
            const idx = draft.findIndex((b) => b.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
          setPurchaseBills((draft) => {
            const idx = draft.findIndex((b) => b.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'expenses', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newExp = mapDbExpense(payload.new);
          setExpenses((draft) => {
            const idx = draft.findIndex((e) => e.id === newExp.id);
            if (idx >= 0) draft[idx] = newExp;
            else draft.unshift(newExp);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbExpense(payload.new);
          setExpenses((draft) => {
            const idx = draft.findIndex((e) => e.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
            else draft.unshift(updated);
          });
        } else if (payload.eventType === 'DELETE') {
          setExpenses((draft) => {
            const idx = draft.findIndex((e) => e.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'incomes', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newInc = mapDbIncome(payload.new);
          setIncomes((draft) => {
            const idx = draft.findIndex((i) => i.id === newInc.id);
            if (idx >= 0) draft[idx] = newInc;
            else draft.unshift(newInc);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbIncome(payload.new);
          setIncomes((draft) => {
            const idx = draft.findIndex((i) => i.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
            else draft.unshift(updated);
          });
        } else if (payload.eventType === 'DELETE') {
          setIncomes((draft) => {
            const idx = draft.findIndex((i) => i.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reminders', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newRem = mapDbReminder(payload.new);
          setReminders((draft) => {
            if (!draft.some((r) => r.id === newRem.id)) draft.unshift(newRem);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbReminder(payload.new);
          setReminders((draft) => {
            const idx = draft.findIndex((r) => r.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setReminders((draft) => {
            const idx = draft.findIndex((r) => r.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notes', filter: `business_id=eq.${bizId}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newNote = mapDbNote(payload.new);
          setNotes((draft) => {
            if (!draft.some((n) => n.id === newNote.id)) draft.unshift(newNote);
          });
        } else if (payload.eventType === 'UPDATE') {
          const updated = mapDbNote(payload.new);
          setNotes((draft) => {
            const idx = draft.findIndex((n) => n.id === updated.id);
            if (idx >= 0) draft[idx] = updated;
          });
        } else if (payload.eventType === 'DELETE') {
          setNotes((draft) => {
            const idx = draft.findIndex((n) => n.id === (payload.old as any).id);
            if (idx >= 0) draft.splice(idx, 1);
          });
        }
        persistState();
      }
    )
    .subscribe();

  realtimeSubscription = channel;
}

// Initialize on script load
syncFromCloud();
initRealtimeSync();

// ----------------------------------------------------------------------------
// ACCOUNTS & MONEY MANAGEMENT ACTIONS
// ----------------------------------------------------------------------------

export async function addBankAccount(data: {
  name: string;
  bankName: string;
  accountNumber?: string;
  accountType: 'cash' | 'bank' | 'wallet';
  balance: number;
  branch?: string;
}) {
  const newAcc: BankAccount = {
    id: crypto.randomUUID(),
    name: data.name,
    bankName: data.bankName,
    accountNumber: data.accountNumber,
    accountType: data.accountType,
    balance: data.balance || 0,
    branch: data.branch,
  };

  setAccounts((draft) => {
    draft.unshift(newAcc);
  });
  persistState();

  await supabase.from('bank_accounts').insert({
    id: newAcc.id,
    business_id: currentBusiness.id,
    account_name: newAcc.name,
    bank_name: newAcc.bankName,
    account_number: newAcc.accountNumber || '',
    branch: newAcc.branch || newAcc.accountType,
    balance: newAcc.balance,
  });

  // Record opening balance transaction if > 0
  if (newAcc.balance > 0) {
    await recordAccountTransaction({
      accountId: newAcc.id,
      transactionType: 'deposit',
      amount: newAcc.balance,
      category: 'Opening Balance',
      notes: 'Initial balance when adding account',
    });
  }

  return newAcc;
}

export async function editBankAccount(id: string, updates: Partial<BankAccount>) {
  setAccounts((draft) => {
    const idx = draft.findIndex((a) => a.id === id);
    if (idx >= 0) Object.assign(draft[idx], updates);
  });
  persistState();

  await supabase
    .from('bank_accounts')
    .update({
      account_name: updates.name,
      bank_name: updates.bankName,
      account_number: updates.accountNumber,
      branch: updates.branch,
      balance: updates.balance,
    })
    .eq('id', id);
}

export async function deleteBankAccount(id: string) {
  setAccounts((draft) => {
    const idx = draft.findIndex((a) => a.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('bank_accounts').delete().eq('id', id);
}

// Internal Transaction Logger
export async function recordAccountTransaction(params: {
  accountId: string;
  toAccountId?: string;
  transactionType: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  amount: number;
  category?: string;
  reference?: string;
  notes?: string;
  date?: string;
}) {
  const normAccountId = normalizeAccountId(params.accountId);
  const normToAccountId = params.toAccountId ? normalizeAccountId(params.toAccountId) : undefined;
  const targetAcc = accounts.find((a) => a.id === normAccountId);
  const now = new Date();
  const dateAd = params.date || now.toISOString().split('T')[0];
  const dateBs = adToBs(new Date(dateAd)).formatted;

  const newTx: AccountTransaction = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    accountId: normAccountId,
    accountName: targetAcc?.name || 'Account',
    toAccountId: normToAccountId,
    toAccountName: normToAccountId
      ? accounts.find((a) => a.id === normToAccountId)?.name
      : undefined,
    transactionType: params.transactionType,
    amount: params.amount,
    balanceAfter: targetAcc?.balance || 0,
    category: params.category,
    reference: params.reference,
    notes: params.notes,
    dateAd,
    dateBs,
    createdAt: now.toISOString(),
  };

  setAccountTransactions((draft) => {
    draft.unshift(newTx);
  });
  persistState();

  await supabase.from('account_transactions').insert({
    id: newTx.id,
    business_id: newTx.businessId,
    account_id: newTx.accountId,
    to_account_id: newTx.toAccountId,
    transaction_type: newTx.transactionType,
    amount: newTx.amount,
    balance_after: newTx.balanceAfter,
    category: newTx.category,
    reference: newTx.reference,
    notes: newTx.notes,
    date_ad: newTx.dateAd,
    date_bs: newTx.dateBs,
  });

  return newTx;
}

function normalizeAccountId(id: string): string {
  if (id === 'acc-cash') return 'b0000000-0000-0000-0000-000000000001';
  if (id === 'acc-bank-1') return 'b0000000-0000-0000-0000-000000000002';
  if (id === 'acc-wallet') return 'b0000000-0000-0000-0000-000000000003';
  return id;
}

// Add Money (Deposit)
export async function depositMoney(
  accountId: string,
  amount: number,
  category: string,
  notes?: string,
  date?: string
) {
  const normId = normalizeAccountId(accountId);
  const targetAcc = accounts.find((a) => a.id === normId || a.id === accountId);
  if (!targetAcc || amount <= 0) return;

  const newBal = targetAcc.balance + amount;
  setAccounts((draft) => {
    const a = draft.find((x) => x.id === normId || x.id === accountId);
    if (a) a.balance = newBal;
  });
  persistState();

  await supabase.from('bank_accounts').update({ balance: newBal }).eq('id', normId);

  await recordAccountTransaction({
    accountId: normId,
    transactionType: 'deposit',
    amount,
    category: category || 'Deposit / Add Money',
    notes,
    date,
  });
}

// Reduce Money (Withdrawal)
export async function withdrawMoney(
  accountId: string,
  amount: number,
  category: string,
  notes?: string,
  date?: string
) {
  const normId = normalizeAccountId(accountId);
  const targetAcc = accounts.find((a) => a.id === normId || a.id === accountId);
  if (!targetAcc || amount <= 0) return;

  const newBal = Math.max(0, targetAcc.balance - amount);
  setAccounts((draft) => {
    const a = draft.find((x) => x.id === normId || x.id === accountId);
    if (a) a.balance = newBal;
  });
  persistState();

  await supabase.from('bank_accounts').update({ balance: newBal }).eq('id', normId);

  await recordAccountTransaction({
    accountId: normId,
    transactionType: 'withdrawal',
    amount,
    category: category || 'Withdrawal / Reduce Money',
    notes,
    date,
  });
}

// Transfer Money between accounts
export async function transferMoney(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  notes?: string,
  date?: string
) {
  const normFromId = normalizeAccountId(fromAccountId);
  const normToId = normalizeAccountId(toAccountId);
  if (normFromId === normToId || amount <= 0) return;

  const fromAcc = accounts.find((a) => a.id === normFromId || a.id === fromAccountId);
  const toAcc = accounts.find((a) => a.id === normToId || a.id === toAccountId);
  if (!fromAcc || !toAcc) return;

  const newFromBal = fromAcc.balance - amount;
  const newToBal = toAcc.balance + amount;

  setAccounts((draft) => {
    const f = draft.find((x) => x.id === normFromId || x.id === fromAccountId);
    if (f) f.balance = newFromBal;
    const t = draft.find((x) => x.id === normToId || x.id === toAccountId);
    if (t) t.balance = newToBal;
  });
  persistState();

  await supabase.from('bank_accounts').update({ balance: newFromBal }).eq('id', normFromId);
  await supabase.from('bank_accounts').update({ balance: newToBal }).eq('id', normToId);

  // Record Transfer Out
  await recordAccountTransaction({
    accountId: normFromId,
    toAccountId: normToId,
    transactionType: 'transfer_out',
    amount,
    category: 'Fund Transfer',
    notes: `Transferred to ${toAcc.name}. ${notes || ''}`,
    date,
  });

  // Record Transfer In
  await recordAccountTransaction({
    accountId: normToId,
    toAccountId: normFromId,
    transactionType: 'transfer_in',
    amount,
    category: 'Fund Transfer',
    notes: `Transferred from ${fromAcc.name}. ${notes || ''}`,
    date,
  });
}

// ----------------------------------------------------------------------------
// STAFF MANAGEMENT ACTIONS
// ----------------------------------------------------------------------------

export async function addStaffMember(data: {
  name: string;
  role: StaffRole;
  phone?: string;
  email?: string;
  permissions?: Record<string, boolean>;
  isActive?: boolean;
}) {
  const newStaff: StaffMember = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    name: data.name,
    role: data.role,
    phone: data.phone || '',
    email: data.email || '',
    permissions: data.permissions || getDefaultRolePermissions(data.role),
    isActive: data.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  setStaffList((draft) => {
    draft.unshift(newStaff);
  });
  persistState();

  await supabase.from('staff').insert({
    id: newStaff.id,
    business_id: newStaff.businessId,
    name: newStaff.name,
    phone: newStaff.phone,
    email: newStaff.email,
    role: newStaff.role,
    permissions: newStaff.permissions,
    is_active: newStaff.isActive,
  });

  return newStaff;
}

export async function updateStaffMember(id: string, updates: Partial<StaffMember>) {
  setStaffList((draft) => {
    const idx = draft.findIndex((s) => s.id === id);
    if (idx >= 0) Object.assign(draft[idx], updates);
  });
  persistState();

  await supabase
    .from('staff')
    .update({
      name: updates.name,
      phone: updates.phone,
      email: updates.email,
      role: updates.role,
      permissions: updates.permissions,
      is_active: updates.isActive,
    })
    .eq('id', id);
}

export async function deleteStaffMember(id: string) {
  setStaffList((draft) => {
    const idx = draft.findIndex((s) => s.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('staff').delete().eq('id', id);
}

// ----------------------------------------------------------------------------
// SALES & PURCHASE VOUCHER ACTIONS
// ----------------------------------------------------------------------------

export async function createQuotation(quotation: Omit<Quotation, 'id' | 'businessId' | 'createdAt'>) {
  const now = new Date();
  const dateStr = quotation.date || now.toISOString().split('T')[0];
  const bs = adToBs(new Date(dateStr));
  const fiscalYear = getNepaliFiscalYear(bs.formatted);

  const newQ: Quotation = {
    ...quotation,
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    createdAt: now.toISOString(),
  };
  setQuotations((draft) => {
    draft.unshift(newQ);
  });
  persistState();

  const { error: invErr } = await supabase.from('invoices').insert({
    id: newQ.id,
    business_id: currentBusiness.id,
    party_id: quotation.partyId || null,
    invoice_type: 'quotation',
    invoice_number: quotation.quotationNumber || `QT-${Date.now().toString().slice(-6)}`,
    fiscal_year: fiscalYear,
    invoice_date_ad: dateStr,
    invoice_date_bs: bs.formatted,
    subtotal: quotation.totalAmount,
    total_amount: quotation.totalAmount,
    paid_amount: 0,
    due_amount: quotation.totalAmount,
    status: quotation.status || 'draft',
    payment_mode: 'credit',
    notes: quotation.notes || (quotation.validUntil ? `Valid until: ${quotation.validUntil}` : ''),
  });

  if (!invErr && quotation.items && quotation.items.length > 0) {
    const itemsToInsert = quotation.items.map((it) => ({
      id: crypto.randomUUID(),
      invoice_id: newQ.id,
      item_id: it.itemId || null,
      item_name: it.itemName,
      quantity: it.quantity || 1,
      unit_price: it.unitPrice || 0,
      total_amount: it.totalAmount || (it.quantity || 1) * (it.unitPrice || 0),
    }));
    await supabase.from('invoice_items').insert(itemsToInsert);
  }

  return newQ;
}

export async function createSalesReturn(ret: Omit<SalesReturn, 'id' | 'businessId' | 'createdAt'>) {
  const now = new Date();
  const dateStr = ret.date || now.toISOString().split('T')[0];
  const bs = adToBs(new Date(dateStr));
  const fiscalYear = getNepaliFiscalYear(bs.formatted);

  const newR: SalesReturn = {
    ...ret,
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    createdAt: now.toISOString(),
  };
  setSalesReturns((draft) => {
    draft.unshift(newR);
  });

  // Adjust stock back up for returned items
  ret.items.forEach((item) => {
    if (item.itemId) {
      const idx = items.findIndex((i) => i.id === item.itemId);
      if (idx >= 0) {
        const newStock = items[idx].currentStock + item.quantity;
        setItems((draft) => {
          if (draft[idx]) draft[idx].currentStock = newStock;
        });
        supabase.from('items').update({ current_stock: newStock }).eq('id', item.itemId);
      }
    }
  });

  // Adjust party balance if credit return
  if (ret.partyId && ret.creditAmount > 0) {
    const pIdx = parties.findIndex((p) => p.id === ret.partyId);
    if (pIdx >= 0) {
      const newBal = parties[pIdx].currentBalance - ret.creditAmount;
      setParties((draft) => {
        if (draft[pIdx]) draft[pIdx].currentBalance = newBal;
      });
      supabase.from('parties').update({ current_balance: newBal }).eq('id', ret.partyId);
    }
  }

  const { error: invErr } = await supabase.from('invoices').insert({
    id: newR.id,
    business_id: currentBusiness.id,
    party_id: ret.partyId || null,
    invoice_type: 'sale_return',
    invoice_number: ret.returnNumber || `RTN-${Date.now().toString().slice(-6)}`,
    fiscal_year: fiscalYear,
    invoice_date_ad: dateStr,
    invoice_date_bs: bs.formatted,
    subtotal: ret.totalAmount,
    total_amount: ret.totalAmount,
    paid_amount: ret.refundAmount || 0,
    due_amount: ret.creditAmount || 0,
    status: 'paid',
    payment_mode: 'cash',
    notes: ret.reason || '',
  });

  if (!invErr && ret.items && ret.items.length > 0) {
    const itemsToInsert = ret.items.map((it) => ({
      id: crypto.randomUUID(),
      invoice_id: newR.id,
      item_id: it.itemId || null,
      item_name: it.itemName,
      quantity: it.quantity || 1,
      unit_price: it.unitPrice || 0,
      total_amount: it.totalAmount || (it.quantity || 1) * (it.unitPrice || 0),
    }));
    await supabase.from('invoice_items').insert(itemsToInsert);
  }

  persistState();
  return newR;
}

export async function createPaymentIn(data: {
  partyId: string;
  amount: number;
  paymentMode: PaymentMode;
  accountId?: string;
  notes?: string;
  date?: string;
}) {
  const party = parties.find((p) => p.id === data.partyId);
  const now = new Date();
  const dateAd = data.date || now.toISOString().split('T')[0];
  const bs = adToBs(new Date(dateAd));

  const payment: PaymentRecord = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    type: 'in',
    partyId: data.partyId,
    partyName: party?.name || 'Customer',
    amount: data.amount,
    paymentMode: data.paymentMode,
    accountId: data.accountId,
    date: dateAd,
    notes: data.notes,
    createdAt: now.toISOString(),
  };

  setPaymentRecords((draft) => {
    draft.unshift(payment);
  });

  // Record in Khata (liyo)
  await addKhataEntry({
    partyId: data.partyId,
    entryType: 'liyo',
    amount: data.amount,
    notes: `Payment In (${data.paymentMode}). ${data.notes || ''}`,
  });

  // Deposit into bank account if selected
  if (data.accountId) {
    await depositMoney(data.accountId, data.amount, 'Customer Payment Received', data.notes, dateAd);
  }

  // Sync to Supabase payments table
  await supabase.from('payments').insert({
    id: payment.id,
    business_id: currentBusiness.id,
    party_id: data.partyId || null,
    payment_mode: toValidPaymentMode(data.paymentMode),
    amount: data.amount,
    reference_id: data.accountId || null,
    payment_metadata: {
      type: 'in',
      notes: data.notes || `Payment In (${data.paymentMode})`,
      party_name: party?.name || 'Customer',
      account_id: data.accountId,
    },
    payment_date_ad: dateAd,
    payment_date_bs: bs.formatted,
  });

  persistState();
  return payment;
}

export async function createPurchaseBill(bill: Omit<PurchaseBill, 'id' | 'businessId' | 'createdAt'>) {
  const newBill: PurchaseBill = {
    ...bill,
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    createdAt: new Date().toISOString(),
  };

  setPurchaseBills((draft) => {
    draft.unshift(newBill);
  });

  // Increment stock for purchased items
  bill.items.forEach((item) => {
    if (item.itemId) {
      const idx = items.findIndex((i) => i.id === item.itemId);
      if (idx >= 0) {
        const newStock = items[idx].currentStock + item.quantity;
        setItems((draft) => {
          if (draft[idx]) draft[idx].currentStock = newStock;
        });
        supabase.from('items').update({ current_stock: newStock }).eq('id', item.itemId);
      }
    }
  });

  // If supplier has due amount, record in supplier ledger
  if (bill.dueAmount > 0 && bill.supplierId) {
    const sIdx = parties.findIndex((p) => p.id === bill.supplierId);
    if (sIdx >= 0) {
      const newBal = parties[sIdx].currentBalance - bill.dueAmount;
      setParties((draft) => {
        if (draft[sIdx]) draft[sIdx].currentBalance = newBal;
      });
      supabase.from('parties').update({ current_balance: newBal }).eq('id', bill.supplierId);
    }
  }

  // Cloud insert into Supabase bills table
  supabase
    .from('bills')
    .upsert({
      id: newBill.id,
      business_id: currentBusiness.id,
      title: bill.supplierName || 'Purchase Bill',
      bill_type: 'purchase',
      amount: bill.totalAmount,
      bill_date: bill.date,
      image_url: newBill.receiptUrl,
      tags: ['purchase'],
    })
    .then(({ error }) => {
      if (error) console.error('Cloud purchase bill sync error:', error);
    });

  persistState();
  return newBill;
}

export async function createPurchaseReturn(ret: Omit<PurchaseReturn, 'id' | 'businessId' | 'createdAt'>) {
  const now = new Date();
  const dateStr = ret.date || now.toISOString().split('T')[0];
  const bs = adToBs(new Date(dateStr));
  const fiscalYear = getNepaliFiscalYear(bs.formatted);

  const newR: PurchaseReturn = {
    ...ret,
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    createdAt: now.toISOString(),
  };

  setPurchaseReturns((draft) => {
    draft.unshift(newR);
  });

  // Decrement stock for returned items
  ret.items.forEach((item) => {
    if (item.itemId) {
      const idx = items.findIndex((i) => i.id === item.itemId);
      if (idx >= 0) {
        const newStock = Math.max(0, items[idx].currentStock - item.quantity);
        setItems((draft) => {
          if (draft[idx]) draft[idx].currentStock = newStock;
        });
        supabase.from('items').update({ current_stock: newStock }).eq('id', item.itemId);
      }
    }
  });

  const { error: invErr } = await supabase.from('invoices').insert({
    id: newR.id,
    business_id: currentBusiness.id,
    party_id: ret.supplierId || null,
    invoice_type: 'purchase_return',
    invoice_number: ret.returnNumber || `PR-${Date.now().toString().slice(-6)}`,
    fiscal_year: fiscalYear,
    invoice_date_ad: dateStr,
    invoice_date_bs: bs.formatted,
    subtotal: ret.totalAmount,
    total_amount: ret.totalAmount,
    paid_amount: ret.refundAmount || 0,
    due_amount: 0,
    status: 'paid',
    payment_mode: 'cash',
    notes: ret.reason || '',
  });

  if (!invErr && ret.items && ret.items.length > 0) {
    const itemsToInsert = ret.items.map((it) => ({
      id: crypto.randomUUID(),
      invoice_id: newR.id,
      item_id: it.itemId || null,
      item_name: it.itemName,
      quantity: it.quantity || 1,
      unit_price: it.costPrice || 0,
      total_amount: it.totalAmount || (it.quantity || 1) * (it.costPrice || 0),
    }));
    await supabase.from('invoice_items').insert(itemsToInsert);
  }

  persistState();
  return newR;
}

export async function createPaymentOut(data: {
  partyId: string;
  amount: number;
  paymentMode: PaymentMode;
  accountId?: string;
  notes?: string;
  date?: string;
}) {
  const party = parties.find((p) => p.id === data.partyId);
  const now = new Date();
  const dateAd = data.date || now.toISOString().split('T')[0];
  const bs = adToBs(new Date(dateAd));

  const payment: PaymentRecord = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    type: 'out',
    partyId: data.partyId,
    partyName: party?.name || 'Supplier',
    amount: data.amount,
    paymentMode: data.paymentMode,
    accountId: data.accountId,
    date: dateAd,
    notes: data.notes,
    createdAt: now.toISOString(),
  };

  setPaymentRecords((draft) => {
    draft.unshift(payment);
  });

  // Record in Khata (diyo)
  await addKhataEntry({
    partyId: data.partyId,
    entryType: 'diyo',
    amount: data.amount,
    notes: `Payment Out to Supplier (${data.paymentMode}). ${data.notes || ''}`,
  });

  // Withdraw from bank account if selected
  if (data.accountId) {
    await withdrawMoney(data.accountId, data.amount, 'Supplier Payment Made', data.notes, dateAd);
  }

  // Sync to Supabase payments table
  await supabase.from('payments').insert({
    id: payment.id,
    business_id: currentBusiness.id,
    party_id: data.partyId || null,
    payment_mode: toValidPaymentMode(data.paymentMode),
    amount: data.amount,
    reference_id: data.accountId || null,
    payment_metadata: {
      type: 'out',
      notes: data.notes || `Payment Out (${data.paymentMode})`,
      party_name: party?.name || 'Supplier',
      account_id: data.accountId,
    },
    payment_date_ad: dateAd,
    payment_date_bs: bs.formatted,
  });

  persistState();
  return payment;
}

// ----------------------------------------------------------------------------
// CORE INVENTORY & KHATA CRUD
// ----------------------------------------------------------------------------

export async function addItem(data: Omit<Item, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) {
  const newItem: Item = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setItems((draft) => {
    draft.unshift(newItem);
  });
  persistState();

  await supabase.from('items').insert({
    id: newItem.id,
    business_id: newItem.businessId,
    name: newItem.name,
    barcode: newItem.barcode,
    sku: newItem.sku,
    mrp: newItem.mrp,
    selling_price: newItem.sellingPrice,
    wholesale_price: newItem.wholesalePrice,
    purchase_cost: newItem.purchaseCost,
    current_stock: newItem.currentStock,
    low_stock_threshold: newItem.lowStockThreshold,
    tax_rate: newItem.taxRate,
    is_tax_inclusive: newItem.isTaxInclusive,
    image_url: newItem.imageUrl,
  });

  return newItem;
}

export async function editItem(id: string, updates: Partial<Item>) {
  setItems((draft) => {
    const idx = draft.findIndex((i) => i.id === id);
    if (idx >= 0) {
      Object.assign(draft[idx], updates, { updatedAt: new Date().toISOString() });
    }
  });
  persistState();

  await supabase
    .from('items')
    .update({
      name: updates.name,
      barcode: updates.barcode,
      sku: updates.sku,
      mrp: updates.mrp,
      selling_price: updates.sellingPrice,
      wholesale_price: updates.wholesalePrice,
      purchase_cost: updates.purchaseCost,
      current_stock: updates.currentStock,
      low_stock_threshold: updates.lowStockThreshold,
      tax_rate: updates.taxRate,
      is_tax_inclusive: updates.isTaxInclusive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function deleteItem(id: string) {
  setItems((draft) => {
    const idx = draft.findIndex((i) => i.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('items').update({ deleted_at: new Date().toISOString() }).eq('id', id);
}

export async function addParty(data: {
  name: string;
  phone?: string;
  address?: string;
  partyType: 'customer' | 'supplier';
  pan?: string;
  openingBalance?: number;
  creditLimit?: number;
}) {
  const newParty: Party = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    name: data.name,
    phone: data.phone || '',
    address: data.address || '',
    partyType: data.partyType,
    panVatNumber: data.pan,
    duePeriodDays: 30,
    openingBalance: data.openingBalance || 0,
    currentBalance: data.openingBalance || 0,
    creditLimit: data.creditLimit || 50000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setParties((draft) => {
    draft.unshift(newParty);
  });
  persistState();

  await supabase.from('parties').insert({
    id: newParty.id,
    business_id: newParty.businessId,
    name: newParty.name,
    phone: newParty.phone,
    address: newParty.address,
    party_type: newParty.partyType,
    pan_vat_number: newParty.panVatNumber,
    due_period_days: newParty.duePeriodDays,
    opening_balance: newParty.openingBalance,
    current_balance: newParty.currentBalance,
    credit_limit: newParty.creditLimit,
  });

  if (data.openingBalance && data.openingBalance !== 0) {
    addKhataEntry({
      partyId: newParty.id,
      entryType: data.openingBalance > 0 ? 'diyo' : 'liyo',
      amount: Math.abs(data.openingBalance),
      notes: 'Opening Balance Entry',
    });
  }

  return newParty;
}

export async function editParty(id: string, updates: Partial<Party>) {
  setParties((draft) => {
    const idx = draft.findIndex((p) => p.id === id);
    if (idx >= 0) {
      Object.assign(draft[idx], updates, { updatedAt: new Date().toISOString() });
    }
  });
  persistState();

  await supabase
    .from('parties')
    .update({
      name: updates.name,
      phone: updates.phone,
      address: updates.address,
      pan_vat_number: updates.panVatNumber,
      credit_limit: updates.creditLimit,
      due_period_days: updates.duePeriodDays,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

export async function deleteParty(id: string) {
  setParties((draft) => {
    const idx = draft.findIndex((p) => p.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('parties').update({ deleted_at: new Date().toISOString() }).eq('id', id);
}

export async function addKhataEntry(params: {
  partyId: string;
  entryType: 'liyo' | 'diyo';
  amount: number;
  notes?: string;
  receiptImageUrl?: string;
}) {
  const now = new Date();
  const bs = adToBs(now);
  const partyIdx = parties.findIndex((p) => p.id === params.partyId);
  if (partyIdx < 0) return;

  const party = parties[partyIdx];

  const newEntry: KhataEntry = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    partyId: party.id,
    partyName: party.name,
    entryType: params.entryType,
    amount: params.amount,
    dateAd: now.toISOString().split('T')[0],
    dateBs: bs.formatted,
    notes: params.notes,
    receiptImageUrl: params.receiptImageUrl,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  setKhataEntries((draft) => {
    draft.unshift(newEntry);
  });

  const balanceDelta = params.entryType === 'diyo' ? params.amount : -params.amount;
  const newBal = (party.currentBalance || 0) + balanceDelta;
  setParties((draft) => {
    draft[partyIdx].currentBalance = newBal;
  });
  persistState();

  try {
    await supabase.from('khata_entries').insert({
      id: newEntry.id,
      business_id: newEntry.businessId,
      party_id: newEntry.partyId,
      entry_type: newEntry.entryType,
      amount: newEntry.amount,
      date_ad: newEntry.dateAd,
      date_bs: newEntry.dateBs,
      notes: newEntry.notes,
      receipt_image_url: newEntry.receiptImageUrl,
    });
  } catch (e) {
    console.warn('Failed to insert khata entry to cloud:', e);
  }

  await supabase
    .from('parties')
    .update({ current_balance: newBal })
    .eq('id', party.id);
}

export function addToCart(item: Item, quantity = 1) {
  const existingIndex = cart.findIndex((c) => c.id === item.id);
  const price = pricingTier() === 'wholesale' && item.wholesalePrice ? item.wholesalePrice : item.sellingPrice;

  if (existingIndex >= 0) {
    setCart((draft) => {
      const current = draft[existingIndex];
      const newQty = current.cartQuantity + quantity;
      current.cartQuantity = newQty;
      current.lineTotal = newQty * current.selectedPrice - current.customDiscount;
    });
  } else {
    const newItem: CartItem = {
      ...item,
      cartQuantity: quantity,
      selectedPrice: price,
      customDiscount: 0,
      lineTotal: price * quantity,
    };
    setCart((draft) => {
      draft.push(newItem);
    });
  }
}

export function updateCartQuantity(itemId: string, delta: number) {
  const idx = cart.findIndex((c) => c.id === itemId);
  if (idx < 0) return;
  const current = cart[idx];
  const newQty = current.cartQuantity + delta;
  if (newQty <= 0) {
    setCart((draft) => {
      const i = draft.findIndex((c) => c.id === itemId);
      if (i >= 0) draft.splice(i, 1);
    });
  } else {
    setCart((draft) => {
      const target = draft[idx];
      target.cartQuantity = newQty;
      target.lineTotal = newQty * target.selectedPrice - target.customDiscount;
    });
  }
}

export function clearCart() {
  setCart((draft) => {
    draft.length = 0;
  });
}

export const cartSubtotal = createMemo(() => {
  return cart.reduce((acc, item) => acc + item.selectedPrice * item.cartQuantity, 0);
});

export const cartDiscount = createMemo(() => {
  return cart.reduce((acc, item) => acc + item.customDiscount, 0);
});

export const cartTaxAmount = createMemo(() => {
  return cart.reduce((acc, item) => {
    if (item.taxRate > 0) {
      const taxable = item.lineTotal / (1 + item.taxRate / 100);
      return acc + (item.lineTotal - taxable);
    }
    return acc;
  }, 0);
});

export const cartTotal = createMemo(() => {
  return Math.round((cartSubtotal() - cartDiscount()) * 100) / 100;
});

export async function checkoutInvoice(params: {
  paymentMode: PaymentMode;
  partyId?: string;
  paidAmount: number;
  notes?: string;
}): Promise<Invoice> {
  const now = new Date();
  const bs = adToBs(now);
  const fiscalYear = getNepaliFiscalYear(bs.formatted);
  const invoiceSeq = (invoices.length + 1).toString().padStart(4, '0');
  const invoiceNumber = `INV-${bs.year}-${invoiceSeq}`;
  const total = cartTotal();
  const due = Math.max(0, total - params.paidAmount);

  const selectedParty = params.partyId ? parties.find((p) => p.id === params.partyId) : undefined;

  const newInvoice: Invoice = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    partyId: params.partyId,
    partyName: selectedParty?.name,
    partyPhone: selectedParty?.phone,
    partyPan: selectedParty?.panVatNumber,
    invoiceType: 'sale',
    invoiceNumber,
    fiscalYear,
    invoiceDateAd: now.toISOString().split('T')[0],
    invoiceDateBs: bs.formatted,
    subtotal: cartSubtotal(),
    discountAmount: cartDiscount(),
    taxableAmount: total - cartTaxAmount(),
    taxAmount: cartTaxAmount(),
    roundOff: 0,
    totalAmount: total,
    paidAmount: params.paidAmount,
    dueAmount: due,
    status: due === 0 ? 'paid' : params.paidAmount > 0 ? 'partially_paid' : 'unpaid',
    paymentMode: params.paymentMode,
    cbmsStatus: currentBusiness.isVatRegistered ? 'pending' : 'not_applicable',
    items: cart.map((c) => ({
      id: crypto.randomUUID(),
      invoiceId: '',
      itemId: c.id,
      itemName: c.name,
      quantity: c.cartQuantity,
      unitPrice: c.selectedPrice,
      discountAmount: c.customDiscount,
      taxRate: c.taxRate,
      taxAmount: c.taxRate > 0 ? (c.lineTotal * c.taxRate) / (100 + c.taxRate) : 0,
      totalAmount: c.lineTotal,
    })),
    notes: params.notes,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  setInvoices((draft) => {
    draft.unshift(newInvoice);
  });

  cart.forEach((c) => {
    const itemIdx = items.findIndex((i) => i.id === c.id);
    if (itemIdx >= 0) {
      setItems((draft) => {
        draft[itemIdx].currentStock = Math.max(0, draft[itemIdx].currentStock - c.cartQuantity);
      });
      supabase
        .from('items')
        .update({ current_stock: Math.max(0, items[itemIdx].currentStock) })
        .eq('id', c.id);
    }
  });

  if (due > 0 && selectedParty) {
    const khataEntry: KhataEntry = {
      id: crypto.randomUUID(),
      businessId: currentBusiness.id,
      partyId: selectedParty.id,
      partyName: selectedParty.name,
      invoiceId: newInvoice.id,
      entryType: 'diyo',
      amount: due,
      dateAd: now.toISOString().split('T')[0],
      dateBs: bs.formatted,
      notes: `Balance due from Invoice #${invoiceNumber}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    setKhataEntries((draft) => {
      draft.unshift(khataEntry);
    });

    const partyIdx = parties.findIndex((p) => p.id === selectedParty.id);
    const newBal = (selectedParty.currentBalance || 0) + due;
    if (partyIdx >= 0) {
      setParties((draft) => {
        draft[partyIdx].currentBalance = newBal;
      });
    }

    supabase.from('khata_entries').insert({
      id: khataEntry.id,
      business_id: khataEntry.businessId,
      party_id: khataEntry.partyId,
      invoice_id: newInvoice.id,
      entry_type: 'diyo',
      amount: due,
      date_ad: khataEntry.dateAd,
      date_bs: khataEntry.dateBs,
      notes: khataEntry.notes,
    });

    supabase
      .from('parties')
      .update({ current_balance: newBal })
      .eq('id', selectedParty.id);
  }

  // Insert Invoice into Cloud Supabase
  await supabase.from('invoices').insert({
    id: newInvoice.id,
    business_id: newInvoice.businessId,
    party_id: newInvoice.partyId,
    invoice_number: newInvoice.invoiceNumber,
    fiscal_year: newInvoice.fiscalYear,
    invoice_date_ad: newInvoice.invoiceDateAd,
    invoice_date_bs: newInvoice.invoiceDateBs,
    subtotal: newInvoice.subtotal,
    discount_amount: newInvoice.discountAmount,
    taxable_amount: newInvoice.taxableAmount,
    tax_amount: newInvoice.taxAmount,
    total_amount: newInvoice.totalAmount,
    paid_amount: newInvoice.paidAmount,
    due_amount: newInvoice.dueAmount,
    status: newInvoice.status,
    payment_mode: newInvoice.paymentMode,
    notes: newInvoice.notes,
  });

  if (newInvoice.items.length > 0) {
    await supabase.from('invoice_items').insert(
      newInvoice.items.map((i) => ({
        id: i.id,
        invoice_id: newInvoice.id,
        item_id: i.itemId,
        item_name: i.itemName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        discount_amount: i.discountAmount,
        tax_rate: i.taxRate,
        tax_amount: i.taxAmount,
        total_amount: i.totalAmount,
      }))
    );
  }

  clearCart();
  persistState();
  return newInvoice;
}

export async function addExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt'> & { id?: string }) {
  const newExp: ExpenseRecord = {
    ...expense,
    id: expense.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  setExpenses((draft) => {
    draft.unshift(newExp);
  });
  persistState();

  await supabase.from('expenses').insert({
    id: newExp.id,
    business_id: currentBusiness.id,
    category: newExp.category,
    amount: newExp.amount,
    payment_mode: newExp.paymentMode,
    recipient_name: newExp.recipientName || null,
    notes: newExp.note || null,
    date_ad: newExp.date,
    date_bs: adToBs(new Date(newExp.date)).formatted,
    receipt_url: newExp.primaryImageId ? null : (newExp.receiptUrl || null),
    primary_image_id: newExp.primaryImageId || null,
  });

  return newExp;
}

export async function addIncome(income: Omit<IncomeRecord, 'id' | 'createdAt'> & { id?: string }) {
  const newInc: IncomeRecord = {
    ...income,
    id: income.id || crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  setIncomes((draft) => {
    draft.unshift(newInc);
  });
  persistState();

  await supabase.from('incomes').insert({
    id: newInc.id,
    business_id: currentBusiness.id,
    category: newInc.source,
    amount: newInc.amount,
    payment_mode: newInc.paymentMode,
    payer_name: newInc.payerName || null,
    notes: newInc.note || null,
    date_ad: newInc.date,
    date_bs: adToBs(new Date(newInc.date)).formatted,
    receipt_url: newInc.primaryImageId ? null : (newInc.receiptUrl || null),
    primary_image_id: newInc.primaryImageId || null,
  });

  return newInc;
}

export async function deleteExpense(id: string) {
  setExpenses((draft) => {
    const idx = draft.findIndex((e) => e.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('expenses').delete().eq('id', id);
}

export async function deleteIncome(id: string) {
  setIncomes((draft) => {
    const idx = draft.findIndex((i) => i.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('incomes').delete().eq('id', id);
}

export async function updateExpense(id: string, updates: Partial<ExpenseRecord>) {
  setExpenses((draft) => {
    const idx = draft.findIndex((e) => e.id === id);
    if (idx >= 0) {
      Object.assign(draft[idx], updates, { updatedAt: new Date().toISOString() });
    }
  });
  persistState();

  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.paymentMode !== undefined) payload.payment_mode = updates.paymentMode;
  if (updates.recipientName !== undefined) payload.recipient_name = updates.recipientName;
  if (updates.note !== undefined) payload.notes = updates.note;
  if (updates.receiptUrl !== undefined) payload.receipt_url = updates.receiptUrl;
  if (updates.primaryImageId !== undefined) payload.primary_image_id = updates.primaryImageId;
  if (updates.date !== undefined) {
    payload.date_ad = updates.date;
    payload.date_bs = adToBs(new Date(updates.date)).formatted;
  }

  await supabase.from('expenses').update(payload).eq('id', id);
}

export async function updateIncome(id: string, updates: Partial<IncomeRecord>) {
  setIncomes((draft) => {
    const idx = draft.findIndex((i) => i.id === id);
    if (idx >= 0) {
      Object.assign(draft[idx], updates, { updatedAt: new Date().toISOString() });
    }
  });
  persistState();

  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.source !== undefined) payload.category = updates.source;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.paymentMode !== undefined) payload.payment_mode = updates.paymentMode;
  if (updates.payerName !== undefined) payload.payer_name = updates.payerName;
  if (updates.note !== undefined) payload.notes = updates.note;
  if (updates.receiptUrl !== undefined) payload.receipt_url = updates.receiptUrl;
  if (updates.primaryImageId !== undefined) payload.primary_image_id = updates.primaryImageId;
  if (updates.date !== undefined) {
    payload.date_ad = updates.date;
    payload.date_bs = adToBs(new Date(updates.date)).formatted;
  }

  await supabase.from('incomes').update(payload).eq('id', id);
}

export function addExpenseCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed || customExpenseCategories.includes(trimmed)) return;
  setCustomExpenseCategories((prev) => [...prev, trimmed]);
  persistState();
}

export function deleteExpenseCategory(name: string) {
  setCustomExpenseCategories((prev) => prev.filter((c) => c !== name));
  persistState();
}

export function addIncomeCategory(name: string) {
  const trimmed = name.trim();
  if (!trimmed || customIncomeCategories.includes(trimmed)) return;
  setCustomIncomeCategories((prev) => [...prev, trimmed]);
  persistState();
}

export function deleteIncomeCategory(name: string) {
  setCustomIncomeCategories((prev) => prev.filter((c) => c !== name));
  persistState();
}

export async function addReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>) {
  const newRem: Reminder = {
    ...reminder,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  setReminders((draft) => {
    draft.unshift(newRem);
  });
  persistState();

  await supabase.from('reminders').insert({
    id: newRem.id,
    business_id: currentBusiness.id,
    party_id: newRem.partyId,
    title: newRem.title,
    amount: newRem.amount || 0,
    due_date_ad: newRem.dueDate,
    due_date_bs: adToBs(new Date(newRem.dueDate)).formatted,
    status: newRem.status,
  });

  return newRem;
}

export async function updateReminder(id: string, updates: Partial<Reminder>) {
  setReminders((draft) => {
    const idx = draft.findIndex((r) => r.id === id);
    if (idx >= 0) Object.assign(draft[idx], updates);
  });
  persistState();

  await supabase.from('reminders').update(updates).eq('id', id);
}

export async function deleteReminder(id: string) {
  setReminders((draft) => {
    const idx = draft.findIndex((r) => r.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('reminders').delete().eq('id', id);
}

export async function addBill(bill: Omit<BillItem, 'id' | 'createdAt'> & { id?: string }) {
  const newBill: BillItem = {
    ...bill,
    id: bill.id || crypto.randomUUID(),
    title: bill.title || bill.vendorName || 'Bill',
    type: bill.type || bill.category || 'General',
    date: bill.date || bill.billDate || new Date().toISOString().split('T')[0],
    image: bill.primaryImageId ? '' : (bill.image || bill.imageUrl || ''),
    imageUrl: bill.primaryImageId ? '' : (bill.imageUrl || bill.image || ''),
    primaryImageId: bill.primaryImageId,
    tags: bill.tags || [],
    createdAt: new Date().toISOString(),
  };
  setBills((draft) => {
    draft.unshift(newBill);
  });
  persistState();

  await supabase.from('bills').insert({
    id: newBill.id,
    business_id: currentBusiness.id,
    title: newBill.title,
    bill_type: newBill.type,
    amount: newBill.amount,
    bill_date: newBill.date,
    image_url: newBill.primaryImageId ? null : (newBill.imageUrl || newBill.image || null),
    primary_image_id: newBill.primaryImageId || null,
    tags: newBill.tags,
  });

  return newBill;
}

export async function updateBillPrimaryImage(billId: string, primaryImageId: string) {
  setBills((draft) => {
    const bill = draft.find((b) => b.id === billId);
    if (bill) {
      bill.primaryImageId = primaryImageId;
      bill.imageUrl = '';
      bill.image = '';
    }
  });
  persistState();

  if (currentBusiness.id && currentBusiness.id !== 'a0000000-0000-0000-0000-000000000001') {
    try {
      await supabase
        .from('bills')
        .update({ primary_image_id: primaryImageId })
        .eq('id', billId)
        .eq('business_id', currentBusiness.id);

      await supabase
        .from('bill_images')
        .update({ bill_id: billId })
        .eq('id', primaryImageId);
    } catch (err) {
      console.warn('[updateBillPrimaryImage] Cloud sync error:', err);
    }
  }
}

export async function deleteBill(id: string) {
  const target = bills.find((b) => b.id === id);

  setBills((draft) => {
    const idx = draft.findIndex((b) => b.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('bills').delete().eq('id', id);

  if (target?.primaryImageId && currentBusiness.id) {
    try {
      await supabase.functions.invoke('delete-bill-image', {
        body: { imageId: target.primaryImageId, businessId: currentBusiness.id },
      });
    } catch (err) {
      console.warn('[deleteBill] Failed to clean up R2 image:', err);
    }
  }
}

export async function addNote(note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const newNote: NoteItem = {
    ...note,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  setNotes((draft) => {
    draft.unshift(newNote);
  });
  persistState();

  try {
    await supabase.from('notes').insert({
      id: newNote.id,
      business_id: currentBusiness.id,
      title: newNote.title,
      content: newNote.content,
      category: newNote.category,
      color: newNote.color || 'emerald',
      is_pinned: newNote.isPinned ?? false,
      created_at: newNote.createdAt,
    });
  } catch (e) {
    console.warn('Failed to sync note insert:', e);
  }

  return newNote;
}

export async function updateNote(id: string, updates: Partial<NoteItem>) {
  const { createdAt, id: _id, ...safeUpdates } = updates;
  const now = new Date().toISOString();
  setNotes((draft) => {
    const idx = draft.findIndex((n) => n.id === id);
    if (idx >= 0) {
      Object.assign(draft[idx], safeUpdates, { updatedAt: now });
    }
  });
  persistState();

  try {
    const payload: any = { updated_at: now };
    if (safeUpdates.title !== undefined) payload.title = safeUpdates.title;
    if (safeUpdates.content !== undefined) payload.content = safeUpdates.content;
    if (safeUpdates.category !== undefined) payload.category = safeUpdates.category;
    if (safeUpdates.color !== undefined) payload.color = safeUpdates.color;
    if (safeUpdates.isPinned !== undefined) payload.is_pinned = safeUpdates.isPinned;

    await supabase
      .from('notes')
      .update(payload)
      .eq('id', id);
  } catch (e) {
    console.warn('Failed to sync note update:', e);
  }
}

export async function deleteNote(id: string) {
  setNotes((draft) => {
    const idx = draft.findIndex((n) => n.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('notes').delete().eq('id', id);
}

export function persistState() {
  localStorage.setItem('byapar_items', JSON.stringify(items));
  localStorage.setItem('byapar_parties', JSON.stringify(parties));
  localStorage.setItem('byapar_khata', JSON.stringify(khataEntries));
  localStorage.setItem('byapar_invoices', JSON.stringify(invoices));
  localStorage.setItem('byapar_settings', JSON.stringify(settings));
  localStorage.setItem('byapar_reminders', JSON.stringify(reminders));
  localStorage.setItem('byapar_expenses', JSON.stringify(expenses));
  localStorage.setItem('byapar_incomes', JSON.stringify(incomes));
  localStorage.setItem('byapar_accounts', JSON.stringify(accounts));
  localStorage.setItem('byapar_account_txs', JSON.stringify(accountTransactions));
  localStorage.setItem('byapar_staff', JSON.stringify(staffList));
  localStorage.setItem('byapar_quotations', JSON.stringify(quotations));
  localStorage.setItem('byapar_sales_returns', JSON.stringify(salesReturns));
  localStorage.setItem('byapar_purchase_bills', JSON.stringify(purchaseBills));
  localStorage.setItem('byapar_purchase_returns', JSON.stringify(purchaseReturns));
  localStorage.setItem('byapar_payment_records', JSON.stringify(paymentRecords));
  localStorage.setItem('byapar_bills', JSON.stringify(bills));
  localStorage.setItem('byapar_notes', JSON.stringify(notes));
  localStorage.setItem('byapar_custom_expense_cats', JSON.stringify(customExpenseCategories));
  localStorage.setItem('byapar_custom_income_cats', JSON.stringify(customIncomeCategories));
  localStorage.setItem('byapar_current_business', JSON.stringify(currentBusiness));
}
