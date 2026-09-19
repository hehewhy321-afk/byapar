import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  reminders,
  parties,
  addReminder,
  updateReminder,
  deleteReminder,
  setActiveTab,
  type Reminder,
} from '../../db/localDb';
import { formatNepaliCurrency } from '@byapar/core';
import { IconPlus, IconCalendar, IconCheck, IconTrash, IconX } from '../icons';

export const RemindersView: Component = () => {
  const [activeReminderTab, setActiveReminderTab] = createSignal<'upcoming' | 'completed'>('upcoming');
  const [showModal, setShowModal] = createSignal(false);

  // Form state
  const [formTitle, setFormTitle] = createSignal('');
  const [formPartyId, setFormPartyId] = createSignal('');
  const [formAmount, setFormAmount] = createSignal(0);
  const [formDueDate, setFormDueDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = createSignal('');

  const upcoming = createMemo(() => reminders.filter((r) => r.status === 'upcoming'));
  const completed = createMemo(() => reminders.filter((r) => r.status === 'completed'));

  const displayedReminders = createMemo(() =>
    activeReminderTab() === 'upcoming' ? upcoming() : completed()
  );

  const handleAddReminder = async () => {
    if (!formTitle().trim()) return;
    const party = formPartyId() ? parties.find((p) => p.id === formPartyId()) : undefined;

    await addReminder({
      title: formTitle(),
      partyId: formPartyId() || undefined,
      partyName: party?.name,
      amount: formAmount() || undefined,
      dueDate: formDueDate(),
      note: formNote() || undefined,
      status: 'upcoming',
    });

    resetForm();
    setShowModal(false);
  };

  const markComplete = async (id: string) => {
    await updateReminder(id, { status: 'completed' });
  };

  const handleDeleteReminder = async (id: string) => {
    await deleteReminder(id);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormPartyId('');
    setFormAmount(0);
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
  };

  return (
    <div class="p-6 animate-fade-in">
      {/* Header */}
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <button
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400"
            onClick={() => setActiveTab('dashboard')}
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">Reminders</h1>
        </div>
        <button class="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <IconPlus class="w-4 h-4" />
          <span>Add New Reminder</span>
        </button>
      </div>

      {/* Tabs */}
      <div class="flex border-b border-gray-200 dark:border-neutral-800 mb-6">
        <button
          class={`tab-item ${activeReminderTab() === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveReminderTab('upcoming')}
        >
          Upcoming ({upcoming().length})
        </button>
        <button
          class={`tab-item ${activeReminderTab() === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveReminderTab('completed')}
        >
          Completed ({completed().length})
        </button>
      </div>

      {/* Content */}
      <Show
        when={displayedReminders().length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center py-20">
            {/* Empty State Illustration */}
            <div class="relative w-64 h-56 mb-4 flex items-center justify-center opacity-85">
              <svg class="w-full h-full" viewBox="0 0 240 200" fill="none">
                {/* Soft backdrop hill */}
                <ellipse cx="130" cy="115" rx="80" ry="45" class="fill-slate-100 dark:fill-neutral-900" />
                <ellipse cx="90" cy="125" rx="60" ry="35" class="fill-slate-200/60 dark:fill-neutral-800/40" />

                {/* Calendar Base */}
                <rect x="52" y="38" width="96" height="96" rx="14" class="fill-slate-300 dark:fill-neutral-800" />
                <rect x="54" y="40" width="92" height="92" rx="12" class="fill-white dark:fill-black" />
                <rect x="54" y="40" width="92" height="24" rx="12" class="fill-slate-200 dark:fill-neutral-800" />
                <rect x="54" y="52" width="92" height="12" class="fill-slate-200 dark:fill-neutral-800" />

                {/* Hanging Tabs / Rings */}
                <rect x="70" y="28" width="6" height="18" rx="3" class="fill-slate-400 dark:fill-neutral-600" />
                <rect x="120" y="28" width="6" height="18" rx="3" class="fill-slate-400 dark:fill-neutral-600" />

                {/* Calendar Days Matrix */}
                <circle cx="73" cy="74" r="6" class="fill-slate-200 dark:fill-neutral-800" />
                <path d="M70 74l2 2 4-4" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="94" cy="74" r="6" class="fill-slate-200 dark:fill-neutral-800" />
                <circle cx="115" cy="74" r="6" class="fill-slate-200 dark:fill-neutral-800" />
                <path d="M112 71l6 6M118 71l-6 6" class="stroke-slate-400 dark:stroke-neutral-600" stroke-width="1.2" stroke-linecap="round" />
                <circle cx="134" cy="74" r="5" class="fill-slate-100 dark:fill-neutral-900" />

                <circle cx="73" cy="92" r="6" class="fill-slate-100 dark:fill-neutral-900" />
                <circle cx="94" cy="92" r="6" class="fill-slate-200 dark:fill-neutral-800" />
                <circle cx="115" cy="92" r="6" class="fill-slate-200 dark:fill-neutral-800" />
                <path d="M112 92l2 2 4-4" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="134" cy="92" r="5" class="fill-slate-100 dark:fill-neutral-900" />

                <circle cx="73" cy="110" r="6" class="fill-slate-200 dark:fill-neutral-800" />
                <path d="M70 107l6 6M76 107l-6 6" class="stroke-slate-400 dark:stroke-neutral-600" stroke-width="1.2" stroke-linecap="round" />
                <circle cx="94" cy="110" r="6" class="fill-slate-100 dark:fill-neutral-900" />
                <circle cx="115" cy="110" r="6" class="fill-slate-100 dark:fill-neutral-900" />

                {/* Overlapping Clock */}
                <circle cx="148" cy="128" r="28" class="fill-white dark:fill-black stroke-slate-400 dark:stroke-neutral-700" stroke-width="3.5" />
                <circle cx="148" cy="128" r="2.5" class="fill-slate-500 dark:fill-neutral-400" />
                <line x1="148" y1="128" x2="136" y2="114" class="stroke-slate-500 dark:stroke-neutral-400" stroke-width="2.5" stroke-linecap="round" />
                <line x1="148" y1="128" x2="162" y2="120" class="stroke-slate-500 dark:stroke-neutral-400" stroke-width="2.5" stroke-linecap="round" />
              </svg>
            </div>

            <p class="text-base font-bold text-gray-800 dark:text-white mb-1">
              {activeReminderTab() === 'upcoming'
                ? 'No any upcoming reminders'
                : 'No completed reminders yet'}
            </p>
          </div>
        }
      >
        <div class="space-y-3">
          <For each={displayedReminders()}>
            {(reminder) => (
              <div class="stat-card flex items-center justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{reminder.title}</p>
                    <Show when={reminder.partyName}>
                      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">{reminder.partyName}</span>
                    </Show>
                  </div>
                  <div class="flex items-center gap-3 text-xs text-gray-400 dark:text-neutral-400">
                    <span class="flex items-center gap-1">
                      <IconCalendar class="w-3.5 h-3.5 text-gray-400" />
                      <span>{reminder.dueDate}</span>
                    </span>
                    <Show when={reminder.amount}>
                      <span class="font-semibold text-brand-600 dark:text-brand-400">{formatNepaliCurrency(reminder.amount!)}</span>
                    </Show>
                    <Show when={reminder.note}>
                      <span class="text-gray-400 dark:text-neutral-400">{reminder.note}</span>
                    </Show>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Show when={reminder.status === 'upcoming'}>
                    <button
                      class="px-2.5 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-xs font-medium hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors flex items-center gap-1.5"
                      onClick={() => markComplete(reminder.id)}
                    >
                      <IconCheck class="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                  </Show>
                  <button
                    class="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    onClick={() => handleDeleteReminder(reminder.id)}
                    title="Delete reminder"
                  >
                    <IconTrash class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Add Reminder Modal */}
      <Show when={showModal()}>
        <div class="modal-overlay" onClick={() => setShowModal(false)}>
          <div class="modal-content bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 class="text-lg font-heading font-bold text-gray-900 dark:text-white">Add New Reminder</h2>
              <button onClick={() => setShowModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Title *</label>
                <input
                  type="text"
                  class="input-field"
                  placeholder="e.g. Collect payment from Ram"
                  value={formTitle()}
                  onInput={(e) => setFormTitle(e.currentTarget.value)}
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Party (Optional)</label>
                <select
                  class="input-field"
                  value={formPartyId()}
                  onChange={(e) => setFormPartyId(e.currentTarget.value)}
                >
                  <option value="">— Select Party —</option>
                  <For each={parties}>
                    {(p) => <option value={p.id}>{p.name}</option>}
                  </For>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Amount (Optional)</label>
                  <input
                    type="number"
                    class="input-field"
                    placeholder="Rs. 0"
                    value={formAmount() || ''}
                    onInput={(e) => setFormAmount(Number(e.currentTarget.value))}
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    class="input-field"
                    value={formDueDate()}
                    onInput={(e) => setFormDueDate(e.currentTarget.value)}
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Note (Optional)</label>
                <textarea
                  class="input-field"
                  rows="2"
                  placeholder="Add a note..."
                  value={formNote()}
                  onInput={(e) => setFormNote(e.currentTarget.value)}
                />
              </div>
            </div>
            <div class="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3">
              <button class="btn-outline" onClick={() => { resetForm(); setShowModal(false); }}>
                Cancel
              </button>
              <button class="btn-primary" onClick={handleAddReminder}>
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
