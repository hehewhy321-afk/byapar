import { Component, createSignal, For, Show } from 'solid-js';
import { showTutorialsModal, setShowTutorialsModal, setActiveTab } from '../../db/localDb';
import {
  IconGraduationCap,
  IconPos,
  IconKhata,
  IconQrCode,
  IconAccounts,
  IconX,
} from '../icons';

export const TutorialsModal: Component = () => {
  const [selectedTutorial, setSelectedTutorial] = createSignal<number>(0);

  const tutorials = [
    {
      title: 'POS Fast Kirana Billing',
      icon: (cls?: string) => <IconPos size={18} class={cls || 'text-emerald-500'} />,
      duration: '2 mins',
      desc: 'Learn how to scan barcodes or search items, choose retail vs wholesale pricing tiers, and generate instant thermal receipts.',
      steps: [
        '1. Search for any product by name or scan its barcode in the top search bar.',
        '2. Press Enter or click on the product card to instantly add it to the cart.',
        '3. Switch between Retail MRP or Wholesale tier to apply trade discounts.',
        '4. Choose Cash Checkout or Fonepay Dynamic QR.',
      ],
      actionTab: 'pos',
      actionLabel: 'Go to POS Billing',
    },
    {
      title: 'Khata Credit & WhatsApp Reminders',
      icon: (cls?: string) => <IconKhata size={18} class={cls || 'text-blue-500'} />,
      duration: '3 mins',
      desc: 'Maintain customer credit ledger, record payments (Liyo / Diyo), and send 1-click WhatsApp payment reminders with invoice balance.',
      steps: [
        '1. Open Parties tab and click "+ Add Party" to register a customer or supplier.',
        '2. Click "+ Diyo (Gave Credit)" when giving goods on credit.',
        '3. Click "+ Liyo (Got Payment)" when receiving partial or full payment.',
        '4. Click "Send WhatsApp Reminder" to send a formatted friendly balance alert.',
      ],
      actionTab: 'khata',
      actionLabel: 'Go to Parties (Khata)',
    },
    {
      title: 'Fonepay Dynamic EMVCo QR Billing',
      icon: (cls?: string) => <IconQrCode size={18} class={cls || 'text-purple-500'} />,
      duration: '2 mins',
      desc: 'Accept digital payments securely without manual amount typing errors and share QR directly on WhatsApp.',
      steps: [
        '1. In POS cart checkout, click the Fonepay payment option.',
        '2. A dynamic EMVCo QR with the exact invoice total is locked and displayed.',
        '3. Customer scans with eSewa, Khalti, or any Nepal mobile banking app.',
        '4. Save the QR or share payment links directly via WhatsApp.',
      ],
      actionTab: 'pos',
      actionLabel: 'Try POS QR Checkout',
    },
    {
      title: 'IRD CBMS Real-time Invoicing',
      icon: (cls?: string) => <IconAccounts size={18} class={cls || 'text-amber-500'} />,
      duration: '4 mins',
      desc: 'How Schedule-13 IRD compliance works, invoice numbering, and encrypted local audit trail preservation.',
      steps: [
        '1. Ensure your store PAN number is registered in Settings.',
        '2. Every completed invoice generates an authentic sequential invoice number.',
        '3. View all issued invoices in the Reports tab.',
        '4. Invoices are queued and synced to IRD servers automatically.',
      ],
      actionTab: 'reports',
      actionLabel: 'View CBMS Reports',
    },
  ];

  return (
    <Show when={showTutorialsModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowTutorialsModal(false)}>
        <div class="modal-content !max-w-2xl p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2">
              <IconGraduationCap size={20} class="text-brand-600 dark:text-brand-400" />
              <h3 class="font-bold text-base text-neutral-900 dark:text-white">Interactive Step-by-Step Tutorials</h3>
            </div>
            <button
              onClick={() => setShowTutorialsModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1 rounded-lg transition"
            >
              <IconX size={16} />
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Tutorial List */}
            <div class="space-y-1.5 md:col-span-1">
              <For each={tutorials}>
                {(tut, idx) => (
                  <button
                    class={`w-full p-2.5 rounded-xl text-left transition flex items-center gap-2.5 border ${
                      selectedTutorial() === idx()
                        ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800 text-brand-900 dark:text-brand-300 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                    onClick={() => setSelectedTutorial(idx())}
                  >
                    <div class="shrink-0">{tut.icon()}</div>
                    <div class="flex-1 min-w-0">
                      <h5 class="text-xs font-bold truncate">{tut.title}</h5>
                      <span class="text-[10px] text-neutral-400 dark:text-neutral-500">{tut.duration}</span>
                    </div>
                  </button>
                )}
              </For>
            </div>

            {/* Right: Tutorial Content */}
            <div class="md:col-span-2 stat-card bg-neutral-50/60 dark:bg-[#060606] border border-neutral-200 dark:border-neutral-800 !p-5 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    {tutorials[selectedTutorial()].icon()}
                    {tutorials[selectedTutorial()].title}
                  </h4>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold">
                    {tutorials[selectedTutorial()].duration}
                  </span>
                </div>
                <p class="text-xs text-neutral-600 dark:text-neutral-400 mb-4 leading-relaxed">
                  {tutorials[selectedTutorial()].desc}
                </p>

                <h5 class="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">Action Checklist:</h5>
                <div class="space-y-2 mb-4">
                  <For each={tutorials[selectedTutorial()].steps}>
                    {(step) => (
                      <div class="p-2.5 rounded-lg bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
                        {step}
                      </div>
                    )}
                  </For>
                </div>
              </div>

              <div class="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <button
                  class="btn-outline text-xs"
                  onClick={() => setShowTutorialsModal(false)}
                >
                  Close
                </button>
                <button
                  class="btn-primary text-xs"
                  onClick={() => {
                    setActiveTab(tutorials[selectedTutorial()].actionTab as any);
                    setShowTutorialsModal(false);
                  }}
                >
                  {tutorials[selectedTutorial()].actionLabel} →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

