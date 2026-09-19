import { Component, onSettled } from 'solid-js';
import { setCurrentPage } from '../../db/localDb';

export const AboutPage: Component = () => {
  onSettled(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

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
      <main class="max-w-4xl mx-auto px-6 py-20 space-y-20">
        
        {/* Intro */}
        <section class="space-y-6">
          <p class="text-xs font-mono uppercase tracking-widest text-zinc-500">
            About Us
          </p>
          <h1 class="text-4xl sm:text-6xl font-heading font-black tracking-tight text-white leading-[1.08]">
            Building the modern OS for Nepal's retail backbone.
          </h1>
          <p class="text-lg text-zinc-400 leading-relaxed max-w-2xl font-normal">
            Every neighborhood in Nepal is powered by retail shops — Kiranas, marts, pharmacies, and hardware stores. Yet millions of transactions are still jotted down on torn notebooks, lost to miscalculations, or locked in clunky desktop software from 2005.
          </p>
          <p class="text-base text-zinc-400 leading-relaxed max-w-2xl font-normal">
            Byapar was founded in Kathmandu with one clear goal: give local shopkeepers high-speed, dependable, cloud-synced software that simplifies billing, tracks Khata debts, and protects store profits.
          </p>
        </section>

        {/* Core Principles */}
        <section class="border-t border-zinc-800 pt-16 space-y-8">
          <div class="max-w-xl">
            <p class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Our Principles</p>
            <h2 class="text-2xl sm:text-3xl font-heading font-bold text-white">
              What we stand for.
            </h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="p-6 rounded-xl border border-zinc-800 bg-[#0d0d11] space-y-3">
              <div class="font-mono text-xs text-zinc-500">01 / SPEED ON THE SHOP FLOOR</div>
              <h3 class="text-lg font-bold text-white">Every Millisecond Counts</h3>
              <p class="text-xs text-zinc-400 leading-relaxed">
                When a customer is standing at your counter with groceries, you cannot wait for slow spin-wheels. Byapar is engineered for instantaneous keyboard shortcuts and barcode lookups.
              </p>
            </div>

            <div class="p-6 rounded-xl border border-zinc-800 bg-[#0d0d11] space-y-3">
              <div class="font-mono text-xs text-zinc-500">02 / ZERO LOST DEBTS</div>
              <h3 class="text-lg font-bold text-white">Udhar Khata Accountability</h3>
              <p class="text-xs text-zinc-400 leading-relaxed">
                Trust is the foundation of local business, but forgotten credit ruins cash flow. Our automated WhatsApp statements help shopkeepers recover money politely with zero awkwardness.
              </p>
            </div>

            <div class="p-6 rounded-xl border border-zinc-800 bg-[#0d0d11] space-y-3">
              <div class="font-mono text-xs text-zinc-500">03 / HARDWARE FREEDOM</div>
              <h3 class="text-lg font-bold text-white">Standard Devices Welcome</h3>
              <p class="text-xs text-zinc-400 leading-relaxed">
                We believe in open compatibility. Plug in any 58mm or 80mm thermal receipt printer, use any barcode scanner, or run the app on an old laptop. No proprietary locked boxes.
              </p>
            </div>

            <div class="p-6 rounded-xl border border-zinc-800 bg-[#0d0d11] space-y-3">
              <div class="font-mono text-xs text-zinc-500">04 / DATA SOVEREIGNTY</div>
              <h3 class="text-lg font-bold text-white">Your Data Is Strictly Yours</h3>
              <p class="text-xs text-zinc-400 leading-relaxed">
                We will never sell or share your customer phone numbers, supplier rates, or sales figures with third parties. Your records are encrypted and protected at all times.
              </p>
            </div>

          </div>
        </section>

        {/* Contact / Office Section */}
        <section class="border-t border-zinc-800 pt-16 space-y-8">
          <div class="max-w-xl">
            <p class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Connect With Us</p>
            <h2 class="text-2xl sm:text-3xl font-heading font-bold text-white">
              Based in Kathmandu, Nepal.
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono text-xs">
            <div class="p-5 rounded-xl border border-zinc-800 bg-[#0d0d11]">
              <div class="text-zinc-500 text-[10px] uppercase">OFFICE LOCATION</div>
              <div class="text-white font-bold mt-2 font-sans">Kathmandu, Nepal</div>
              <div class="text-zinc-500 mt-1">Bagmati Province</div>
            </div>

            <div class="p-5 rounded-xl border border-zinc-800 bg-[#0d0d11]">
              <div class="text-zinc-500 text-[10px] uppercase">DIRECT WHATSAPP</div>
              <div class="text-white font-bold mt-2 font-sans">+977 980-1234567</div>
              <div class="text-zinc-500 mt-1">Instant Merchant Help</div>
            </div>

            <div class="p-5 rounded-xl border border-zinc-800 bg-[#0d0d11]">
              <div class="text-zinc-500 text-[10px] uppercase">EMAIL SUPPORT</div>
              <div class="text-white font-bold mt-2 font-sans">support@byapar.np</div>
              <div class="text-zinc-500 mt-1">General Inquiries</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section class="border-t border-zinc-800 pt-16 text-center space-y-6">
          <h3 class="text-2xl sm:text-3xl font-heading font-bold text-white">
            Join thousands of smart Nepali retailers.
          </h3>
          <button
            onClick={() => setCurrentPage('auth')}
            class="px-8 py-3.5 bg-white text-black hover:bg-zinc-200 font-heading font-bold text-sm rounded-md transition-all active:scale-95"
          >
            Create Your Free Account →
          </button>
        </section>

      </main>

      {/* ─── FOOTER ─── */}
      <footer class="py-12 px-6 border-t border-zinc-800 text-xs text-zinc-500 font-mono">
        <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span class="font-bold text-zinc-300">Byapar</span> • Smart Business Management for Nepal MSMEs
          </div>
          <div class="flex items-center gap-6">
            <button onClick={() => setCurrentPage('landing')} class="hover:text-white transition-colors">Home</button>
            <button onClick={() => setCurrentPage('faq')} class="hover:text-white transition-colors">FAQ</button>
            <button onClick={() => setCurrentPage('privacy')} class="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => setCurrentPage('terms')} class="hover:text-white transition-colors">Terms</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
