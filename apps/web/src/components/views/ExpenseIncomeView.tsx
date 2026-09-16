import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  expenses,
  setExpenses,
  incomes,
  setIncomes,
  persistState,
  setActiveTab,
  type ExpenseRecord,
  type IncomeRecord,
} from '../../db/localDb';
import { formatNepaliCurrency } from '@byapar/core';
import { IconExpense, IconIncome, IconPlus, IconTrash, IconX } from '../icons';

const EXPENSE_CATEGORIES = [
  'Rent', 'Salary', 'Utilities', 'Transport', 'Supplies', 'Food', 'Marketing', 'Other'
];

const INCOME_SOURCES = [
  'Sales', 'Service', 'Commission', 'Interest', 'Rental Income', 'Other'
];

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'Fonepay', 'eSewa', 'Khalti', 'Cheque'];

interface ExpenseIncomeViewProps {
  type: 'expense' | 'income';
}

export const ExpenseIncomeView: Component<ExpenseIncomeViewProps> = (props) => {
  const [showModal, setShowModal] = createSignal(false);
  const [formCategory, setFormCategory] = createSignal('');
  const [formAmount, setFormAmount] = createSignal(0);
  const [formPaymentMode, setFormPaymentMode] = createSignal('Cash');
  const [formDate, setFormDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = createSignal('');

  const isExpense = () => props.type === 'expense';
  const categories = () => isExpense() ? EXPENSE_CATEGORIES : INCOME_SOURCES;

  const records = createMemo(() => {
    return isExpense()
      ? [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [...incomes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  const totalAmount = createMemo(() => {
    return records().reduce((sum, r) => sum + r.amount, 0);
  });

  const handleAdd = () => {
    if (!formCategory() || !formAmount()) return;

    if (isExpense()) {
      const rec: ExpenseRecord = {
        id: crypto.randomUUID(),
        category: formCategory(),
        amount: formAmount(),
        paymentMode: formPaymentMode(),
        date: formDate(),
        note: formNote() || undefined,
        createdAt: new Date().toISOString(),
      };
      setExpenses((draft) => { draft.unshift(rec); });
    } else {
      const rec: IncomeRecord = {
        id: crypto.randomUUID(),
        source: formCategory(),
        amount: formAmount(),
        paymentMode: formPaymentMode(),
        date: formDate(),
        note: formNote() || undefined,
        createdAt: new Date().toISOString(),
      };
      setIncomes((draft) => { draft.unshift(rec); });
    }

    persistState();
    resetForm();
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (isExpense()) {
      const idx = expenses.findIndex((e) => e.id === id);
      if (idx >= 0) setExpenses((d) => { d.splice(idx, 1); });
    } else {
      const idx = incomes.findIndex((i) => i.id === id);
      if (idx >= 0) setIncomes((d) => { d.splice(idx, 1); });
    }
    persistState();
  };

  const resetForm = () => {
    setFormCategory('');
    setFormAmount(0);
    setFormPaymentMode('Cash');
    setFormDate(new Date().toISOString().split('T')[0]);
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
          <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">
            {isExpense() ? 'Expenses' : 'Incomes'}
          </h1>
        </div>
        <button
          class={`flex items-center gap-2 ${isExpense() ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => setShowModal(true)}
        >
          <IconPlus class="w-4 h-4" />
          <span>Add {isExpense() ? 'Expense' : 'Income'}</span>
        </button>
      </div>

      {/* Summary Card */}
      <div class="stat-card mb-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-500 dark:text-neutral-400 mb-0.5">Total {isExpense() ? 'Expenses' : 'Income'}</p>
            <p class={`text-2xl font-bold ${isExpense() ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatNepaliCurrency(totalAmount())}
            </p>
          </div>
          <div class={`w-12 h-12 rounded-xl flex items-center justify-center ${isExpense() ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'}`}>
            {isExpense() ? (
              <IconExpense class="w-6 h-6" />
            ) : (
              <IconIncome class="w-6 h-6" />
            )}
          </div>
        </div>
      </div>

      {/* Records List */}
      <Show
        when={records().length > 0}
        fallback={
          <div class="text-center py-16 flex flex-col items-center">
            <div class={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${isExpense() ? 'bg-red-50 dark:bg-red-950/40 text-red-500' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'}`}>
              {isExpense() ? <IconExpense class="w-8 h-8" /> : <IconIncome class="w-8 h-8" />}
            </div>
            <p class="text-sm font-semibold text-gray-700 dark:text-white mb-1">
              No {isExpense() ? 'expenses' : 'income'} recorded yet
            </p>
            <p class="text-xs text-gray-400 dark:text-neutral-500 mb-4">Start tracking your business {isExpense() ? 'expenses' : 'income'}.</p>
            <button
              class={`flex items-center gap-1.5 text-xs ${isExpense() ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => setShowModal(true)}
            >
              <IconPlus class="w-3.5 h-3.5" />
              <span>Add {isExpense() ? 'Expense' : 'Income'}</span>
            </button>
          </div>
        }
      >
        <div class="space-y-2">
          <For each={records()}>
            {(rec) => {
              const cat = isExpense() ? (rec as ExpenseRecord).category : (rec as IncomeRecord).source;
              return (
                <div class="stat-card flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3 flex-1">
                    <div class={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isExpense() ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {cat[0]}
                    </div>
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">{cat}</p>
                      <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-neutral-500">
                        <span>{rec.date}</span>
                        <span>•</span>
                        <span>{rec.paymentMode}</span>
                        <Show when={rec.note}>
                          <span>• {rec.note}</span>
                        </Show>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class={`text-sm font-bold ${isExpense() ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {isExpense() ? '−' : '+'} {formatNepaliCurrency(rec.amount)}
                    </span>
                    <button
                      class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      onClick={() => handleDelete(rec.id)}
                      title="Delete entry"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* Add Modal */}
      <Show when={showModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowModal(false)}>
          <div class="modal-content bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 class="text-lg font-heading font-bold text-gray-900 dark:text-white">
                Add {isExpense() ? 'Expense' : 'Income'}
              </h2>
              <button onClick={() => setShowModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">
                  {isExpense() ? 'Category' : 'Source'} *
                </label>
                <select class="input-field" value={formCategory()} onChange={(e) => setFormCategory(e.currentTarget.value)}>
                  <option value="">— Select —</option>
                  <For each={categories()}>
                    {(c) => <option value={c}>{c}</option>}
                  </For>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Amount *</label>
                  <input
                    type="number"
                    class="input-field"
                    placeholder="Rs. 0"
                    value={formAmount() || ''}
                    onInput={(e) => setFormAmount(Number(e.currentTarget.value))}
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Date *</label>
                  <input
                    type="date"
                    class="input-field"
                    value={formDate()}
                    onInput={(e) => setFormDate(e.currentTarget.value)}
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Payment Mode</label>
                <select class="input-field" value={formPaymentMode()} onChange={(e) => setFormPaymentMode(e.currentTarget.value)}>
                  <For each={PAYMENT_MODES}>
                    {(m) => <option value={m}>{m}</option>}
                  </For>
                </select>
              </div>

              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-neutral-300 mb-1.5">Note (Optional)</label>
                <input
                  type="text"
                  class="input-field"
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
              <button
                class={isExpense() ? 'btn-danger' : 'btn-primary'}
                onClick={handleAdd}
              >
                Save {isExpense() ? 'Expense' : 'Income'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
