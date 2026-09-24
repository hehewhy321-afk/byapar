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

  // Financial / Business Terms
  total: string;
  subtotal: string;
  discount: string;
  tax: string;
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

  // Ledger / Khata
  customer: string;
  supplier: string;
  giveCredit: string;
  receivePayment: string;
  reminderWhatsApp: string;
  viewStatement: string;
  statement: string;

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

  // Simple prompts & statuses
  success: string;
  error: string;
  loading: string;
  noData: string;
  enterAmount: string;
  enterName: string;
  enterPhone: string;
  personal: string;
  others: string;
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
    parties: 'Parties & Khata',
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

    total: 'Total',
    subtotal: 'Subtotal',
    discount: 'Discount',
    tax: 'VAT (13%)',
    roundOff: 'Round Off',
    grandTotal: 'Grand Total',
    paid: 'Paid Amount',
    due: 'Due / Udharo',
    received: 'Received',
    balance: 'Balance',
    cash: 'Cash',
    credit: 'Credit (Udhar)',
    fonepay: 'Fonepay QR',
    onlinePayment: 'Online / QR',
    bank: 'Bank Transfer',
    changeDue: 'Change Return',
    totalReceivable: 'To Receive (उठ्न बाँकी)',
    totalPayable: 'To Pay (तिर्न बाँकी)',
    netProfit: 'Net Profit',
    todaySales: "Today's Sales",
    todayPurchases: "Today's Purchases",
    cashInHand: 'Cash in Hand',

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

    customer: 'Customer',
    supplier: 'Supplier / Sahuji',
    giveCredit: 'Gave (दिएँ - बिक्री)',
    receivePayment: 'Got (पाएँ - भुक्तानी)',
    reminderWhatsApp: 'Send WhatsApp Reminder',
    viewStatement: 'View Statement',
    statement: 'Statement',

    language: 'Language',
    languageName: 'English',
    languageSwitch: 'नेपालीमा बदल्नुहोस्',
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
  },
  ne: {
    home: 'गृहपृष्ठ',
    dashboard: 'ड्यासबोर्ड',
    sales: 'बिक्री',
    salesHub: 'बिक्री केन्द्र',
    purchase: 'खरिद',
    purchaseHub: 'खरिद केन्द्र',
    pos: 'बिलिङ (POS)',
    inventory: 'सामान / स्टक',
    stock: 'स्टक',
    ledger: 'ग्राहक खाता',
    parties: 'खाता (पार्टी)',
    expenses: 'खर्चहरू',
    income: 'आम्दानी',
    accounts: 'बैंक तथा नगद',
    billGallery: 'बिल ग्यालरी',
    billsArchive: 'बिल संग्रह',
    reports: 'हिसाब किताब',
    staff: 'कर्मचारी',
    settings: 'सेटिङ',
    notifications: 'सूचनाहरू',
    reminders: 'ताकेता / सम्झना',
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
    signIn: 'लग-इन गर्नुहोस्',
    signOut: 'बाहिरिनुहोस्',
    createStore: 'नयाँ पसल दर्ता',

    total: 'जम्मा',
    subtotal: 'कुल रकम',
    discount: 'छुट',
    tax: 'भ्याट (१३%)',
    roundOff: 'राउन्ड अफ',
    grandTotal: 'कुल जम्मा',
    paid: 'बुझाएको रकम',
    due: 'बाँकी (उधारो)',
    received: 'प्राप्त रकम',
    balance: 'बाँकी हिसाब',
    cash: 'नगद',
    credit: 'उधारो',
    fonepay: 'फोनपे क्युआर',
    onlinePayment: 'अनलाइन / क्युआर',
    bank: 'बैंक ट्रान्सफर',
    changeDue: 'फिर्ता दिनुपर्ने',
    totalReceivable: 'लिन बाँकी रकम',
    totalPayable: 'तिर्न बाँकी रकम',
    netProfit: 'खुद नाफा',
    todaySales: 'आजको बिक्री',
    todayPurchases: 'आजको खरिद',
    cashInHand: 'नगद मौज्दात',

    allCategories: 'सबै वर्ग',
    barcodeScan: 'बारकोड स्क्यान',
    searchProducts: 'सामान खोज्नुहोस् वा स्क्यान...',
    cart: 'झोला (कार्ट)',
    emptyCart: 'कुनै सामान छैन',
    items: 'सामानहरू',
    qty: 'संख्या (Qty)',
    rate: 'दर (Rate)',
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

    customer: 'ग्राहक',
    supplier: 'साहुजी / आपूर्तिकर्ता',
    giveCredit: 'दिएँ (उधारो सामान)',
    receivePayment: 'पाएँ (रकम प्राप्त)',
    reminderWhatsApp: 'ह्वाट्सएपमा ताकेता',
    viewStatement: 'हिसाब हेर्नुहोस्',
    statement: 'स्टेटमेन्ट',

    language: 'भाषा (Language)',
    languageName: 'नेपाली',
    languageSwitch: 'Switch to English',
    darkMode: 'डार्क मोड',
    lightMode: 'लाइट मोड',
    preferences: 'प्राथमिकताहरू',
    storeProfile: 'पसलको विवरण र प्यान',
    vatRegistered: 'भ्याट दर्ता (१३%)',
    subscription: 'योजना तथा प्याकेज',
    thermalPrinter: 'प्रिन्टर साइज (कागज चौडाइ)',
    fonepaySetup: 'फोनपे डाइनामिक क्युआर',
    whatsappTemplate: 'उधारो सम्झाउने म्यासेज',
    pushNotifications: 'मोबाइल नोटिफिकेसन',
    updates: 'अपडेट जाँच गर्नुहोस्',
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
  },
};

export const getTranslation = (lang: Language, key: keyof TranslationDict, fallback?: string): string => {
  const dict = translations[lang] || translations.en;
  return dict[key] || fallback || key;
};
