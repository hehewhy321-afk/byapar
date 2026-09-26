import { Component, createSignal, onSettled, For, Show } from 'solid-js';
import { setCurrentPage } from '../../db/localDb';

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

export const FaqPage: Component = () => {
  const [activeCategory, setActiveCategory] = createSignal<string>('all');
  const [searchQuery, setSearchQuery] = createSignal<string>('');
  const [expandedIndex, setExpandedIndex] = createSignal<number | null>(0);

  onSettled(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  const faqs: FaqItem[] = [
    {
      category: 'General',
      q: 'Is Byapar free to use for Nepali shops?',
      a: 'Yes, Byapar is completely free forever for single-counter retail stores and kiranas. You get full POS billing, unlimited items in inventory, digital Khata ledger with WhatsApp reminders, and real-time cloud sync. No credit card is required to sign up.',
    },
    {
      category: 'General',
      q: 'Can I use Byapar on my phone and shop computer together?',
      a: 'Yes! Byapar is cloud-synced in real time. Your cashier or staff can run checkout at the counter on a desktop PC, laptop, or tablet, while you check daily sales, profits, and customer balances on your Android phone from home or on the road.',
    },
    {
      category: 'Billing',
      q: 'What receipt printers and barcode scanners work with Byapar?',
      a: 'Byapar supports all standard ESC/POS 58mm and 80mm thermal receipt printers via Bluetooth and USB. It also supports all handheld USB barcode guns and 2D wireless scanners. You can also use your mobile phone camera to scan barcodes directly.',
    },
    {
      category: 'Billing',
      q: 'Can I split a bill between Cash, Fonepay QR, and Khata?',
      a: 'Yes. When checking out a customer, you can tender exact cash, display a Fonepay QR code for digital wallet payments (eSewa, Khalti, Mobile Banking), and put the remaining balance directly on the customer’s Khata credit ledger.',
    },
    {
      category: 'Billing',
      q: 'Are invoices CBMS and IRD PAN compliant in Nepal?',
      a: 'Yes. Byapar generates official invoice numbers, includes your business PAN/VAT number, breaks down 13% VAT and item discounts, and provides fiscal end-of-day summary reports.',
    },
    {
      category: 'Khata',
      q: 'How do the automated WhatsApp reminders work?',
      a: 'When a customer has pending udhar, clicking "Send WhatsApp" opens WhatsApp with a pre-formatted courteous Nepali message containing their total balance, bill details, and your store’s direct Fonepay QR payment link so they can settle immediately from their phone.',
    },
    {
      category: 'Khata',
      q: 'Can I set credit limits for specific customers?',
      a: 'Yes. You can assign a custom credit limit for any customer or wholesale party. If their balance exceeds the cap, Byapar alerts your cashier before issuing more goods on credit.',
    },
    {
      category: 'Khata',
      q: 'Can I print account statements for customers or suppliers?',
      a: 'Yes. You can download and print clean, professional PDF account statements (Got / Gave ledger) showing full transaction dates, bill numbers, and running balance for dispute-free settlements.',
    },
    {
      category: 'Inventory',
      q: 'How does real-time stock deduction work?',
      a: 'Every time an invoice is completed, stock counts decrement automatically in your cloud database. If a customer returns an item, stock is immediately added back. You also receive push alerts when stock falls below your designated minimum threshold.',
    },
    {
      category: 'Inventory',
      q: 'Can I set different retail and wholesale rates for products?',
      a: 'Yes. Every product has both a Retail Rate and Wholesale Rate. You can switch pricing tiers with one click during billing, or assign a customer permanently to wholesale pricing.',
    },
    {
      category: 'Hardware',
      q: 'What happens if my shop’s internet disconnects?',
      a: 'Byapar has offline-resilience built right in. You can continue billing customers, adding stock, and printing thermal receipts uninterrupted. Everything syncs to the cloud automatically the moment your WiFi or mobile hotspot reconnects.',
    },
  ];

  const categories = ['all', 'General', 'Billing', 'Khata', 'Inventory', 'Hardware'];

  const filteredFaqs = () => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory() === 'all' || faq.category === activeCategory();
      const q = searchQuery().toLowerCase().trim();
      const matchesSearch = !q || faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  };

  return (
    <div class="min-h-screen bg-[#FDFCF8] text-[#292524] font-sans antialiased selection:bg-[#FFB7B2]/30 softly-page relative overflow-x-hidden">
      
      {/* ─── GRAIN OVERLAY ─── */}
      <div class="softly-grain" aria-hidden="true">
        <svg>
          <filter id="softlyNoiseFaq">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#softlyNoiseFaq)" />
        </svg>
      </div>

      {/* ─── FLOATING BACKGROUND BLOBS ─── */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          class="softly-blob absolute top-10 left-1/4 w-[360px] h-[360px] opacity-50"
          style={{ background: '#FFE4E1', filter: 'blur(100px)' }}
        />
        <div
          class="softly-blob-reverse absolute top-80 right-1/4 w-[340px] h-[340px] opacity-40"
          style={{ background: '#E6E6FA', filter: 'blur(100px)' }}
        />
      </div>

      {/* ─── FLOATING PILL HEADER ─── */}
      <header
        class="fixed top-3 left-1/2 -translate-x-1/2 z-40 rounded-full px-4 sm:px-6 py-2.5 bg-white/75 backdrop-blur-[20px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] border border-stone-200/50"
        style={{ width: 'calc(100% - 32px)', 'max-width': '760px' }}
      >
        <div class="flex items-center justify-between">
          <div 
            class="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => setCurrentPage('landing')}
          >
            <div class="w-7 h-7 rounded-full bg-[#FFB7B2] flex items-center justify-center shadow-sm">
              <div class="w-2 h-2 rounded-full bg-white" />
            </div>
            <span class="font-heading font-semibold text-sm text-[#292524] tracking-tight">
              Byapar
            </span>
          </div>

          <div class="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('landing')}
              class="text-xs sm:text-sm font-heading font-medium text-[#78716C] hover:text-[#292524] transition-colors px-3 py-1.5 rounded-full"
            >
              ← Back to Home
            </button>
            <button
              onClick={() => setCurrentPage('auth')}
              class="text-xs sm:text-sm font-heading font-semibold text-white bg-[#292524] hover:bg-[#1c1917] px-4 sm:px-5 py-2 rounded-full transition-all active:scale-95 softly-cta-scale"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main class="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-24 space-y-12">
        
        {/* Intro */}
        <section class="space-y-4 text-center max-w-2xl mx-auto">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFEDF4] text-[#292524] text-xs font-heading font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-[#FFB7B2]" />
            Help Center
          </div>
          <h1 class="text-4xl sm:text-5xl font-heading font-black tracking-tight text-[#292524]">
            Frequently Asked{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-2deg]">Questions</span>
          </h1>
          <p class="text-sm sm:text-base text-[#78716C] leading-relaxed">
            Everything you need to know about billing, Bluetooth thermal printers, Khata reminders, and getting started with Byapar in Nepal.
          </p>

          {/* Search Bar */}
          <div class="pt-4 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Search answers (e.g. printer, Fonepay, Khata)..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full bg-white border border-stone-200 rounded-full px-5 py-3 text-sm text-[#292524] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40 transition-all font-heading shadow-sm"
            />
          </div>
        </section>

        {/* Categories Bar */}
        <div class="flex items-center justify-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
          <For each={categories}>
            {(cat) => (
              <button
                onClick={() => setActiveCategory(cat)}
                class={`px-4 py-2 rounded-full text-xs font-heading font-semibold transition-all capitalize whitespace-nowrap ${
                  activeCategory() === cat
                    ? 'bg-[#292524] text-white shadow-sm'
                    : 'bg-white text-[#78716C] border border-stone-200/70 hover:text-[#292524]'
                }`}
              >
                {cat === 'all' ? 'All Questions' : cat}
              </button>
            )}
          </For>
        </div>

        {/* FAQs Accordion */}
        <div class="space-y-3 pt-2">
          <Show 
            when={filteredFaqs().length > 0} 
            fallback={<div class="py-12 text-center text-[#78716C] text-sm font-heading">No questions found matching your search.</div>}
          >
            <For each={filteredFaqs()}>
              {(faq, idx) => (
                <div class="bg-white rounded-2xl border border-stone-100 overflow-hidden softly-card">
                  <button
                    onClick={() => setExpandedIndex(expandedIndex() === idx() ? null : idx())}
                    class="w-full text-left px-6 py-5 flex items-center justify-between text-[#292524] hover:text-[#78716C] transition-colors"
                  >
                    <span class="pr-4 font-heading font-medium text-sm sm:text-base">{faq.q}</span>
                    <span class={`softly-faq-icon text-[#FFB7B2] text-xl font-light shrink-0 ${expandedIndex() === idx() ? 'is-open' : ''}`}>
                      +
                    </span>
                  </button>

                  <div class={`softly-accordion-body ${expandedIndex() === idx() ? 'is-open' : ''}`}>
                    <div class="softly-accordion-inner">
                      <div class="px-6 pb-6 text-sm text-[#78716C] leading-relaxed">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>

        {/* Still Have Questions Box */}
        <div class="bg-white rounded-[2rem] border border-stone-100 p-8 sm:p-10 text-center space-y-4 softly-card max-w-xl mx-auto">
          <div class="w-12 h-12 bg-[#E8EFE8] rounded-2xl flex items-center justify-center mx-auto text-[#292524] text-lg font-bold">
            ?
          </div>
          <h3 class="text-xl font-heading font-bold text-[#292524]">Still have questions?</h3>
          <p class="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto leading-relaxed">
            Our support team in Kathmandu is available on WhatsApp to answer your technical questions or help you configure your thermal receipt printer.
          </p>
          <div class="pt-2 flex justify-center">
            <a
              href="https://wa.me/9779801234567"
              target="_blank"
              rel="noopener noreferrer"
              class="px-6 py-3 bg-[#FFB7B2] hover:bg-[#E8948E] text-white font-heading font-semibold text-xs rounded-full transition-all active:scale-95 shadow-md shadow-[#FFB7B2]/30 flex items-center gap-2 softly-cta-scale"
            >
              <span>Chat on WhatsApp</span>
              <span>→</span>
            </a>
          </div>
        </div>

      </main>

      {/* ─── FOOTER ─── */}
      <footer class="py-12 px-6 border-t border-stone-100 bg-white/50 text-xs text-[#78716C] font-heading">
        <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span class="font-bold text-[#292524]">Byapar</span> • Smart Business Management for Nepal MSMEs
          </div>
          <div class="flex items-center gap-6">
            <button onClick={() => setCurrentPage('landing')} class="hover:text-[#292524] transition-colors">Home</button>
            <button onClick={() => setCurrentPage('pricing')} class="hover:text-[#292524] transition-colors">Pricing</button>
            <button onClick={() => setCurrentPage('about')} class="hover:text-[#292524] transition-colors">About Us</button>
            <button onClick={() => setCurrentPage('privacy')} class="hover:text-[#292524] transition-colors">Privacy</button>
            <button onClick={() => setCurrentPage('terms')} class="hover:text-[#292524] transition-colors">Terms</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
