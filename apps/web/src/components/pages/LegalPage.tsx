import { Component, onSettled } from 'solid-js';
import { setCurrentPage } from '../../db/localDb';

export const LegalPage: Component<{ type: 'privacy' | 'terms' }> = (props) => {
  onSettled(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  return (
    <div class="min-h-screen bg-[#FDFCF8] text-[#292524] font-sans antialiased selection:bg-[#FFB7B2]/30 softly-page relative overflow-x-hidden">
      
      {/* ─── GRAIN OVERLAY ─── */}
      <div class="softly-grain" aria-hidden="true">
        <svg>
          <filter id="softlyNoiseLegal">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#softlyNoiseLegal)" />
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
      <main class="relative z-10 max-w-3xl mx-auto px-6 pt-32 pb-24 space-y-12">
        {props.type === 'privacy' ? (
          <div class="space-y-8 bg-white/80 backdrop-blur-md rounded-[2rem] border border-stone-100 p-8 sm:p-12 softly-card">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE8] text-[#292524] text-xs font-heading font-medium mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#FFB7B2]" />
                Legal & Trust
              </div>
              <h1 class="text-3xl sm:text-4xl font-heading font-bold text-[#292524]">Privacy Policy</h1>
              <p class="text-xs text-[#78716C] font-heading mt-1">Last Updated: January 2025 • Kathmandu, Nepal</p>
            </div>

            <div class="space-y-6 text-sm text-[#78716C] leading-relaxed font-normal">
              <p class="text-base text-[#292524] font-medium leading-relaxed">
                At Byapar, we believe that shopkeepers own their business data. We do not sell, rent, or monetize your store’s transaction records, customer details, or supplier rates.
              </p>

              <h2 class="text-lg font-heading font-bold text-[#292524] pt-4 border-t border-stone-100">1. Information We Collect</h2>
              <p>
                To provide billing and ledger services, we store:
              </p>
              <ul class="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-[#78716C]">
                <li>Your business profile: Shop name, owner name, address, and PAN/VAT number.</li>
                <li>Product Catalog: Item names, SKU barcodes, retail and wholesale prices, and stock counts.</li>
                <li>Transaction records: Sales invoices, customer names, phone numbers, and Khata debt balances.</li>
              </ul>

              <h2 class="text-lg font-heading font-bold text-[#292524] pt-4 border-t border-stone-100">2. How Your Data Is Protected</h2>
              <p>
                All data transmitted between your device and our cloud servers is encrypted using modern TLS 1.3 encryption. Passwords and security credentials are salted and hashed using industry-standard cryptography.
              </p>

              <h2 class="text-lg font-heading font-bold text-[#292524] pt-4 border-t border-stone-100">3. WhatsApp Reminders</h2>
              <p>
                When you click "Send WhatsApp Reminder", Byapar creates a standard message draft. The message is sent directly from your own WhatsApp account on your device. We do not inspect or store your private chat conversations.
              </p>

              <h2 class="text-lg font-heading font-bold text-[#292524] pt-4 border-t border-stone-100">4. Your Rights & Data Export</h2>
              <p>
                You can export your customer lists, sales records, and inventory into CSV/Excel format at any time. If you wish to delete your account, you can request full permanent removal of all your data by emailing support@byapar.np.
              </p>
            </div>
          </div>
        ) : (
          <div class="space-y-8 bg-white/80 backdrop-blur-md rounded-[2rem] border border-stone-100 p-8 sm:p-12 softly-card">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFEDF4] text-[#292524] text-xs font-heading font-medium mb-3">
                <span class="w-1.5 h-1.5 rounded-full bg-[#FFB7B2]" />
                Legal & Agreement
              </div>
              <h1 class="text-3xl sm:text-4xl font-heading font-bold text-[#292524]">Terms of Service</h1>
              <p class="text-xs text-[#78716C] font-heading mt-1">Last Updated: January 2025 • Kathmandu, Nepal</p>
            </div>

            <div class="space-y-6 text-sm text-[#78716C] leading-relaxed font-normal">
              <p class="text-base text-[#292524] font-medium leading-relaxed">
                Welcome to Byapar. By accessing our platform on web or mobile, you agree to these Terms of Service.
              </p>

              <h2 class="text-lg font-heading font-bold text-[#292524] pt-4 border-t border-stone-100">1. License & Store Use</h2>
              <p>
                Byapar grants you a revocable, non-exclusive license to use the platform for your store’s commercial billing, inventory, and customer ledger management.
              </p>

              <h2 class="text-lg font-heading font-bold text-[#292524] pt-4 border-t border-stone-100">2. Account Responsibility</h2>
              <p>
                You are responsible for safeguarding your login credentials. You are solely responsible for all sales invoices, cash entries, and credit balances recorded under your store account.
              </p>

              <h2 class="text-lg font-heading font-bold text-[#292524] pt-4 border-t border-stone-100">3. Taxation & Compliance in Nepal</h2>
              <p>
                Byapar provides tools for invoice calculation and VAT breakdown. Shopkeepers remain solely responsible for reporting correct sales figures and paying applicable taxes to the Inland Revenue Department (IRD) of Nepal.
              </p>

              <h2 class="text-lg font-heading font-bold text-[#292524] pt-4 border-t border-stone-100">4. Availability & Cloud Backups</h2>
              <p>
                We strive for 99.9% cloud uptime. While we provide automated encrypted cloud backups, we encourage store owners to regularly download ledger summaries and monthly sales reports for their offline records.
              </p>
            </div>
          </div>
        )}
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
            <button onClick={() => setCurrentPage('faq')} class="hover:text-[#292524] transition-colors">FAQ</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
