import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  reminders,
  parties,
  addReminder,
  updateReminder,
  deleteReminder,
  setActiveTab,
  currentBusiness,
  type Reminder,
} from '../../db/localDb';
import { createDebtorReminder, createSupplierPayableReminder } from '../../services/notificationService';
import { formatNepaliCurrency } from '@byapar/core';
import { currentLang } from '../../services/i18n';
import { IconPlus, IconCalendar, IconCheck, IconTrash, IconX, IconClock } from '../icons';

export const RemindersView: Component = () => {
  const [activeReminderTab, setActiveReminderTab] = createSignal<'upcoming' | 'completed'>('upcoming');
  const [typeFilter, setTypeFilter] = createSignal<'all' | 'payment_reminder' | 'task_reminder' | 'event_reminder'>('all');
  const [showModal, setShowModal] = createSignal(false);

  // Form state
  const [formTitle, setFormTitle] = createSignal('');
  const [formPartyId, setFormPartyId] = createSignal('');
  const [formAmount, setFormAmount] = createSignal(0);
  const [formDueDate, setFormDueDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [formDueTime, setFormDueTime] = createSignal('10:00');
  const [formReminderType, setFormReminderType] = createSignal<'payment_reminder' | 'task_reminder' | 'event_reminder'>('payment_reminder');
  const [formFrequency, setFormFrequency] = createSignal<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [formNote, setFormNote] = createSignal('');

  const upcoming = createMemo(() => reminders.filter((r) => r.status === 'upcoming'));
  const completed = createMemo(() => reminders.filter((r) => r.status === 'completed'));

  const displayedReminders = createMemo(() => {
    const list = activeReminderTab() === 'upcoming' ? upcoming() : completed();
    if (typeFilter() === 'all') return list;
    return list.filter((r) => r.reminderType === typeFilter());
  });

  const handlePartySelect = (partyId: string) => {
    setFormPartyId(partyId);
    if (!partyId) return;
    const p = parties.find((item) => item.id === partyId);
    if (p) {
      if (!formTitle()) {
        setFormTitle(
          currentLang() === 'ne' ? `${p.name} - भुक्तानी रिमाइन्डर` : `Payment reminder for ${p.name}`
        );
      }
      if (p.currentBalance > 0 && formAmount() === 0) {
        setFormAmount(p.currentBalance);
      }
    }
  };

  const handleAddReminder = async () => {
    if (!formTitle().trim()) return;
    const party = formPartyId() ? parties.find((p) => p.id === formPartyId()) : undefined;

    await addReminder({
      title: formTitle(),
      partyId: formPartyId() || undefined,
      partyName: party?.name,
      amount: formAmount() || undefined,
      dueDate: formDueDate(),
      dueTime: formDueTime(),
      reminderType: formReminderType(),
      note: formNote() || undefined,
      status: 'upcoming',
    });

    // Synchronize to cloud notifications
    if (formReminderType() === 'payment_reminder' && formPartyId() && party) {
      await createDebtorReminder({
        businessId: currentBusiness.id,
        partyId: party.id,
        partyName: party.name,
        partyPhone: party.phone,
        amount: formAmount() || party.currentBalance || 0,
        dueDate: formDueDate(),
        frequency: formFrequency(),
        notes: formNote(),
      });
    }

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
          <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">Reminders</h1>
        </div>
        <button class="btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
          <IconPlus class="w-4 h-4" />
          <span>Add New Reminder</span>
        </button>
      </div>

      {/* Tabs & Type Filter Pills */}
      <div class="flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-neutral-800 pb-4 mb-6 gap-3">
        <div class="flex items-center gap-2">
          <button
            class={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeReminderTab() === 'upcoming'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
            }`}
            onClick={() => setActiveReminderTab('upcoming')}
          >
            {currentLang() === 'ne' ? 'आगामी रिमाइन्डर' : 'Upcoming'} ({upcoming().length})
          </button>
          <button
            class={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeReminderTab() === 'completed'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
            }`}
            onClick={() => setActiveReminderTab('completed')}
          >
            {currentLang() === 'ne' ? 'सम्पन्न भइसकेका' : 'Completed'} ({completed().length})
          </button>
        </div>

        {/* Filter by Type */}
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-gray-400 dark:text-neutral-500 text-[11px] font-semibold mr-1">
            {currentLang() === 'ne' ? 'प्रकार:' : 'Type:'}
          </span>
          {(['all', 'payment_reminder', 'task_reminder', 'event_reminder'] as const).map((t) => (
            <button
              onClick={() => setTypeFilter(t)}
              class={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                typeFilter() === t
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-black font-bold'
                  : 'bg-gray-100 dark:bg-neutral-800/80 text-gray-600 dark:text-neutral-400 hover:bg-gray-200'
              }`}
            >
              {t === 'all'
                ? (currentLang() === 'ne' ? 'सबै' : 'All')
                : t === 'payment_reminder'
                ? (currentLang() === 'ne' ? 'भुक्तानी' : 'Payment')
                : t === 'task_reminder'
                ? (currentLang() === 'ne' ? 'कार्य' : 'Task')
                : (currentLang() === 'ne' ? 'कार्यक्रम' : 'Event')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <Show
        when={displayedReminders().length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-neutral-800/60 flex items-center justify-center text-gray-400 mb-3">
              <IconCalendar class="w-8 h-8 opacity-60" />
            </div>
            <p class="text-base font-bold text-gray-800 dark:text-white mb-1">
              {activeReminderTab() === 'upcoming'
                ? (currentLang() === 'ne' ? 'कुनै आगामी रिमाइन्डर छैन' : 'No upcoming reminders')
                : (currentLang() === 'ne' ? 'कुनै सम्पन्न रिमाइन्डर छैन' : 'No completed reminders yet')}
            </p>
            <p class="text-xs text-gray-400 dark:text-neutral-500">
              {currentLang() === 'ne'
                ? 'नयाँ भुक्तानी, कार्य वा बैठक रिमाइन्डर थप्न माथिको बटन प्रयोग गर्नुहोस्।'
                : 'Click "Add New Reminder" to schedule payment dues, store tasks, or events.'}
            </p>
          </div>
        }
      >
        <div class="space-y-3">
          <For each={displayedReminders()}>
            {(reminder) => (
              <div class="stat-card flex items-center justify-between gap-4 p-4 hover:border-gray-300 dark:hover:border-neutral-700 transition">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1.5">
                    {/* Type Tag */}
                    <span class={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      reminder.reminderType === 'task_reminder'
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40'
                        : reminder.reminderType === 'event_reminder'
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                    }`}>
                      {reminder.reminderType === 'task_reminder'
                        ? (currentLang() === 'ne' ? 'कार्य' : 'Task')
                        : reminder.reminderType === 'event_reminder'
                        ? (currentLang() === 'ne' ? 'कार्यक्रम' : 'Event')
                        : (currentLang() === 'ne' ? 'भुक्तानी' : 'Payment')}
                    </span>

                    <p class="text-sm font-bold text-gray-900 dark:text-white">{reminder.title}</p>

                    <Show when={reminder.partyName}>
                      <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 font-medium">
                        {reminder.partyName}
                      </span>
                    </Show>
                  </div>

                  <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-neutral-400">
                    <span class="flex items-center gap-1 font-mono">
                      <IconCalendar class="w-3.5 h-3.5 text-gray-400" />
                      <span>{reminder.dueDate}</span>
                    </span>

                    <Show when={reminder.dueTime}>
                      <span class="flex items-center gap-1 font-mono">
                        <IconClock class="w-3.5 h-3.5 text-gray-400" />
                        <span>{reminder.dueTime}</span>
                      </span>
                    </Show>

                    <Show when={reminder.amount}>
                      <span class="font-extrabold text-brand-600 dark:text-brand-400">
                        {formatNepaliCurrency(reminder.amount!)}
                      </span>
                    </Show>

                    <Show when={reminder.note}>
                      <span class="text-gray-400 dark:text-neutral-500 italic">
                        • {reminder.note}
                      </span>
                    </Show>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <Show when={reminder.status === 'upcoming'}>
                    <button
                      class="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-1.5"
                      onClick={() => markComplete(reminder.id)}
                    >
                      <IconCheck class="w-3.5 h-3.5" />
                      <span>{currentLang() === 'ne' ? 'सकियो' : 'Done'}</span>
                    </button>
                  </Show>
                  <button
                    class="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    onClick={() => handleDeleteReminder(reminder.id)}
                    title={currentLang() === 'ne' ? 'हटाउनुहोस्' : 'Delete reminder'}
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
        <div class="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div class="modal-content !max-w-md bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 class="text-base font-heading font-bold text-gray-900 dark:text-white">
                {currentLang() === 'ne' ? 'नयाँ रिमाइन्डर थप्नुहोस्' : 'Add New Reminder'}
              </h2>
              <button onClick={() => setShowModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1.5">
                  {currentLang() === 'ne' ? 'रिमाइन्डर प्रकार' : 'Reminder Type'}
                </label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    class={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                      formReminderType() === 'payment_reminder'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-400'
                    }`}
                    onClick={() => setFormReminderType('payment_reminder')}
                  >
                    {currentLang() === 'ne' ? 'भुक्तानी' : 'Payment'}
                  </button>
                  <button
                    type="button"
                    class={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                      formReminderType() === 'task_reminder'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-400'
                    }`}
                    onClick={() => setFormReminderType('task_reminder')}
                  >
                    {currentLang() === 'ne' ? 'कार्य / फलोअप' : 'Task / Work'}
                  </button>
                  <button
                    type="button"
                    class={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                      formReminderType() === 'event_reminder'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-400'
                    }`}
                    onClick={() => setFormReminderType('event_reminder')}
                  >
                    {currentLang() === 'ne' ? 'कार्यक्रम / बैठक' : 'Event'}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">
                  {currentLang() === 'ne' ? 'शीर्षक *' : 'Title *'}
                </label>
                <input
                  type="text"
                  class="input-field"
                  placeholder={currentLang() === 'ne' ? 'जस्तै: रामबाट भुक्तानी उठाउने' : 'e.g. Collect payment from Ram'}
                  value={formTitle()}
                  onInput={(e) => setFormTitle(e.currentTarget.value)}
                  autofocus
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">
                  {currentLang() === 'ne' ? 'सम्पर्क / ग्राहक (वैकल्पिक)' : 'Contact / Party (Optional)'}
                </label>
                <select
                  class="input-field"
                  value={formPartyId()}
                  onChange={(e) => handlePartySelect(e.currentTarget.value)}
                >
                  <option value="">{currentLang() === 'ne' ? '— सम्पर्क छान्नुहोस् —' : '— Select Party —'}</option>
                  <For each={parties}>
                    {(p) => <option value={p.id}>{p.name} {p.currentBalance > 0 ? `(Rs. ${p.currentBalance} due)` : ''}</option>}
                  </For>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">
                    {currentLang() === 'ne' ? 'मिति *' : 'Due Date *'}
                  </label>
                  <input
                    type="date"
                    class="input-field font-mono"
                    value={formDueDate()}
                    onInput={(e) => setFormDueDate(e.currentTarget.value)}
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">
                    {currentLang() === 'ne' ? 'समय' : 'Due Time'}
                  </label>
                  <input
                    type="time"
                    class="input-field font-mono"
                    value={formDueTime()}
                    onInput={(e) => setFormDueTime(e.currentTarget.value)}
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">
                    {currentLang() === 'ne' ? 'रकम (रु.)' : 'Amount (Optional)'}
                  </label>
                  <input
                    type="number"
                    class="input-field font-mono"
                    placeholder="Rs. 0"
                    value={formAmount() || ''}
                    onInput={(e) => setFormAmount(Number(e.currentTarget.value))}
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">
                    {currentLang() === 'ne' ? 'दोहोरिने' : 'Repeat'}
                  </label>
                  <select
                    class="input-field"
                    value={formFrequency()}
                    onChange={(e) => setFormFrequency(e.currentTarget.value as any)}
                  >
                    <option value="once">{currentLang() === 'ne' ? 'एक पटक' : 'One-time'}</option>
                    <option value="daily">{currentLang() === 'ne' ? 'दैनिक' : 'Daily'}</option>
                    <option value="weekly">{currentLang() === 'ne' ? 'साप्ताहिक' : 'Weekly'}</option>
                    <option value="monthly">{currentLang() === 'ne' ? 'मासिक' : 'Monthly'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">
                  {currentLang() === 'ne' ? 'कैफियत / नोट' : 'Note (Optional)'}
                </label>
                <textarea
                  class="input-field"
                  rows="2"
                  placeholder={currentLang() === 'ne' ? 'कुनै अतिरिक्त विवरण...' : 'Add a note...'}
                  value={formNote()}
                  onInput={(e) => setFormNote(e.currentTarget.value)}
                />
              </div>
            </div>

            <div class="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3">
              <button class="btn-outline text-xs" onClick={() => { resetForm(); setShowModal(false); }}>
                {currentLang() === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
              </button>
              <button class="btn-primary text-xs" onClick={handleAddReminder}>
                {currentLang() === 'ne' ? 'रिमाइन्डर सेभ गर्नुहोस्' : 'Save Reminder'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

