import { Component, createSignal, For, Show } from 'solid-js';
import { showHelpModal, setShowHelpModal } from '../../db/localDb';
import {
  IconHandshake,
  IconWhatsApp,
  IconPhone,
  IconMail,
  IconX,
  IconChevronDown,
  IconChevronUp,
} from '../icons';

export const HelpSupportModal: Component = () => {
  const [activeFaq, setActiveFaq] = createSignal<number | null>(0);
  const [searchQuery, setSearchQuery] = createSignal('');

  const faqs = [
    {
      q: 'How do I add a new customer or supplier credit entry?',
      a: 'Navigate to "Parties" from the sidebar. You can click "+ Add Party" to register a customer or supplier. Select their name in the list, then click "+ Liyo (Got Payment)" or "+ Diyo (Gave Credit)" to record transaction amounts with optional remarks.',
    },
    {
      q: 'How does the Fonepay Dynamic QR & Soundbox work?',
      a: 'When you checkout a sale in POS Billing, choose "Fonepay Dynamic QR". A dynamic QR with exact invoice amount locked will be displayed. Customers scan with eSewa, Khalti, or any mobile banking app. When paid, your device voice soundbox speaks in Nepali/English announcing the received amount.',
    },
    {
      q: 'Is this system compliant with Nepal Inland Revenue Department (IRD) CBMS?',
      a: 'Yes! Byapar implements the Schedule-13 Real-Time Central Billing Monitoring System (CBMS). All issued tax invoices generate sequential invoice numbers, encrypted hash logs, and sync directly with IRD servers when internet connectivity is active.',
    },
    {
      q: 'How do I setup 58mm or 80mm thermal receipt printing?',
      a: 'Go to Settings > Billing & Hardware. Select your preferred thermal printer width (58mm or 80mm). When completing a POS sale, click "Print Receipt" to automatically format with monospace thermal receipt styling.',
    },
    {
      q: 'How does real-time cloud data sync work?',
      a: 'Byapar uses real-time encrypted cloud sync. Every transaction, POS invoice, customer credit khata entry, and inventory update is immediately synchronized to high-speed cloud database servers with end-to-end security and automated backups.',
    },
  ];

  const filteredFaqs = () => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return faqs;
    return faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  };

  return (
    <Show when={showHelpModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowHelpModal(false)}>
        <div class="modal-content !max-w-xl p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2">
              <IconHandshake size={20} class="text-brand-600 dark:text-brand-400" />
              <h3 class="font-bold text-base text-neutral-900 dark:text-white">Help & Support Center</h3>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1 rounded-lg transition"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Quick Contact Cards */}
          <div class="grid grid-cols-3 gap-3 mb-5">
            <a
              href="https://wa.me/9779841234567?text=Hello%20Byapar%20Support"
              target="_blank"
              class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-center transition block group"
            >
              <div class="flex justify-center mb-1">
                <IconWhatsApp size={22} class="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span class="font-bold text-xs text-emerald-800 dark:text-emerald-300 block">WhatsApp</span>
              <span class="text-[10px] text-emerald-600 dark:text-emerald-400">Live 24/7 Chat</span>
            </a>

            <a
              href="tel:9841234567"
              class="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-center transition block group"
            >
              <div class="flex justify-center mb-1">
                <IconPhone size={22} class="text-blue-600 dark:text-blue-400" />
              </div>
              <span class="font-bold text-xs text-blue-800 dark:text-blue-300 block">Call Helpline</span>
              <span class="text-[10px] text-blue-600 dark:text-blue-400">Toll Free Nepal</span>
            </a>

            <a
              href="mailto:support@byapar.com"
              class="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900/40 text-center transition block group"
            >
              <div class="flex justify-center mb-1">
                <IconMail size={22} class="text-purple-600 dark:text-purple-400" />
              </div>
              <span class="font-bold text-xs text-purple-800 dark:text-purple-300 block">Email Us</span>
              <span class="text-[10px] text-purple-600 dark:text-purple-400">support@byapar.com</span>
            </a>
          </div>

          {/* FAQ Accordion */}
          <div class="mb-3">
            <h4 class="font-bold text-xs text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">Frequently Asked Questions</h4>
            <input
              type="text"
              placeholder="Search help topics..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="input-field text-xs mb-3"
            />

            <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
              <For each={filteredFaqs()}>
                {(faq, idx) => {
                  const isOpen = activeFaq() === idx();
                  return (
                    <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                      <button
                        class="w-full p-3 text-left font-semibold text-xs text-neutral-800 dark:text-neutral-200 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100/80 dark:hover:bg-neutral-800 transition"
                        onClick={() => setActiveFaq(isOpen ? null : idx())}
                      >
                        <span>{faq.q}</span>
                        <span class="text-neutral-400 dark:text-neutral-500 text-xs">
                          {isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                        </span>
                      </button>
                      <Show when={isOpen}>
                        <div class="p-3 text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-black leading-relaxed border-t border-neutral-100 dark:border-neutral-800">
                          {faq.a}
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>

          <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
            <button class="btn-primary text-xs" onClick={() => setShowHelpModal(false)}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

