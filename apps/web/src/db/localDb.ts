import { createSignal, createMemo, createStore } from 'solid-js';
import { Item, Party, Invoice, KhataEntry, CartItem, PaymentMode, InvoiceType } from '@byapar/core';
import { adToBs, getNepaliFiscalYear } from '@byapar/core';
import { supabase, currentUser } from './auth';
import { getDefaultRolePermissions, StaffRole } from './permissions';

export interface AppSettings {
  lang: 'ne' | 'en';
  calendar: 'BS' | 'AD';
  voiceSoundboxEnabled: boolean;
  thermalPrinterWidth: '58mm' | '80mm';
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
  note?: string;
  status: 'upcoming' | 'completed';
  createdAt: string;
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
  createdAt: string;
}

export interface IncomeRecord {
  id: string;
  source: string;
  amount: number;
  paymentMode: string;
  date: string;
  payerName?: string;
  note?: string;
  createdAt: string;
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
  | 'greeting-cards';

// Global App Signals
export const [isOnline, setIsOnline] = createSignal<boolean>(true);
export const [activeTab, setActiveTab] = createSignal<ActiveTab>('dashboard');
export const [pricingTier, setPricingTier] = createSignal<'retail' | 'wholesale'>('retail');

// Dark mode state
export const [isDarkMode, setIsDarkMode] = createSignal<boolean>(
  loadStored('theme', 'dark') === 'dark'
);

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
    voiceSoundboxEnabled: true,
    thermalPrinterWidth: '80mm',
  })
);

export interface BillItem {
  id: string;
  title: string;
  type: string;
  amount: number;
  date: string;
  image: string;
  tags: string[];
  createdAt: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
}

export const [reminders, setReminders] = createStore<Reminder[]>(loadStored('reminders', []));
export const [expenses, setExpenses] = createStore<ExpenseRecord[]>(loadStored('expenses', []));
export const [incomes, setIncomes] = createStore<IncomeRecord[]>(loadStored('incomes', []));
export const [accounts, setAccounts] = createStore<BankAccount[]>(loadStored('accounts', [
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'Cash in Hand / Main Drawer', accountType: 'cash', balance: 50000, bankName: 'Cash Drawer' },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'Nabil Bank Current A/C', accountType: 'bank', accountNumber: '01928472918', balance: 185000, bankName: 'Nabil Bank', branch: 'New Road, Kathmandu' },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'eSewa Merchant Wallet', accountType: 'wallet', accountNumber: '9841234567', balance: 15000, bankName: 'eSewa Nepal' },
]));
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

// Modals Global Signals
export const [showAuthModal, setShowAuthModal] = createSignal(false);
export const [showProfileModal, setShowProfileModal] = createSignal(false);
export const [showSubscriptionModal, setShowSubscriptionModal] = createSignal(false);
export const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModal] = createSignal(false);
export const [showHelpModal, setShowHelpModal] = createSignal(false);
export const [showTutorialsModal, setShowTutorialsModal] = createSignal(false);
export const [showWhatsNewModal, setShowWhatsNewModal] = createSignal(false);

// Reactive Business Profile
export const [currentBusiness, setCurrentBusiness] = createStore(
  loadStored('current_business', {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Shrestha Mart & General Store',
    nameEn: 'Shrestha Mart & General Store',
    ownerName: 'Suman Shrestha',
    pan: '302918274',
    address: 'New Road, Kathmandu',
    phone: '9841234567',
    isVatRegistered: true,
  })
);

