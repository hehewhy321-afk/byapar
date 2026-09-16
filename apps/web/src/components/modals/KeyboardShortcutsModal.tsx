import { Component, For, Show } from 'solid-js';
import { showKeyboardShortcutsModal, setShowKeyboardShortcutsModal } from '../../db/localDb';
import { IconKeyboard, IconX } from '../icons';

export const KeyboardShortcutsModal: Component = () => {
  const shortcutGroups = [
    {
      group: 'General & Navigation',
      shortcuts: [
        { key: 'Ctrl + K', desc: 'Open Global Command Palette' },
        { key: 'Ctrl + B', desc: 'Toggle Sidebar Collapse' },
        { key: 'Ctrl + D', desc: 'Toggle Dark / Light Theme' },
        { key: 'Esc', desc: 'Close any active modal or dropdown' },
      ],
    },
    {
      group: 'Quick View Jump',
      shortcuts: [
        { key: 'F1', desc: 'Dashboard View' },
        { key: 'F2', desc: 'POS Billing Register' },
        { key: 'F3', desc: 'Parties / Khata Ledger' },
        { key: 'F4', desc: 'Inventory & Stock' },
        { key: 'F5', desc: 'Sales Reports & CBMS' },
      ],
    },
    {
      group: 'POS Billing Shortcuts',
      shortcuts: [
        { key: 'Enter', desc: 'Add first search result directly to cart' },
        { key: 'Space', desc: 'Trigger Cash Checkout when in cart' },
      ],
    },
  ];

  return (
    <Show when={showKeyboardShortcutsModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowKeyboardShortcutsModal(false)}>
        <div class="modal-content !max-w-lg p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2">
              <IconKeyboard size={20} class="text-brand-600 dark:text-brand-400" />
              <h3 class="font-bold text-base text-neutral-900 dark:text-white">Keyboard Shortcuts Helper</h3>
            </div>
            <button
              onClick={() => setShowKeyboardShortcutsModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1 rounded-lg transition"
            >
              <IconX size={16} />
            </button>
          </div>

          <div class="space-y-4 max-h-[420px] overflow-y-auto pr-1">
            <For each={shortcutGroups}>
              {(grp) => (
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">{grp.group}</h4>
                  <div class="space-y-1.5">
                    <For each={grp.shortcuts}>
                      {(s) => (
                        <div class="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-[#060606] border border-neutral-200 dark:border-neutral-800 text-xs">
                          <span class="text-neutral-700 dark:text-neutral-300 font-medium">{s.desc}</span>
                          <kbd class="px-2 py-1 rounded bg-white dark:bg-black border border-neutral-200 dark:border-neutral-700 text-[11px] font-mono font-bold text-neutral-800 dark:text-neutral-200 shadow-xs">
                            {s.key}
                          </kbd>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>

          <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
            <button class="btn-primary text-xs" onClick={() => setShowKeyboardShortcutsModal(false)}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

