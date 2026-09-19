import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Party,
  LedgerEntry,
  Invoice,
  BillImage,
  StoreProfile,
  CartItem,
  ActiveTab,
  PaymentMode,
  BankAccount,
  AccountTransaction,
  Quotation,
  SalesReturn,
  PurchaseBill,
  PurchaseReturn,
  PaymentRecord,
  StaffMember,
  CategoryItem,
  BusinessType,
} from '../types';
import { generateUUID } from '../utils/uuid';
import { getDefaultRolePermissions, StaffRole } from '../db/permissions';
import { storage } from '../services/storage';
import { ThemeMode, Theme, getTheme } from '../theme';
import { supabase } from '../config/supabase';
import { User } from '@supabase/supabase-js';
import { updateService } from '../services/updateService';
import { adToBs, getNepaliFiscalYear } from '@byapar/core';

const DEFAULT_BIZ_ID = 'a0000000-0000-0000-0000-000000000001';

const INITIAL_STORE: StoreProfile = {
  name: '',
  ownerName: '',
  phone: '',
  panNumber: '',
  address: '',
  currency: 'NPR',
  vatEnabled: false,
  paperWidth: '58mm',
  whatsappTemplate: '',
  businessType: 'general',
};

interface AppContextType {
  isReady: boolean;
  isOnboarded: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navigateBack: () => boolean;
  themeMode: ThemeMode;
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleThemeMode: () => Promise<void>;
  store: StoreProfile;
  updateStoreProfile: (updates: Partial<StoreProfile>) => Promise<void>;
  completeOnboarding: (storeData: StoreProfile) => Promise<void>;
  resetOnboarding: () => Promise<void>;

  // Cloud Auth & Synchronization
  user: User | null;
  activeBizId: string;
  categories: CategoryItem[];
  refreshFromCloud: () => Promise<void>;
  login: (email: string, pass: string) => Promise<{ data?: any; error?: any }>;
  signUp: (email: string, pass: string, storeName: string, phone: string, businessType?: BusinessType) => Promise<{ data?: any; error?: any }>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ error?: string }>;
  showAuthModal: boolean;
  setShowAuthModal: (visible: boolean) => void;

  // Products CRUD
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  editProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Parties CRUD
  parties: Party[];
  addParty: (party: Omit<Party, 'id' | 'balance'>) => Promise<void>;
  editParty: (id: string, updates: Partial<Party>) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;

  // Ledger Entries
  ledgerEntries: LedgerEntry[];
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => Promise<void>;
  editLedgerEntry: (id: string, updates: Partial<LedgerEntry>) => Promise<void>;
  deleteLedgerEntry: (id: string) => Promise<void>;

  // Bills CRUD
  bills: BillImage[];
  addBill: (bill: Omit<BillImage, 'id'>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;

  // Invoices & POS
  invoices: Invoice[];
  cart: CartItem[];
  addToCart: (product: Product) => void;
  updateCartQty: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  completeCheckout: (mode: PaymentMode, partyId?: string) => Promise<Invoice | null>;

  // Accounts & Money Management
  accounts: BankAccount[];
  accountTransactions: AccountTransaction[];
  addAccount: (acc: Omit<BankAccount, 'id'>) => Promise<void>;
  editAccount: (id: string, updates: Partial<BankAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  depositMoney: (accountId: string, amount: number, category?: string, notes?: string, date?: string) => Promise<void>;
  withdrawMoney: (accountId: string, amount: number, category?: string, notes?: string, date?: string) => Promise<void>;
  transferMoney: (fromId: string, toId: string, amount: number, notes?: string, date?: string) => Promise<void>;

  // Sales Vouchers
  quotations: Quotation[];
  createQuotation: (q: Omit<Quotation, 'id'>) => Promise<Quotation>;
  salesReturns: SalesReturn[];
  createSalesReturn: (sr: Omit<SalesReturn, 'id'>) => Promise<SalesReturn>;
  paymentInRecords: PaymentRecord[];
  createPaymentIn: (pay: Omit<PaymentRecord, 'id'>) => Promise<PaymentRecord>;

  // Purchase Vouchers
  purchaseBills: PurchaseBill[];
  createPurchaseBill: (b: Omit<PurchaseBill, 'id'>) => Promise<PurchaseBill>;
  purchaseReturns: PurchaseReturn[];
  createPurchaseReturn: (pr: Omit<PurchaseReturn, 'id'>) => Promise<PurchaseReturn>;
  paymentOutRecords: PaymentRecord[];
  createPaymentOut: (pay: Omit<PaymentRecord, 'id'>) => Promise<PaymentRecord>;

  // Active Invoice for Receipt modal
  activeInvoice: Invoice | null;
  setActiveInvoice: (inv: Invoice | null) => void;

  // Selected party for ledger detail
  selectedPartyId: string | null;
  setSelectedPartyId: (id: string | null) => void;

  // Staff Management
  staffList: StaffMember[];
  addStaffMember: (staff: Omit<StaffMember, 'id'>) => Promise<StaffMember>;
  updateStaffMember: (id: string, updates: Partial<StaffMember>) => Promise<void>;
  deleteStaffMember: (id: string) => Promise<void>;

  // Reset
  resetAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ----------------------------------------------------------------------------
// DB Mapping Utilities
// ----------------------------------------------------------------------------
function mapDbToProduct(row: any): Product {
  const catName = row.categories?.name || row.category || 'General';
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode || '',
    category: catName,
    costPrice: Number(row.purchase_cost) || 0,
    salePrice: Number(row.selling_price) || 0,
    stock: Number(row.current_stock) || 0,
    unit: 'Pcs',
    imageUri: row.image_url,
  };
}

function mapDbToParty(row: any): Party {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    type: row.party_type === 'supplier' ? 'supplier' : 'customer',
    balance: Number(row.current_balance) || 0,
    address: row.address,
  };
}