export function updateBusinessProfile(data: Partial<typeof currentBusiness>) {
  setCurrentBusiness((prev) => Object.assign(prev, data));
  localStorage.setItem('byapar_current_business', JSON.stringify(currentBusiness));

  // Sync with Supabase
  supabase
    .from('businesses')
    .update({
      name: data.name,
      pan_vat_number: data.pan,
      phone: data.phone,
      address_line: data.address,
      is_vat_registered: data.isVatRegistered,
    })
    .eq('id', currentBusiness.id)
    .then(({ error }) => {
      if (error) console.error('Error updating business on cloud:', error);
    });
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

function mapDbInvoice(row: any): Invoice {
  return {
    id: row.id,
    businessId: row.business_id,
    partyId: row.party_id,
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
    notes: row.notes,
    items: (row.invoice_items || []).map((ii: any) => ({
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
    })),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function mapDbAccount(row: any): BankAccount {
  return {
    id: row.id,
    name: row.account_name,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountType: (row.branch || '').toLowerCase().includes('wallet')
      ? 'wallet'
      : row.branch
      ? 'bank'
      : 'cash',
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

// ----------------------------------------------------------------------------
// Cloud Supabase Hydration & Realtime Synchronization
// ----------------------------------------------------------------------------
export async function syncFromCloud() {
  const bizId = currentBusiness.id;
  try {
    // 1. Items
    const { data: dbItems } = await supabase
      .from('items')
      .select('*')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbItems) setItems(dbItems.map(mapDbItem));

    // 2. Parties
    const { data: dbParties } = await supabase
      .from('parties')
      .select('*')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbParties) setParties(dbParties.map(mapDbParty));

    // 3. Khata Entries
    const { data: dbKhata } = await supabase
      .from('khata_entries')
      .select('*')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbKhata) setKhataEntries(dbKhata.map(mapDbKhata));

    // 4. Invoices
    const { data: dbInvoices } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('business_id', bizId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (dbInvoices) setInvoices(dbInvoices.map(mapDbInvoice));

    // 5. Bank Accounts
    const { data: dbAccounts } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('business_id', bizId);

    if (dbAccounts && dbAccounts.length > 0) {
      setAccounts(dbAccounts.map(mapDbAccount));
    }

    // 6. Account Transactions
    const { data: dbTxs } = await supabase
      .from('account_transactions')
      .select('*')
      .eq('business_id', bizId)
      .order('date_ad', { ascending: false });

    if (dbTxs) setAccountTransactions(dbTxs.map(mapDbAccountTx));

    // 7. Staff Members
    const { data: dbStaff } = await supabase
      .from('staff')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });

    if (dbStaff && dbStaff.length > 0) {
      setStaffList(dbStaff.map(mapDbStaff));
    }

    persistState();
  } catch (err) {
    console.error('Failed to sync data from cloud:', err);
  }
}

// Subscribe to Supabase Realtime changes
let realtimeSubscription: any = null;

export function initRealtimeSync() {
  if (realtimeSubscription) {
    supabase.removeChannel(realtimeSubscription);
  }

  const bizId = currentBusiness.id;
  const channel = supabase
    .channel(`realtime_biz_${bizId}`)
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
}) {
  const newStaff: StaffMember = {
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    name: data.name,
    role: data.role,
    phone: data.phone || '',
    email: data.email || '',
    permissions: data.permissions || getDefaultRolePermissions(data.role),
    isActive: true,
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
  const newQ: Quotation = {
    ...quotation,
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    createdAt: new Date().toISOString(),
  };
  setQuotations((draft) => {
    draft.unshift(newQ);
  });
  persistState();
  return newQ;
}

export async function createSalesReturn(ret: Omit<SalesReturn, 'id' | 'businessId' | 'createdAt'>) {
  const newR: SalesReturn = {
    ...ret,
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    createdAt: new Date().toISOString(),
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
        setItems(idx, 'currentStock', newStock);
        supabase.from('items').update({ current_stock: newStock }).eq('id', item.itemId);
      }
    }
  });

  // Adjust party balance if credit return
  if (ret.partyId && ret.creditAmount > 0) {
    const pIdx = parties.findIndex((p) => p.id === ret.partyId);
    if (pIdx >= 0) {
      const newBal = parties[pIdx].currentBalance - ret.creditAmount;
      setParties(pIdx, 'currentBalance', newBal);
      supabase.from('parties').update({ current_balance: newBal }).eq('id', ret.partyId);
    }
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
        setItems(idx, 'currentStock', newStock);
        supabase.from('items').update({ current_stock: newStock }).eq('id', item.itemId);
      }
    }
  });

  // If supplier has due amount, record in supplier ledger
  if (bill.dueAmount > 0 && bill.supplierId) {
    const sIdx = parties.findIndex((p) => p.id === bill.supplierId);
    if (sIdx >= 0) {
      const newBal = parties[sIdx].currentBalance - bill.dueAmount;
      setParties(sIdx, 'currentBalance', newBal);
      supabase.from('parties').update({ current_balance: newBal }).eq('id', bill.supplierId);
    }
  }

  persistState();
  return newBill;
}

