import { Component, For, Show } from 'solid-js';
import { showWhatsNewModal, setShowWhatsNewModal } from '../../db/localDb';
import { IconSparkles, IconX, IconCheck } from '../icons';

export const WhatsNewModal: Component = () => {
  const updates = [
    {
      version: 'v2.4.0 (Latest)',
      date: 'September 2026',
      badge: 'Major Release',
      features: [
        'AMOLED Pure Black & Modern Line Icons: Pitch black theme with clean SVG icons across all screens.',
        'Fonepay Dynamic QR & Soundbox: Automated voice payment announcements without manual typing.',
        'Multi-Account Management: Unified tracking for Cash in Hand, Nabil Bank, and Digital Wallets.',
        'Complete Khata Ledger: Fast customer & supplier accounts with credit limits and WhatsApp reminders.',
        'Bill Gallery & Vouchers: Archive and categorize paper supplier bills and expense receipts.',
        'Interactive Daily Notebook: Color-tagged notes with pin-to-top for orders, cheques, and stock reminders.',
        'Global Command Search (Ctrl + K): Instant shortcut search to jump across modules and products.',
      ],
    },
    {
      version: 'v2.3.0',
      date: 'August 2026',
      badge: 'Feature Update',
      features: [
        'Nepal IRD Real-Time CBMS (Schedule-13): Sequential tax invoicing and encrypted audit sync.',
        'Thermal Printer Engine: Hardware-ready receipt generation for 58mm and 80mm roll printers.',
        'WhatsApp Payment Reminders: 1-click formatted statement dispatch directly to customer chat.',
      ],
    },
  ];

  return (
    <Show when={showWhatsNewModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowWhatsNewModal(false)}>
        <div class="modal-content !max-w-xl p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2">
              <IconSparkles size={20} class="text-amber-500" />
              <h3 class="font-bold text-base text-neutral-900 dark:text-white">What's New in Byapar</h3>
            </div>
            <button
              onClick={() => setShowWhatsNewModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1 rounded-lg transition"
            >
              <IconX size={16} />
            </button>
          </div>

          <div class="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            <For each={updates}>
              {(u) => (
                <div class="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-[#060606]">
                  <div class="flex items-center justify-between mb-2.5">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-sm text-neutral-900 dark:text-white">{u.version}</span>
                      <span class="text-[10px] bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold">
                        {u.badge}
                      </span>
                    </div>
                    <span class="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">{u.date}</span>
                  </div>

                  <ul class="space-y-2 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    <For each={u.features}>
                      {(f) => (
                        <li class="flex items-start gap-2">
                          <IconCheck size={14} class="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </div>
              )}
            </For>
          </div>

          <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
            <button class="btn-primary text-xs" onClick={() => setShowWhatsNewModal(false)}>
              Awesome!
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

