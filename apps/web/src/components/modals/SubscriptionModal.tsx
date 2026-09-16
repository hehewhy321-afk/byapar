import { Component, Show, For } from 'solid-js';
import { showSubscriptionModal, setShowSubscriptionModal } from '../../db/localDb';
import { IconCrown, IconX, IconCheck } from '../icons';

export const SubscriptionModal: Component = () => {
  const features = [
    'Unlimited POS Invoices & Thermal Printing (58mm / 80mm)',
    'Unlimited Parties & Customer Credit Khata with WhatsApp Reminders',
    'Fonepay Dynamic QR with Instant Voice Soundbox Announcements',
    'Nepal IRD Real-Time CBMS Module (Schedule-13 Invoicing)',
    'Multi-Account Cash & Commercial Bank Balance Management',
    'Bill Gallery & Receipt Archival for Tax Audits',
    'Daily Notebook & Supplier Orders Manager',
    'Real-Time Multi-Device Cloud Sync with Encrypted Backup',
  ];

  return (
    <Show when={showSubscriptionModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowSubscriptionModal(false)}>
        <div class="modal-content !max-w-md p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2">
              <IconCrown size={20} class="text-amber-500" />
              <h3 class="font-bold text-base text-neutral-900 dark:text-white">Subscription & Licensing</h3>
            </div>
            <button
              onClick={() => setShowSubscriptionModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1 rounded-lg transition"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Active Plan Card */}
          <div class="rounded-2xl p-5 bg-gradient-to-br from-brand-600 via-emerald-600 to-teal-700 text-white mb-4 shadow-md">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                Active Tier
              </span>
              <span class="text-xs text-emerald-100 font-mono">Valid until Sep 2027</span>
            </div>
            <h4 class="text-xl font-bold font-heading">Byapar Pro Cloud</h4>
            <p class="text-xs text-emerald-100 mt-1">Full Kirana & Retail Cloud Management Suite</p>
          </div>

          <div class="space-y-2 mb-5">
            <h5 class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">Enabled Features:</h5>
            <For each={features}>
              {(f) => (
                <div class="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                  <IconCheck size={14} class="text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </div>
              )}
            </For>
          </div>

          <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
            <button class="btn-primary text-xs" onClick={() => setShowSubscriptionModal(false)}>
              Manage Plan
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