export async function createPurchaseReturn(ret: Omit<PurchaseReturn, 'id' | 'businessId' | 'createdAt'>) {
  const newR: PurchaseReturn = {
    ...ret,
    id: crypto.randomUUID(),
    businessId: currentBusiness.id,
    createdAt: new Date().toISOString(),
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
        setItems(idx, 'currentStock', newStock);
        supabase.from('items').update({ current_stock: newStock }).eq('id', item.itemId);
      }
    }
  });

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
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  setKhataEntries((draft) => {
    draft.unshift(newEntry);
  });

  const balanceDelta = params.entryType === 'diyo' ? params.amount : -params.amount;
  setParties((draft) => {
    draft[partyIdx].currentBalance += balanceDelta;
  });
  persistState();

  await supabase.from('khata_entries').insert({
    id: newEntry.id,
    business_id: newEntry.businessId,
    party_id: newEntry.partyId,
    entry_type: newEntry.entryType,
    amount: newEntry.amount,
    date_ad: newEntry.dateAd,
    date_bs: newEntry.dateBs,
    notes: newEntry.notes,
  });

  await supabase
    .from('parties')
    .update({ current_balance: party.currentBalance + balanceDelta })
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
    if (partyIdx >= 0) {
      setParties((draft) => {
        draft[partyIdx].currentBalance += due;
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
      .update({ current_balance: selectedParty.currentBalance + due })
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

export async function addExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) {
  const newExp: ExpenseRecord = {
    ...expense,
    id: crypto.randomUUID(),
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
    recipient_name: newExp.recipientName,
    notes: newExp.note,
    date_ad: newExp.date,
    date_bs: adToBs(new Date(newExp.date)).formatted,
  });

  return newExp;
}

export async function addIncome(income: Omit<IncomeRecord, 'id' | 'createdAt'>) {
  const newInc: IncomeRecord = {
    ...income,
    id: crypto.randomUUID(),
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
    payer_name: newInc.payerName,
    notes: newInc.note,
    date_ad: newInc.date,
    date_bs: adToBs(new Date(newInc.date)).formatted,
  });

  return newInc;
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

export async function addBill(bill: Omit<BillItem, 'id' | 'createdAt'>) {
  const newBill: BillItem = {
    ...bill,
    id: crypto.randomUUID(),
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
    image_url: newBill.image,
    tags: newBill.tags,
  });

  return newBill;
}

export async function deleteBill(id: string) {
  setBills((draft) => {
    const idx = draft.findIndex((b) => b.id === id);
    if (idx >= 0) draft.splice(idx, 1);
  });
  persistState();

  await supabase.from('bills').delete().eq('id', id);
}

export async function addNote(note: Omit<NoteItem, 'id' | 'updatedAt'>) {
  const newNote: NoteItem = {
    ...note,
    id: crypto.randomUUID(),
    updatedAt: new Date().toLocaleDateString(),
  };
  setNotes((draft) => {
    draft.unshift(newNote);
  });
  persistState();

  await supabase.from('notes').insert({
    id: newNote.id,
    business_id: currentBusiness.id,
    title: newNote.title,
    content: newNote.content,
    category: newNote.category,
  });

  return newNote;
}

export async function updateNote(id: string, updates: Partial<NoteItem>) {
  setNotes((draft) => {
    const idx = draft.findIndex((n) => n.id === id);
    if (idx >= 0) {
      Object.assign(draft[idx], updates, { updatedAt: new Date().toLocaleDateString() });
    }
  });
  persistState();

  await supabase
    .from('notes')
    .update({
      title: updates.title,
      content: updates.content,
      category: updates.category,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
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
  localStorage.setItem('byapar_current_business', JSON.stringify(currentBusiness));
}
