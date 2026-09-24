export type Language = 'en' | 'ne';

export interface TranslationDict {
  // Navigation / Tabs
  home: string;
  dashboard: string;
  sales: string;
  salesHub: string;
  purchase: string;
  purchaseHub: string;
  pos: string;
  inventory: string;
  stock: string;
  ledger: string;
  parties: string;
  expenses: string;
  income: string;
  accounts: string;
  billGallery: string;
  billsArchive: string;
  reports: string;
  staff: string;
  settings: string;
  notifications: string;
  reminders: string;
  more: string;
  switchBranch: string;
  newSale: string;
  newPurchase: string;
  addExpense: string;
  addIncome: string;
  addParty: string;
  addProduct: string;

  // Common Actions
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  search: string;
  filter: string;
  viewAll: string;
  close: string;
  back: string;
  submit: string;
  confirm: string;
  print: string;
  share: string;
  download: string;
  upgrade: string;
  sync: string;
  synced: string;
  offline: string;
  online: string;
  signIn: string;
  signOut: string;
  createStore: string;
  actions: string;
  status: string;

  // Financial / Business Terms
  total: string;
  subtotal: string;
  discount: string;
  tax: string;
  vat: string;
  roundOff: string;
  grandTotal: string;
  paid: string;
  due: string;
  received: string;
  balance: string;
  cash: string;
  credit: string;
  fonepay: string;
  onlinePayment: string;
  bank: string;
  changeDue: string;
  totalReceivable: string;
  totalPayable: string;
  netProfit: string;
  todaySales: string;
  todayPurchases: string;
  cashInHand: string;
  cashAndBank: string;
  purchasesAndExpenses: string;
  recentTransactions: string;
  quickActions: string;

  // POS & Inventory
  allCategories: string;
  barcodeScan: string;
  searchProducts: string;
  cart: string;
  emptyCart: string;
  items: string;
  qty: string;
  rate: string;
  unit: string;
  price: string;
  stockAlert: string;
  inStock: string;
  outOfStock: string;
  checkout: string;
  completeSale: string;
  invoiceNumber: string;
  billNumber: string;
  date: string;
  customerName: string;
  supplierName: string;
  buyPrice: string;
  sellPrice: string;
  productName: string;
  category: string;
  allProducts: string;
  lowStockAlert: string;

  // Ledger / Khata
  customer: string;
  customers: string;
  supplier: string;
  suppliers: string;
  giveCredit: string;
  receivePayment: string;
  reminderWhatsApp: string;
  viewStatement: string;
  statement: string;
  allParties: string;
  allCustomers: string;
  allSuppliers: string;
  creditGiven: string;
  paymentReceived: string;

  // Statuses
  unpaid: string;
  partial: string;
  paidStatus: string;
  active: string;
  completed: string;
  pending: string;

  // Settings & Preferences
  language: string;
  languageName: string;
  languageSwitch: string;
  darkMode: string;
  lightMode: string;
  preferences: string;
  storeProfile: string;
  vatRegistered: string;
  subscription: string;
  thermalPrinter: string;
  fonepaySetup: string;
  whatsappTemplate: string;
  pushNotifications: string;
  updates: string;
  changePassword: string;

  // Simple prompts & descriptions
  success: string;
  error: string;
  loading: string;
  noData: string;
  enterAmount: string;
  enterName: string;
  enterPhone: string;
  personal: string;
  others: string;
  invoicesGenerated: string;
  billsRecorded: string;
  activeAccounts: string;

  // Additional Module Keys
  invoices: string;
  quotations: string;
  salesReturns: string;
  paymentIn: string;
  newInvoice: string;
  newQuotation: string;
  newSalesReturn: string;
  recordPaymentIn: string;
  viewReceipt: string;
  customerSelect: string;
  amountReceived: string;
  paymentMethod: string;
  notes: string;

