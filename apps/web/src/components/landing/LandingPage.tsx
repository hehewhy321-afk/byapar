import { createSignal, onSettled, Show, For } from 'solid-js';
import { setCurrentPage } from '../../db/localDb';

interface CartItem {
  id: string;
  name: string;
  category: string;
  priceRetail: number;
  priceWholesale: number;
  qty: number;
}

export function LandingPage() {
  const [scrolled, setScrolled] = createSignal(false);
  const [pricingMode, setPricingMode] = createSignal<'retail' | 'wholesale'>('retail');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [activeTab, setActiveTab] = createSignal<'billing' | 'khata' | 'inventory'>('billing');
  const [whatsAppNotice, setWhatsAppNotice] = createSignal<string | null>(null);
  const [stockFilter, setStockFilter] = createSignal<'all' | 'low' | 'expiring'>('all');
  const [printedBill, setPrintedBill] = createSignal(false);
  const [openFaq, setOpenFaq] = createSignal<number | null>(0);

  const previewFaqs = [
    {
      q: 'Is Byapar really free for single-counter retail shops?',
      a: 'Yes, Byapar is 100% free for single-counter stores. You can add unlimited items, issue unlimited bills, track customer Khata debts, and access real-time cloud sync with zero hidden charges.',
    },
    {
      q: 'Can I print receipts on regular 58mm or 80mm thermal printers?',
      a: 'Yes. Byapar supports all standard ESC/POS Bluetooth and USB thermal receipt printers. There are no proprietary drivers or locked hardware required.',
    },
    {
      q: 'How do the automated WhatsApp Khata reminders work?',
      a: 'Clicking "Send WhatsApp" drafts an automated courteous message in Nepali with the customer’s exact balance and your shop’s direct Fonepay QR payment link so they can settle immediately from their phone.',
    },
    {
      q: 'Can I use Byapar on my phone and shop laptop at the same time?',
      a: 'Yes. Everything syncs to your secure cloud database in real time. Your staff can issue bills on the shop PC while you inspect live profit and inventory on your phone from anywhere.',
    },
  ];

  // Available sample catalog for live register interaction
  const catalog = [
    { id: '1', name: 'Wai Wai Quick Chicken 75g', category: 'Noodles', priceRetail: 25, priceWholesale: 22 },
    { id: '2', name: 'Fortune Sunlite Sunflower Oil 1L', category: 'Oil & Ghee', priceRetail: 280, priceWholesale: 260 },
    { id: '3', name: 'Amul Salted Butter 100g', category: 'Dairy', priceRetail: 110, priceWholesale: 102 },
    { id: '4', name: 'Tokla Gold Leaf Tea 500g', category: 'Beverages', priceRetail: 340, priceWholesale: 315 },
    { id: '5', name: 'Dettol Original Soap 75g', category: 'Personal Care', priceRetail: 55, priceWholesale: 48 },
    { id: '6', name: 'Dawaat Basmati Rice 20kg', category: 'Grains', priceRetail: 2850, priceWholesale: 2650 },
  ];

  // Active cart state for live register
  const [cart, setCart] = createSignal<CartItem[]>([
    { id: '1', name: 'Wai Wai Quick Chicken 75g', category: 'Noodles', priceRetail: 25, priceWholesale: 22, qty: 6 },
    { id: '2', name: 'Fortune Sunlite Sunflower Oil 1L', category: 'Oil & Ghee', priceRetail: 280, priceWholesale: 260, qty: 2 },
  ]);

  const addToBill = (product: typeof catalog[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const next = item.qty + delta;
            return next > 0 ? { ...item, qty: next } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const currentPrice = (item: CartItem) =>
    pricingMode() === 'retail' ? item.priceRetail : item.priceWholesale;

  const totalBill = () =>
    cart().reduce((sum, item) => sum + currentPrice(item) * item.qty, 0);

  const filteredCatalog = () => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return catalog;
    return catalog.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  };

  // Sample Khata Customers
  const khataCustomers = [
    { name: 'Ramesh Bahadur Shrestha', phone: '9841234567', balance: 4500, days: 4, status: 'overdue' },
    { name: 'Sita Devi Koirala', phone: '9851098765', balance: 1850, days: 1, status: 'recent' },
    { name: 'Bikram Thapa (Kirana Mart)', phone: '9803112233', balance: 12400, days: 8, status: 'overdue' },
    { name: 'Gita Sharma', phone: '9847665544', balance: 650, days: 2, status: 'recent' },
  ];

  // Sample Inventory List
  const inventoryItems = [
    { name: 'Wai Wai Quick Chicken 75g', sku: 'WW-CHK-75', category: 'Noodles', stock: 4, alert: 'Low Stock', daysExp: 140 },
    { name: 'Amul Salted Butter 100g', sku: 'AML-BTR-100', category: 'Dairy', stock: 8, alert: 'Expires in 12 Days', daysExp: 12 },
    { name: 'Fortune Sunflower Oil 1L', sku: 'FTN-OIL-1L', category: 'Oil & Ghee', stock: 48, alert: 'Normal', daysExp: 220 },
    { name: 'Tokla Gold Leaf Tea 500g', sku: 'TKL-TEA-500', category: 'Beverages', stock: 26, alert: 'Normal', daysExp: 310 },
    { name: 'Dettol Original Soap 75g', sku: 'DTL-SP-75', category: 'Personal Care', stock: 3, alert: 'Low Stock', daysExp: 450 },
    { name: 'Dawaat Basmati Rice 20kg', sku: 'DWT-RC-20', category: 'Grains', stock: 15, alert: 'Normal', daysExp: 365 },
  ];

  const filteredInventory = () => {
    if (stockFilter() === 'low') return inventoryItems.filter(i => i.stock < 10);
    if (stockFilter() === 'expiring') return inventoryItems.filter(i => i.daysExp <= 30);
    return inventoryItems;
  };

  const triggerWhatsApp = (name: string, amt: number) => {
    setWhatsAppNotice(`WhatsApp reminder sent to ${name} for रू ${amt}`);
    setTimeout(() => setWhatsAppNotice(null), 3500);
  };

  onSettled(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  });

  return (
    <div class="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-white selection:text-black">
      
      {/* ─── TOAST NOTIFICATION ─── */}
      <Show when={whatsAppNotice()}>
        <div class="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-5 py-2.5 rounded-full text-xs font-mono font-bold shadow-2xl flex items-center gap-2 animate-fade-in border border-zinc-200">
          <span class="w-2 h-2 rounded-full bg-black animate-pulse" />
          <span>{whatsAppNotice()}</span>
        </div>
      </Show>

      {/* ─── NAVIGATION ─── */}
      <header
        class={`fixed top-0 inset-x-0 z-40 transition-all duration-200 border-b ${
          scrolled()
            ? 'bg-[#09090b]/90 backdrop-blur-md border-zinc-800 py-3.5'
            : 'bg-transparent border-transparent py-5'
        }`}
      >
        <div class="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div 
            class="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span class="font-heading font-black text-xl tracking-tighter text-white">
              BYAPAR<span class="text-zinc-500 text-base">.NP</span>
            </span>
          </div>

          <nav class="hidden sm:flex items-center gap-6 text-xs text-zinc-400 font-medium">
            <a href="#interactive" class="hover:text-white transition-colors">Register</a>
            <a href="#product" class="hover:text-white transition-colors">Inside Byapar</a>
            <button onClick={() => setCurrentPage('about')} class="hover:text-white transition-colors">About Us</button>
            <button onClick={() => setCurrentPage('faq')} class="hover:text-white transition-colors">FAQs</button>
          </nav>

          <div class="flex items-center gap-3">
            <a
              href="/byapar.apk"
              download="byapar.apk"
              class="hidden sm:flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 bg-zinc-900 px-3 py-1.5 rounded-md transition-colors font-medium"
            >
              <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0001 0-.5516.4482-1.0001.9993-1.0001.5516 0 1.0002.4485 1.0002 1.0001 0 .5515-.4486 1.0001-1.0002 1.0001m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0001 0-.5516.4482-1.0001.9993-1.0001.5516 0 1.0001.4485 1.0001 1.0001 0 .5515-.4485 1.0001-1.0001 1.0001m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.0818 12 8.0818c-1.8538 0-3.5907.3298-5.1368.8678L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.689-7.5743-6.1185-9.4396" />
              </svg>
              <span>Download App</span>
            </a>
            <button
              onClick={() => setCurrentPage('auth')}
              class="text-xs font-bold text-black bg-white hover:bg-zinc-200 px-4 py-2 rounded-md transition-all active:scale-95"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section class="pt-36 pb-20 px-6 max-w-6xl mx-auto">
        <div class="max-w-3xl">
          <h1 class="text-4xl sm:text-6xl font-heading font-black tracking-tight text-white leading-[1.05] mb-6">
            Run your shop without paper registers or lost udhar.
          </h1>
          <p class="text-lg text-zinc-400 leading-relaxed mb-8 max-w-2xl font-normal">
            Byapar gives grocery, mart, and retail owners an ultra-fast counter POS, a digital credit ledger with 1-tap WhatsApp reminders, and real-time cloud sync across your phone and computer.
          </p>

          <div class="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setCurrentPage('auth')}
              class="px-6 py-3.5 bg-white text-black hover:bg-zinc-200 font-heading font-bold text-sm rounded-md transition-all active:scale-95"
            >
              Start using Byapar — Free
            </button>
            
            {/* DOWNLOAD APP BUTTON INSTEAD OF LIVE DEMO */}
            <a
              href="/byapar.apk"
              download="byapar.apk"
              class="px-6 py-3.5 bg-zinc-900 text-zinc-200 hover:text-white hover:bg-zinc-800 border border-zinc-800 font-heading font-semibold text-sm rounded-md transition-all flex items-center gap-2.5 active:scale-95 shadow-sm"
            >
              <svg class="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0001 0-.5516.4482-1.0001.9993-1.0001.5516 0 1.0002.4485 1.0002 1.0001 0 .5515-.4486 1.0001-1.0002 1.0001m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0001 0-.5516.4482-1.0001.9993-1.0001.5516 0 1.0001.4485 1.0001 1.0001 0 .5515-.4485 1.0001-1.0001 1.0001m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.0818 12 8.0818c-1.8538 0-3.5907.3298-5.1368.8678L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.689-7.5743-6.1185-9.4396" />
              </svg>
              <span>Download App</span>
              <span class="text-[10px] text-zinc-500 font-mono bg-zinc-800 px-1.5 py-0.5 rounded">Android</span>
            </a>
          </div>
        </div>

        {/* ─── INTERACTIVE COUNTER REGISTER (EXPERIENCE THE REAL APP) ─── */}
        <div id="interactive" class="mt-16 border border-zinc-800 bg-[#0d0d11] rounded-xl overflow-hidden shadow-2xl">
          <div class="border-b border-zinc-800 px-5 py-3 flex flex-wrap items-center justify-between gap-4 bg-zinc-950/60">
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider">
                LIVE INTERACTIVE REGISTER
              </span>
              <span class="text-[11px] text-zinc-500 font-mono">
                Click products to add to bill
              </span>
            </div>

            {/* Pricing Mode Switcher */}
            <div class="flex items-center gap-1 bg-zinc-900 p-1 rounded-md border border-zinc-800 text-xs">
              <button
                onClick={() => setPricingMode('retail')}
                class={`px-3 py-1 rounded font-medium transition-all ${
                  pricingMode() === 'retail'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Retail Rate
              </button>
              <button
                onClick={() => setPricingMode('wholesale')}
                class={`px-3 py-1 rounded font-medium transition-all ${
                  pricingMode() === 'wholesale'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Wholesale Rate
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
            
            {/* Left: Product Search & Quick Catalog (7 cols) */}
            <div class="lg:col-span-7 p-6 space-y-4">
              <div class="relative">
                <input
                  type="text"
                  placeholder="Search item name or scan barcode..."
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                  class="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                <For each={filteredCatalog()}>
                  {(item) => (
                    <button
                      onClick={() => addToBill(item)}
                      class="text-left p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 transition-all flex flex-col justify-between group active:scale-[0.98]"
                    >
                      <div>
                        <div class="text-xs font-semibold text-white group-hover:text-zinc-100 line-clamp-1">
                          {item.name}
                        </div>
                        <div class="text-[11px] text-zinc-500">{item.category}</div>
                      </div>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-xs font-mono font-bold text-zinc-200">
                          रू {pricingMode() === 'retail' ? item.priceRetail : item.priceWholesale}
                        </span>
                        <span class="text-[10px] uppercase font-mono text-zinc-400 group-hover:text-white">
                          + Add
                        </span>
                      </div>
                    </button>
                  )}
                </For>
              </div>

              <div class="text-[11px] text-zinc-500 font-mono pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                <span>Items in catalog: {catalog.length}</span>
                <span>Mode: {pricingMode().toUpperCase()}</span>
              </div>
            </div>

            {/* Right: Real-time Cashier Bill Paper Slip (5 cols) */}
            <div class="lg:col-span-5 p-6 flex flex-col justify-between bg-zinc-950/40 font-mono text-xs">
              <div>
                <div class="border-b border-zinc-800 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <div class="font-bold text-white text-sm">INVOICE #INV-0418</div>
                    <div class="text-zinc-500 text-[11px]">Date: {new Date().toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={() => setCart([])}
                    class="text-[11px] text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Clear Bill
                  </button>
                </div>

                <div class="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  <Show 
                    when={cart().length > 0} 
                    fallback={<div class="py-12 text-center text-zinc-600 font-sans text-xs">Bill is empty. Click any product on the left to add.</div>}
                  >
                    <For each={cart()}>
                      {(item) => (
                        <div class="flex items-center justify-between py-1.5 border-b border-zinc-900">
                          <div class="pr-2 flex-1">
                            <div class="text-zinc-200 line-clamp-1">{item.name}</div>
                            <div class="text-[10px] text-zinc-500">
                              रू {currentPrice(item)} × {item.qty}
                            </div>
                          </div>
                          <div class="flex items-center gap-3">
                            <div class="flex items-center gap-1 border border-zinc-800 rounded bg-zinc-900 px-1 py-0.5">
                              <button
                                onClick={() => updateQty(item.id, -1)}
                                class="px-1 text-zinc-400 hover:text-white"
                              >
                                −
                              </button>
                              <span class="px-1 text-white font-bold">{item.qty}</span>
                              <button
                                onClick={() => updateQty(item.id, 1)}
                                class="px-1 text-zinc-400 hover:text-white"
                              >
                                +
                              </button>
                            </div>
                            <span class="font-bold text-white w-16 text-right">
                              रू {currentPrice(item) * item.qty}
                            </span>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>

              {/* Bill Totals & Actions */}
              <div class="border-t border-zinc-800 pt-4 mt-4 space-y-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-zinc-400">Total Payable</span>
                  <span class="text-xl font-bold text-white font-mono">रू {totalBill()}</span>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-1 font-sans">
                  <button
                    onClick={() => setCurrentPage('auth')}
                    class="w-full py-2.5 px-3 bg-white text-black font-bold text-xs rounded hover:bg-zinc-200 transition-colors active:scale-95"
                  >
                    Complete Sale
                  </button>
                  <button
                    onClick={() => setCurrentPage('auth')}
                    class="w-full py-2.5 px-3 bg-zinc-900 text-zinc-300 border border-zinc-800 font-bold text-xs rounded hover:bg-zinc-800 hover:text-white transition-colors"
                  >
                    Add to Khata
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ─── INSIDE BYAPAR: DESIGNED FOR SHOP FLOOR SPEED (PURE RENDERED UI) ─── */}
      <section id="product" class="py-20 px-6 max-w-6xl mx-auto border-t border-zinc-800">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <p class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
              Inside Byapar
            </p>
            <h2 class="text-3xl sm:text-4xl font-heading font-black text-white tracking-tight">
              Designed for shop floor speed.
            </h2>
          </div>

          {/* Feature Tab Switcher */}
          <div class="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-medium self-start md:self-auto">
            <button
              onClick={() => setActiveTab('billing')}
              class={`px-4 py-2 rounded-md transition-all ${
                activeTab() === 'billing'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              01. POS & Thermal Bill
            </button>
            <button
              onClick={() => setActiveTab('khata')}
              class={`px-4 py-2 rounded-md transition-all ${
                activeTab() === 'khata'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              02. Khata & WhatsApp
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              class={`px-4 py-2 rounded-md transition-all ${
                activeTab() === 'inventory'
                  ? 'bg-zinc-800 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              03. Live Stock Alerts
            </button>
          </div>
        </div>

        {/* ─── TAB 1: POS BILLING & THERMAL RECEIPT VIEW ─── */}
        <Show when={activeTab() === 'billing'}>
          <div class="border border-zinc-800 bg-[#0d0d11] rounded-xl p-6 sm:p-8">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* POS Interface Highlights */}
              <div class="lg:col-span-6 space-y-6">
                <div>
                  <span class="text-xs font-mono text-zinc-500 uppercase tracking-widest">Fast Checkout Engine</span>
                  <h3 class="text-2xl font-heading font-bold text-white mt-1 mb-3">
                    2-second billing with thermal receipt printing.
                  </h3>
                  <p class="text-sm text-zinc-400 leading-relaxed">
                    Designed for fast-paced checkout queues. Cashiers can scan barcodes, apply wholesale discounts, and print bills to standard 58mm or 80mm Bluetooth & USB receipt printers without touching the mouse.
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div class="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
                    <div class="text-zinc-500 text-[10px]">KEYBOARD SHORTCUTS</div>
                    <div class="text-white font-bold mt-1">F1 New • F2 Cash • F3 QR</div>
                  </div>
                  <div class="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
                    <div class="text-zinc-500 text-[10px]">SPLIT PAYMENTS</div>
                    <div class="text-white font-bold mt-1">Cash + Fonepay + Khata</div>
                  </div>
                  <div class="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
                    <div class="text-zinc-500 text-[10px]">PRINTER COMPATIBILITY</div>
                    <div class="text-white font-bold mt-1">ESC/POS 58mm & 80mm</div>
                  </div>
                  <div class="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60">
                    <div class="text-zinc-500 text-[10px]">DISCOUNTS & TAX</div>
                    <div class="text-white font-bold mt-1">Auto VAT & Item Discount</div>
                  </div>
                </div>

                <div class="pt-2">
                  <button
                    onClick={() => {
                      setPrintedBill(true);
                      setTimeout(() => setPrintedBill(false), 3000);
                    }}
                    class="px-5 py-2.5 bg-white text-black hover:bg-zinc-200 font-bold text-xs rounded transition-all active:scale-95 flex items-center gap-2"
                  >
                    <span>{printedBill() ? '✓ Bill Sent to Thermal Spool' : '🖨️ Simulate Thermal Print'}</span>
                  </button>
                </div>
              </div>

              {/* Realistic Thermal Receipt Simulation */}
              <div class="lg:col-span-6 flex justify-center">
                <div class="w-full max-w-sm bg-white text-black font-mono text-[11px] p-6 rounded-md shadow-2xl space-y-3 border-t-4 border-black">
                  <div class="text-center space-y-0.5 border-b border-dashed border-zinc-400 pb-3">
                    <div class="font-black text-sm tracking-wider">BYAPAR STORE</div>
                    <div class="text-[10px] text-zinc-600">New Road, Ward 22, Kathmandu</div>
                    <div class="text-[10px] text-zinc-600">PAN: 609812453 • Tel: 01-4234567</div>
                    <div class="text-[10px] text-zinc-800 font-bold pt-1">CASH SALES INVOICE</div>
                  </div>

                  <div class="flex justify-between text-[10px] text-zinc-600 border-b border-dashed border-zinc-300 pb-2">
                    <span>Bill: #INV-2081-0842</span>
                    <span>{new Date().toLocaleDateString()} 16:42</span>
                  </div>

                  <div class="space-y-1.5 border-b border-dashed border-zinc-400 pb-3">
                    <div class="flex justify-between font-bold text-[10px] text-zinc-500">
                      <span>ITEM</span>
                      <span>QTY × RATE</span>
                      <span>AMT</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="truncate max-w-[140px]">Wai Wai Chicken 75g</span>
                      <span>6 × 25</span>
                      <span class="font-bold">150.00</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="truncate max-w-[140px]">Fortune Sunlite Oil 1L</span>
                      <span>2 × 280</span>
                      <span class="font-bold">560.00</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="truncate max-w-[140px]">Amul Salted Butter 100g</span>
                      <span>1 × 110</span>
                      <span class="font-bold">110.00</span>
                    </div>
                  </div>

                  <div class="space-y-1 pt-1 text-xs">
                    <div class="flex justify-between">
                      <span>Subtotal:</span>
                      <span>रू 820.00</span>
                    </div>
                    <div class="flex justify-between text-zinc-600 text-[10px]">
                      <span>VAT (13%):</span>
                      <span>Included</span>
                    </div>
                    <div class="flex justify-between font-black text-sm border-t border-black pt-1">
                      <span>GRAND TOTAL:</span>
                      <span>रू 820.00</span>
                    </div>
                    <div class="flex justify-between text-[10px] text-zinc-600 pt-1">
                      <span>Paid via: Fonepay QR</span>
                      <span>Tendered: 820.00</span>
                    </div>
                  </div>

                  <div class="border-t border-dashed border-zinc-400 pt-3 text-center text-[10px] text-zinc-600 space-y-1">
                    <div class="font-bold text-black">धन्यवाद! पुन: पधार्नुहोला</div>
                    <div>Byapar Cloud POS System</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </Show>

        {/* ─── TAB 2: KHATA CUSTOMER LEDGER VIEW ─── */}
        <Show when={activeTab() === 'khata'}>
          <div class="border border-zinc-800 bg-[#0d0d11] rounded-xl p-6 sm:p-8 space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h3 class="text-xl font-heading font-bold text-white">Party Udhar Ledger (खता)</h3>
                <p class="text-xs text-zinc-400 mt-0.5">Track every customer balance with automated 1-click WhatsApp payment links.</p>
              </div>
              <div class="text-right">
                <span class="text-[10px] font-mono uppercase text-zinc-500 block">Total Outstanding Debt</span>
                <span class="text-lg font-mono font-black text-white">रू 19,400.00</span>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-mono">
                <thead>
                  <tr class="border-b border-zinc-800 text-zinc-500 text-[11px]">
                    <th class="py-2.5">CUSTOMER / PARTY</th>
                    <th class="py-2.5">CONTACT</th>
                    <th class="py-2.5">STATUS</th>
                    <th class="py-2.5 text-right">TOTAL DUE</th>
                    <th class="py-2.5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-900">
                  <For each={khataCustomers}>
                    {(customer) => (
                      <tr class="hover:bg-zinc-900/40 transition-colors">
                        <td class="py-3 font-medium text-white font-sans">{customer.name}</td>
                        <td class="py-3 text-zinc-400">{customer.phone}</td>
                        <td class="py-3">
                          <span class={`px-2 py-0.5 rounded text-[10px] uppercase ${
                            customer.status === 'overdue' 
                              ? 'bg-zinc-800 text-white font-bold border border-zinc-700' 
                              : 'bg-zinc-900 text-zinc-400'
                          }`}>
                            {customer.days} days due
                          </span>
                        </td>
                        <td class="py-3 text-right font-bold text-white">रू {customer.balance}</td>
                        <td class="py-3 text-right">
                          <button
                            onClick={() => triggerWhatsApp(customer.name, customer.balance)}
                            class="px-3 py-1 bg-white hover:bg-zinc-200 text-black font-sans font-bold text-[11px] rounded transition-all active:scale-95"
                          >
                            Send WhatsApp
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>

            <div class="p-4 rounded-lg border border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div class="text-zinc-400">
                <strong class="text-white">Dispute-Free Settlements:</strong> Download itemized PDF statements showing invoice numbers and timestamps.
              </div>
              <button
                onClick={() => setWhatsAppNotice('Sample statement PDF generated')}
                class="px-4 py-2 border border-zinc-700 hover:border-white text-white rounded text-xs font-bold transition-colors whitespace-nowrap"
              >
                Download Statement PDF
              </button>
            </div>
          </div>
        </Show>

        {/* ─── TAB 3: LIVE STOCK & INVENTORY ALERTS VIEW ─── */}
        <Show when={activeTab() === 'inventory'}>
          <div class="border border-zinc-800 bg-[#0d0d11] rounded-xl p-6 sm:p-8 space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h3 class="text-xl font-heading font-bold text-white">Real-Time Inventory Control</h3>
                <p class="text-xs text-zinc-400 mt-0.5">Stock deductions happen live on bill generation. Instant warnings for low stock and near expiry.</p>
              </div>

              {/* Filter Buttons */}
              <div class="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800 text-xs">
                <button
                  onClick={() => setStockFilter('all')}
                  class={`px-3 py-1 rounded transition-all ${stockFilter() === 'all' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setStockFilter('low')}
                  class={`px-3 py-1 rounded transition-all ${stockFilter() === 'low' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => setStockFilter('expiring')}
                  class={`px-3 py-1 rounded transition-all ${stockFilter() === 'expiring' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400'}`}
                >
                  Expiring Soon
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-mono">
                <thead>
                  <tr class="border-b border-zinc-800 text-zinc-500 text-[11px]">
                    <th class="py-2.5">PRODUCT NAME</th>
                    <th class="py-2.5">SKU CODE</th>
                    <th class="py-2.5">CATEGORY</th>
                    <th class="py-2.5 text-right">STOCK UNITS</th>
                    <th class="py-2.5 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-900">
                  <For each={filteredInventory()}>
                    {(item) => (
                      <tr class="hover:bg-zinc-900/40 transition-colors">
                        <td class="py-3 font-medium text-white font-sans">{item.name}</td>
                        <td class="py-3 text-zinc-400">{item.sku}</td>
                        <td class="py-3 text-zinc-500">{item.category}</td>
                        <td class="py-3 text-right font-bold text-white">{item.stock} Units</td>
                        <td class="py-3 text-right">
                          <span class={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            item.alert === 'Low Stock' 
                              ? 'bg-white text-black' 
                              : item.alert.includes('Expires')
                              ? 'bg-zinc-800 text-white border border-zinc-600'
                              : 'text-zinc-500'
                          }`}>
                            {item.alert}
                          </span>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>

      </section>

      {/* ─── KHATA & WHATSAPP FEATURE SPOTLIGHT ─── */}
      <section id="khata" class="py-20 px-6 max-w-6xl mx-auto border-t border-zinc-800">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div class="lg:col-span-6 space-y-6">
            <p class="text-xs font-mono uppercase tracking-widest text-zinc-500">
              Recover Credit Faster
            </p>
            <h2 class="text-3xl sm:text-5xl font-heading font-black text-white tracking-tight leading-tight">
              Stop awkward phone calls for overdue udhar.
            </h2>
            <p class="text-zinc-400 leading-relaxed font-normal">
              Nepali shopkeepers lose thousands every year because paper notebooks tear, handwriting is lost, or customers forget their balance. Byapar logs every credit transaction with the exact date, items, and total.
            </p>

            <ul class="space-y-3 text-sm text-zinc-300">
              <li class="flex items-start gap-3">
                <span class="text-white font-mono font-bold">01.</span>
                <span>Send a polite WhatsApp reminder with exact itemized balance and your Fonepay QR code link.</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-white font-mono font-bold">02.</span>
                <span>Set credit limits per customer so debts never exceed what you are comfortable lending.</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-white font-mono font-bold">03.</span>
                <span>Download and print clean PDF account statements for dispute-free settlements.</span>
              </li>
            </ul>
          </div>

          {/* Interactive WhatsApp Reminder Message Preview */}
          <div class="lg:col-span-6 border border-zinc-800 bg-[#0d0d11] p-6 rounded-xl space-y-4">
            <div class="text-xs font-mono text-zinc-400 flex items-center justify-between pb-3 border-b border-zinc-800">
              <span>PREVIEW: AUTOMATED WHATSAPP MESSAGE</span>
              <span class="text-zinc-500">Party: Ramesh Khadka</span>
            </div>

            <div class="bg-zinc-950 p-4 rounded-lg border border-zinc-800/80 text-xs font-mono space-y-2 text-zinc-300 leading-relaxed">
              <p class="text-white font-bold">नमस्ते Ramesh जी,</p>
              <p>तपाईको यस Byapar Store मा बाँकी हिसाब:</p>
              <div class="p-3 bg-zinc-900 rounded border border-zinc-800 font-bold text-white text-sm flex items-center justify-between">
                <span>Total Baki Balance</span>
                <span>रू ३,४५०.००</span>
              </div>
              <p class="text-zinc-400 text-[11px]">
                Fonepay QR वा eSewa बाट सजिलै भुक्तानी गर्न यो लिंक खोल्नुहोस्: <span class="text-white underline">https://pay.byapar.np/qr/s82k</span>
              </p>
              <p class="text-zinc-500 text-[10px]">
                कृपया भुक्तानी भएपछि जानकारी दिनुहोला। धन्यवाद!
              </p>
            </div>

            <div class="pt-2">
              <button
                onClick={() => {
                  setWhatsAppNotice('WhatsApp reminder delivered to 9841******');
                  setTimeout(() => setWhatsAppNotice(null), 3000);
                }}
                class="w-full py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-bold rounded transition-colors active:scale-95"
              >
                Send Test WhatsApp Reminder
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ─── REAL REASONS SHOPKEEPERS SWITCH (PRACTICAL GRID) ─── */}
      <section class="py-20 px-6 max-w-6xl mx-auto border-t border-zinc-800">
        <div class="max-w-xl mb-12">
          <p class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Practical Benefits
          </p>
          <h2 class="text-3xl sm:text-4xl font-heading font-black text-white tracking-tight">
            Why Byapar replaces spreadsheets and register books.
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-6 border border-zinc-800 bg-[#0d0d11] rounded-xl space-y-2.5">
            <div class="font-mono text-xs text-zinc-500">01 / SPEED</div>
            <h3 class="text-lg font-bold text-white">Faster Than A Calculator</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              Scan barcode or type initials. Byapar handles discounts, VAT, and change calculation automatically.
            </p>
          </div>

          <div class="p-6 border border-zinc-800 bg-[#0d0d11] rounded-xl space-y-2.5">
            <div class="font-mono text-xs text-zinc-500">02 / CLOUD</div>
            <h3 class="text-lg font-bold text-white">Live Cloud Sync</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              Your staff issues bills at the shop computer, while you check daily profit and stock levels on your phone from anywhere.
            </p>
          </div>

          <div class="p-6 border border-zinc-800 bg-[#0d0d11] rounded-xl space-y-2.5">
            <div class="font-mono text-xs text-zinc-500">03 / HARDWARE</div>
            <h3 class="text-lg font-bold text-white">Standard Printer Ready</h3>
            <p class="text-xs text-zinc-400 leading-relaxed">
              Plug in any standard Bluetooth or USB thermal receipt printer (58mm or 80mm). No custom drivers or locked hardware.
            </p>
          </div>
        </div>
      </section>

      {/* ─── COMPACT FAQ PREVIEW SECTION ─── */}
      <section id="faq" class="py-20 px-6 max-w-4xl mx-auto border-t border-zinc-800 space-y-8">
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Common Questions</p>
            <h2 class="text-3xl font-heading font-black text-white tracking-tight">Frequently Asked Questions</h2>
          </div>
          <button
            onClick={() => setCurrentPage('faq')}
            class="text-xs font-bold text-white hover:text-zinc-300 flex items-center gap-1.5 transition-colors self-start sm:self-auto font-mono"
          >
            <span>See all FAQs</span>
            <span>→</span>
          </button>
        </div>

        <div class="space-y-3">
          <For each={previewFaqs}>
            {(faq, idx) => (
              <div class="border border-zinc-800 bg-[#0d0d11] rounded-xl overflow-hidden transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq() === idx() ? null : idx())}
                  class="w-full text-left p-5 flex items-center justify-between font-heading font-bold text-sm sm:text-base text-white hover:text-zinc-200 transition-colors"
                >
                  <span class="pr-4">{faq.q}</span>
                  <span class="font-mono text-zinc-400 text-lg shrink-0">
                    {openFaq() === idx() ? '−' : '+'}
                  </span>
                </button>

                <Show when={openFaq() === idx()}>
                  <div class="px-5 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                    {faq.a}
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        <div class="pt-2 text-center">
          <button
            onClick={() => setCurrentPage('faq')}
            class="px-6 py-2.5 rounded-md border border-zinc-700 hover:border-white text-white text-xs font-bold transition-all hover:bg-zinc-900 active:scale-95"
          >
            View All Questions & Answers →
          </button>
        </div>
      </section>

      {/* ─── CLOSING CTA ─── */}
      <section class="py-24 px-6 max-w-4xl mx-auto text-center border-t border-zinc-800">
        <h2 class="text-4xl sm:text-5xl font-heading font-black text-white tracking-tight mb-4">
          Set up your shop in 2 minutes.
        </h2>
        <p class="text-zinc-400 text-sm sm:text-base max-w-md mx-auto mb-8 font-normal">
          No credit card needed. Free forever for single-counter stores.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => setCurrentPage('auth')}
            class="px-8 py-3.5 bg-white text-black hover:bg-zinc-200 font-heading font-bold text-sm rounded-md transition-all active:scale-95"
          >
            Create Free Store Account →
          </button>
          <a
            href="/byapar.apk"
            download="byapar.apk"
            class="px-6 py-3.5 bg-zinc-900 text-zinc-200 hover:text-white border border-zinc-800 font-heading font-semibold text-sm rounded-md transition-all flex items-center gap-2"
          >
            <svg class="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0001 0-.5516.4482-1.0001.9993-1.0001.5516 0 1.0002.4485 1.0002 1.0001 0 .5515-.4486 1.0001-1.0002 1.0001m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0001 0-.5516.4482-1.0001.9993-1.0001.5516 0 1.0001.4485 1.0001 1.0001 0 .5515-.4485 1.0001-1.0001 1.0001m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.0818 12 8.0818c-1.8538 0-3.5907.3298-5.1368.8678L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.689-7.5743-6.1185-9.4396" />
            </svg>
            <span>Download APK</span>
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer class="py-12 px-6 border-t border-zinc-800 text-xs text-zinc-500 font-mono">
        <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span class="font-bold text-zinc-300">Byapar</span> • Smart Business Management for Nepal MSMEs
          </div>
          <div class="flex flex-wrap items-center justify-center gap-6">
            <button onClick={() => setCurrentPage('about')} class="hover:text-white transition-colors">About Us</button>
            <button onClick={() => setCurrentPage('faq')} class="hover:text-white transition-colors">FAQs</button>
            <button onClick={() => setCurrentPage('privacy')} class="hover:text-white transition-colors">Privacy Policy</button>
            <button onClick={() => setCurrentPage('terms')} class="hover:text-white transition-colors">Terms of Service</button>
            <a
              href="/byapar.apk"
              download="byapar.apk"
              class="hover:text-white transition-colors flex items-center gap-1"
            >
              <span>Download APK</span>
            </a>
            <button
              onClick={() => setCurrentPage('auth')}
              class="hover:text-white transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
