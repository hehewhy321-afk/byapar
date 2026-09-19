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
      category: 'Security',
      q: 'What happens if my shop laptop breaks or gets stolen?',
      a: 'Because Byapar syncs to your secure cloud database, your data is never lost. You can simply log in on another computer, tablet, or phone, and all your bills, inventory, and customer ledgers will immediately load in seconds.',
    },
    {
      category: 'Security',
      q: 'Can my staff see my profit margins and wholesale purchase prices?',
      a: 'No. Byapar has role-based permissions. You can assign counter staff as "Cashiers", which allows them to issue bills and add items, but restricts access to wholesale cost prices, overall profit reports, and staff management.',
    },
  ];

  const categories = ['all', 'General', 'Billing', 'Khata', 'Inventory', 'Security'];

  const filteredFaqs = () => {
    return faqs.filter((faq) => {
      const matchCat = activeCategory() === 'all' || faq.category === activeCategory();
      const q = searchQuery().toLowerCase().trim();
      const matchSearch = !q || faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  };

  return (
    <div class="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-white selection:text-black">
      
      {/* ─── HEADER ─── */}
      <header class="border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-40 py-4 px-6">
        <div class="max-w-5xl mx-auto flex items-center justify-between">
          <div 
            class="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setCurrentPage('landing')}
          >
            <span class="font-heading font-black text-xl tracking-tighter text-white">
              BYAPAR<span class="text-zinc-500 text-base">.NP</span>
            </span>
          </div>

          <div class="flex items-center gap-4 text-xs">
            <button
              onClick={() => setCurrentPage('landing')}
              class="text-zinc-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
            <button
              onClick={() => setCurrentPage('auth')}
              class="font-bold text-black bg-white hover:bg-zinc-200 px-4 py-2 rounded-md transition-all active:scale-95"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main class="max-w-4xl mx-auto px-6 py-20 space-y-12">
        
        {/* Intro & Search */}
        <div class="space-y-6">
          <p class="text-xs font-mono uppercase tracking-widest text-zinc-500">
            Frequently Asked Questions
          </p>
          <h1 class="text-4xl sm:text-5xl font-heading font-black tracking-tight text-white">
            Everything you need to know about Byapar.
          </h1>
          <p class="text-zinc-400 text-base max-w-2xl">
            Clear answers about pricing, hardware compatibility, thermal receipts, WhatsApp reminders, and data security.
          </p>

          <div class="pt-2">
            <input
              type="text"
              placeholder="Search question or keyword (e.g. printer, WhatsApp, Fonepay, pricing)..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full bg-[#0d0d11] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
            />
          </div>

          {/* Category Filter Chips */}
          <div class="flex flex-wrap gap-2 pt-2">
            <For each={categories}>
              {(cat) => (
                <button
                  onClick={() => setActiveCategory(cat)}
                  class={`px-3.5 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                    activeCategory() === cat
                      ? 'bg-white text-black font-bold'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All Questions' : cat}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div class="space-y-3 pt-6 border-t border-zinc-800">
          <Show 
            when={filteredFaqs().length > 0} 
            fallback={<div class="py-12 text-center text-zinc-500 text-sm">No questions found matching your search.</div>}
          >
            <For each={filteredFaqs()}>
              {(faq, idx) => (
                <div class="border border-zinc-800 bg-[#0d0d11] rounded-xl overflow-hidden transition-colors">
                  <button
                    onClick={() => setExpandedIndex(expandedIndex() === idx() ? null : idx())}
                    class="w-full text-left p-5 flex items-center justify-between font-heading font-bold text-sm sm:text-base text-white hover:text-zinc-200 transition-colors"
                  >
                    <span class="pr-4">{faq.q}</span>
                    <span class="font-mono text-zinc-400 text-lg shrink-0">
                      {expandedIndex() === idx() ? '−' : '+'}
                    </span>
                  </button>

                  <Show when={expandedIndex() === idx()}>
                    <div class="px-5 pb-5 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/60 pt-3">
                      {faq.a}
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </div>

        {/* Still Have Questions Box */}
        <div class="border border-zinc-800 bg-[#0d0d11] rounded-xl p-8 text-center space-y-4">
          <h3 class="text-xl font-heading font-bold text-white">Still have questions?</h3>
          <p class="text-xs text-zinc-400 max-w-md mx-auto">
            Our team is available on WhatsApp to answer your technical questions or help you configure your thermal printer.
          </p>
          <div class="pt-2 flex justify-center">
            <a
              href="https://wa.me/9779801234567"
              target="_blank"
              rel="noopener noreferrer"
              class="px-6 py-2.5 bg-zinc-900 border border-zinc-700 hover:border-white text-white font-bold text-xs rounded transition-all flex items-center gap-2"
            >
              <span>Chat on WhatsApp</span>
              <span>→</span>
            </a>
          </div>
        </div>

      </main>

      {/* ─── FOOTER ─── */}
      <footer class="py-12 px-6 border-t border-zinc-800 text-xs text-zinc-500 font-mono">
        <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span class="font-bold text-zinc-300">Byapar</span> • Smart Business Management for Nepal MSMEs
          </div>
          <div class="flex items-center gap-6">
            <button onClick={() => setCurrentPage('landing')} class="hover:text-white transition-colors">Home</button>
            <button onClick={() => setCurrentPage('about')} class="hover:text-white transition-colors">About Us</button>
            <button onClick={() => setCurrentPage('privacy')} class="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => setCurrentPage('terms')} class="hover:text-white transition-colors">Terms</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
