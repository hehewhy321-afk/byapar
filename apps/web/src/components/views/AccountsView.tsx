import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  accounts,
  accountTransactions,
  depositMoney,
  withdrawMoney,
  transferMoney,
  addBankAccount,
  editBankAccount,
  deleteBankAccount,
  setActiveTab,
  type BankAccount,
  type AccountTransaction,
} from '../../db/localDb';
import { formatNepaliCurrency } from '@byapar/core';
import { currentLang } from '../../services/i18n';
import { IconAccounts, IconQrCode, IconPlus, IconX, IconTransfer } from '../icons';

export const AccountsView: Component = () => {
  // Modals state
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [showEditModal, setShowEditModal] = createSignal(false);
  const [showDepositModal, setShowDepositModal] = createSignal(false);
  const [showWithdrawModal, setShowWithdrawModal] = createSignal(false);
  const [showTransferModal, setShowTransferModal] = createSignal(false);

  // Selected account for actions
  const [selectedAccountId, setSelectedAccountId] = createSignal<string>('');
  const selectedAccount = () => accounts.find((a) => a.id === selectedAccountId());

  // Form states
  const [formName, setFormName] = createSignal('');
  const [formType, setFormType] = createSignal<'cash' | 'bank' | 'wallet'>('bank');
  const [formBankName, setFormBankName] = createSignal('');
  const [formAccNumber, setFormAccNumber] = createSignal('');
  const [formBranch, setFormBranch] = createSignal('');
  const [formBalance, setFormBalance] = createSignal(0);

  // Money action form states
  const [actionAmount, setActionAmount] = createSignal(0);
  const [actionCategory, setActionCategory] = createSignal('');
  const [actionNotes, setActionNotes] = createSignal('');
  const [actionDate, setActionDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [transferTargetId, setTransferTargetId] = createSignal('');

  // Transactions Filter
  const [filterAccount, setFilterAccount] = createSignal<string>('all');
  const [filterType, setFilterType] = createSignal<string>('all');

  const totalBankBalance = createMemo(() => accounts.reduce((sum, a) => sum + a.balance, 0));

  const filteredTransactions = createMemo(() => {
    return accountTransactions.filter((tx) => {
      if (filterAccount() !== 'all' && tx.accountId !== filterAccount() && tx.toAccountId !== filterAccount()) {
        return false;
      }
      if (filterType() !== 'all' && tx.transactionType !== filterType()) {
        return false;
      }
      return true;
    });
  });

  const totalIn = createMemo(() =>
    filteredTransactions()
      .filter((t) => t.transactionType === 'deposit' || t.transactionType === 'transfer_in')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const totalOut = createMemo(() =>
    filteredTransactions()
      .filter((t) => t.transactionType === 'withdrawal' || t.transactionType === 'transfer_out')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  // Add Account
  const handleAddAccount = async (e: Event) => {
    e.preventDefault();
    if (!formName()) return;

    await addBankAccount({
      name: formName(),
      accountType: formType(),
      bankName: formBankName() || formName(),
      accountNumber: formAccNumber() || undefined,
      branch: formBranch() || undefined,
      balance: formBalance() || 0,
    });

    resetForms();
    setShowAddModal(false);
  };

  // Edit Account
  const handleEditAccount = async (e: Event) => {
    e.preventDefault();
    const id = selectedAccountId();
    if (!id) return;

    await editBankAccount(id, {
      name: formName(),
      bankName: formBankName(),
      accountNumber: formAccNumber(),
      branch: formBranch(),
    });

    setShowEditModal(false);
  };

  // Delete Account
  const handleDeleteAccount = async (id: string) => {
    if (confirm('Are you sure you want to delete this account?')) {
      await deleteBankAccount(id);
    }
  };

  // Deposit Money
  const handleDeposit = async (e: Event) => {
    e.preventDefault();
    const id = selectedAccountId();
    if (!id || actionAmount() <= 0) return;

    await depositMoney(id, actionAmount(), actionCategory() || 'Cash Deposit', actionNotes(), actionDate());
    resetForms();
    setShowDepositModal(false);
  };

  // Withdraw Money
  const handleWithdraw = async (e: Event) => {
    e.preventDefault();
    const id = selectedAccountId();
    if (!id || actionAmount() <= 0) return;

    await withdrawMoney(id, actionAmount(), actionCategory() || 'Cash Withdrawal', actionNotes(), actionDate());
    resetForms();
    setShowWithdrawModal(false);
  };

  // Transfer Money
  const handleTransfer = async (e: Event) => {
    e.preventDefault();
    const fromId = selectedAccountId();
    const toId = transferTargetId();
    if (!fromId || !toId || actionAmount() <= 0) return;

    await transferMoney(fromId, toId, actionAmount(), actionNotes(), actionDate());
    resetForms();
    setShowTransferModal(false);
  };

  const resetForms = () => {
    setFormName('');
    setFormType('bank');
    setFormBankName('');
    setFormAccNumber('');
    setFormBranch('');
    setFormBalance(0);
    setActionAmount(0);
    setActionCategory('');
    setActionNotes('');
    setTransferTargetId('');
  };

  const openDeposit = (accId: string) => {
    setSelectedAccountId(accId);
    setActionCategory('Deposit');
    setShowDepositModal(true);
  };

  const openWithdraw = (accId: string) => {
    setSelectedAccountId(accId);
    setActionCategory('Withdrawal');
    setShowWithdrawModal(true);
  };

  const openTransfer = (accId: string) => {
    setSelectedAccountId(accId);
    const otherAcc = accounts.find((a) => a.id !== accId);
    if (otherAcc) setTransferTargetId(otherAcc.id);
    setShowTransferModal(true);
  };

  const openEdit = (acc: BankAccount) => {
    setSelectedAccountId(acc.id);
    setFormName(acc.name);
    setFormType(acc.accountType);
    setFormBankName(acc.bankName || '');
    setFormAccNumber(acc.accountNumber || '');
    setFormBranch(acc.branch || '');
    setShowEditModal(true);
  };

  const renderAccountIcon = (type: string) => {
    if (type === 'wallet') return <IconQrCode class="w-5 h-5 text-red-500" />;
    return <IconAccounts class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
  };

  return (
    <div class="p-6 space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400"
            onClick={() => setActiveTab('dashboard')}
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div>
            <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">Manage Accounts & Cash Flow</h1>
            <p class="text-xs text-gray-500 dark:text-neutral-400">Track bank balances, cash drawers, digital wallets, and money transfers</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn-primary flex items-center gap-2 text-xs"
            onClick={() => {
              resetForms();
              setShowAddModal(true);
            }}
          >
            <IconPlus class="w-4 h-4" />
            <span>Add New Account</span>
          </button>
        </div>
      </div>

      {/* Top Total & Statistics Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stat-card bg-gradient-to-br from-emerald-50 via-white to-white dark:from-neutral-900 dark:via-black dark:to-black border-emerald-200 dark:border-neutral-800 !p-5">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider block">
            Total Available Balance
          </span>
          <span class="text-3xl font-black text-gray-900 dark:text-white mt-1 block font-heading">
            {formatNepaliCurrency(totalBankBalance())}
          </span>
          <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
            Across {accounts.length} active business accounts
          </span>
        </div>

        <div class="stat-card !p-5 border-gray-200 dark:border-neutral-800">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider block">
            Filtered Total In (Deposits / Inflows)
          </span>
          <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block font-heading">
            + {formatNepaliCurrency(totalIn())}
          </span>
          <span class="text-xs text-gray-400 dark:text-neutral-500 mt-1 block">
            {filteredTransactions().length} total recorded transactions
          </span>
        </div>

        <div class="stat-card !p-5 border-gray-200 dark:border-neutral-800">
          <span class="text-xs text-gray-500 dark:text-neutral-400 font-semibold uppercase tracking-wider block">
            Filtered Total Out (Withdrawals / Outflows)
          </span>
          <span class="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block font-heading">
            - {formatNepaliCurrency(totalOut())}
          </span>
          <span class="text-xs text-gray-400 dark:text-neutral-500 mt-1 block">
            Net Change: {formatNepaliCurrency(totalIn() - totalOut())}
          </span>
        </div>
      </div>

      {/* Accounts Grid */}
      <div>
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-neutral-300 mb-3">Active Accounts ({accounts.length})</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <For each={accounts}>
            {(acc) => (
              <div class="stat-card flex flex-col justify-between !p-5 group hover:border-emerald-500/50 transition-all shadow-sm">
                <div>
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-neutral-900 flex items-center justify-center">
                      {renderAccountIcon(acc.accountType)}
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">
                        {acc.accountType}
                      </span>
                      <button
                        onClick={() => openEdit(acc)}
                        class="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                        title="Edit Account"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        class="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800"
                        title="Delete Account"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <h3 class="font-bold text-base text-gray-900 dark:text-white mb-0.5">{acc.name}</h3>
                  <Show when={acc.bankName}>
                    <p class="text-xs text-gray-500 dark:text-neutral-400">{acc.bankName}</p>
                  </Show>
                  <Show when={acc.accountNumber}>
                    <p class="text-xs font-mono text-gray-400 dark:text-neutral-500 mt-0.5">A/C: {acc.accountNumber}</p>
                  </Show>
                  <Show when={acc.branch}>
                    <p class="text-[11px] text-gray-400 dark:text-neutral-500">Branch: {acc.branch}</p>
                  </Show>
                </div>

                <div class="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800">
                  <div class="flex items-baseline justify-between mb-3">
                    <span class="text-xs text-gray-400 dark:text-neutral-500 font-medium">Balance:</span>
                    <span class="text-xl font-black text-emerald-600 dark:text-emerald-400 font-heading">
                      {formatNepaliCurrency(acc.balance)}
                    </span>
                  </div>

                  {/* Money Management Quick Actions */}
                  <div class="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => openDeposit(acc.id)}
                      class="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold text-center transition"
                    >
                      + Add Money
                    </button>
                    <button
                      onClick={() => openWithdraw(acc.id)}
                      class="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 text-xs font-bold text-center transition"
                    >
                      - Reduce
                    </button>
                    <button
                      onClick={() => openTransfer(acc.id)}
                      class="px-2 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-950/70 text-sky-700 dark:text-sky-300 text-xs font-bold text-center transition flex items-center justify-center gap-1"
                    >
                      <IconTransfer class="w-3 h-3" />
                      <span>Transfer</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* Account Transactions History & Full Report */}
      <div class="stat-card !p-5 border-gray-200 dark:border-neutral-800">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-neutral-800">
          <div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white">Account Transactions History & Report</h2>
            <p class="text-xs text-gray-500 dark:text-neutral-400">Complete audit ledger of all cash deposits, withdrawals, and inter-account transfers</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <select
              value={filterAccount()}
              onChange={(e) => setFilterAccount(e.currentTarget.value)}
              class="input-field !py-1 !text-xs !w-auto"
            >
              <option value="all">All Accounts</option>
              <For each={accounts}>
                {(acc) => <option value={acc.id}>{acc.name}</option>}
              </For>
            </select>
            <select
              value={filterType()}
              onChange={(e) => setFilterType(e.currentTarget.value)}
              class="input-field !py-1 !text-xs !w-auto"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits / Added</option>
              <option value="withdrawal">Withdrawals / Reduced</option>
              <option value="transfer_in">Transfers In</option>
              <option value="transfer_out">Transfers Out</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div class="overflow-x-auto mt-4">
          <table class="w-full text-left text-xs">
            <thead class="bg-gray-50 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 uppercase font-semibold">
              <tr>
                <th class="py-2.5 px-3">Date</th>
                <th class="py-2.5 px-3">Account</th>
                <th class="py-2.5 px-3">Type</th>
                <th class="py-2.5 px-3">Category / Reason</th>
                <th class="py-2.5 px-3">Notes & Reference</th>
                <th class="py-2.5 px-3 text-right">Amount</th>
                <th class="py-2.5 px-3 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-neutral-800">
              <Show
                when={filteredTransactions().length > 0}
                fallback={
                  <tr>
                    <td colspan="7" class="text-center py-8 text-gray-400 dark:text-neutral-500">
                      No account transactions recorded yet. Use "+ Add Money" or "Transfer" above.
                    </td>
                  </tr>
                }
              >
                <For each={filteredTransactions()}>
                  {(tx) => (
                    <tr class="hover:bg-gray-50 dark:hover:bg-neutral-900/40 transition">
                      <td class="py-3 px-3 font-mono text-gray-600 dark:text-neutral-300">
                        {tx.dateAd} {tx.dateBs ? `(${tx.dateBs})` : ''}
                      </td>
                      <td class="py-3 px-3 font-medium text-gray-900 dark:text-white">
                        {tx.accountName || accounts.find((a) => a.id === tx.accountId)?.name || 'Account'}
                        <Show when={tx.toAccountName}>
                          <span class="text-gray-400 dark:text-neutral-500 text-[11px] block">
                            → {tx.toAccountName}
                          </span>
                        </Show>
                      </td>
                      <td class="py-3 px-3">
                        <span
                          class={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {tx.transactionType.replace('_', ' ')}
                        </span>
                      </td>
                      <td class="py-3 px-3 text-gray-700 dark:text-neutral-300">{tx.category || '-'}</td>
                      <td class="py-3 px-3 text-gray-500 dark:text-neutral-400">
                        {tx.notes || tx.reference || '-'}
                      </td>
                      <td
                        class={`py-3 px-3 text-right font-black font-heading ${
                          tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {tx.transactionType === 'deposit' || tx.transactionType === 'transfer_in' ? '+' : '-'}
                        {formatNepaliCurrency(tx.amount)}
                      </td>
                      <td class="py-3 px-3 text-right font-mono text-gray-600 dark:text-neutral-300">
                        {formatNepaliCurrency(tx.balanceAfter)}
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Add New Account Modal */}
      <Show when={showAddModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div class="modal-content p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800 max-w-md" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">Add New Account</h3>
              <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" onClick={() => setShowAddModal(false)}>
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Account Display Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Current Account, Cash Counter #1"
                  value={formName()}
                  onInput={(e) => setFormName(e.currentTarget.value)}
                  class="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Account Type *</label>
                <select
                  value={formType()}
                  onChange={(e) => setFormType(e.currentTarget.value as any)}
                  class="input-field text-xs"
                >
                  <option value="bank">Bank Account</option>
                  <option value="cash">Cash In Hand / Counter</option>
                  <option value="wallet">Digital Wallet (eSewa, Khalti, Fonepay)</option>
                </select>
              </div>

              <Show when={formType() === 'bank'}>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Nabil Bank, Global IME Bank, NIC Asia"
                    value={formBankName()}
                    onInput={(e) => setFormBankName(e.currentTarget.value)}
                    class="input-field text-xs"
                  />
                </div>
              </Show>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Account / Mobile Number</label>
                <input
                  type="text"
                  placeholder="Account number or wallet ID"
                  value={formAccNumber()}
                  onInput={(e) => setFormAccNumber(e.currentTarget.value)}
                  class="input-field text-xs font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Branch (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. New Road, Putalisadak"
                  value={formBranch()}
                  onInput={(e) => setFormBranch(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">{currentLang() === 'ne' ? 'सुरुवाती मौज्दात (रु.)' : 'Opening Balance (Rs.)'}</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formBalance() || ''}
                  onInput={(e) => setFormBalance(Number(e.currentTarget.value))}
                  class="input-field text-xs font-mono"
                />
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <button type="button" class="btn-outline text-xs" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" class="btn-primary text-xs">
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* 2. Edit Account Modal */}
      <Show when={showEditModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowEditModal(false)}>
          <div class="modal-content p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800 max-w-md" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">Edit Account</h3>
              <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" onClick={() => setShowEditModal(false)}>
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditAccount} class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Account Display Name</label>
                <input
                  type="text"
                  value={formName()}
                  onInput={(e) => setFormName(e.currentTarget.value)}
                  class="input-field text-xs"
                  required
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formBankName()}
                  onInput={(e) => setFormBankName(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formAccNumber()}
                  onInput={(e) => setFormAccNumber(e.currentTarget.value)}
                  class="input-field text-xs font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Branch</label>
                <input
                  type="text"
                  value={formBranch()}
                  onInput={(e) => setFormBranch(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <button type="button" class="btn-outline text-xs" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" class="btn-primary text-xs">
                  Update Account
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* 3. Add Money (Deposit) Modal */}
      <Show when={showDepositModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowDepositModal(false)}>
          <div class="modal-content p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800 max-w-md" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">Add Money to {selectedAccount()?.name}</h3>
              <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" onClick={() => setShowDepositModal(false)}>
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeposit} class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">{currentLang() === 'ne' ? 'थप रकम (रु.) *' : 'Deposit Amount (Rs.) *'}</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={actionAmount() || ''}
                  onInput={(e) => setActionAmount(Number(e.currentTarget.value))}
                  class="input-field text-base font-bold font-mono text-emerald-600"
                  required
                  min="1"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Deposit Category / Source</label>
                <input
                  type="text"
                  placeholder="e.g. Daily Cash Deposit, Owner Capital, Direct Deposit"
                  value={actionCategory()}
                  onInput={(e) => setActionCategory(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Date</label>
                <input
                  type="date"
                  value={actionDate()}
                  onInput={(e) => setActionDate(e.currentTarget.value)}
                  class="input-field text-xs font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Notes / Remarks</label>
                <textarea
                  placeholder="Optional transaction reference or bank voucher number"
                  value={actionNotes()}
                  onInput={(e) => setActionNotes(e.currentTarget.value)}
                  class="input-field text-xs h-20"
                />
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <button type="button" class="btn-outline text-xs" onClick={() => setShowDepositModal(false)}>
                  Cancel
                </button>
                <button type="submit" class="btn-primary text-xs !bg-emerald-600 hover:!bg-emerald-700">
                  Confirm Deposit (+रु. {actionAmount()})
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* 4. Reduce Money (Withdrawal) Modal */}
      <Show when={showWithdrawModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowWithdrawModal(false)}>
          <div class="modal-content p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800 max-w-md" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">Reduce Money from {selectedAccount()?.name}</h3>
              <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" onClick={() => setShowWithdrawModal(false)}>
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleWithdraw} class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">{currentLang() === 'ne' ? 'झिक्ने रकम (रु.) *' : 'Withdrawal Amount (Rs.) *'}</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={actionAmount() || ''}
                  onInput={(e) => setActionAmount(Number(e.currentTarget.value))}
                  class="input-field text-base font-bold font-mono text-rose-600"
                  required
                  min="1"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Reason / Category</label>
                <input
                  type="text"
                  placeholder="e.g. Cash Withdrawal, Petty Cash, Owner Drawing"
                  value={actionCategory()}
                  onInput={(e) => setActionCategory(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Date</label>
                <input
                  type="date"
                  value={actionDate()}
                  onInput={(e) => setActionDate(e.currentTarget.value)}
                  class="input-field text-xs font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Notes / Remarks</label>
                <textarea
                  placeholder="Optional check number or purpose"
                  value={actionNotes()}
                  onInput={(e) => setActionNotes(e.currentTarget.value)}
                  class="input-field text-xs h-20"
                />
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <button type="button" class="btn-outline text-xs" onClick={() => setShowWithdrawModal(false)}>
                  Cancel
                </button>
                <button type="submit" class="btn-primary text-xs !bg-rose-600 hover:!bg-rose-700">
                  Confirm Withdrawal (-रु. {actionAmount()})
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* 5. Transfer Money Modal */}
      <Show when={showTransferModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowTransferModal(false)}>
          <div class="modal-content p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800 max-w-md" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="text-base font-bold text-gray-900 dark:text-white">Transfer Money Between Accounts</h3>
              <button class="text-gray-400 hover:text-gray-600 dark:hover:text-white" onClick={() => setShowTransferModal(false)}>
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransfer} class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">From Account (Source)</label>
                <input
                  type="text"
                  disabled
                  value={selectedAccount()?.name || ''}
                  class="input-field text-xs bg-gray-100 dark:bg-neutral-900 opacity-80"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">To Account (Destination) *</label>
                <select
                  value={transferTargetId()}
                  onChange={(e) => setTransferTargetId(e.currentTarget.value)}
                  class="input-field text-xs font-medium"
                  required
                >
                  <option value="" disabled>Select destination account</option>
                  <For each={accounts.filter((a) => a.id !== selectedAccountId())}>
                    {(acc) => <option value={acc.id}>{acc.name} ({formatNepaliCurrency(acc.balance)})</option>}
                  </For>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">{currentLang() === 'ne' ? 'सार्ने रकम (रु.) *' : 'Transfer Amount (Rs.) *'}</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={actionAmount() || ''}
                  onInput={(e) => setActionAmount(Number(e.currentTarget.value))}
                  class="input-field text-base font-bold font-mono text-sky-600"
                  required
                  min="1"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Date</label>
                <input
                  type="date"
                  value={actionDate()}
                  onInput={(e) => setActionDate(e.currentTarget.value)}
                  class="input-field text-xs font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Counter cash to bank deposit"
                  value={actionNotes()}
                  onInput={(e) => setActionNotes(e.currentTarget.value)}
                  class="input-field text-xs"
                />
              </div>

              <div class="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <button type="button" class="btn-outline text-xs" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </button>
                <button type="submit" class="btn-primary text-xs !bg-sky-600 hover:!bg-sky-700">
                  Transfer रु. {actionAmount()}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};
