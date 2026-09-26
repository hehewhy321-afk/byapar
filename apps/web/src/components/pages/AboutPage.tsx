import { Component, onSettled } from 'solid-js';
import { setCurrentPage } from '../../db/localDb';

export const AboutPage: Component = () => {
  onSettled(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  return (
    <div class="min-h-screen bg-[#FDFCF8] text-[#292524] font-sans antialiased selection:bg-[#FFB7B2]/30 softly-page relative overflow-x-hidden">
      
      {/* ─── GRAIN OVERLAY ─── */}
      <div class="softly-grain" aria-hidden="true">
        <svg>
          <filter id="softlyNoiseAbout">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#softlyNoiseAbout)" />
        </svg>
      </div>

      {/* ─── FLOATING BACKGROUND BLOBS ─── */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          class="softly-blob absolute top-10 left-1/4 w-[360px] h-[360px] opacity-50"
          style={{ background: '#FFE4E1', filter: 'blur(100px)' }}
        />
        <div
          class="softly-blob-reverse absolute top-96 right-1/4 w-[340px] h-[340px] opacity-40"
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
      <main class="relative z-10 max-w-4xl mx-auto px-6 pt-32 pb-24 space-y-20">
        
        {/* Intro */}
        <section class="space-y-6 text-center sm:text-left max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE8] text-[#292524] text-xs font-heading font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-[#FFB7B2]" />
            About Byapar
          </div>
          <h1 class="text-4xl sm:text-6xl font-heading font-black tracking-tight text-[#292524] leading-[1.08]">
            Building the modern OS for Nepal's{' '}
            <span class="font-cursive font-normal text-[#FFB7B2] inline-block rotate-[-2deg]">retail backbone</span>.
          </h1>
          <p class="text-base sm:text-lg text-[#78716C] leading-relaxed font-normal">
            Every neighborhood in Nepal is powered by retail shops — Kiranas, marts, pharmacies, and hardware stores. Yet millions of transactions are still jotted down on torn notebooks, lost to miscalculations, or locked in clunky desktop software from 2005.
          </p>
          <p class="text-sm sm:text-base text-[#78716C] leading-relaxed font-normal">
            Byapar was founded in Kathmandu with one clear goal: give local shopkeepers high-speed, dependable, cloud-synced software that simplifies billing, tracks Khata debts, and protects store profits.
          </p>
        </section>

        {/* Core Principles */}
        <section class="border-t border-stone-200/60 pt-16 space-y-8">
          <div class="max-w-xl">
            <p class="text-xs font-heading uppercase tracking-widest text-[#FFB7B2] font-semibold mb-2">Our Principles</p>
            <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524]">
              What we stand for.
            </h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="p-7 rounded-[1.75rem] border border-stone-100 bg-white softly-card space-y-3">
              <div class="text-[11px] font-heading font-semibold text-stone-400 uppercase tracking-wider">01 / Speed On The Counter</div>
              <h3 class="text-lg font-heading font-bold text-[#292524]">Every Millisecond Counts</h3>
              <p class="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                When a customer is standing at your counter with groceries, you cannot wait for slow spin-wheels. Byapar is engineered for instantaneous keyboard shortcuts and barcode lookups.
              </p>
            </div>

            <div class="p-7 rounded-[1.75rem] border border-stone-100 bg-white softly-card space-y-3">
              <div class="text-[11px] font-heading font-semibold text-stone-400 uppercase tracking-wider">02 / Zero Lost Debts</div>
              <h3 class="text-lg font-heading font-bold text-[#292524]">Udhar Khata Accountability</h3>
              <p class="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                Trust is the foundation of local business, but forgotten credit ruins cash flow. Our automated WhatsApp statements help shopkeepers recover money politely with zero awkwardness.
              </p>
            </div>

            <div class="p-7 rounded-[1.75rem] border border-stone-100 bg-white softly-card space-y-3">
              <div class="text-[11px] font-heading font-semibold text-stone-400 uppercase tracking-wider">03 / Hardware Freedom</div>
              <h3 class="text-lg font-heading font-bold text-[#292524]">Standard Devices Welcome</h3>
              <p class="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                We believe in open compatibility. Plug in any 58mm or 80mm thermal receipt printer, use any barcode scanner, or run the app on an old laptop. No proprietary locked boxes.
              </p>
            </div>

            <div class="p-7 rounded-[1.75rem] border border-stone-100 bg-white softly-card space-y-3">
              <div class="text-[11px] font-heading font-semibold text-stone-400 uppercase tracking-wider">04 / Data Sovereignty</div>
              <h3 class="text-lg font-heading font-bold text-[#292524]">Your Data Is Strictly Yours</h3>
              <p class="text-xs sm:text-sm text-[#78716C] leading-relaxed">
                We will never sell or share your customer phone numbers, supplier rates, or sales figures with third parties. Your records are encrypted and protected at all times.
              </p>
            </div>
          </div>
        </section>

        {/* Contact / Office Section */}
        <section class="border-t border-stone-200/60 pt-16 space-y-8">
          <div class="max-w-xl">
            <p class="text-xs font-heading uppercase tracking-widest text-[#FFB7B2] font-semibold mb-2">Connect With Us</p>
            <h2 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524]">
              Based in Kathmandu, Nepal.
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div class="p-6 rounded-[1.5rem] border border-stone-100 bg-white softly-card">
              <div class="text-stone-400 text-[10px] font-heading uppercase tracking-wider">Office Location</div>
              <div class="text-[#292524] font-heading font-bold text-base mt-2">Kathmandu, Nepal</div>
              <div class="text-[#78716C] text-xs mt-1">Bagmati Province</div>
            </div>

            <div class="p-6 rounded-[1.5rem] border border-stone-100 bg-white softly-card">
              <div class="text-stone-400 text-[10px] font-heading uppercase tracking-wider">Direct WhatsApp</div>
              <div class="text-[#292524] font-heading font-bold text-base mt-2">+977 980-1234567</div>
              <div class="text-[#78716C] text-xs mt-1">Instant Merchant Help</div>
            </div>

            <div class="p-6 rounded-[1.5rem] border border-stone-100 bg-white softly-card">
              <div class="text-stone-400 text-[10px] font-heading uppercase tracking-wider">Email Support</div>
              <div class="text-[#292524] font-heading font-bold text-base mt-2">support@byapar.np</div>
              <div class="text-[#78716C] text-xs mt-1">General Inquiries</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section class="border-t border-stone-200/60 pt-16 text-center space-y-6">
          <div class="w-12 h-12 bg-[#292524] rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <div class="w-2.5 h-2.5 rounded-full bg-[#FFB7B2]" />
          </div>
          <h3 class="text-2xl sm:text-3xl font-heading font-bold text-[#292524]">
            Join thousands of smart Nepali retailers.
          </h3>
          <p class="text-sm text-[#78716C] max-w-md mx-auto">
            Get started in 2 minutes. Free forever for single-counter stores with zero hidden fees.
          </p>
          <button
            onClick={() => setCurrentPage('auth')}
            class="px-8 py-3.5 bg-[#FFB7B2] hover:bg-[#E8948E] text-white font-heading font-semibold text-sm rounded-full transition-all active:scale-95 shadow-[0_4px_20px_-2px_rgba(255,183,178,0.4)] softly-cta-scale"
          >
            Create Your Free Account →
          </button>
        </section>

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
            <button onClick={() => setCurrentPage('faq')} class="hover:text-[#292524] transition-colors">FAQ</button>
            <button onClick={() => setCurrentPage('privacy')} class="hover:text-[#292524] transition-colors">Privacy</button>
            <button onClick={() => setCurrentPage('terms')} class="hover:text-[#292524] transition-colors">Terms</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
