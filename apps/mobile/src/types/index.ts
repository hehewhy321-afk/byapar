export type PaymentMode = 'cash' | 'card' | 'fonepay_qr' | 'credit' | 'bank' | 'fonepay';

export type UnitType = 'Pcs' | 'Kg' | 'Ltr' | 'Pkt' | 'Bag' | 'Jar' | 'Bottle';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  unit: string;
  imageUri?: string;
}

export interface CartItem extends Product {
  qty: number;
}

export interface Party {
  id: string;
  name: string;
  phone: string;
  type: 'customer' | 'supplier';
  balance: number; // Positive = Receivable (they owe us), Negative = Payable (we owe them)
  address?: string;
}

export interface LedgerEntry {
  id: string;
  partyId: string;
  date: string;
  type: 'credit' | 'payment';
  amount: number;
  note: string;
  billImageUri?: string;
}

export interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  partyName: string;
  total: number;
  paymentMode: PaymentMode;
  items: InvoiceItem[];
}

export interface BillImage {
  id: string;
  title: string;
  vendorName: string;
  amount: number;
  date: string;
  category: 'Inventory' | 'Utilities' | 'Rent' | 'Packaging' | 'Logistics' | 'Other';
  imageUri: string;
  notes?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  color?: string;
}

export type BusinessType =
  | 'general'
  | 'clothing'
  | 'bakery'
  | 'electronics'
  | 'foods'
  | 'hotel'
  | 'pharmacy'
  | 'hardware'
  | 'cosmetics'
  | 'other';

export interface StoreProfile {
  id?: string;
  name: string;
  businessType?: BusinessType;
  ownerName: string;
  phone: string;
  panNumber: string;
  address: string;
  currency: string;
  vatEnabled: boolean;
  paperWidth: '58mm' | '80mm';
  whatsappTemplate: string;
}

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
  accountId: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  transactionType: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  amount: number;
  balanceAfter: number;
  category?: string;
  notes?: string;
  dateAd: string;
  createdAt?: string;
}

export interface Quotation {
  id: string;
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
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }[];
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  partyId?: string;
  partyName: string;
  date: string;
  totalAmount: number;
  refundAmount: number;
  creditAmount: number;
  reason?: string;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }[];
}

export interface PurchaseBill {
  id: string;
  billNumber: string;
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  date: string;
  subtotal: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: PaymentMode;
  status: 'paid' | 'unpaid' | 'partial';
  notes?: string;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    costPrice: number;
    totalAmount: number;
  }[];
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  supplierId?: string;
  supplierName: string;
  date: string;
  totalAmount: number;
  refundAmount: number;
  reason?: string;
  items: {
    id: string;
    itemName: string;
    quantity: number;
    costPrice: number;
    totalAmount: number;
  }[];
}

export interface PaymentRecord {
  id: string;
  type: 'in' | 'out';
  partyId: string;
  partyName: string;
  amount: number;
  paymentMode: PaymentMode;
  accountId?: string;
  notes?: string;
  date: string;
}

export interface StaffMember {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  permissions: Record<string, boolean>;
  isActive: boolean;
  createdAt?: string;
}

export interface ExpenseRecord {
  id: string;
  category: string;
  amount: number;
  paymentMode: string;
  date: string;
  note?: string;
  recipientName?: string;
  createdAt?: string;
}

export interface IncomeRecord {
  id: string;
  category: string;
  amount: number;
  paymentMode: string;
  date: string;
  note?: string;
  payerName?: string;
  createdAt?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'sales'
  | 'purchase'
  | 'inventory'
  | 'ledger'
  | 'accounts'
  | 'bills'
  | 'expenses'
  | 'reports'
  | 'staff'
  | 'more'
  | 'settings';