  purchaseBills: string;
  purchaseReturns: string;
  paymentOut: string;
  addPurchaseBill: string;
  newPurchaseReturn: string;
  recordPaymentOut: string;
  supplierSelect: string;
  amountPaid: string;

  scanBarcode: string;
  addToCart: string;
  clearCart: string;
  holdCart: string;
  discountPercent: string;
  tenderedAmount: string;

  manageInventory: string;
  stockAlerts: string;
  categories: string;
  stockValue: string;
  retailValue: string;
  lowStockItems: string;

  customerKhata: string;
  supplierKhata: string;
  totalReceivableDesc: string;
  totalPayableDesc: string;
  settleDues: string;
  sendReminder: string;

  allExpenses: string;
  expenseCategory: string;
  recipientPaidTo: string;
  payerReceivedFrom: string;

  bankAccounts: string;
  cashInHandDesc: string;
  transferFunds: string;
  deposit: string;
  withdraw: string;
  fromAccount: string;
  toAccount: string;

  profitLoss: string;
  salesSummary: string;
  dayBook: string;
  taxSummary: string;
  topSelling: string;
  totalRevenue: string;

  today: string;
  last7Days: string;
  last30Days: string;
  thisMonth: string;
  fiscalYear: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    home: 'Home',
    dashboard: 'Dashboard',
    sales: 'Sales',
    salesHub: 'Sales Hub',
    purchase: 'Purchase',
    purchaseHub: 'Purchase Hub',
    pos: 'POS Billing',
    inventory: 'Stock & Inventory',
    stock: 'Stock',
    ledger: 'Customer Khata',
    parties: 'Parties',
    expenses: 'Expenses',
    income: 'Income',
    accounts: 'Bank & Accounts',
    billGallery: 'Bill Gallery',
    billsArchive: 'Bills Archive',
    reports: 'Reports & P&L',
    staff: 'Staff & Team',
    settings: 'Settings',
    notifications: 'Notifications',
    reminders: 'Reminders',
    more: 'More',
    switchBranch: 'Switch Branch',
    newSale: 'New Sale',
    newPurchase: 'New Purchase',
    addExpense: 'Add Expense',
    addIncome: 'Add Income',
    addParty: 'Add Contact',
    addProduct: 'Add Product',

    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    viewAll: 'View All',
    close: 'Close',
    back: 'Back',
    submit: 'Submit',
    confirm: 'Confirm',
    print: 'Print Receipt',
    share: 'Share',
    download: 'Download',
    upgrade: 'Upgrade',
    sync: 'Sync',
    synced: 'Synced',
    offline: 'Offline',
    online: 'Online',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    createStore: 'Create Store',
    actions: 'Actions',
    status: 'Status',

    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'Tax',
    vat: 'VAT (13%)',
    roundOff: 'Round Off',
    grandTotal: 'Grand Total',
    paid: 'Paid Amount',
    due: 'Due Balance',
    received: 'Received',
    balance: 'Balance',
    cash: 'Cash',
    credit: 'Credit',
    fonepay: 'Fonepay QR',
    onlinePayment: 'Online / QR',
    bank: 'Bank Transfer',
    changeDue: 'Change Return',
    totalReceivable: 'To Receive',
    totalPayable: 'To Pay',
    netProfit: 'Net Profit',
    todaySales: "Today's Sales",
    todayPurchases: "Today's Purchases",
    cashInHand: 'Cash in Hand',
    cashAndBank: 'Cash & Bank',
    purchasesAndExpenses: 'Purchases & Expenses',
    recentTransactions: 'Recent Transactions',
    quickActions: 'Quick Actions',

