import { createSignal, onSettled, Show, For } from 'solid-js';
import { setCurrentPage } from '../../db/localDb';
import {
  SubscriptionPlan,
  fetchSubscriptionPlans,
  DEFAULT_PLANS,
} from '../../services/subscriptionService';

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
  const [openFaq, setOpenFaq] = createSignal<number | null>(null);
  const [waitlistEmail, setWaitlistEmail] = createSignal('');
  const [waitlistSubmitted, setWaitlistSubmitted] = createSignal(false);
  const [plans, setPlans] = createSignal<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [planCycle, setPlanCycle] = createSignal<'monthly' | 'annual'>('monthly');

  // ─── DATA ───
  const previewFaqs = [
    {
      q: 'Is Byapar really free for single-counter shops?',
      a: 'Yes, Byapar is 100% free for single-counter stores. Unlimited items, unlimited bills, Khata debts, and real-time cloud sync with zero hidden charges.',
    },
    {
      q: 'Can I print on regular 58mm or 80mm thermal printers?',
      a: 'Yes. Byapar supports all standard ESC/POS Bluetooth and USB thermal receipt printers. No proprietary drivers or locked hardware required.',
    },
    {
      q: 'How do WhatsApp Khata reminders work?',
      a: "Clicking Send WhatsApp drafts a polite Nepali message with the customer\u2019s exact balance and your Fonepay QR payment link so they can settle from their phone.",
    },
    {
      q: 'Can I use it on my phone and shop laptop together?',
      a: 'Yes. Everything syncs to your secure cloud database in real time. Staff can bill on the shop PC while you check profit on your phone from anywhere.',
    },
    {
      q: 'What happens if my internet goes down?',
      a: 'Byapar works fully offline. All data syncs automatically when your connection returns. No transactions are ever lost.',
    },
  ];

  const catalog = [
    { id: '1', name: 'Wai Wai Quick Chicken 75g', category: 'Noodles', priceRetail: 25, priceWholesale: 22 },
    { id: '2', name: 'Fortune Sunlite Sunflower Oil 1L', category: 'Oil & Ghee', priceRetail: 280, priceWholesale: 260 },
    { id: '3', name: 'Amul Salted Butter 100g', category: 'Dairy', priceRetail: 110, priceWholesale: 102 },
    { id: '4', name: 'Tokla Gold Leaf Tea 500g', category: 'Beverages', priceRetail: 340, priceWholesale: 315 },
    { id: '5', name: 'Dettol Original Soap 75g', category: 'Personal Care', priceRetail: 55, priceWholesale: 48 },
    { id: '6', name: 'Dawaat Basmati Rice 20kg', category: 'Grains', priceRetail: 2850, priceWholesale: 2650 },
  ];

  const [cart, setCart] = createSignal<CartItem[]>([
    { id: '1', name: 'Wai Wai Quick Chicken 75g', category: 'Noodles', priceRetail: 25, priceWholesale: 22, qty: 6 },
    { id: '2', name: 'Fortune Sunlite Sunflower Oil 1L', category: 'Oil & Ghee', priceRetail: 280, priceWholesale: 260, qty: 2 },
  ]);

  const khataCustomers = [
    { name: 'Ramesh Bahadur Shrestha', phone: '9841234567', balance: 4500, days: 4, status: 'overdue' },
    { name: 'Sita Devi Koirala', phone: '9851098765', balance: 1850, days: 1, status: 'recent' },
    { name: 'Bikram Thapa (Kirana Mart)', phone: '9803112233', balance: 12400, days: 8, status: 'overdue' },
    { name: 'Gita Sharma', phone: '9847665544', balance: 650, days: 2, status: 'recent' },
  ];

  const inventoryItems = [
    { name: 'Wai Wai Quick Chicken 75g', sku: 'WW-CHK-75', category: 'Noodles', stock: 4, alert: 'Low Stock', daysExp: 140 },
    { name: 'Amul Salted Butter 100g', sku: 'AML-BTR-100', category: 'Dairy', stock: 8, alert: 'Expires in 12 Days', daysExp: 12 },
    { name: 'Fortune Sunflower Oil 1L', sku: 'FTN-OIL-1L', category: 'Oil & Ghee', stock: 48, alert: 'Normal', daysExp: 220 },
    { name: 'Tokla Gold Leaf Tea 500g', sku: 'TKL-TEA-500', category: 'Beverages', stock: 26, alert: 'Normal', daysExp: 310 },
    { name: 'Dettol Original Soap 75g', sku: 'DTL-SP-75', category: 'Personal Care', stock: 3, alert: 'Low Stock', daysExp: 450 },
    { name: 'Dawaat Basmati Rice 20kg', sku: 'DWT-RC-20', category: 'Grains', stock: 15, alert: 'Normal', daysExp: 365 },
  ];

  // Horizontal scenario cards — spec: 288x160, timestamp top-left, text bottom
  const scenarioCards = [
    { time: '7:00 AM', text: 'Open shop, sync inventory', accent: '#E8EFE8' },
    { time: '8:30 AM', text: 'First customer, scan & bill', accent: '#FFB7B2' },
    { time: '10:15 AM', text: 'Wholesale order, bulk pricing', accent: '#EFEDF4' },
    { time: '1:00 PM', text: 'Check low stock alerts', accent: '#FFE4E1' },
    { time: '4:30 PM', text: 'Send WhatsApp reminders', accent: '#E8EFE8' },
    { time: '7:00 PM', text: 'Review daily profit report', accent: '#EFEDF4' },
    { time: '9:00 PM', text: 'Close register, auto-backup', accent: '#FFB7B2' },
  ];

  // Testimonials — diary-entry style
  const testimonials = [
    {
      quote: 'My old register notebook got soaked in monsoon rain. Lost 3 months of udhar records. With Byapar, everything is in the cloud now. Peace of mind.',
      name: 'Rajesh Shrestha',
      shop: 'Shrestha Kirana, Patan',
    },
    {
      quote: 'Customers used to argue about their balance. Now I just show them the screen. No fights, no awkwardness. WhatsApp reminder is genius.',
      name: 'Sunita Tamang',
      shop: 'Sunita General Store, Bhaktapur',
    },
    {
      quote: 'I check my shop profit from my phone while having tea at home. My staff handles billing, I see everything live. Best decision I made.',
      name: 'Hari Bahadur KC',
      shop: 'KC Mart, Kalimati',
    },
    {
      quote: 'Thermal printing was so fast my customers were surprised. No more writing bills by hand. Byapar paid for itself on day one.',
      name: 'Anita Gurung',
      shop: 'Gurung Provision, Pokhara',
    },
  ];

  // ─── LOGIC ───
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
      (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  };

  const filteredInventory = () => {
    if (stockFilter() === 'low') return inventoryItems.filter(i => i.stock < 10);
    if (stockFilter() === 'expiring') return inventoryItems.filter(i => i.daysExp <= 30);
    return inventoryItems;
  };

  const triggerWhatsApp = (name: string, amt: number) => {
    setWhatsAppNotice(`WhatsApp reminder sent to ${name} for रु ${amt}`);
    setTimeout(() => setWhatsAppNotice(null), 3500);
  };

  const handleWaitlist = (e: Event) => {
    e.preventDefault();
    if (waitlistEmail().trim()) {
      setWaitlistSubmitted(true);
      setTimeout(() => {
        setCurrentPage('auth');
      }, 1500);
    }
  };

  // ─── LIFECYCLE ───
  onSettled(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });

    fetchSubscriptionPlans()
      .then((livePlans) => {
        if (livePlans && livePlans.length > 0) {
          setPlans(livePlans);
        }
      })
      .catch((err) => console.warn('Could not load live plans:', err));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.softly-reveal').forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  });

  return (
    <div class="min-h-screen bg-[#FDFCF8] text-[#292524] font-sans antialiased selection:bg-[#FFB7B2]/30 softly-page relative overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════
          GRAIN OVERLAY — spec: z-50, mix-blend-mode overlay, 0.35 opacity
          ═══════════════════════════════════════════════════ */}
      <div class="softly-grain" aria-hidden="true">
        <svg>
          <filter id="softlyNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#softlyNoise)" />
        </svg>
      </div>

      {/* ═══════════════════════════════════════════════════
          TOAST
          ═══════════════════════════════════════════════════ */}
      <Show when={whatsAppNotice()}>
        <div class="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-white/90 backdrop-blur-md text-[#292524] px-5 py-2.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 animate-fade-in border border-[#FFB7B2]/30">
          <span class="w-2 h-2 rounded-full bg-[#FFB7B2] animate-pulse" />
          <span>{whatsAppNotice()}</span>
        </div>
      </Show>

      {/* ═══════════════════════════════════════════════════
          NAVIGATION — spec: floating pill, 70% white opacity, 20px backdrop-blur,
          coral circle logo with white dot, dark stone #292524 pill CTA
          ═══════════════════════════════════════════════════ */}
      <header
        class={`fixed top-3 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 rounded-full px-2 sm:px-4 py-2 ${
          scrolled()
            ? 'bg-white/70 backdrop-blur-[20px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-stone-200/50'
            : 'bg-white/70 backdrop-blur-[20px] border border-transparent'
        }`}
        style={{ width: 'calc(100% - 32px)', 'max-width': '720px' }}
      >
        <div class="flex items-center justify-between">
          {/* Logo — spec: small circular coral with white dot */}
          <div
            class="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div class="w-7 h-7 rounded-full bg-[#FFB7B2] flex items-center justify-center shadow-sm">
              <div class="w-2 h-2 rounded-full bg-white" />
            </div>
            <span class="font-heading font-semibold text-sm text-[#292524] tracking-tight">
              Byapar
            </span>
          </div>

          {/* Text links — spec: 14px Outfit Medium */}
          <nav class="hidden md:flex items-center gap-1">
            <a href="#scenarios" class="px-3 py-1.5 text-sm font-medium text-[#78716C] hover:text-[#292524] rounded-full transition-colors font-heading">Features</a>
            <a href="#interactive" class="px-3 py-1.5 text-sm font-medium text-[#78716C] hover:text-[#292524] rounded-full transition-colors font-heading">Demo</a>
            <a href="#pricing" class="px-3 py-1.5 text-sm font-medium text-[#78716C] hover:text-[#292524] rounded-full transition-colors font-heading">Pricing</a>
            <a href="#faq" class="px-3 py-1.5 text-sm font-medium text-[#78716C] hover:text-[#292524] rounded-full transition-colors font-heading">FAQ</a>
            <a href="#contact" class="px-3 py-1.5 text-sm font-medium text-[#78716C] hover:text-[#292524] rounded-full transition-colors font-heading">Contact</a>
          </nav>

          {/* CTA — spec: dark stone #292524 pill button */}
          <button
            onClick={() => setCurrentPage('auth')}
            class="text-xs sm:text-sm font-heading font-semibold text-white bg-[#292524] hover:bg-[#1c1917] px-5 py-2 rounded-full transition-all active:scale-95"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          HERO — spec: center-aligned, two large blurred blobs (#FFE4E1, #E6E6FA) at 60%,
          72px Outfit headline with cursive word inline, sub-headline max-w-500px,
          primary coral pill CTA with shadow, secondary white pill with 1px stone-200 border
          ═══════════════════════════════════════════════════ */}
      <section class="relative pt-32 sm:pt-40 pb-20 px-6">
        {/* Background blobs — spec: #FFE4E1 and #E6E6FA at 60% opacity */}
        <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            class="softly-blob absolute -top-20 left-1/4 w-[420px] h-[420px] opacity-60"
            style={{ background: '#FFE4E1', filter: 'blur(100px)' }}
          />
          <div
            class="softly-blob-reverse absolute top-32 right-1/4 w-[380px] h-[380px] opacity-60"
            style={{ background: '#E6E6FA', filter: 'blur(100px)' }}
          />
        </div>

        <div class="relative max-w-2xl mx-auto text-center softly-reveal">
          {/* Headline — spec: 72px Outfit, cursive word inserted for emphasis */}
          <h1 class="text-5xl sm:text-6xl md:text-[72px] font-heading font-extrabold text-[#292524] leading-[1.05] tracking-tight mb-5">
            Run your shop{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-2deg] relative -top-1">
              beautifully
            </span>
          </h1>

          {/* Sub-headline — spec: max-width 500px */}
          <p class="text-base sm:text-lg text-[#78716C] leading-relaxed mb-9 max-w-[500px] mx-auto">
            Ultra-fast billing, digital credit ledger with WhatsApp reminders, and real-time cloud sync for Nepali retail owners. Free forever.
          </p>

          {/* Dual CTAs — spec: primary coral pill with soft shadow, secondary white pill with 1px stone-200 border */}
          <div class="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setCurrentPage('auth')}
              class="px-7 py-3.5 bg-[#FFB7B2] hover:bg-[#E8948E] text-white font-heading font-semibold text-sm rounded-full transition-all active:scale-95 shadow-[0_4px_20px_-2px_rgba(255,183,178,0.4)] softly-cta-scale"
            >
              Start using Byapar
            </button>
            <a
              href="/byapar.apk"
              download="byapar.apk"
              class="px-6 py-3.5 bg-white text-[#292524] border border-stone-200 font-heading font-medium text-sm rounded-full transition-all flex items-center gap-2 active:scale-95 hover:border-stone-300 softly-cta-scale"
            >
              <svg class="w-4 h-4 text-[#78716C]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0001 0-.5516.4482-1.0001.9993-1.0001.5516 0 1.0002.4485 1.0002 1.0001 0 .5515-.4486 1.0001-1.0002 1.0001m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0001 0-.5516.4482-1.0001.9993-1.0001.5516 0 1.0001.4485 1.0001 1.0001 0 .5515-.4485 1.0001-1.0001 1.0001m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.0818 12 8.0818c-1.8538 0-3.5907.3298-5.1368.8678L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.689-7.5743-6.1185-9.4396" />
              </svg>
              <span>Download APK</span>
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          HORIZONTAL SCENARIO SCROLL — spec: 288x160px cards, white bg, rounded-3xl,
          timestamp 14px stone-400 top-left, text 20px stone-800 bottom,
          hover text changes to pastel accent
          ═══════════════════════════════════════════════════ */}
      <section id="scenarios" class="py-16 softly-reveal">
        <div class="max-w-3xl mx-auto px-6 mb-6">
          <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524] tracking-tight text-center">
            A day with{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-1deg]">Byapar</span>
          </h2>
        </div>

        <div class="overflow-x-auto scrollbar-hide pb-4 px-6">
          <div class="flex gap-4 min-w-max mx-auto" style={{ 'max-width': 'fit-content' }}>
            <For each={scenarioCards}>
              {(card) => (
                <div
                  class="scenario-card w-72 h-40 bg-white rounded-3xl p-6 flex flex-col justify-between cursor-default softly-card border border-stone-100"
                  style={{ 'min-width': '288px', 'min-height': '160px' }}
                >
                  <span class="text-sm text-stone-400 font-heading font-medium">{card.time}</span>
                  <span class="scenario-text text-xl text-stone-800 font-heading font-semibold leading-snug transition-colors duration-300">
                    {card.text}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          APP EXPERIENCE PREVIEW — spec: 3 stacked phone mockups
          Center: 300x620, full opacity, coral pulsing button
          Left: 280x580, 80% opacity, translated +48px
          Right: 280x580, 80% opacity, translated +96px
          Screen backgrounds: Sage #E8EFE8 and Lavender #EFEDF4
          ═══════════════════════════════════════════════════ */}
      <section class="py-20 px-6 softly-reveal overflow-hidden">
        <div class="max-w-3xl mx-auto text-center mb-12">
          <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524] tracking-tight">
            Your shop,{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-1deg]">in your pocket</span>
          </h2>
          <p class="text-sm text-[#78716C] mt-2 max-w-md mx-auto">
            Bill on the counter, check profit on your phone, send reminders on the go.
          </p>
        </div>

        <div class="flex items-end justify-center gap-4 sm:gap-6 relative">
          {/* Left phone — spec: 280x580, 80%, +48px */}
          <div
            class="hidden sm:flex flex-col rounded-[2rem] border-2 border-stone-200/60 overflow-hidden shadow-lg flex-shrink-0"
            style={{ width: '240px', height: '500px', opacity: '0.8', transform: 'translateY(48px)' }}
          >
            <div class="bg-[#E8EFE8] flex-1 p-5 flex flex-col justify-between">
              <div>
                <div class="text-[10px] text-stone-400 font-heading uppercase tracking-widest mb-3">Inventory</div>
                <div class="space-y-2">
                  <div class="bg-white/70 rounded-xl p-3 text-xs text-stone-700 font-medium">Wai Wai Chicken <span class="float-right text-stone-400">4 left</span></div>
                  <div class="bg-white/70 rounded-xl p-3 text-xs text-stone-700 font-medium">Amul Butter <span class="float-right text-[#FFB7B2]">Low!</span></div>
                  <div class="bg-white/70 rounded-xl p-3 text-xs text-stone-700 font-medium">Fortune Oil 1L <span class="float-right text-stone-400">48</span></div>
                  <div class="bg-white/70 rounded-xl p-3 text-xs text-stone-700 font-medium">Dettol Soap <span class="float-right text-[#FFB7B2]">Low!</span></div>
                </div>
              </div>
              <div class="bg-white/80 rounded-2xl p-3 text-center text-xs text-stone-500 font-heading">6 items tracked</div>
            </div>
          </div>

          {/* Center phone — spec: 300x620, full opacity, coral pulsing button */}
          <div
            class="flex flex-col rounded-[2rem] border-2 border-stone-200 overflow-hidden shadow-2xl flex-shrink-0 relative z-10"
            style={{ width: '280px', height: '560px' }}
          >
            <div class="bg-[#FDFCF8] flex-1 p-5 flex flex-col">
              {/* Status bar mockup */}
              <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] text-stone-400 font-mono">9:41</span>
                <div class="flex gap-1">
                  <div class="w-3 h-1.5 rounded-sm bg-stone-300" />
                  <div class="w-1.5 h-1.5 rounded-full bg-stone-300" />
                </div>
              </div>

              <div class="text-xs text-stone-400 font-heading uppercase tracking-widest mb-1">Quick Bill</div>
              <div class="text-lg font-heading font-bold text-[#292524] mb-4">Today's Register</div>

              {/* Mini bill items */}
              <div class="space-y-2 flex-1">
                <div class="bg-white rounded-xl p-3 flex justify-between text-xs border border-stone-100">
                  <span class="text-stone-700 font-medium">Wai Wai × 6</span>
                  <span class="text-stone-800 font-bold">रु 150</span>
                </div>
                <div class="bg-white rounded-xl p-3 flex justify-between text-xs border border-stone-100">
                  <span class="text-stone-700 font-medium">Fortune Oil × 2</span>
                  <span class="text-stone-800 font-bold">रु 560</span>
                </div>
                <div class="bg-white rounded-xl p-3 flex justify-between text-xs border border-stone-100">
                  <span class="text-stone-700 font-medium">Amul Butter × 1</span>
                  <span class="text-stone-800 font-bold">रु 110</span>
                </div>

                <div class="border-t border-dashed border-stone-200 pt-3 mt-3 flex justify-between text-sm px-1">
                  <span class="text-stone-500 font-medium">Total</span>
                  <span class="text-[#292524] font-heading font-bold">रु 820</span>
                </div>
              </div>

              {/* Pulsing CTA button — spec: coral pulsing */}
              <button class="breathe-pulse w-full py-3.5 bg-[#FFB7B2] text-white rounded-2xl font-heading font-semibold text-sm mt-4 shadow-md shadow-[#FFB7B2]/30">
                Complete Sale
              </button>
            </div>
          </div>

          {/* Right phone — spec: 280x580, 80%, +96px */}
          <div
            class="hidden sm:flex flex-col rounded-[2rem] border-2 border-stone-200/60 overflow-hidden shadow-lg flex-shrink-0"
            style={{ width: '240px', height: '500px', opacity: '0.8', transform: 'translateY(96px)' }}
          >
            <div class="bg-[#EFEDF4] flex-1 p-5 flex flex-col justify-between">
              <div>
                <div class="text-[10px] text-stone-400 font-heading uppercase tracking-widest mb-3">Khata Ledger</div>
                <div class="space-y-2">
                  <div class="bg-white/70 rounded-xl p-3 text-xs">
                    <div class="text-stone-700 font-medium">Ramesh Shrestha</div>
                    <div class="text-[#FFB7B2] font-bold mt-0.5">रु 4,500 due</div>
                  </div>
                  <div class="bg-white/70 rounded-xl p-3 text-xs">
                    <div class="text-stone-700 font-medium">Sita Koirala</div>
                    <div class="text-stone-400 font-bold mt-0.5">रु 1,850 due</div>
                  </div>
                  <div class="bg-white/70 rounded-xl p-3 text-xs">
                    <div class="text-stone-700 font-medium">Bikram Thapa</div>
                    <div class="text-[#FFB7B2] font-bold mt-0.5">रु 12,400 due</div>
                  </div>
                </div>
              </div>
              <div class="bg-white/80 rounded-2xl p-3 text-center text-xs text-stone-500 font-heading">
                Total: रु 19,400
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          INTERACTIVE REGISTER DEMO (preserved existing functionality)
          ═══════════════════════════════════════════════════ */}
      <section id="interactive" class="py-16 px-6 max-w-5xl mx-auto softly-reveal">
        <div class="text-center mb-10">
          <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524] tracking-tight">
            Try the{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-1deg]">live register</span>
          </h2>
          <p class="text-sm text-[#78716C] mt-2 max-w-md mx-auto">
            Click products to add them to your bill. Toggle retail or wholesale pricing.
          </p>
        </div>

        <div class="bg-white rounded-[2rem] border border-stone-100 overflow-hidden softly-card">
          {/* Register Header */}
          <div class="border-b border-stone-100 px-5 py-3 flex flex-wrap items-center justify-between gap-4 bg-stone-50/50">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full bg-[#FFB7B2]" />
              <span class="text-xs font-heading font-medium text-[#78716C] uppercase tracking-wider">Live Register</span>
            </div>
            <div class="flex items-center gap-0.5 bg-stone-100 p-1 rounded-full text-xs">
              <button
                onClick={() => setPricingMode('retail')}
                class={`px-3.5 py-1.5 rounded-full font-heading font-medium transition-all ${
                  pricingMode() === 'retail' ? 'bg-white text-[#292524] font-semibold shadow-sm' : 'text-[#78716C] hover:text-[#292524]'
                }`}
              >Retail</button>
              <button
                onClick={() => setPricingMode('wholesale')}
                class={`px-3.5 py-1.5 rounded-full font-heading font-medium transition-all ${
                  pricingMode() === 'wholesale' ? 'bg-white text-[#292524] font-semibold shadow-sm' : 'text-[#78716C] hover:text-[#292524]'
                }`}
              >Wholesale</button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-100">
            {/* Product Catalog */}
            <div class="lg:col-span-7 p-5 sm:p-6 space-y-4">
              <input
                type="text"
                placeholder="Search item or scan barcode..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
                class="w-full bg-stone-50 border border-stone-150 rounded-full px-5 py-2.5 text-sm text-[#292524] placeholder-stone-400 focus:outline-none focus:border-[#FFB7B2]/40 focus:ring-2 focus:ring-[#FFB7B2]/10 transition-all font-heading"
              />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                <For each={filteredCatalog()}>
                  {(item) => (
                    <button
                      onClick={() => addToBill(item)}
                      class="text-left p-4 rounded-2xl border border-stone-100 bg-white hover:border-[#FFB7B2]/30 transition-all flex flex-col justify-between group active:scale-[0.98] hover:shadow-sm"
                    >
                      <div>
                        <div class="text-xs font-heading font-semibold text-[#292524] line-clamp-1">{item.name}</div>
                        <div class="text-[11px] text-stone-400 mt-0.5">{item.category}</div>
                      </div>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-xs font-bold text-[#292524]">रु {pricingMode() === 'retail' ? item.priceRetail : item.priceWholesale}</span>
                        <span class="text-[10px] font-medium text-[#FFB7B2] opacity-0 group-hover:opacity-100 transition-opacity">+ Add</span>
                      </div>
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Bill */}
            <div class="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-stone-50/30 text-xs">
              <div>
                <div class="border-b border-stone-100 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <div class="font-heading font-bold text-[#292524] text-sm">INVOICE #INV-0418</div>
                    <div class="text-stone-400 text-[11px]">{new Date().toLocaleDateString()}</div>
                  </div>
                  <button onClick={() => setCart([])} class="text-[11px] text-stone-400 hover:text-red-400 transition-colors font-heading">Clear</button>
                </div>
                <div class="space-y-2 max-h-52 overflow-y-auto pr-1">
                  <Show when={cart().length > 0} fallback={<div class="py-10 text-center text-stone-400 text-xs">Click a product to add to bill.</div>}>
                    <For each={cart()}>
                      {(item) => (
                        <div class="flex items-center justify-between py-1.5 border-b border-stone-100/60">
                          <div class="pr-2 flex-1">
                            <div class="text-[#292524] font-medium line-clamp-1">{item.name}</div>
                            <div class="text-[10px] text-stone-400">रु {currentPrice(item)} × {item.qty}</div>
                          </div>
                          <div class="flex items-center gap-2">
                            <div class="flex items-center gap-0.5 border border-stone-200 rounded-full bg-white px-1.5 py-0.5">
                              <button onClick={() => updateQty(item.id, -1)} class="px-1 text-stone-400 hover:text-[#292524] text-xs">−</button>
                              <span class="px-1 text-[#292524] font-bold text-xs">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} class="px-1 text-stone-400 hover:text-[#292524] text-xs">+</button>
                            </div>
                            <span class="font-bold text-[#292524] w-14 text-right">रु {currentPrice(item) * item.qty}</span>
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
              <div class="border-t border-stone-200/60 pt-4 mt-4 space-y-3">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-[#78716C]">Total</span>
                  <span class="text-xl font-heading font-bold text-[#292524]">रु {totalBill()}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button onClick={() => setCurrentPage('auth')} class="py-2.5 bg-[#FFB7B2] hover:bg-[#E8948E] text-white font-heading font-semibold text-xs rounded-full transition-colors active:scale-95">Complete Sale</button>
                  <button onClick={() => setCurrentPage('auth')} class="py-2.5 bg-white text-[#292524] border border-stone-200 font-heading font-semibold text-xs rounded-full hover:border-stone-300 transition-colors">Add to Khata</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          INSIDE BYAPAR TABS (preserved)
          ═══════════════════════════════════════════════════ */}
      <section id="product" class="py-16 px-6 max-w-5xl mx-auto softly-reveal">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524] tracking-tight">
              Designed for{' '}
              <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-1deg]">speed</span>
            </h2>
          </div>
          <div class="flex items-center gap-0.5 bg-stone-100 p-1 rounded-full text-xs font-heading font-medium self-start md:self-auto">
            <button onClick={() => setActiveTab('billing')} class={`px-4 py-2 rounded-full transition-all ${activeTab() === 'billing' ? 'bg-white text-[#292524] font-semibold shadow-sm' : 'text-[#78716C]'}`}>POS & Print</button>
            <button onClick={() => setActiveTab('khata')} class={`px-4 py-2 rounded-full transition-all ${activeTab() === 'khata' ? 'bg-white text-[#292524] font-semibold shadow-sm' : 'text-[#78716C]'}`}>Khata</button>
            <button onClick={() => setActiveTab('inventory')} class={`px-4 py-2 rounded-full transition-all ${activeTab() === 'inventory' ? 'bg-white text-[#292524] font-semibold shadow-sm' : 'text-[#78716C]'}`}>Stock</button>
          </div>
        </div>

        <Show when={activeTab() === 'billing'}>
          <div class="bg-white rounded-[2rem] border border-stone-100 p-6 sm:p-8 softly-card">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div class="lg:col-span-6 space-y-5">
                <div>
                  <span class="text-[11px] font-heading font-medium text-[#FFB7B2] uppercase tracking-widest">Fast Checkout</span>
                  <h3 class="text-xl font-heading font-bold text-[#292524] mt-1 mb-2">2-second billing with thermal receipt printing.</h3>
                  <p class="text-sm text-[#78716C] leading-relaxed">Scan barcodes, apply wholesale discounts, print to standard 58mm or 80mm Bluetooth & USB printers.</p>
                </div>
                <div class="grid grid-cols-2 gap-2.5 text-xs">
                  <div class="p-3.5 rounded-2xl border border-stone-100 bg-[#E8EFE8]/30"><div class="text-stone-400 text-[10px] uppercase tracking-wider">Shortcuts</div><div class="text-[#292524] font-semibold mt-1">F1 New • F2 Cash • F3 QR</div></div>
                  <div class="p-3.5 rounded-2xl border border-stone-100 bg-[#EFEDF4]/30"><div class="text-stone-400 text-[10px] uppercase tracking-wider">Split Pay</div><div class="text-[#292524] font-semibold mt-1">Cash + Fonepay + Khata</div></div>
                  <div class="p-3.5 rounded-2xl border border-stone-100 bg-[#FFB7B2]/10"><div class="text-stone-400 text-[10px] uppercase tracking-wider">Printers</div><div class="text-[#292524] font-semibold mt-1">ESC/POS 58mm & 80mm</div></div>
                  <div class="p-3.5 rounded-2xl border border-stone-100 bg-stone-50"><div class="text-stone-400 text-[10px] uppercase tracking-wider">Tax</div><div class="text-[#292524] font-semibold mt-1">Auto VAT & Discounts</div></div>
                </div>
                <button onClick={() => { setPrintedBill(true); setTimeout(() => setPrintedBill(false), 3000); }} class="px-5 py-2.5 bg-[#292524] hover:bg-[#1c1917] text-white font-heading font-semibold text-xs rounded-full transition-all active:scale-95 flex items-center gap-2">
                  <span>{printedBill() ? '✓ Bill Sent to Printer' : '🖨️ Simulate Thermal Print'}</span>
                </button>
              </div>
              {/* Thermal Receipt */}
              <div class="lg:col-span-6 flex justify-center">
                <div class="w-full max-w-sm bg-white text-[#292524] font-mono text-[11px] p-6 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] space-y-3 border border-stone-100">
                  <div class="text-center space-y-0.5 border-b border-dashed border-stone-200 pb-3"><div class="font-black text-sm tracking-wider font-heading">BYAPAR STORE</div><div class="text-[10px] text-stone-400">New Road, Ward 22, Kathmandu</div><div class="text-[10px] text-stone-400">PAN: 609812453</div><div class="text-[10px] text-[#292524] font-bold pt-1">CASH SALES INVOICE</div></div>
                  <div class="space-y-1.5 border-b border-dashed border-stone-200 pb-3">
                    <div class="flex justify-between font-bold text-[10px] text-stone-400"><span>ITEM</span><span>QTY × RATE</span><span>AMT</span></div>
                    <div class="flex justify-between"><span class="truncate max-w-[140px]">Wai Wai Chicken 75g</span><span>6 × 25</span><span class="font-bold">150.00</span></div>
                    <div class="flex justify-between"><span class="truncate max-w-[140px]">Fortune Sunlite Oil 1L</span><span>2 × 280</span><span class="font-bold">560.00</span></div>
                    <div class="flex justify-between"><span class="truncate max-w-[140px]">Amul Butter 100g</span><span>1 × 110</span><span class="font-bold">110.00</span></div>
                  </div>
                  <div class="flex justify-between font-black text-sm border-t border-stone-300 pt-1"><span>TOTAL:</span><span>रु 820.00</span></div>
                  <div class="border-t border-dashed border-stone-200 pt-3 text-center text-[10px] text-stone-400"><div class="font-bold text-[#292524]">धन्यवाद! पुनः पधार्नुहोला</div><div>Byapar Cloud POS</div></div>
                </div>
              </div>
            </div>
          </div>
        </Show>

        <Show when={activeTab() === 'khata'}>
          <div class="bg-white rounded-[2rem] border border-stone-100 p-6 sm:p-8 space-y-5 softly-card">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div><h3 class="text-lg font-heading font-bold text-[#292524]">Khata Ledger (खाता)</h3><p class="text-xs text-[#78716C] mt-0.5">Track balances with 1-click WhatsApp links.</p></div>
              <div class="text-right"><span class="text-[10px] font-heading uppercase text-stone-400 block">Outstanding</span><span class="text-lg font-heading font-bold text-[#292524]">रु 19,400</span></div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead><tr class="border-b border-stone-100 text-stone-400 text-[11px] uppercase tracking-wider"><th class="py-2.5 font-medium">Customer</th><th class="py-2.5 font-medium">Contact</th><th class="py-2.5 font-medium">Status</th><th class="py-2.5 text-right font-medium">Due</th><th class="py-2.5 text-right font-medium">Action</th></tr></thead>
                <tbody class="divide-y divide-stone-50">
                  <For each={khataCustomers}>{(c) => (
                    <tr class="hover:bg-stone-50/50 transition-colors">
                      <td class="py-3 font-medium text-[#292524]">{c.name}</td>
                      <td class="py-3 text-[#78716C] font-mono text-[11px]">{c.phone}</td>
                      <td class="py-3"><span class={`px-2.5 py-1 rounded-full text-[10px] font-medium ${c.status === 'overdue' ? 'bg-[#FFB7B2]/15 text-[#E8948E]' : 'bg-[#E8EFE8]/50 text-[#78716C]'}`}>{c.days}d</span></td>
                      <td class="py-3 text-right font-bold text-[#292524] font-mono">रु {c.balance}</td>
                      <td class="py-3 text-right"><button onClick={() => triggerWhatsApp(c.name, c.balance)} class="px-3 py-1.5 bg-[#FFB7B2]/10 hover:bg-[#FFB7B2]/20 text-[#E8948E] font-heading font-semibold text-[11px] rounded-full transition-all active:scale-95">WhatsApp</button></td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>

        <Show when={activeTab() === 'inventory'}>
          <div class="bg-white rounded-[2rem] border border-stone-100 p-6 sm:p-8 space-y-5 softly-card">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div><h3 class="text-lg font-heading font-bold text-[#292524]">Live Inventory</h3><p class="text-xs text-[#78716C] mt-0.5">Auto-deducts on billing. Instant alerts.</p></div>
              <div class="flex items-center gap-0.5 bg-stone-100 p-1 rounded-full text-xs">
                <button onClick={() => setStockFilter('all')} class={`px-3 py-1.5 rounded-full transition-all font-heading ${stockFilter() === 'all' ? 'bg-white text-[#292524] font-semibold shadow-sm' : 'text-[#78716C]'}`}>All</button>
                <button onClick={() => setStockFilter('low')} class={`px-3 py-1.5 rounded-full transition-all font-heading ${stockFilter() === 'low' ? 'bg-white text-[#292524] font-semibold shadow-sm' : 'text-[#78716C]'}`}>Low</button>
                <button onClick={() => setStockFilter('expiring')} class={`px-3 py-1.5 rounded-full transition-all font-heading ${stockFilter() === 'expiring' ? 'bg-white text-[#292524] font-semibold shadow-sm' : 'text-[#78716C]'}`}>Expiring</button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead><tr class="border-b border-stone-100 text-stone-400 text-[11px] uppercase tracking-wider"><th class="py-2.5 font-medium">Product</th><th class="py-2.5 font-medium">SKU</th><th class="py-2.5 text-right font-medium">Stock</th><th class="py-2.5 text-right font-medium">Status</th></tr></thead>
                <tbody class="divide-y divide-stone-50">
                  <For each={filteredInventory()}>{(item) => (
                    <tr class="hover:bg-stone-50/50 transition-colors">
                      <td class="py-3 font-medium text-[#292524]">{item.name}</td>
                      <td class="py-3 text-[#78716C] font-mono text-[11px]">{item.sku}</td>
                      <td class="py-3 text-right font-bold text-[#292524]">{item.stock}</td>
                      <td class="py-3 text-right"><span class={`px-2.5 py-1 rounded-full text-[10px] font-medium ${item.alert === 'Low Stock' ? 'bg-[#FFB7B2]/15 text-[#E8948E]' : item.alert.includes('Expires') ? 'bg-[#FFF0E5] text-[#B45309]' : 'text-stone-400 bg-stone-50'}`}>{item.alert}</span></td>
                    </tr>
                  )}</For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      </section>

      {/* ═══════════════════════════════════════════════════
          DIARY ENTRY TESTIMONIALS — spec: 2-col desktop, 1-col mobile,
          cards with ±1deg rotation, white bg,
          signature: 32px line + Reenie Beanie 24px stone-500
          ═══════════════════════════════════════════════════ */}
      <section class="py-16 px-6 max-w-5xl mx-auto softly-reveal">
        <div class="text-center mb-10">
          <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524] tracking-tight">
            Shopkeepers{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-1deg]">love it</span>
          </h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <For each={testimonials}>
            {(t, idx) => (
              <div class={`bg-white rounded-2xl border border-stone-100 p-6 softly-card ${idx() % 2 === 0 ? 'diary-card-left' : 'diary-card-right'}`}>
                <p class="text-sm text-[#292524] leading-relaxed mb-5 italic">
                  "{t.quote}"
                </p>
                {/* Signature — spec: 32px horizontal line + Reenie Beanie 24px stone-500 */}
                <div class="flex items-center gap-3">
                  <div class="w-8 h-px bg-stone-300" />
                  <div>
                    <div class="font-cursive text-2xl text-stone-500 leading-none">{t.name}</div>
                    <div class="text-[11px] text-stone-400 mt-0.5">{t.shop}</div>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FAQ ACCORDION — spec: white bg, 16px rounded, 1px stone-100 border,
          24px padding header, 500 weight text, plus icon rotates 45deg,
          height 0 to auto transition 500ms ease-in-out, 24px bottom padding on content
          ═══════════════════════════════════════════════════ */}
      <section id="faq" class="py-16 px-6 max-w-3xl mx-auto softly-reveal">
        <div class="text-center mb-8">
          <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524] tracking-tight">
            Got{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-1deg]">questions?</span>
          </h2>
        </div>

        <div class="space-y-3">
          <For each={previewFaqs}>
            {(faq, idx) => (
              <div class="bg-white rounded-2xl border border-stone-100 overflow-hidden softly-card">
                {/* Header — spec: 24px padding, 500 weight, plus icon */}
                <button
                  onClick={() => setOpenFaq(openFaq() === idx() ? null : idx())}
                  class="w-full text-left px-6 py-5 flex items-center justify-between text-[#292524] hover:text-[#78716C] transition-colors"
                >
                  <span class="pr-4 font-heading font-medium text-sm sm:text-base">{faq.q}</span>
                  <span class={`softly-faq-icon text-[#FFB7B2] text-xl font-light shrink-0 ${openFaq() === idx() ? 'is-open' : ''}`}>
                    +
                  </span>
                </button>
                {/* Body — spec: transition height 0 to auto, 500ms, 24px bottom padding */}
                <div class={`softly-accordion-body ${openFaq() === idx() ? 'is-open' : ''}`}>
                  <div class="softly-accordion-inner">
                    <div class="px-6 pb-6 text-sm text-[#78716C] leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          DYNAMIC PRICING EXPERIENCE SECTION — Softly theme
          Dynamic plans synced from cloud/subscriptionService
          ═══════════════════════════════════════════════════ */}
      <section id="pricing" class="py-20 px-6 max-w-6xl mx-auto softly-reveal">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE8] text-[#292524] text-xs font-heading font-medium mb-3">
            <span class="w-2 h-2 rounded-full bg-[#FFB7B2]" />
            Fair & Transparent Pricing
          </div>
          <h2 class="text-3xl sm:text-4xl font-heading font-bold text-[#292524] tracking-tight">
            Plans for shops of{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-2deg]">every size</span>
          </h2>
          <p class="text-sm text-[#78716C] mt-2 max-w-md mx-auto">
            Free forever for single-counter stores. Upgrade anytime as your shop adds staff, multiple counters, or chain branches.
          </p>

          {/* Monthly / Annual Toggle */}
          <div class="pt-6 flex items-center justify-center">
            <div class="inline-flex items-center bg-stone-100 p-1 rounded-full text-xs font-heading font-semibold">
              <button
                type="button"
                onClick={() => setPlanCycle('monthly')}
                class={`px-4 py-1.5 rounded-full transition-all ${
                  planCycle() === 'monthly'
                    ? 'bg-white text-[#292524] shadow-sm font-bold'
                    : 'text-[#78716C] hover:text-[#292524]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setPlanCycle('annual')}
                class={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                  planCycle() === 'annual'
                    ? 'bg-white text-[#292524] shadow-sm font-bold'
                    : 'text-[#78716C] hover:text-[#292524]'
                }`}
              >
                <span>Annual</span>
                <span class="text-[10px] bg-[#E8EFE8] text-[#292524] px-1.5 py-0.5 rounded-full font-bold">Save 20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          <For each={plans()}>
            {(plan) => {
              const isPopular = plan.is_popular || plan.id === 'pro_99';
              const price = () => (planCycle() === 'annual' ? plan.annual_price : plan.monthly_price);

              return (
                <div
                  class={`relative rounded-[2rem] p-6 flex flex-col justify-between transition-all duration-300 softly-card ${
                    isPopular
                      ? 'bg-white border-2 border-[#FFB7B2] shadow-xl shadow-[#FFB7B2]/15 scale-[1.02] z-10'
                      : 'bg-white border border-stone-100 hover:border-stone-200'
                  }`}
                >
                  {isPopular && (
                    <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FFB7B2] text-white text-[10px] font-heading font-bold px-3 py-0.5 rounded-full shadow-sm uppercase tracking-wider">
                      {plan.badge_text || 'Most Popular'}
                    </div>
                  )}

                  <div>
                    <div class="mb-3">
                      <h3 class="text-lg font-heading font-bold text-[#292524]">{plan.name}</h3>
                      <p class="text-xs text-[#78716C] mt-1 line-clamp-2">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div class="py-3 border-y border-stone-100 my-3">
                      <div class="flex items-baseline gap-1">
                        <span class="text-2xl font-heading font-black text-[#292524]">
                          {price() === 0 ? 'Free' : `रु ${price()}`}
                        </span>
                        <span class="text-xs text-[#78716C] font-heading font-medium">
                          {price() === 0 ? '' : planCycle() === 'annual' ? '/year' : '/month'}
                        </span>
                      </div>
                      <div class="text-[10px] text-stone-400 mt-0.5 font-heading">
                        {price() === 0 ? 'Free forever' : planCycle() === 'annual' ? 'Billed annually' : 'Billed monthly'}
                      </div>
                    </div>

                    {/* Key features */}
                    <div class="space-y-2 pt-1 text-xs text-[#78716C]">
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">App & Web Free for All</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">App Lock & PIN Security</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class={plan.id === 'free' ? "text-amber-600 font-bold" : "text-emerald-500 font-bold"}>
                          {plan.id === 'free' ? '−' : '✓'}
                        </span>
                        <span class={plan.id === 'free' ? "text-stone-400" : "text-[#292524] font-medium"}>
                          {plan.id === 'free'
                            ? 'Bill Images: Not in Free'
                            : `Bill Images: ${plan.daily_bill_upload_limit === -1 ? 'Unlimited' : `${plan.daily_bill_upload_limit}/day`}`}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">Notes, Reminders & Auto WhatsApp</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">Reports in Detail & PDF/Excel Export</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">
                          {plan.max_staff_accounts === -1 ? 'Unlimited' : `${plan.max_staff_accounts}`} Staff Seat{plan.max_staff_accounts !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-emerald-500 font-bold">✓</span>
                        <span class="text-[#292524] font-medium">
                          {plan.max_stores_allowed === -1 ? 'Unlimited' : `${plan.max_stores_allowed}`} Store{plan.max_stores_allowed !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="pt-5 mt-5 border-t border-stone-100">
                    <button
                      onClick={() => setCurrentPage('auth')}
                      class={`w-full py-2.5 rounded-full text-xs font-heading font-semibold transition-all active:scale-95 softly-cta-scale ${
                        isPopular
                          ? 'bg-[#FFB7B2] hover:bg-[#E8948E] text-white shadow-md shadow-[#FFB7B2]/30'
                          : plan.id === 'free'
                          ? 'bg-[#292524] hover:bg-[#1c1917] text-white'
                          : 'bg-stone-100 hover:bg-stone-200 text-[#292524]'
                      }`}
                    >
                      {plan.id === 'free' ? 'Get Started' : 'Choose Plan'}
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>

        {/* Link to in-detail comparison */}
        <div class="text-center mt-10">
          <button
            onClick={() => setCurrentPage('pricing')}
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-stone-200 text-xs font-heading font-semibold text-[#292524] hover:border-[#FFB7B2] transition-colors softly-cta-scale shadow-sm"
          >
            <span>View Full Feature Comparison & FAQ</span>
            <span class="text-[#FFB7B2]">→</span>
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          WAITLIST / CONVERSION — spec: high-blur floating gradients bg,
          dark stone #292524 rounded-square icon with coral dot,
          email input (rounded-full, bg-stone-50), black submit scales on hover
          ═══════════════════════════════════════════════════ */}
      <section class="py-20 px-6 softly-reveal relative overflow-hidden">
        {/* Background floating gradients */}
        <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div class="softly-blob absolute top-1/4 left-1/4 w-[300px] h-[300px] opacity-40" style={{ background: '#FFE4E1', filter: 'blur(120px)' }} />
          <div class="softly-blob-reverse absolute bottom-1/4 right-1/4 w-[350px] h-[350px] opacity-40" style={{ background: '#E6E6FA', filter: 'blur(120px)' }} />
        </div>

        <div class="relative max-w-md mx-auto text-center">
          {/* Icon — spec: dark stone rounded-square with coral dot */}
          <div class="w-14 h-14 bg-[#292524] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div class="w-3 h-3 rounded-full bg-[#FFB7B2]" />
          </div>

          <h2 class="text-3xl sm:text-4xl font-heading font-extrabold text-[#292524] tracking-tight mb-3">
            Set up your shop in 2 minutes.
          </h2>
          <p class="text-[#78716C] text-sm mb-8">
            No credit card needed. Free forever for single-counter stores.
          </p>

          {/* Form — spec: email input rounded-full bg-stone-50, black submit button scales on hover */}            <button
             onClick={() => setCurrentPage('auth')}
              type="submit"
              class="px-6 py-3 bg-[#292524] hover:bg-[#1c1917] text-white font-heading font-semibold text-sm rounded-full transition-all softly-cta-scale active:scale-95 whitespace-nowrap"
            >
              {waitlistSubmitted() ? '✓ Welcome!' : 'Get Started Free'}
            </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          CONTACT & FOOTER — redesigned for Softly
          ═══════════════════════════════════════════════════ */}
      <footer id="contact" class="border-t border-stone-100 bg-white/50">
        {/* Contact section */}
        <div class="max-w-5xl mx-auto px-6 py-14">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Brand + about */}
            <div class="md:col-span-4 space-y-4">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-[#FFB7B2] flex items-center justify-center shadow-sm">
                  <div class="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
                <span class="font-heading font-bold text-lg text-[#292524]">Byapar</span>
              </div>
              <p class="text-sm text-[#78716C] leading-relaxed">
                Smart business management for Nepal MSMEs. Free POS billing, digital Khata, WhatsApp reminders, and real-time cloud sync.
              </p>
              <div class="flex items-center gap-3 pt-1">
                <a href="mailto:hello@byapar.np" class="text-xs text-[#78716C] hover:text-[#FFB7B2] transition-colors font-heading">hello@byapar.np</a>
                <span class="text-stone-300">|</span>
                <span class="text-xs text-[#78716C] font-heading">Kathmandu, Nepal</span>
              </div>
            </div>

            {/* Quick links */}
            <div class="md:col-span-2 space-y-3">
              <h4 class="text-xs font-heading font-semibold text-[#292524] uppercase tracking-widest">Product</h4>
              <div class="space-y-2">
                <a href="#scenarios" class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">Features</a>
                <a href="#interactive" class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">Live Demo</a>
                <button onClick={() => setCurrentPage('pricing')} class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading text-left">Pricing Plans</button>
                <a href="/byapar.apk" download="byapar.apk" class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">Download APK</a>
              </div>
            </div>

            {/* Company */}
            <div class="md:col-span-2 space-y-3">
              <h4 class="text-xs font-heading font-semibold text-[#292524] uppercase tracking-widest">Company</h4>
              <div class="space-y-2">
                <button onClick={() => setCurrentPage('about')} class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">About Us</button>
                <button onClick={() => setCurrentPage('faq')} class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">FAQs</button>
                <button onClick={() => setCurrentPage('auth')} class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">Sign In</button>
              </div>
            </div>

            {/* Legal */}
            <div class="md:col-span-2 space-y-3">
              <h4 class="text-xs font-heading font-semibold text-[#292524] uppercase tracking-widest">Legal</h4>
              <div class="space-y-2">
                <button onClick={() => setCurrentPage('privacy')} class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">Privacy Policy</button>
                <button onClick={() => setCurrentPage('terms')} class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">Terms of Service</button>
              </div>
            </div>

            {/* Social / Connect */}
            <div class="md:col-span-2 space-y-3">
              <h4 class="text-xs font-heading font-semibold text-[#292524] uppercase tracking-widest">Connect</h4>
              <div class="space-y-2">
                <a href="mailto:hello@byapar.np" class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">Email Us</a>
                <a href="tel:+9771234567" class="block text-sm text-[#78716C] hover:text-[#292524] transition-colors font-heading">Call Support</a>
                <span class="block text-sm text-[#78716C] font-heading">WhatsApp: 9800000000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div class="border-t border-stone-100 py-5 px-6">
          <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400 font-heading">
            <span>© {new Date().getFullYear()} Byapar. Made with care in Nepal.</span>
            <span class="font-cursive text-lg text-stone-300">simple & beautiful</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
