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

function mapDbToInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.invoice_date_ad,
    partyName: row.party_id || 'Counter Sale',
    total: Number(row.total_amount) || 0,
    paymentMode: row.payment_mode || 'cash',
    items: (row.invoice_items || []).map((i: any) => ({
      name: i.item_name,
      qty: Number(i.quantity) || 1,
      price: Number(i.unit_price) || 0,
    })),
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

  // Hydrate Cloud Supabase data
  const hydrateFromCloud = async (targetBizId?: string) => {
    const bizId = targetBizId || activeBizId;
    if (!bizId) return;

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

      // 5. Invoices
      const { data: dbInvoices } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('business_id', bizId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (dbInvoices) {
        const mapped = dbInvoices.map(mapDbToInvoice);
        setInvoices(mapped);
        await storage.set('invoices', mapped);
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
      }

      // 7. Account Transactions
      const { data: dbTxs } = await supabase
        .from('account_transactions')
        .select('*')
        .eq('business_id', bizId)
        .order('created_at', { ascending: false });

      if (dbTxs) {
        const mapped = dbTxs.map(mapDbToAccountTx);
        setAccountTransactions(mapped);
        await storage.set('account_txs', mapped);
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
    if (!activeBizId || activeBizId === DEFAULT_BIZ_ID) return;

    const channel = supabase
      .channel(`mobile_realtime_${activeBizId}`)
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
        { event: '*', schema: 'public', table: 'account_transactions', filter: `business_id=eq.${activeBizId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTx = mapDbToAccountTx(payload.new);
            setAccountTransactions((prev) => (prev.some((t) => t.id === newTx.id) ? prev : [newTx, ...prev]));
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
  };

  const completeOnboarding = async (storeData: StoreProfile) => {
    setStore(storeData);
    setIsOnboarded(true);
    await storage.set('store', storeData);
    await storage.set('onboarded', true);
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

    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.barcode !== undefined) payload.barcode = updates.barcode;
    if (updates.costPrice !== undefined) payload.purchase_cost = updates.costPrice;
    if (updates.salePrice !== undefined) {
      payload.selling_price = updates.salePrice;
      payload.mrp = updates.salePrice;
    }
    if (updates.stock !== undefined) payload.current_stock = updates.stock;
    if (updates.imageUri !== undefined) payload.image_url = updates.imageUri;

    if (updates.category) {
      const matchedCategory = categories.find(
        (c) => c.name.toLowerCase() === updates.category!.toLowerCase()
      );
      if (matchedCategory) {
        payload.category_id = matchedCategory.id;
      }
    }

    if (Object.keys(payload).length > 0) {
      await supabase.from('items').update(payload).eq('id', id);
    }
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

    await supabase
      .from('parties')
      .update({
        name: updates.name,
        phone: updates.phone,
        address: updates.address,
      })
      .eq('id', id);
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

    await supabase.from('khata_entries').insert({
      id: newEntry.id,
      business_id: activeBizId,
      party_id: newEntry.partyId,
      entry_type: newEntry.type === 'credit' ? 'diyo' : 'liyo',
      amount: newEntry.amount,
      date_ad: newEntry.date,
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

    // Cloud insert
    const { error: invErr } = await supabase.from('invoices').insert({
      id: newInvoice.id,
      business_id: activeBizId,
      invoice_number: newInvoice.invoiceNumber,
      invoice_date_ad: newInvoice.date,
      total_amount: newInvoice.total,
      payment_mode: mode,
      status: mode === 'credit' ? 'unpaid' : 'paid',
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
      await supabase.from('invoice_items').insert(invItems);
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
  };

  const editAccount = async (id: string, updates: Partial<BankAccount>) => {
    const updated = accounts.map((a) => (a.id === id ? { ...a, ...updates } : a));
    setAccounts(updated);
    await storage.set('accounts', updated);
  };

  const deleteAccount = async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    await storage.set('accounts', updated);
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
  };

  // Sales Vouchers
  const createQuotation = async (q: Omit<Quotation, 'id'>) => {
    const newQ: Quotation = { ...q, id: generateUUID() };
    const updated = [newQ, ...quotations];
    setQuotations(updated);
    await storage.set('quotations', updated);
    return newQ;
  };

  const createSalesReturn = async (sr: Omit<SalesReturn, 'id'>) => {
    const newSR: SalesReturn = { ...sr, id: generateUUID() };
    const updated = [newSR, ...salesReturns];
    setSalesReturns(updated);
    await storage.set('sales_returns', updated);
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
    return newP;
  };

  // Staff Management
  const addStaffMember = async (newStaff: Omit<StaffMember, 'id'>) => {
    const member: StaffMember = {
      ...newStaff,
      id: 'staff-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [member, ...staffList];
    setStaffList(updated);
    await storage.set('staff_list', updated);
    return member;
  };

  const updateStaffMember = async (id: string, updates: Partial<StaffMember>) => {
    const updated = staffList.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setStaffList(updated);
    await storage.set('staff_list', updated);
  };

  const deleteStaffMember = async (id: string) => {
    const updated = staffList.filter((s) => s.id !== id);
    setStaffList(updated);
    await storage.set('staff_list', updated);
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