    allCategories: 'All Categories',
    barcodeScan: 'Scan Barcode',
    searchProducts: 'Search products or scan...',
    cart: 'Cart',
    emptyCart: 'Cart is empty',
    items: 'Items',
    qty: 'Qty',
    rate: 'Rate',
    unit: 'Unit',
    price: 'Price',
    stockAlert: 'Low Stock',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    checkout: 'Checkout',
    completeSale: 'Complete Sale',
    invoiceNumber: 'Invoice #',
    billNumber: 'Bill #',
    date: 'Date',
    customerName: 'Customer Name',
    supplierName: 'Supplier Name',
    buyPrice: 'Buy Price',
    sellPrice: 'Sell Price',
    productName: 'Product Name',
    category: 'Category',
    allProducts: 'All Products',
    lowStockAlert: 'Low Stock Alert',

    customer: 'Customer',
    customers: 'Customers',
    supplier: 'Supplier',
    suppliers: 'Suppliers',
    giveCredit: 'Credit Given',
    receivePayment: 'Payment Received',
    reminderWhatsApp: 'Send WhatsApp Reminder',
    viewStatement: 'View Statement',
    statement: 'Statement',
    allParties: 'All Contacts',
    allCustomers: 'All Customers',
    allSuppliers: 'All Suppliers',
    creditGiven: 'Credit Given',
    paymentReceived: 'Payment Received',

    unpaid: 'Unpaid',
    partial: 'Partial',
    paidStatus: 'Paid',
    active: 'Active',
    completed: 'Completed',
    pending: 'Pending',

    language: 'Language',
    languageName: 'English',
    languageSwitch: 'Switch to Nepali',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    preferences: 'Preferences',
    storeProfile: 'Store Details & PAN',
    vatRegistered: 'VAT Registered (13%)',
    subscription: 'Subscription & Plans',
    thermalPrinter: 'Thermal Paper Width',
    fonepaySetup: 'Fonepay Dynamic QR',
    whatsappTemplate: 'Dues Reminder Template',
    pushNotifications: 'Notifications & Alerts',
    updates: 'Check for Updates',
    changePassword: 'Change Password',

    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    noData: 'No records found',
    enterAmount: 'Enter amount',
    enterName: 'Enter name',
    enterPhone: 'Enter phone number',
    personal: 'Personal',
    others: 'Others',
    invoicesGenerated: 'invoices generated',
    billsRecorded: 'bills recorded',
    activeAccounts: 'active accounts',

    invoices: 'Invoices',
    quotations: 'Quotations',
    salesReturns: 'Sales Returns',
    paymentIn: 'Payment In',
    newInvoice: 'New Invoice',
    newQuotation: 'New Quotation',
    newSalesReturn: 'New Sales Return',
    recordPaymentIn: 'Record Payment In',
    viewReceipt: 'View Receipt',
    customerSelect: 'Select Customer',
    amountReceived: 'Amount Received',
    paymentMethod: 'Payment Method',
    notes: 'Notes / Remarks',

    purchaseBills: 'Purchase Bills',
    purchaseReturns: 'Purchase Returns',
    paymentOut: 'Payment Out',
    addPurchaseBill: 'Add Purchase Bill',
    newPurchaseReturn: 'New Purchase Return',
    recordPaymentOut: 'Record Payment Out',
    supplierSelect: 'Select Supplier',
    amountPaid: 'Amount Paid',

    scanBarcode: 'Scan Barcode',
    addToCart: 'Add to Cart',
    clearCart: 'Clear Cart',
    holdCart: 'Hold Cart',
    discountPercent: 'Discount %',
    tenderedAmount: 'Tendered Amount',

    manageInventory: 'Manage Inventory',
    stockAlerts: 'Stock Alerts',
    categories: 'Categories',
    stockValue: 'Cost Value',
    retailValue: 'Retail Value',
    lowStockItems: 'Low Stock Items',

    customerKhata: 'Customer Khata',
    supplierKhata: 'Supplier Khata',
    totalReceivableDesc: 'Total to receive from customers',
    totalPayableDesc: 'Total to pay to suppliers',
    settleDues: 'Settle Dues',
    sendReminder: 'Send Reminder',