function mapDbToLedger(row: any): LedgerEntry {
  return {
    id: row.id,
    partyId: row.party_id,
    date: row.date_ad,
    type: row.entry_type === 'diyo' ? 'credit' : 'payment',
    amount: Number(row.amount) || 0,
    note: row.notes || '',
    billImageUri: row.receipt_image_url,
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

function mapDbToInvoice(row: any): Invoice {
  const rawItems = (row.invoice_items || []).map((i: any) => ({
    name: i.item_name,
    qty: Number(i.quantity) || 1,
    price: Number(i.unit_price) || 0,
  }));

  const seen = new Set<string>();
  const items = rawItems.filter((item: any) => {
    const key = `${item.name}-${item.qty}-${item.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.invoice_date_ad,
    partyName: row.parties?.name || row.party_id || 'Counter Sale',
    total: Number(row.total_amount) || 0,
    paymentMode: row.payment_mode || 'cash',
    items,
  };
}

function mapDbToQuotation(row: any): Quotation {
  return {
    id: row.id,
    quotationNumber: row.invoice_number,
    partyId: row.party_id,
    partyName: row.parties?.name || row.party_name || 'Customer',
    partyPhone: row.parties?.phone || row.party_phone || undefined,
    date: row.invoice_date_ad,
    validUntil: undefined,
    totalAmount: Number(row.total_amount) || 0,
    notes: row.notes || undefined,
    status: (row.status as any) || 'draft',
    items: (row.invoice_items || []).map((ii: any) => ({
      id: ii.id,
      itemName: ii.item_name,
      quantity: Number(ii.quantity) || 1,
      unitPrice: Number(ii.unit_price) || 0,
      totalAmount: Number(ii.total_amount) || 0,
    })),
  };
}

function mapDbToSalesReturn(row: any): SalesReturn {
  return {
    id: row.id,
    returnNumber: row.invoice_number,
    partyId: row.party_id,
    partyName: row.parties?.name || row.party_name || 'Customer',
    date: row.invoice_date_ad,
    totalAmount: Number(row.total_amount) || 0,
    refundAmount: Number(row.paid_amount) || 0,
    creditAmount: Number(row.due_amount) || 0,
    reason: row.notes || undefined,
    items: (row.invoice_items || []).map((ii: any) => ({
      id: ii.id,
      itemName: ii.item_name,
      quantity: Number(ii.quantity) || 1,
      unitPrice: Number(ii.unit_price) || 0,
      totalAmount: Number(ii.total_amount) || 0,
    })),
  };
}

function mapDbToPurchaseReturn(row: any): PurchaseReturn {
  return {
    id: row.id,
    returnNumber: row.invoice_number,
    supplierId: row.party_id,
    supplierName: row.parties?.name || row.party_name || 'Supplier',
    date: row.invoice_date_ad,
    totalAmount: Number(row.total_amount) || 0,
    refundAmount: Number(row.paid_amount) || 0,
    reason: row.notes || undefined,
    items: (row.invoice_items || []).map((ii: any) => ({
      id: ii.id,
      itemName: ii.item_name,
      quantity: Number(ii.quantity) || 1,
      costPrice: Number(ii.unit_price) || 0,
      totalAmount: Number(ii.total_amount) || 0,
    })),
  };
}

function mapDbToPaymentRecord(row: any): PaymentRecord {
  const meta = row.payment_metadata || {};
  return {
    id: row.id,
    type: meta.type || (row.reference_id === 'out' ? 'out' : 'in'),
    partyId: row.party_id || '',
    partyName: meta.party_name || row.parties?.name || 'Party',
    amount: Number(row.amount) || 0,
    paymentMode: row.payment_mode || 'cash',
    accountId: meta.account_id || row.reference_id || undefined,
    date: row.payment_date_ad || row.created_at?.split('T')[0],
    notes: meta.notes || row.notes || undefined,
  };
}

function mapDbToBill(row: any): BillImage {
  return {
    id: row.id,
    title: row.title,
    vendorName: 'Vendor',
    amount: Number(row.amount) || 0,
    date: row.bill_date,
    category: 'Inventory',
    imageUri: row.image_url || '',
    notes: '',
  };
}

function mapDbToAccountTx(row: any): AccountTransaction {
  return {
    id: row.id,
    accountId: row.account_id,
    accountName: row.account_name,
    toAccountId: row.to_account_id,
    toAccountName: row.to_account_name,
    transactionType: row.transaction_type,
    amount: Number(row.amount) || 0,
    balanceAfter: Number(row.balance_after) || 0,
    category: row.category,
    notes: row.notes,
    dateAd: row.date_ad,
    createdAt: row.created_at,
  };
}

function mapDbToAccount(row: any): BankAccount {
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

function mapDbToStaff(row: any): StaffMember {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role || 'Sales Person',
    permissions: row.permissions || {},
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(true);
  const [activeTab, setActiveTabState] = useState<ActiveTab>('dashboard');
  const [tabHistory, setTabHistory] = useState<ActiveTab[]>(['dashboard']);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    setTabHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === tab) return prev;
      return [...prev, tab];
    });
    storage.set('active_tab', tab).catch(() => {});
  };

  const navigateBack = (): boolean => {
    if (tabHistory.length > 1) {
      const nextHistory = [...tabHistory];
      nextHistory.pop(); // Pop current tab
      const prevTab = nextHistory[nextHistory.length - 1];
      setTabHistory(nextHistory);
      setActiveTabState(prevTab);
      storage.set('active_tab', prevTab).catch(() => {});
      return true;
    }
    if (activeTab !== 'dashboard') {
      setActiveTabState('dashboard');
      setTabHistory(['dashboard']);
      storage.set('active_tab', 'dashboard').catch(() => {});
      return true;
    }
    return false;
  };

  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  // Cloud Auth
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Core Data
  const [store, setStore] = useState<StoreProfile>({...INITIAL_STORE});
  const [products, setProducts] = useState<Product[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [bills, setBills] = useState<BillImage[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Accounts & Money
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<AccountTransaction[]>([]);

  // Vouchers
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [paymentInRecords, setPaymentInRecords] = useState<PaymentRecord[]>([]);
  const [paymentOutRecords, setPaymentOutRecords] = useState<PaymentRecord[]>([]);

  // POS
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  // Staff Members
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const [activeBizId, setActiveBizId] = useState<string>(DEFAULT_BIZ_ID);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Automatic backfill of local offline data to cloud
  const backfillLocalDataToCloud = async (bizId: string) => {
    if (!bizId) return;
    try {
      // 1. Backfill products
      const localProds = await storage.get<Product[]>('products', []);
      if (localProds && localProds.length > 0) {
        for (const p of localProds) {
          const matchedCat = categories.find(
            (c) => c.name.toLowerCase() === (p.category || '').toLowerCase()
          );
          await supabase.from('items').upsert({
            id: p.id,
            business_id: bizId,
            category_id: matchedCat?.id || null,
            name: p.name,
            barcode: p.barcode || null,
            selling_price: p.salePrice || 0,
            mrp: p.salePrice || 0,
            wholesale_price: p.salePrice || 0,
            purchase_cost: p.costPrice || 0,
            current_stock: p.stock || 0,
            image_url: p.imageUri || null,
          });
        }
      }

      // 2. Backfill parties
      const localParties = await storage.get<Party[]>('parties', []);
      if (localParties && localParties.length > 0) {
        for (const p of localParties) {
          await supabase.from('parties').upsert({
            id: p.id,
            business_id: bizId,
            name: p.name,
            phone: p.phone || null,
            party_type: p.type || 'customer',
            address: p.address || null,
            current_balance: p.balance || 0,
          });
        }
      }

      // 3. Backfill invoices
      const localInvoices = await storage.get<Invoice[]>('invoices', []);
      if (localInvoices && localInvoices.length > 0) {
        for (const inv of localInvoices) {
          const dateStr = inv.date || new Date().toISOString().split('T')[0];
          const bs = adToBs(new Date(dateStr));
          const fiscalYear = getNepaliFiscalYear(bs.formatted);
          const isCredit = inv.paymentMode === 'credit';
          const total = Number(inv.total) || 0;

          await supabase.from('invoices').upsert({
            id: inv.id,
            business_id: bizId,
            invoice_number: inv.invoiceNumber,
            invoice_type: 'sale',
            fiscal_year: fiscalYear,
            invoice_date_ad: dateStr,
            invoice_date_bs: bs.formatted,
            subtotal: total,
            total_amount: total,
            paid_amount: isCredit ? 0 : total,
            due_amount: isCredit ? total : 0,
            payment_mode: inv.paymentMode || 'cash',
            status: isCredit ? 'unpaid' : 'paid',
          });

          if (inv.items && inv.items.length > 0) {
            const { count } = await supabase
              .from('invoice_items')
              .select('id', { count: 'exact', head: true })
              .eq('invoice_id', inv.id);

            if (!count || count === 0) {
              const itemsToInsert = inv.items.map((item) => ({
                id: generateUUID(),
                invoice_id: inv.id,
                item_name: item.name,
                quantity: item.qty || 1,
                unit_price: item.price || 0,
                total_amount: (item.qty || 1) * (item.price || 0),
              }));
              await supabase.from('invoice_items').insert(itemsToInsert);
            }
          }
        }
      }

      // 4. Backfill ledger entries
      const localLedger = await storage.get<LedgerEntry[]>('ledger', []);
      if (localLedger && localLedger.length > 0) {
        for (const entry of localLedger) {
          const dateStr = entry.date || new Date().toISOString().split('T')[0];
          const bs = adToBs(new Date(dateStr));
          await supabase.from('khata_entries').upsert({
            id: entry.id,
            business_id: bizId,
            party_id: entry.partyId,
            entry_type: entry.type === 'credit' ? 'diyo' : 'liyo',
            amount: Number(entry.amount) || 0,
            date_ad: dateStr,
            date_bs: bs.formatted,
            notes: entry.note || null,
          });
        }
      }

      // 5. Backfill purchase bills
      const localPBills = await storage.get<PurchaseBill[]>('purchase_bills', []);
      if (localPBills && localPBills.length > 0) {
        for (const pb of localPBills) {
          await supabase.from('bills').upsert({
            id: pb.id,
            business_id: bizId,
            title: pb.supplierName || 'Purchase Bill',
            bill_type: 'purchase',
            amount: Number(pb.totalAmount) || 0,
            bill_date: pb.date || new Date().toISOString().split('T')[0],
            tags: ['purchase'],
          });
        }
      }
    } catch (backfillErr) {
      console.warn('Backfill to cloud non-fatal:', backfillErr);
    }
  };

  // Hydrate Cloud Supabase data
  const hydrateFromCloud = async (targetBizId?: string) => {
    const bizId = targetBizId || activeBizId;
    if (!bizId) return;

    // First auto-backfill any local unsynced records to cloud
    await backfillLocalDataToCloud(bizId);

    try {
      // 1. Categories
      const { data: dbCats } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', bizId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (dbCats && dbCats.length > 0) {
        const mappedCats: CategoryItem[] = dbCats.map((c: any) => ({
          id: c.id,
          name: c.name,
          color: c.color_code,
        }));
        setCategories(mappedCats);
        await storage.set('categories', mappedCats);
      } else {
        // Automatically seed business categories if empty
        try {
          await supabase.rpc('seed_business_categories', {
            p_biz_id: bizId,
            p_type: store.businessType || 'general',
          });
          const { data: seededCats } = await supabase
            .from('categories')
            .select('*')
            .eq('business_id', bizId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true });
          if (seededCats && seededCats.length > 0) {
            const mappedCats: CategoryItem[] = seededCats.map((c: any) => ({
              id: c.id,
              name: c.name,
              color: c.color_code,
            }));
            setCategories(mappedCats);
            await storage.set('categories', mappedCats);
          }
        } catch (seedErr) {
          console.warn('Auto seed categories non-fatal:', seedErr);
        }
      }

      // 2. Products (with categories relationship join)
      const { data: dbItems } = await supabase
        .from('items')
        .select('*, categories(id, name, color_code)')
        .eq('business_id', bizId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (dbItems) {
        const mapped = dbItems.map(mapDbToProduct);
        setProducts(mapped);
        await storage.set('products', mapped);
      }

      // 3. Parties
      const { data: dbParties } = await supabase
        .from('parties')
        .select('*')
        .eq('business_id', bizId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (dbParties) {
        const mapped = dbParties.map(mapDbToParty);
        setParties(mapped);
        await storage.set('parties', mapped);
      }

      // 4. Khata Entries
      const { data: dbKhata } = await supabase
        .from('khata_entries')
        .select('*')
        .eq('business_id', bizId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (dbKhata) {
        const mapped = dbKhata.map(mapDbToLedger);
        setLedgerEntries(mapped);
        await storage.set('ledger', mapped);
      }

      // 5. Invoices & Vouchers
      const { data: dbInvoices } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('business_id', bizId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (dbInvoices) {
        const salesInvoices = dbInvoices
          .filter((r: any) => !r.invoice_type || r.invoice_type === 'sale')
          .map(mapDbToInvoice);
        setInvoices(salesInvoices);
        await storage.set('invoices', salesInvoices);

        const quots = dbInvoices
          .filter((r: any) => r.invoice_type === 'quotation')
          .map(mapDbToQuotation);
        setQuotations(quots);
        await storage.set('quotations', quots);

        const sReturns = dbInvoices
          .filter((r: any) => r.invoice_type === 'sale_return')
          .map(mapDbToSalesReturn);
        setSalesReturns(sReturns);
        await storage.set('sales_returns', sReturns);

        const pReturns = dbInvoices
          .filter((r: any) => r.invoice_type === 'purchase_return')
          .map(mapDbToPurchaseReturn);
        setPurchaseReturns(pReturns);
        await storage.set('purchase_returns', pReturns);
      }

      // Payments (Payment In & Payment Out)
      const { data: dbPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('business_id', bizId)
        .order('created_at', { ascending: false });

      if (dbPayments) {
        const allPayments = dbPayments.map(mapDbToPaymentRecord);
        const payIn = allPayments.filter((p) => p.type === 'in');
        const payOut = allPayments.filter((p) => p.type === 'out');
        setPaymentInRecords(payIn);
        setPaymentOutRecords(payOut);
        await storage.set('pay_in', payIn);
        await storage.set('pay_out', payOut);
      }

      // 6. Bills
      const { data: dbBills } = await supabase
        .from('bills')
        .select('*')
        .eq('business_id', bizId)
        .order('created_at', { ascending: false });

      if (dbBills) {
        const mapped = dbBills.map(mapDbToBill);
        setBills(mapped);
        await storage.set('bills', mapped);

        // Also map purchase bills
        const purchaseMapped: PurchaseBill[] = dbBills
          .filter((b: any) => (b.bill_type || '').toLowerCase() === 'purchase')
          .map((b: any) => ({
            id: b.id,
            billNumber: `PB-${b.id.slice(0, 6).toUpperCase()}`,
            supplierName: b.title || 'Supplier',
            date: b.bill_date || b.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            subtotal: Number(b.amount) || 0,
            totalAmount: Number(b.amount) || 0,
            paidAmount: Number(b.amount) || 0,
            dueAmount: 0,
            paymentMode: 'cash',
            status: 'paid',
            items: [],
          }));
        if (purchaseMapped.length > 0) {
          setPurchaseBills(purchaseMapped);
          await storage.set('purchase_bills', purchaseMapped);
        }
      }

      // 7. Account Transactions
      const { data: dbTxs } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('business_id', bizId)
        .order('date_ad', { ascending: false });

      if (dbTxs) {
        const mapped = dbTxs.map(mapDbToAccountTx);
        setAccountTransactions(mapped);
        await storage.set('account_txs', mapped);
      }

      // 8. Bank Accounts
      const { data: dbAccounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('business_id', bizId);

      if (dbAccounts) {
        const mapped = dbAccounts.map(mapDbToAccount);
        setAccounts(mapped);
        await storage.set('accounts', mapped);
      }

      // 9. Staff Members
      const { data: dbStaff } = await supabase
        .from('staff')
        .select('*')
        .eq('business_id', bizId)
        .order('created_at', { ascending: false });

      if (dbStaff) {
        const mapped = dbStaff.map(mapDbToStaff);
        setStaffList(mapped);
        await storage.set('staff_list', mapped);
      }

      // 10. Store Profile / Business
      const { data: dbBiz } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', bizId)
        .maybeSingle();

      if (dbBiz) {
        const updatedStore: StoreProfile = {
          ...store,
          id: dbBiz.id,
          name: dbBiz.name || store.name,
          ownerName: dbBiz.owner_name || store.ownerName,
          phone: dbBiz.phone || store.phone,
          panNumber: dbBiz.pan_vat_number || store.panNumber,
          address: dbBiz.address_line || store.address,
          vatEnabled: dbBiz.is_vat_registered ?? store.vatEnabled,
          businessType: (dbBiz.business_type as BusinessType) || store.businessType || 'general',
        };
        setStore(updatedStore);
        await storage.set('store', updatedStore);
      }
    } catch (err) {
      console.warn('Error hydrating mobile app from cloud:', err);
    }
  };

  const resolveUserBusiness = async (supabaseUser: User): Promise<string | null> => {
    try {
      const { data: membership } = await supabase
        .from('business_members')
        .select('business_id, role, businesses(*)')
        .eq('user_id', supabaseUser.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membership?.business_id) {
        const resolvedBizId = membership.business_id;
        setActiveBizId(resolvedBizId);
        await storage.set('active_biz_id', resolvedBizId);

        const biz = (membership as any).businesses;
        if (biz) {
          const updatedStore: StoreProfile = {
            ...store,
            id: biz.id,
            name: biz.name || store.name,
            businessType: (biz.business_type as BusinessType) || store.businessType || 'general',
            phone: biz.phone || store.phone,
            address: biz.address_line || store.address,
            panNumber: biz.pan_vat_number || store.panNumber,
          };
          setStore(updatedStore);
          await storage.set('store', updatedStore);
        }

        await hydrateFromCloud(resolvedBizId);
        return resolvedBizId;
      }
    } catch (e) {
      console.warn('Error resolving user business:', e);
    }
    return null;
  };

  const refreshFromCloud = async () => {
    await hydrateFromCloud(activeBizId);
  };

  useEffect(() => {
    (async () => {
      // 1. Read cached local state for instant start
      const storedOnboarded = await storage.get<boolean>('onboarded', true);
      const storedTheme = await storage.get<ThemeMode>('theme_mode', 'dark');
      const storedStore = await storage.get<StoreProfile>('store', INITIAL_STORE);
      const storedBizId = await storage.get<string>('active_biz_id', DEFAULT_BIZ_ID);
      const storedCategories = await storage.get<CategoryItem[]>('categories', []);
      const storedProducts = await storage.get<Product[]>('products', []);
      const storedParties = await storage.get<Party[]>('parties', []);
      const storedLedger = await storage.get<LedgerEntry[]>('ledger', []);
      const storedBills = await storage.get<BillImage[]>('bills', []);
      const storedInvoices = await storage.get<Invoice[]>('invoices', []);
      const storedAccounts = await storage.get<BankAccount[]>('accounts', []);
      const storedTxs = await storage.get<AccountTransaction[]>('account_txs', []);
      const storedQuotations = await storage.get<Quotation[]>('quotations', []);
      const storedReturns = await storage.get<SalesReturn[]>('sales_returns', []);
      const storedPBills = await storage.get<PurchaseBill[]>('purchase_bills', []);
      const storedPReturns = await storage.get<PurchaseReturn[]>('purchase_returns', []);
      const storedPayIn = await storage.get<PaymentRecord[]>('pay_in', []);
      const storedPayOut = await storage.get<PaymentRecord[]>('pay_out', []);
      const storedStaff = await storage.get<StaffMember[]>('staff_list', []);

      const storedActiveTab = await storage.get<ActiveTab>('active_tab', 'dashboard');
      if (storedActiveTab && storedActiveTab !== 'dashboard') {
        setActiveTabState(storedActiveTab);
        setTabHistory(['dashboard', storedActiveTab]);
      }

      setIsOnboarded(storedOnboarded);
      setThemeModeState(storedTheme === 'light' ? 'light' : 'dark');
      setStore(storedStore);
      setActiveBizId(storedBizId);
      setCategories(storedCategories);
      setProducts(storedProducts);
      setParties(storedParties);
      setLedgerEntries(storedLedger);
      setBills(storedBills);
      setInvoices(storedInvoices);
      setAccounts(storedAccounts);
      setAccountTransactions(storedTxs);
      setQuotations(storedQuotations);
      setSalesReturns(storedReturns);
      setPurchaseBills(storedPBills);
      setPurchaseReturns(storedPReturns);
      setPaymentInRecords(storedPayIn);
      setPaymentOutRecords(storedPayOut);
      if (storedStaff && storedStaff.length > 0) {
        setStaffList(storedStaff);
      }

      // Check current auth session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        setUser(sessionData.session.user);
        await resolveUserBusiness(sessionData.session.user);
      } else {
        await hydrateFromCloud(storedBizId);
      }

      setIsReady(true);

      // Auto-check for updates silently on launch
      updateService.checkForUpdates(true).catch(() => {});

      // Listen for auth state changes
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await resolveUserBusiness(session.user);
        } else {
          setUser(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    })();
  }, []);

  // Realtime updates subscription whenever activeBizId changes
  useEffect(() => {
    if (!activeBizId) return;

    const channel = supabase
      .channel(`mobile_realtime_${activeBizId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'businesses', filter: `id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const b = payload.new as any;
            setStore((prev) => ({
              ...prev,
              name: b.name || prev.name,
              ownerName: b.owner_name || prev.ownerName,
              phone: b.phone || prev.phone,
              panNumber: b.pan_vat_number || prev.panNumber,
              address: b.address_line || prev.address,
              vatEnabled: b.is_vat_registered ?? prev.vatEnabled,
              businessType: (b.business_type as BusinessType) || prev.businessType,
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProd = mapDbToProduct(payload.new);
            setProducts((prev) => (prev.some((p) => p.id === newProd.id) ? prev : [newProd, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToProduct(payload.new);
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } else if (payload.eventType === 'DELETE') {
            setProducts((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parties', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newParty = mapDbToParty(payload.new);
            setParties((prev) => (prev.some((p) => p.id === newParty.id) ? prev : [newParty, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToParty(payload.new);
            setParties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          } else if (payload.eventType === 'DELETE') {
            setParties((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const c = payload.new as any;
            const newCat: CategoryItem = { id: c.id, name: c.name, color: c.color_code };
            setCategories((prev) => (prev.some((x) => x.id === newCat.id) ? prev : [...prev, newCat]));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          const invType = (payload.new as any)?.invoice_type || (payload.old as any)?.invoice_type || 'sale';

          if (invType === 'quotation') {
            if (payload.eventType === 'INSERT') {
              const newQ = mapDbToQuotation(payload.new);
              setQuotations((prev) => (prev.some((q) => q.id === newQ.id) ? prev : [newQ, ...prev]));
            } else if (payload.eventType === 'UPDATE') {
              const updated = mapDbToQuotation(payload.new);
              setQuotations((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
            } else if (payload.eventType === 'DELETE') {
              setQuotations((prev) => prev.filter((q) => q.id !== (payload.old as any).id));
            }
          } else if (invType === 'sale_return') {
            if (payload.eventType === 'INSERT') {
              const newSR = mapDbToSalesReturn(payload.new);
              setSalesReturns((prev) => (prev.some((s) => s.id === newSR.id) ? prev : [newSR, ...prev]));
            } else if (payload.eventType === 'UPDATE') {
              const updated = mapDbToSalesReturn(payload.new);
              setSalesReturns((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            } else if (payload.eventType === 'DELETE') {
              setSalesReturns((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
            }
          } else if (invType === 'purchase_return') {
            if (payload.eventType === 'INSERT') {
              const newPR = mapDbToPurchaseReturn(payload.new);
              setPurchaseReturns((prev) => (prev.some((p) => p.id === newPR.id) ? prev : [newPR, ...prev]));
            } else if (payload.eventType === 'UPDATE') {
              const updated = mapDbToPurchaseReturn(payload.new);
              setPurchaseReturns((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            } else if (payload.eventType === 'DELETE') {
              setPurchaseReturns((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
            }
          } else {
            if (payload.eventType === 'INSERT') {
              const newInv = mapDbToInvoice(payload.new);
              setInvoices((prev) => (prev.some((i) => i.id === newInv.id) ? prev : [newInv, ...prev]));
            } else if (payload.eventType === 'UPDATE') {
              const updated = mapDbToInvoice(payload.new);
              setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            } else if (payload.eventType === 'DELETE') {
              setInvoices((prev) => prev.filter((i) => i.id !== (payload.old as any).id));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newP = mapDbToPaymentRecord(payload.new);
            if (newP.type === 'in') {
              setPaymentInRecords((prev) => (prev.some((p) => p.id === newP.id) ? prev : [newP, ...prev]));
            } else {
              setPaymentOutRecords((prev) => (prev.some((p) => p.id === newP.id) ? prev : [newP, ...prev]));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToPaymentRecord(payload.new);
            if (updated.type === 'in') {
              setPaymentInRecords((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            } else {
              setPaymentOutRecords((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            }
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as any).id;
            setPaymentInRecords((prev) => prev.filter((p) => p.id !== id));
            setPaymentOutRecords((prev) => prev.filter((p) => p.id !== id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'khata_entries', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newE = mapDbToLedger(payload.new);
            setLedgerEntries((prev) => (prev.some((e) => e.id === newE.id) ? prev : [newE, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToLedger(payload.new);
            setLedgerEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          } else if (payload.eventType === 'DELETE') {
            setLedgerEntries((prev) => prev.filter((e) => e.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bank_accounts', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newA = mapDbToAccount(payload.new);
            setAccounts((prev) => (prev.some((a) => a.id === newA.id) ? prev : [...prev, newA]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToAccount(payload.new);
            setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
          } else if (payload.eventType === 'DELETE') {
            setAccounts((prev) => prev.filter((a) => a.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'account_transactions', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTx = mapDbToAccountTx(payload.new);
            setAccountTransactions((prev) => (prev.some((t) => t.id === newTx.id) ? prev : [newTx, ...prev]));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newS = mapDbToStaff(payload.new);
            setStaffList((prev) => (prev.some((s) => s.id === newS.id) ? prev : [newS, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updated = mapDbToStaff(payload.new);
            setStaffList((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          } else if (payload.eventType === 'DELETE') {
            setStaffList((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newB = mapDbToBill(payload.new);
            setBills((prev) => (prev.some((b) => b.id === newB.id) ? prev : [newB, ...prev]));
          } else if (payload.eventType === 'DELETE') {
            setBills((prev) => prev.filter((b) => b.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBizId]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await storage.set('theme_mode', mode);
  };

  const toggleThemeMode = async () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    await setThemeMode(nextMode);
  };

  const activeTheme = getTheme(themeMode);

  // Auth Operations
  const login = async (email: string, pass: string) => {
    const res = await supabase.auth.signInWithPassword({ email, password: pass });
    if (res.data?.user) {
      setUser(res.data.user);
      await resolveUserBusiness(res.data.user);
    }
    return res;
  };

  const signUp = async (
    email: string,
    pass: string,
    storeName: string,
    phone: string,
    businessType: BusinessType = 'general'
  ) => {
    const res = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { store_name: storeName, phone, business_type: businessType },
      },
    });
    if (res.data?.user) {
      setUser(res.data.user);
      const updatedStore = {
        ...store,
        name: storeName || store.name,
        phone: phone || store.phone,
        businessType,
      };
      setStore(updatedStore);
      await storage.set('store', updatedStore);

      // Resolve business created by PostgreSQL trigger
      setTimeout(async () => {
        if (res.data.user) {
          await resolveUserBusiness(res.data.user);
        }
      }, 700);
    }
    return res;
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<{ error?: string }> => {
    if (!user?.email) {
      return { error: 'No active user session found. Please sign in.' };
    }
    if (!oldPassword.trim()) {
      return { error: 'Please enter your current password.' };
    }
    if (!newPassword || newPassword.length < 6) {
      return { error: 'New password must be at least 6 characters long.' };
    }
    if (oldPassword === newPassword) {
      return { error: 'New password cannot be the same as current password.' };
    }

    try {
      // 1. Verify current password by re-authenticating with Supabase
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (verifyErr) {
        return { error: 'Incorrect current password. Please try again.' };
      }

      // 2. Update to new password
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        return { error: updateErr.message || 'Failed to update password.' };
      }

      return {};
    } catch (e: any) {
      return { error: e.message || 'An unexpected error occurred while updating password.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveBizId(DEFAULT_BIZ_ID);
    await storage.set('active_biz_id', DEFAULT_BIZ_ID);
    setProducts([]);
    setParties([]);
    setLedgerEntries([]);
    setInvoices([]);
    setBills([]);
    setAccounts([]);
    setAccountTransactions([]);
    setCategories([]);
    await storage.set('products', []);
    await storage.set('parties', []);
    await storage.set('ledger', []);
    await storage.set('invoices', []);
    await storage.set('bills', []);
    await storage.set('categories', []);
  };

  // Store Profile
  const updateStoreProfile = async (updates: Partial<StoreProfile>) => {
    const updated = { ...store, ...updates };
    setStore(updated);
    await storage.set('store', updated);

    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.panNumber !== undefined) payload.pan_vat_number = updates.panNumber;
    if (updates.address !== undefined) payload.address_line = updates.address;
    if (updates.vatEnabled !== undefined) payload.is_vat_registered = updates.vatEnabled;
    if (updates.businessType !== undefined) payload.business_type = updates.businessType;

    if (Object.keys(payload).length > 0 && activeBizId) {
      await supabase.from('businesses').update(payload).eq('id', activeBizId);
    }

    if (updates.ownerName !== undefined && user?.id) {
      await supabase.from('profiles').update({ full_name: updates.ownerName }).eq('id', user.id);
    }
  };

  const completeOnboarding = async (storeData: StoreProfile) => {
    setStore(storeData);
    setIsOnboarded(true);
    await storage.set('store', storeData);
    await storage.set('onboarded', true);

    if (activeBizId) {
      await supabase
        .from('businesses')
        .update({
          name: storeData.name,
          phone: storeData.phone,
          pan_vat_number: storeData.panNumber,
          address_line: storeData.address,
          is_vat_registered: storeData.vatEnabled,
          business_type: storeData.businessType,
        })
        .eq('id', activeBizId);
    }

    if (storeData.ownerName && user?.id) {
      await supabase.from('profiles').update({ full_name: storeData.ownerName }).eq('id', user.id);
    }
  };

  const resetOnboarding = async () => {
    setIsOnboarded(false);
    await storage.set('onboarded', false);
  };

  // Products CRUD
  const addProduct = async (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...productData,
      id: generateUUID(),
    };
    const updated = [newProduct, ...products];
    setProducts(updated);
    await storage.set('products', updated);

    // Match category ID from categories
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === (newProduct.category || '').toLowerCase()
    );

    await supabase.from('items').insert({
      id: newProduct.id,
      business_id: activeBizId,
      category_id: matchedCategory?.id || null,
      name: newProduct.name,
      barcode: newProduct.barcode,
      mrp: newProduct.salePrice,
      purchase_cost: newProduct.costPrice,
      selling_price: newProduct.salePrice,
      wholesale_price: newProduct.salePrice,
      current_stock: newProduct.stock,
      image_url: newProduct.imageUri,
    });
  };

  const editProduct = async (id: string, updates: Partial<Product>) => {
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProducts(updated);
    await storage.set('products', updated);

    const fullProd = updated.find((p) => p.id === id);
    const catName = updates.category !== undefined ? updates.category : fullProd?.category;
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === (catName || '').toLowerCase()
    );

    await supabase.from('items').upsert({
      id,
      business_id: activeBizId,
      category_id: matchedCategory?.id || null,
      name: updates.name ?? fullProd?.name ?? 'Item',
      barcode: updates.barcode ?? fullProd?.barcode ?? null,
      purchase_cost: updates.costPrice ?? fullProd?.costPrice ?? 0,
      selling_price: updates.salePrice ?? fullProd?.salePrice ?? 0,
      mrp: updates.salePrice ?? fullProd?.salePrice ?? 0,
      wholesale_price: updates.salePrice ?? fullProd?.salePrice ?? 0,
      current_stock: updates.stock ?? fullProd?.stock ?? 0,
      image_url: updates.imageUri ?? fullProd?.imageUri ?? null,
      updated_at: new Date().toISOString(),
    });
  };

  const deleteProduct = async (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    await storage.set('products', updated);

    await supabase.from('items').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  };

  // Parties CRUD
  const addParty = async (partyData: Omit<Party, 'id' | 'balance'>) => {
    const newParty: Party = {
      ...partyData,
      id: generateUUID(),
      balance: 0,
    };
    const updated = [newParty, ...parties];
    setParties(updated);
    await storage.set('parties', updated);

    await supabase.from('parties').insert({
      id: newParty.id,
      business_id: activeBizId,
      name: newParty.name,
      phone: newParty.phone,
      party_type: newParty.type,
      address: newParty.address,
      current_balance: 0,
    });
  };

  const editParty = async (id: string, updates: Partial<Party>) => {
    const updated = parties.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setParties(updated);
    await storage.set('parties', updated);

    const dbPayload: Record<string, any> = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.address !== undefined) dbPayload.address = updates.address;
    if (updates.balance !== undefined) dbPayload.current_balance = updates.balance;

    if (Object.keys(dbPayload).length > 0) {
      await supabase
        .from('parties')
        .update(dbPayload)
        .eq('id', id);
    }
  };

  const deleteParty = async (id: string) => {
    const updated = parties.filter((p) => p.id !== id);
    setParties(updated);
    await storage.set('parties', updated);

    await supabase.from('parties').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  };

  // Ledger Entries
  const addLedgerEntry = async (entryData: Omit<LedgerEntry, 'id'>) => {
    const newEntry: LedgerEntry = {
      ...entryData,
      id: generateUUID(),
    };
    const updated = [newEntry, ...ledgerEntries];
    setLedgerEntries(updated);
    await storage.set('ledger', updated);

    // Update party balance
    const delta = entryData.type === 'credit' ? entryData.amount : -entryData.amount;
    const targetParty = parties.find((p) => p.id === entryData.partyId);
    if (targetParty) {
      const newBal = targetParty.balance + delta;
      editParty(targetParty.id, { balance: newBal });
    }

    const bs = adToBs(new Date(newEntry.date));

    await supabase.from('khata_entries').upsert({
      id: newEntry.id,
      business_id: activeBizId,
      party_id: newEntry.partyId,
      entry_type: newEntry.type === 'credit' ? 'diyo' : 'liyo',
      amount: newEntry.amount,
      date_ad: newEntry.date,
      date_bs: bs.formatted,
      notes: newEntry.note,
    });
  };

  const editLedgerEntry = async (id: string, updates: Partial<LedgerEntry>) => {
    const oldEntry = ledgerEntries.find((e) => e.id === id);
    if (!oldEntry) return;

    const updatedEntries = ledgerEntries.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setLedgerEntries(updatedEntries);
    await storage.set('ledger', updatedEntries);

    // Recalculate party balance if amount or type changed
    if (updates.amount !== undefined || updates.type !== undefined) {
      const oldDelta = oldEntry.type === 'credit' ? oldEntry.amount : -oldEntry.amount;
      const newType = updates.type || oldEntry.type;
      const newAmount = updates.amount ?? oldEntry.amount;
      const newDelta = newType === 'credit' ? newAmount : -newAmount;
      const balanceChange = newDelta - oldDelta;
      const targetParty = parties.find((p) => p.id === oldEntry.partyId);
      if (targetParty) {
        await editParty(targetParty.id, { balance: targetParty.balance + balanceChange });
      }
    }

    await supabase.from('khata_entries').update({
      entry_type: (updates.type || oldEntry.type) === 'credit' ? 'diyo' : 'liyo',
      amount: updates.amount ?? oldEntry.amount,
      notes: updates.note ?? oldEntry.note,
    }).eq('id', id);
  };

  const deleteLedgerEntry = async (id: string) => {
    const entry = ledgerEntries.find((e) => e.id === id);
    if (!entry) return;

    const updated = ledgerEntries.filter((e) => e.id !== id);
    setLedgerEntries(updated);
    await storage.set('ledger', updated);

    // Reverse the balance effect
    const delta = entry.type === 'credit' ? entry.amount : -entry.amount;
    const targetParty = parties.find((p) => p.id === entry.partyId);
    if (targetParty) {
      await editParty(targetParty.id, { balance: targetParty.balance - delta });
    }

    await supabase.from('khata_entries').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  };

  // Bills CRUD
  const addBill = async (billData: Omit<BillImage, 'id'>) => {
    const newBill: BillImage = {
      ...billData,
      id: generateUUID(),
    };
    const updated = [newBill, ...bills];
    setBills(updated);
    await storage.set('bills', updated);

    await supabase.from('bills').insert({
      id: newBill.id,
      business_id: activeBizId,
      title: newBill.title,
      amount: newBill.amount,
      bill_date: newBill.date,
      image_url: newBill.imageUri,
    });
  };

  const deleteBill = async (id: string) => {
    const updated = bills.filter((b) => b.id !== id);
    setBills(updated);
    await storage.set('bills', updated);

    await supabase.from('bills').delete().eq('id', id);
  };

  // Cart & POS
  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item)));
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const completeCheckout = async (mode: PaymentMode, partyId?: string): Promise<Invoice | null> => {
    if (cart.length === 0) return null;

    const total = cart.reduce((sum, item) => sum + item.salePrice * item.qty, 0);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date().toISOString().split('T')[0];

    const party = parties.find((p) => p.id === partyId);

    const newInvoice: Invoice = {
      id: generateUUID(),
      invoiceNumber,
      date: today,
      partyName: party?.name || 'Cash Counter',
      total,
      paymentMode: mode,
      items: cart.map((item) => ({
        name: item.name,
        qty: item.qty,
        price: item.salePrice,
      })),
    };

    const updatedInvoices = [newInvoice, ...invoices];
    setInvoices(updatedInvoices);
    await storage.set('invoices', updatedInvoices);

    // Stock decrement
    for (const c of cart) {
      const p = products.find((prod) => prod.id === c.id);
      if (p) {
        const newStock = Math.max(0, p.stock - c.qty);
        await editProduct(p.id, { stock: newStock });
      }
    }

    // Ledger credit if unpaid
    if (mode === 'credit' && partyId) {
      await addLedgerEntry({
        partyId,
        date: today,
        type: 'credit',
        amount: total,
        note: `Bill #${invoiceNumber}`,
      });
    }

    const bs = adToBs(new Date(newInvoice.date));
    const fiscalYear = getNepaliFiscalYear(bs.formatted);
    const isCredit = mode === 'credit';

    // Cloud insert
    const { error: invErr } = await supabase.from('invoices').upsert({
      id: newInvoice.id,
      business_id: activeBizId,
      party_id: partyId && partyId.length === 36 ? partyId : null,
      invoice_type: 'sale',
      invoice_number: newInvoice.invoiceNumber,
      fiscal_year: fiscalYear,
      invoice_date_ad: newInvoice.date,
      invoice_date_bs: bs.formatted,
      subtotal: newInvoice.total,
      total_amount: newInvoice.total,
      paid_amount: isCredit ? 0 : newInvoice.total,
      due_amount: isCredit ? newInvoice.total : 0,
      payment_mode: mode,
      status: isCredit ? 'unpaid' : 'paid',
    });

    if (!invErr && cart.length > 0) {
      const invItems = cart.map((item) => ({
        id: generateUUID(),
        invoice_id: newInvoice.id,
        item_id: item.id.length === 36 ? item.id : null,
        item_name: item.name,
        quantity: item.qty,
        unit_price: item.salePrice,
        total_amount: item.salePrice * item.qty,
      }));
      await supabase.from('invoice_items').upsert(invItems);
    }

    clearCart();
    setActiveInvoice(newInvoice);
    return newInvoice;
  };

  // Accounts CRUD
  const addAccount = async (accData: Omit<BankAccount, 'id'>) => {
    const newAcc: BankAccount = {
      ...accData,
      id: generateUUID(),
    };
    const updated = [...accounts, newAcc];
    setAccounts(updated);
    await storage.set('accounts', updated);

    await supabase.from('bank_accounts').insert({
      id: newAcc.id,
      business_id: activeBizId,
      account_name: newAcc.name,
      bank_name: newAcc.bankName || '',
      account_number: newAcc.accountNumber || '',
      branch: newAcc.branch || newAcc.accountType,
      balance: newAcc.balance || 0,
    });
  };

  const editAccount = async (id: string, updates: Partial<BankAccount>) => {
    const updated = accounts.map((a) => (a.id === id ? { ...a, ...updates } : a));
    setAccounts(updated);
    await storage.set('accounts', updated);

    const payload: any = {};
    if (updates.name !== undefined) payload.account_name = updates.name;
    if (updates.bankName !== undefined) payload.bank_name = updates.bankName;
    if (updates.accountNumber !== undefined) payload.account_number = updates.accountNumber;
    if (updates.branch !== undefined) payload.branch = updates.branch;
    if (updates.balance !== undefined) payload.balance = updates.balance;

    if (Object.keys(payload).length > 0) {
      await supabase.from('bank_accounts').update(payload).eq('id', id);
    }
  };

  const deleteAccount = async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    await storage.set('accounts', updated);

    await supabase.from('bank_accounts').delete().eq('id', id);
  };

  const depositMoney = async (
    accountId: string,
    amount: number,
    category = 'Deposit',
    notes = '',
    date = new Date().toISOString().split('T')[0]
  ) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const newBalance = acc.balance + amount;
    await editAccount(accountId, { balance: newBalance });

    const tx: AccountTransaction = {
      id: generateUUID(),
      accountId,
      accountName: acc.name,
      transactionType: 'deposit',
      amount,
      balanceAfter: newBalance,
      category,
      notes,
      dateAd: date,
      createdAt: new Date().toISOString(),
    };
    const updatedTxs = [tx, ...accountTransactions];
    setAccountTransactions(updatedTxs);
    await storage.set('account_txs', updatedTxs);

    // Sync to Supabase
    await supabase.from('account_transactions').insert({
      id: tx.id,
      business_id: activeBizId,
      account_id: tx.accountId,
      account_name: tx.accountName,
      transaction_type: tx.transactionType,
      amount: tx.amount,
      balance_after: tx.balanceAfter,
      category: tx.category,
      notes: tx.notes,
      date_ad: tx.dateAd,
    });
  };

  const withdrawMoney = async (
    accountId: string,
    amount: number,
    category = 'Withdrawal',
    notes = '',
    date = new Date().toISOString().split('T')[0]
  ) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const newBalance = Math.max(0, acc.balance - amount);
    await editAccount(accountId, { balance: newBalance });

    const tx: AccountTransaction = {
      id: generateUUID(),
      accountId,
      accountName: acc.name,
      transactionType: 'withdrawal',
      amount,
      balanceAfter: newBalance,
      category,
      notes,
      dateAd: date,
      createdAt: new Date().toISOString(),
    };
    const updatedTxs = [tx, ...accountTransactions];
    setAccountTransactions(updatedTxs);
    await storage.set('account_txs', updatedTxs);

    await supabase.from('account_transactions').insert({
      id: tx.id,
      business_id: activeBizId,
      account_id: tx.accountId,
      account_name: tx.accountName,
      transaction_type: tx.transactionType,
      amount: tx.amount,
      balance_after: tx.balanceAfter,
      category: tx.category,
      notes: tx.notes,
      date_ad: tx.dateAd,
    });
  };

  const transferMoney = async (
    fromId: string,
    toId: string,
    amount: number,
    notes = '',
    date = new Date().toISOString().split('T')[0]
  ) => {
    const fromAcc = accounts.find((a) => a.id === fromId);
    const toAcc = accounts.find((a) => a.id === toId);
    if (!fromAcc || !toAcc) return;

    const fromBal = fromAcc.balance - amount;
    const toBal = toAcc.balance + amount;

    const updatedAccounts = accounts.map((a) => {
      if (a.id === fromId) return { ...a, balance: fromBal };
      if (a.id === toId) return { ...a, balance: toBal };
      return a;
    });
    setAccounts(updatedAccounts);
    await storage.set('accounts', updatedAccounts);

    const txOut: AccountTransaction = {
      id: generateUUID(),
      accountId: fromId,
      accountName: fromAcc.name,
      toAccountId: toId,
      toAccountName: toAcc.name,
      transactionType: 'transfer_out',
      amount,
      balanceAfter: fromBal,
      notes,
      dateAd: date,
      createdAt: new Date().toISOString(),
    };

    const updatedTxs = [txOut, ...accountTransactions];
    setAccountTransactions(updatedTxs);
    await storage.set('account_txs', updatedTxs);

    await supabase.from('account_transactions').insert({
      id: txOut.id,
      business_id: activeBizId,
      account_id: fromId,
      account_name: fromAcc.name,
      to_account_id: toId,
      to_account_name: toAcc.name,
      transaction_type: 'transfer_out',
      amount,
      balance_after: fromBal,
      notes,
      date_ad: date,
    });

    await supabase.from('bank_accounts').update({ balance: fromBal }).eq('id', fromId);
    await supabase.from('bank_accounts').update({ balance: toBal }).eq('id', toId);
  };

  // Sales Vouchers
  const createQuotation = async (q: Omit<Quotation, 'id'>) => {
    const newQ: Quotation = { ...q, id: generateUUID() };
    const updated = [newQ, ...quotations];
    setQuotations(updated);
    await storage.set('quotations', updated);

    const dateStr = q.date || new Date().toISOString().split('T')[0];
    const bs = adToBs(new Date(dateStr));
    const fiscalYear = getNepaliFiscalYear(bs.formatted);

    await supabase.from('invoices').upsert({
      id: newQ.id,
      business_id: activeBizId,
      party_id: q.partyId && q.partyId.length === 36 ? q.partyId : null,
      invoice_number: newQ.quotationNumber,
      invoice_type: 'quotation',
      fiscal_year: fiscalYear,
      invoice_date_ad: dateStr,
      invoice_date_bs: bs.formatted,
      subtotal: newQ.totalAmount,
      total_amount: newQ.totalAmount,
      paid_amount: 0,
      due_amount: newQ.totalAmount,
      payment_mode: 'cash',
      status: q.status || 'draft',
      notes: q.notes || null,
    });

    if (q.items && q.items.length > 0) {
      const itemsToInsert = q.items.map((it) => ({
        id: generateUUID(),
        invoice_id: newQ.id,
        item_name: it.itemName,
        quantity: it.quantity || 1,
        unit_price: it.unitPrice || 0,
        total_amount: it.totalAmount || (it.quantity || 1) * (it.unitPrice || 0),
      }));
      await supabase.from('invoice_items').insert(itemsToInsert);
    }

    return newQ;
  };

  const createSalesReturn = async (sr: Omit<SalesReturn, 'id'>) => {
    const newSR: SalesReturn = { ...sr, id: generateUUID() };
    const updated = [newSR, ...salesReturns];
    setSalesReturns(updated);
    await storage.set('sales_returns', updated);

    const dateStr = sr.date || new Date().toISOString().split('T')[0];
    const bs = adToBs(new Date(dateStr));
    const fiscalYear = getNepaliFiscalYear(bs.formatted);

    await supabase.from('invoices').upsert({
      id: newSR.id,
      business_id: activeBizId,
      party_id: sr.partyId && sr.partyId.length === 36 ? sr.partyId : null,
      invoice_number: newSR.returnNumber,
      invoice_type: 'sale_return',
      fiscal_year: fiscalYear,
      invoice_date_ad: dateStr,
      invoice_date_bs: bs.formatted,
      subtotal: newSR.totalAmount,
      total_amount: newSR.totalAmount,
      paid_amount: newSR.refundAmount || 0,
      due_amount: newSR.creditAmount || 0,
      payment_mode: 'cash',
      status: 'paid',
      notes: sr.reason || null,
    });

    if (sr.items && sr.items.length > 0) {
      const itemsToInsert = sr.items.map((it) => ({
        id: generateUUID(),
        invoice_id: newSR.id,
        item_name: it.itemName,
        quantity: it.quantity || 1,
        unit_price: it.unitPrice || 0,
        total_amount: it.totalAmount || (it.quantity || 1) * (it.unitPrice || 0),
      }));
      await supabase.from('invoice_items').insert(itemsToInsert);
    }

    return newSR;
  };

  const createPaymentIn = async (pay: Omit<PaymentRecord, 'id'>) => {
    const newP: PaymentRecord = { ...pay, id: generateUUID() };
    const updated = [newP, ...paymentInRecords];
    setPaymentInRecords(updated);
    await storage.set('pay_in', updated);

    // Also update ledger
    await addLedgerEntry({
      partyId: pay.partyId,
      date: pay.date,
      type: 'payment',
      amount: pay.amount,
      note: `Payment In (${pay.paymentMode})`,
    });

    if (pay.accountId) {
      await depositMoney(pay.accountId, pay.amount, 'Customer Payment', pay.notes, pay.date);
    }

    const dateStr = pay.date || new Date().toISOString().split('T')[0];
    const bs = adToBs(new Date(dateStr));

    await supabase.from('payments').insert({
      id: newP.id,
      business_id: activeBizId,
      party_id: pay.partyId && pay.partyId.length === 36 ? pay.partyId : null,
      payment_mode: toValidPaymentMode(pay.paymentMode),
      amount: pay.amount,
      payment_metadata: {
        type: 'in',
        party_name: pay.partyName,
        account_id: pay.accountId,
        notes: pay.notes,
      },
      payment_date_ad: dateStr,
      payment_date_bs: bs.formatted,
    });

    return newP;
  };

  // Purchase Vouchers
  const createPurchaseBill = async (b: Omit<PurchaseBill, 'id'>) => {
    const newB: PurchaseBill = { ...b, id: generateUUID() };
    const updated = [newB, ...purchaseBills];
    setPurchaseBills(updated);
    await storage.set('purchase_bills', updated);

    // Auto-restock items
    for (const it of b.items) {
      const prod = products.find((p) => p.name.toLowerCase() === it.itemName.toLowerCase());
      if (prod) {
        await editProduct(prod.id, { stock: prod.stock + it.quantity });
      }
    }

    // Sync to Supabase bills table
    await supabase.from('bills').upsert({
      id: newB.id,
      business_id: activeBizId,
      title: b.supplierName || 'Purchase Bill',
      bill_type: 'purchase',
      amount: b.totalAmount,
      bill_date: b.date,
      tags: ['purchase'],
    });

    return newB;
  };

  const createPurchaseReturn = async (pr: Omit<PurchaseReturn, 'id'>) => {
    const newPR: PurchaseReturn = { ...pr, id: generateUUID() };
    const updated = [newPR, ...purchaseReturns];
    setPurchaseReturns(updated);
    await storage.set('purchase_returns', updated);

    // Decrement stock
    for (const it of pr.items) {
      const prod = products.find((p) => p.name.toLowerCase() === it.itemName.toLowerCase());
      if (prod) {
        await editProduct(prod.id, { stock: Math.max(0, prod.stock - it.quantity) });
      }
    }

    const dateStr = pr.date || new Date().toISOString().split('T')[0];
    const bs = adToBs(new Date(dateStr));
    const fiscalYear = getNepaliFiscalYear(bs.formatted);

    await supabase.from('invoices').upsert({
      id: newPR.id,
      business_id: activeBizId,
      party_id: pr.supplierId && pr.supplierId.length === 36 ? pr.supplierId : null,
      invoice_number: newPR.returnNumber,
      invoice_type: 'purchase_return',
      fiscal_year: fiscalYear,
      invoice_date_ad: dateStr,
      invoice_date_bs: bs.formatted,
      subtotal: newPR.totalAmount,
      total_amount: newPR.totalAmount,
      paid_amount: newPR.refundAmount || 0,
      due_amount: 0,
      payment_mode: 'cash',
      status: 'paid',
      notes: pr.reason || null,
    });

    if (pr.items && pr.items.length > 0) {
      const itemsToInsert = pr.items.map((it) => ({
        id: generateUUID(),
        invoice_id: newPR.id,
        item_name: it.itemName,
        quantity: it.quantity || 1,
        unit_price: it.costPrice || 0,
        total_amount: it.totalAmount || (it.quantity || 1) * (it.costPrice || 0),
      }));
      await supabase.from('invoice_items').insert(itemsToInsert);
    }

    return newPR;
  };

  const createPaymentOut = async (pay: Omit<PaymentRecord, 'id'>) => {
    const newP: PaymentRecord = { ...pay, id: generateUUID() };
    const updated = [newP, ...paymentOutRecords];
    setPaymentOutRecords(updated);
    await storage.set('pay_out', updated);

    if (pay.accountId) {
      await withdrawMoney(pay.accountId, pay.amount, 'Vendor Payment Out', pay.notes, pay.date);
    }

    const dateStr = pay.date || new Date().toISOString().split('T')[0];
    const bs = adToBs(new Date(dateStr));

    await supabase.from('payments').insert({
      id: newP.id,
      business_id: activeBizId,
      party_id: pay.partyId && pay.partyId.length === 36 ? pay.partyId : null,
      payment_mode: toValidPaymentMode(pay.paymentMode),
      amount: pay.amount,
      payment_metadata: {
        type: 'out',
        party_name: pay.partyName,
        account_id: pay.accountId,
        notes: pay.notes,
      },
      payment_date_ad: dateStr,
      payment_date_bs: bs.formatted,
    });

    return newP;
  };

  // Staff Management
  const addStaffMember = async (newStaff: Omit<StaffMember, 'id'>) => {
    const member: StaffMember = {
      ...newStaff,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [member, ...staffList];
    setStaffList(updated);
    await storage.set('staff_list', updated);

    await supabase.from('staff').insert({
      id: member.id,
      business_id: activeBizId,
      name: member.name,
      phone: member.phone || '',
      email: member.email || '',
      role: member.role,
      permissions: member.permissions || {},
      is_active: member.isActive ?? true,
    });

    return member;
  };

  const updateStaffMember = async (id: string, updates: Partial<StaffMember>) => {
    const updated = staffList.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setStaffList(updated);
    await storage.set('staff_list', updated);

    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.permissions !== undefined) payload.permissions = updates.permissions;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;

    if (Object.keys(payload).length > 0) {
      await supabase.from('staff').update(payload).eq('id', id);
    }
  };

  const deleteStaffMember = async (id: string) => {
    const updated = staffList.filter((s) => s.id !== id);
    setStaffList(updated);
    await storage.set('staff_list', updated);

    await supabase.from('staff').delete().eq('id', id);
  };

  const resetAllData = async () => {
    await storage.remove('products');
    await storage.remove('parties');
    await storage.remove('ledger');
    await storage.remove('bills');
    await storage.remove('invoices');
    await storage.remove('accounts');
    await storage.remove('account_txs');
    await storage.remove('quotations');
    await storage.remove('sales_returns');
    await storage.remove('purchase_bills');
    await storage.remove('purchase_returns');
    await storage.remove('pay_in');
    await storage.remove('pay_out');
    await storage.remove('staff_list');

    setProducts([]);
    setParties([]);
    setLedgerEntries([]);
    setBills([]);
    setInvoices([]);
    setAccounts([]);
    setAccountTransactions([]);
    setQuotations([]);
    setSalesReturns([]);
    setPurchaseBills([]);
    setPurchaseReturns([]);
    setPaymentInRecords([]);
    setPaymentOutRecords([]);
    setStaffList([]);
    setCart([]);
  };

  return (
    <AppContext.Provider
      value={{
        isReady,
        isOnboarded,
        activeTab,
        setActiveTab,
        navigateBack,
        themeMode,
        theme: activeTheme,
        setThemeMode,
        toggleThemeMode,
        store,
        updateStoreProfile,
        completeOnboarding,
        resetOnboarding,
        user,
        activeBizId,
        categories,
        refreshFromCloud,
        login,
        signUp,
        logout,
        changePassword,
        showAuthModal,
        setShowAuthModal,
        products,
        addProduct,
        editProduct,
        deleteProduct,
        parties,
        addParty,
        editParty,
        deleteParty,
        ledgerEntries,
        addLedgerEntry,
        editLedgerEntry,
        deleteLedgerEntry,
        bills,
        addBill,
        deleteBill,
        invoices,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        completeCheckout,
        accounts,
        accountTransactions,
        addAccount,
        editAccount,
        deleteAccount,
        depositMoney,
        withdrawMoney,
        transferMoney,
        quotations,
        createQuotation,
        salesReturns,
        createSalesReturn,
        paymentInRecords,
        createPaymentIn,
        purchaseBills,
        createPurchaseBill,
        purchaseReturns,
        createPurchaseReturn,
        paymentOutRecords,
        createPaymentOut,
        activeInvoice,
        setActiveInvoice,
        selectedPartyId,
        setSelectedPartyId,
        staffList,
        addStaffMember,
        updateStaffMember,
        deleteStaffMember,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
