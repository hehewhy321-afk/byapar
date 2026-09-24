/**
 * BYAPAR (व्यापार) - Core TypeScript Domain Models
 */

export type UserRole = 'owner' | 'manager' | 'cashier' | 'stock_keeper';
export type PartyType = 'customer' | 'supplier' | 'both';
export type InvoiceType = 'sale' | 'purchase' | 'sale_return' | 'purchase_return' | 'quotation';
export type InvoiceStatus = 'draft' | 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
export type PaymentMode = 'cash' | 'fonepay_qr' | 'connectips' | 'bank_transfer' | 'cheque' | 'credit';
export type KhataEntryType = 'liyo' | 'diyo'; // liyo = received, diyo = gave
export type CbmsStatus = 'not_applicable' | 'pending' | 'synced' | 'failed';

export interface Business {
  id: string;
  name: string;
  businessType: string;
  panVatNumber?: string;
  isVatRegistered: boolean;
  addressLine?: string;
  city?: string;
  province?: string;
  phone?: string;
  currency: string;
  transactionDateLock?: string;
  logoUrl?: string;
  fonepayQrImage?: string;
  fonepayMerchantId?: string;
  fonepayMerchantName?: string;
  fonepayQrPayload?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  colorCode: string;
  createdAt: string;
}

export interface Unit {
  id: string;
  businessId: string;
  name: string;
  shortCode: string;
}

export interface Item {
  id: string;
  businessId: string;
  categoryId?: string;
  unitId?: string;
  name: string;
  barcode?: string;
  sku?: string;
  mrp: number;
  sellingPrice: number;
  wholesalePrice?: number;
  purchaseCost?: number;
  costPrice?: number;
  currentStock: number;
  lowStockThreshold: number;
  taxRate: number; // 0 or 13 (VAT)
  isTaxInclusive: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Party {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  panVatNumber?: string;
  partyType: PartyType;
  creditLimit: number;
  duePeriodDays: number;
  openingBalance: number;
  currentBalance: number; // Positive = they owe us (Receivable), Negative = we owe them (Payable)
  address?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemId?: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  partyId?: string;
  partyName?: string;
  partyPhone?: string;
  partyPan?: string;
  invoiceType: InvoiceType;
  invoiceNumber: string;
  fiscalYear: string;
  invoiceDateAd: string; // YYYY-MM-DD
  invoiceDateBs: string; // YYYY-MM-DD (Bikram Sambat)
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  roundOff: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
  paymentMode: PaymentMode;
  cbmsStatus: CbmsStatus;
  cbmsSyncCode?: string;
  items: InvoiceItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KhataEntry {
  id: string;
  businessId: string;
  partyId: string;
  partyName?: string;
  invoiceId?: string;
  entryType: KhataEntryType; // 'liyo' or 'diyo'
  amount: number;
  dateAd: string;
  dateBs: string;
  notes?: string;
  receiptImageUrl?: string;
  voiceNoteUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  businessId: string;
  category: string;
  amount: number;
  paymentMode: PaymentMode;
  recipientName?: string;
  notes?: string;
  receiptUrl?: string;
  dateAd: string;
  dateBs: string;
  createdAt: string;
}

export interface CartItem extends Item {
  cartQuantity: number;
  selectedPrice: number; // MRP, wholesale, or custom
  customDiscount: number;
  lineTotal: number;
}

export type NotificationType =
  | 'debtor_reminder'
  | 'supplier_payable'
  | 'low_stock'
  | 'daily_summary'
  | 'subscription_alert'
  | 'admin_broadcast'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  businessId: string;
  userId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  data?: {
    partyId?: string;
    partyName?: string;
    partyPhone?: string;
    invoiceId?: string;
    billId?: string;
    itemId?: string;
    amount?: number;
    actionUrl?: string;
    linkScreen?: string;
    [key: string]: any;
  };
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type ReminderType = 'customer_due' | 'supplier_payment' | 'custom' | 'recurring_daily';
export type ReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ReminderWithConfig {
  id: string;
  businessId: string;
  partyId?: string;
  partyName?: string;
  title: string;
  amount?: number;
  dueDateAd: string;
  dueDateBs?: string;
  reminderType: ReminderType;
  frequency: ReminderFrequency;
  notifyWeb: boolean;
  notifyMobile: boolean;
  isActive: boolean;
  status: 'upcoming' | 'completed' | 'cancelled';
  lastNotifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionPlanTier = 'free' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'expiring_soon' | 'past_due' | 'expired' | 'cancelled';

export interface BusinessSubscription {
  id: string;
  businessId: string;
  planTier: SubscriptionPlanTier;
  billingCycle: 'monthly' | 'yearly';
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt: string;
  price: number;
  currency: string;
  features: {
    multiDevice?: boolean;
    unlimitedInvoices?: boolean;
    cbmsSync?: boolean;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminBroadcast {
  id: string;
  title: string;
  message: string;
  category: 'announcement' | 'offer' | 'maintenance' | 'feature_update';
  targetAudience: 'all' | 'free' | 'pro' | 'expiring_soon' | 'specific_business';
  targetBusinessId?: string | null;
  actionUrl?: string | null;
  sentBy?: string | null;
  recipientCount: number;
  createdAt: string;
}

export interface UserDevice {
  id: string;
  userId: string;
  businessId: string;
  playerId: string;
  platform: 'web' | 'android' | 'ios';
  deviceInfo?: Record<string, any>;
  lastActiveAt: string;
  createdAt: string;
}