    allExpenses: 'All Expenses',
    expenseCategory: 'Expense Category',
    recipientPaidTo: 'Paid To',
    payerReceivedFrom: 'Received From',

    bankAccounts: 'Bank & Wallet',
    cashInHandDesc: 'Physical Cash in Register',
    transferFunds: 'Transfer Funds',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    fromAccount: 'From Account',
    toAccount: 'To Account',

    profitLoss: 'Profit & Loss',
    salesSummary: 'Sales Summary',
    dayBook: 'Day Book',
    taxSummary: 'Tax & VAT Summary',
    topSelling: 'Top Selling Items',
    totalRevenue: 'Total Revenue',

    today: 'Today',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    thisMonth: 'This Month',
    fiscalYear: 'Fiscal Year',
  },
  ne: {
    home: 'गृहपृष्ठ',
    dashboard: 'ड्यासबोर्ड',
    sales: 'बिक्री',
    salesHub: 'बिक्री केन्द्र',
    purchase: 'खरिद',
    purchaseHub: 'खरिद केन्द्र',
    pos: 'बिलिङ',
    inventory: 'सामान तथा स्टक',
    stock: 'स्टक',
    ledger: 'ग्राहक खाता',
    parties: 'खाता सूची',
    expenses: 'खर्चहरू',
    income: 'आम्दानी',
    accounts: 'बैंक तथा नगद',
    billGallery: 'बिल ग्यालरी',
    billsArchive: 'बिल संग्रह',
    reports: 'हिसाब किताब',
    staff: 'कर्मचारी',
    settings: 'सेटिङ',
    notifications: 'सूचनाहरू',
    reminders: 'ताकेता',
    more: 'थप',
    switchBranch: 'शाखा बदल्नुहोस्',
    newSale: 'नयाँ बिक्री',
    newPurchase: 'नयाँ खरिद',
    addExpense: 'खर्च जोड्नुहोस्',
    addIncome: 'आम्दानी जोड्नुहोस्',
    addParty: 'नयाँ सम्पर्क',
    addProduct: 'सामान थप्नुहोस्',

    save: 'सेभ गर्नुहोस्',
    cancel: 'रद्द गर्नुहोस्',
    delete: 'हटाउनुहोस्',
    edit: 'सम्पादन',
    search: 'खोज्नुहोस्',
    filter: 'छान्नुहोस्',
    viewAll: 'सबै हेर्नुहोस्',
    close: 'बन्द गर्नुहोस्',
    back: 'पछाडि',
    submit: 'पेश गर्नुहोस्',
    confirm: 'निश्चित गर्नुहोस्',
    print: 'बिल प्रिन्ट',
    share: 'सेयर गर्नुहोस्',
    download: 'डाउनलोड',
    upgrade: 'अपग्रेड',
    sync: 'सिंक',
    synced: 'सिंक भएको',
    offline: 'अफलाइन',
    online: 'अनलाइन',
    signIn: 'लग-इन',
    signOut: 'बाहिरिनुहोस्',
    createStore: 'नयाँ पसल दर्ता',
    actions: 'कार्य',
    status: 'अवस्था',

    total: 'जम्मा',
    subtotal: 'कुल रकम',
    discount: 'छुट',
    tax: 'कर',
    vat: 'भ्याट (१३%)',
    roundOff: 'राउन्ड अफ',
    grandTotal: 'कुल जम्मा',
    paid: 'बुझाएको रकम',
    due: 'बाँकी रकम',
    received: 'प्राप्त रकम',
    balance: 'बाँकी हिसाब',
    cash: 'नगद',
    credit: 'उधारो',
    fonepay: 'फोनपे क्युआर',
    onlinePayment: 'अनलाइन भुक्तानी',
    bank: 'बैंक ट्रान्सफर',
    changeDue: 'फिर्ता दिनुपर्ने',
    totalReceivable: 'लिन बाँकी',
    totalPayable: 'तिर्न बाँकी',
    netProfit: 'खुद नाफा',
    todaySales: 'आजको बिक्री',
    todayPurchases: 'आजको खरिद',
    cashInHand: 'नगद मौज्दात',
    cashAndBank: 'नगद तथा बैंक',
    purchasesAndExpenses: 'खरिद तथा खर्च',
    recentTransactions: 'पछिल्ला कारोबारहरू',
    quickActions: 'द्रुत कार्यहरू',

    allCategories: 'सबै वर्ग',
    barcodeScan: 'बारकोड स्क्यान',
    searchProducts: 'सामान खोज्नुहोस् वा स्क्यान...',
    cart: 'झोला',
    emptyCart: 'कुनै सामान छैन',
    items: 'सामानहरू',
    qty: 'संख्या',
    rate: 'दर',
    unit: 'इकाई',
    price: 'मूल्य',
    stockAlert: 'कम स्टक',
    inStock: 'उपलब्ध स्टक',
    outOfStock: 'स्टक सकियो',
    checkout: 'बिल बनाउनुहोस्',
    completeSale: 'बिक्री सम्पन्न',
    invoiceNumber: 'बिल नं.',
    billNumber: 'खरिद बिल नं.',
    date: 'मिति',
    customerName: 'ग्राहकको नाम',
    supplierName: 'साहुजीको नाम',
    buyPrice: 'खरिद मूल्य',
    sellPrice: 'बिक्री मूल्य',
    productName: 'सामानको नाम',
    category: 'वर्ग',
    allProducts: 'सबै सामानहरू',
    lowStockAlert: 'कम स्टक सूचना',

    customer: 'ग्राहक',
    customers: 'ग्राहकहरू',
    supplier: 'साहुजी',
    suppliers: 'साहुजीहरू',
    giveCredit: 'उधारो दिएँ',
    receivePayment: 'रकम पाएँ',
    reminderWhatsApp: 'ह्वाट्सएपमा ताकेता',
    viewStatement: 'हिसाब हेर्नुहोस्',
    statement: 'स्टेटमेन्ट',
    allParties: 'सबै सम्पर्कहरू',
    allCustomers: 'सबै ग्राहकहरू',
    allSuppliers: 'सबै साहुजीहरू',
    creditGiven: 'उधारो दिएको',
    paymentReceived: 'रकम प्राप्त भएको',

    unpaid: 'बाँकी',
    partial: 'आंशिक',
    paidStatus: 'चुक्ता',
    active: 'सक्रिय',
    completed: 'सम्पन्न',
    pending: 'प्रक्रियामा',

    language: 'भाषा',
    languageName: 'नेपाली',
    languageSwitch: 'Switch to English',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',
    preferences: 'प्राथमिकताहरू',
    storeProfile: 'पसलको विवरण र प्यान',
    vatRegistered: 'भ्याट दर्ता (१३%)',
    subscription: 'योजना तथा प्याकेज',
    thermalPrinter: 'कागज चौडाइ (प्रिन्टर साइज)',
    fonepaySetup: 'फोनपे डाइनामिक क्युआर',
    whatsappTemplate: 'उधारो सम्झाउने म्यासेज',
    pushNotifications: 'मोबाइल सूचनाहरू',
    updates: 'अपडेट जाँच',
    changePassword: 'पासवर्ड परिवर्तन',

    success: 'सफल भयो',
    error: 'समस्या आयो',
    loading: 'लोड हुँदैछ...',
    noData: 'कुनै विवरण भेटिएन',
    enterAmount: 'रकम राख्नुहोस्',
    enterName: 'नाम राख्नुहोस्',
    enterPhone: 'मोबाइल नम्बर राख्नुहोस्',
    personal: 'व्यक्तिगत',
    others: 'अन्य सेवाहरू',
    invoicesGenerated: 'वटा बिल काटिएको',
    billsRecorded: 'वटा बिल दर्ता',
    activeAccounts: 'वटा सक्रिय खाता',

    invoices: 'बिक्री बिलहरू',
    quotations: 'कोटेशनहरू',
    salesReturns: 'बिक्री फिर्ता',
    paymentIn: 'रकम प्राप्ति',
    newInvoice: 'नयाँ बिक्री बिल',
    newQuotation: 'नयाँ कोटेशन',
    newSalesReturn: 'नयाँ बिक्री फिर्ता',
    recordPaymentIn: 'रकम प्राप्त जोड्नुहोस्',
    viewReceipt: 'रसिद हेर्नुहोस्',
    customerSelect: 'ग्राहक छान्नुहोस्',
    amountReceived: 'प्राप्त रकम',
    paymentMethod: 'भुक्तानी माध्यम',
    notes: 'कैफियत',

    purchaseBills: 'खरिद बिलहरू',
    purchaseReturns: 'खरिद फिर्ता',
    paymentOut: 'रकम भुक्तानी',
    addPurchaseBill: 'खरिद बिल जोड्नुहोस्',
    newPurchaseReturn: 'नयाँ खरिद फिर्ता',
    recordPaymentOut: 'भुक्तानी दर्ता गर्नुहोस्',
    supplierSelect: 'साहुजी छान्नुहोस्',
    amountPaid: 'भुक्तानी रकम',

    scanBarcode: 'बारकोड स्क्यान',
    addToCart: 'झोलामा हाल्नुहोस्',
    clearCart: 'झोला खाली गर्नुहोस्',
    holdCart: 'होल्ड गर्नुहोस्',
    discountPercent: 'छुट प्रतिशत',
    tenderedAmount: 'ग्राहकले दिएको रकम',

    manageInventory: 'स्टक व्यवस्थापन',
    stockAlerts: 'कम स्टक सूचना',
    categories: 'वर्गहरू',
    stockValue: 'स्टक मूल्य',
    retailValue: 'बिक्री मूल्य',
    lowStockItems: 'सकिन लागेका सामानहरू',

    customerKhata: 'ग्राहक खाता',
    supplierKhata: 'साहुजी खाता',
    totalReceivableDesc: 'ग्राहकबाट उठ्न बाँकी कुल रकम',
    totalPayableDesc: 'साहुजीलाई तिर्न बाँकी कुल रकम',
    settleDues: 'हिसाब चुक्ता',
    sendReminder: 'ताकेता पठाउनुहोस्',

    allExpenses: 'सबै खर्चहरू',
    expenseCategory: 'खर्च शीर्षक',
    recipientPaidTo: 'पाउने व्यक्ति',
    payerReceivedFrom: 'दिने व्यक्ति',

    bankAccounts: 'बैंक तथा वालेट',
    cashInHandDesc: 'पसलको नगद मौज्दात',
    transferFunds: 'रकम सार्नुहोस्',
    deposit: 'जम्मा गर्नुहोस्',
    withdraw: 'झिक्नुहोस्',
    fromAccount: 'पठाउने खाता',
    toAccount: 'पाउने खाता',

    profitLoss: 'नाफा तथा नोक्सान',
    salesSummary: 'बिक्री सारांश',
    dayBook: 'दैनिक हिसाब (डेबुक)',
    taxSummary: 'कर तथा भ्याट हिसाब',
    topSelling: 'धेरै बिक्री भएका सामान',
    totalRevenue: 'कुल आम्दानी',

    today: 'आज',
    last7Days: 'पछिल्लो ७ दिन',
    last30Days: 'पछिल्लो ३० दिन',
    thisMonth: 'यो महिना',
    fiscalYear: 'आर्थिक वर्ष',
  },
};

export const getTranslation = (lang: Language, key: keyof TranslationDict, fallback?: string): string => {
  const dict = translations[lang] || translations.en;
  return dict[key] || fallback || key;
};
