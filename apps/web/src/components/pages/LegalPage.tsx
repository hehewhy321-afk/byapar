import { Component, onSettled } from 'solid-js';
import { setCurrentPage } from '../../db/localDb';

export const LegalPage: Component<{ type: 'privacy' | 'terms' }> = (props) => {
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
      <main class="max-w-3xl mx-auto px-6 py-20 space-y-12">
        {props.type === 'privacy' ? (
          <div class="space-y-8">
            <div>
              <p class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Legal & Trust</p>
              <h1 class="text-3xl sm:text-4xl font-heading font-black text-white">Privacy Policy</h1>
              <p class="text-xs text-zinc-500 font-mono mt-1">Last Updated: January 2025 • Kathmandu, Nepal</p>
            </div>

            <div class="space-y-6 text-sm text-zinc-300 leading-relaxed font-normal">
              <p>
                At Byapar, we believe that shopkeepers own their business data. We do not sell, rent, or monetize your store’s transaction records, customer details, or supplier rates.
              </p>

              <h2 class="text-lg font-bold text-white pt-4 border-t border-zinc-800">1. Information We Collect</h2>
              <p>
                To provide billing and ledger services, we store:
              </p>
              <ul class="list-disc pl-5 space-y-1 text-zinc-400 text-xs">
                <li>Your business profile: Shop name, owner name, address, and PAN/VAT number.</li>
                <li>Product Catalog: Item names, SKU barcodes, retail and wholesale prices, and stock counts.</li>
                <li>Transaction records: Sales invoices, customer names, phone numbers, and Khata debt balances.</li>
              </ul>

              <h2 class="text-lg font-bold text-white pt-4 border-t border-zinc-800">2. How Your Data Is Protected</h2>
              <p>
                All data transmitted between your device and our cloud servers is encrypted using modern TLS 1.3 encryption. Passwords and security credentials are salted and hashed using industry-standard cryptography.
              </p>

              <h2 class="text-lg font-bold text-white pt-4 border-t border-zinc-800">3. WhatsApp Reminders</h2>
              <p>
                When you click "Send WhatsApp Reminder", Byapar creates a standard message draft. The message is sent directly from your own WhatsApp account on your device. We do not inspect or store your private chat conversations.
              </p>

              <h2 class="text-lg font-bold text-white pt-4 border-t border-zinc-800">4. Your Rights & Data Export</h2>
              <p>
                You can export your customer lists, sales records, and inventory into CSV/Excel format at any time. If you wish to delete your account, you can request full permanent removal of all your data by emailing support@byapar.np.
              </p>
            </div>
          </div>
        ) : (
          <div class="space-y-8">
            <div>
              <p class="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2">Legal & Agreement</p>
              <h1 class="text-3xl sm:text-4xl font-heading font-black text-white">Terms of Service</h1>
              <p class="text-xs text-zinc-500 font-mono mt-1">Last Updated: January 2025 • Kathmandu, Nepal</p>
            </div>

            <div class="space-y-6 text-sm text-zinc-300 leading-relaxed font-normal">
              <p>
                Welcome to Byapar. By accessing our platform on web or mobile, you agree to these Terms of Service.
              </p>

              <h2 class="text-lg font-bold text-white pt-4 border-t border-zinc-800">1. License & Store Use</h2>
              <p>
                Byapar grants you a revocable, non-exclusive license to use the platform for your store’s commercial billing, inventory, and customer ledger management.
              </p>

              <h2 class="text-lg font-bold text-white pt-4 border-t border-zinc-800">2. Account Responsibility</h2>
              <p>
                You are responsible for safeguarding your login credentials. You are solely responsible for all sales invoices, cash entries, and credit balances recorded under your store account.
              </p>

              <h2 class="text-lg font-bold text-white pt-4 border-t border-zinc-800">3. Taxation & Compliance in Nepal</h2>
              <p>
                Byapar provides tools for invoice calculation and VAT breakdown. Shopkeepers remain solely responsible for reporting correct sales figures and paying applicable taxes to the Inland Revenue Department (IRD) of Nepal.
              </p>

              <h2 class="text-lg font-bold text-white pt-4 border-t border-zinc-800">4. Availability & Cloud Backups</h2>
              <p>
                We strive for 99.9% cloud uptime. While we provide automated encrypted cloud backups, we encourage store owners to regularly download ledger summaries and monthly sales reports for their offline records.
              </p>
            </div>
          </div>
        )}
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
            <button onClick={() => setCurrentPage('faq')} class="hover:text-white transition-colors">FAQ</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
