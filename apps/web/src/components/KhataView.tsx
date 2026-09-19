import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  parties,
  khataEntries,
  addKhataEntry,
  addParty,
  currentBusiness,
  settings,
} from '../db/localDb';
import { formatNepaliCurrency, KhataEntry, Party } from '@byapar/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconPlus,
  IconWhatsApp,
  IconUser,
  IconAccounts,
  IconX,
} from './icons';

export const KhataView: Component = () => {
  const [partyFilter, setPartyFilter] = createSignal<'all' | 'customer' | 'supplier'>('all');
  const [selectedPartyId, setSelectedPartyId] = createSignal<string>('');
  const [searchQuery, setSearchQuery] = createSignal('');

  const [showEntryModal, setShowEntryModal] = createSignal(false);
  const [entryType, setEntryType] = createSignal<'liyo' | 'diyo'>('liyo');
  const [entryAmount, setEntryAmount] = createSignal<number>(0);
  const [entryNotes, setEntryNotes] = createSignal('');

  // Add Party Form State
  const [showAddPartyModal, setShowAddPartyModal] = createSignal(false);
  const [newPartyName, setNewPartyName] = createSignal('');
  const [newPartyPhone, setNewPartyPhone] = createSignal('');
  const [newPartyAddress, setNewPartyAddress] = createSignal('');
  const [newPartyType, setNewPartyType] = createSignal<'customer' | 'supplier'>('customer');
  const [newPartyOpeningBalance, setNewPartyOpeningBalance] = createSignal<number>(0);
  const [newPartyCreditLimit, setNewPartyCreditLimit] = createSignal<number>(50000);
  const [newPartyPan, setNewPartyPan] = createSignal('');

  const handleCreateParty = async (e: Event) => {
    e.preventDefault();
    if (!newPartyName().trim()) return;

    const created = await addParty({
      name: newPartyName().trim(),
      phone: newPartyPhone().trim() || undefined,
      address: newPartyAddress().trim() || undefined,
      partyType: newPartyType(),
      openingBalance: newPartyOpeningBalance(),
      creditLimit: newPartyCreditLimit(),
      pan: newPartyPan().trim() || undefined,
    });

    setSelectedPartyId(created.id);
    setShowAddPartyModal(false);
    // Reset
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyAddress('');
    setNewPartyType('customer');
    setNewPartyOpeningBalance(0);
    setNewPartyCreditLimit(50000);
    setNewPartyPan('');
  };

  const totalReceivable = createMemo(() => {
    return parties
      .filter((p) => p.currentBalance > 0)
      .reduce((acc, p) => acc + p.currentBalance, 0);
  });

  const totalPayable = createMemo(() => {
    return parties
      .filter((p) => p.currentBalance < 0)
      .reduce((acc, p) => acc + Math.abs(p.currentBalance), 0);
  });

  const filteredParties = createMemo(() => {
    const q = searchQuery().toLowerCase().trim();
    return parties.filter((p) => {
      const matchFilter =
        partyFilter() === 'all' ||
        (partyFilter() === 'customer' && p.partyType !== 'supplier') ||
        (partyFilter() === 'supplier' && p.partyType !== 'customer');
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q));
      return matchFilter && matchSearch;
    });
  });

  const selectedParty = createMemo(() => {
    if (!parties || parties.length === 0) return null;
    const currentId = selectedPartyId();
    if (currentId) {
      const found = parties.find((p) => p.id === currentId);
      if (found) return found;
    }
    return parties[0];
  });

  const partyTransactions = createMemo(() => {
    const p = selectedParty();
    if (!p) return [];
    return khataEntries.filter((k) => k.partyId === p.id);
  });

  const handleOpenEntry = (type: 'liyo' | 'diyo') => {
    setEntryType(type);
    setEntryAmount(0);
    setEntryNotes('');
    setShowEntryModal(true);
  };

  const handleSaveEntry = (e: Event) => {
    e.preventDefault();
    const p = selectedParty();
    if (entryAmount() <= 0 || !p) return;

    addKhataEntry({
      partyId: p.id,
      entryType: entryType(),
      amount: entryAmount(),
      notes: entryNotes() || (entryType() === 'liyo' ? 'Cash Payment Received' : 'Goods on Credit'),
    });

    setShowEntryModal(false);
  };

  const handleSendWhatsAppReminder = () => {
    const p = selectedParty();
    if (!p) return;
    const phone = p.phone ? `977${p.phone}` : '';
    const text = encodeURIComponent(
      `Dear ${p.name},\n` +
      `This is a gentle payment reminder from ${currentBusiness.name}. Your outstanding balance is Rs. ${p.currentBalance}.\n` +
      `Kindly settle at your earliest convenience via cash or Fonepay QR. Thank you!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div class="p-4 space-y-4 animate-fade-in">
      {/* Top Stats */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stat-card flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 block uppercase tracking-wider">Total Receivables</span>
            <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{formatNepaliCurrency(totalReceivable())}</span>
            <span class="text-[11px] text-gray-400 dark:text-neutral-500">Customer credit outstanding</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <IconArrowDown class="w-6 h-6" />
          </div>
        </div>

        <div class="stat-card flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 block uppercase tracking-wider">Total Payables</span>
            <span class="text-2xl font-black text-red-500 dark:text-red-400 mt-1 block">{formatNepaliCurrency(totalPayable())}</span>
            <span class="text-[11px] text-gray-400 dark:text-neutral-500">Owed to suppliers</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 flex items-center justify-center font-bold">
            <IconArrowUp class="w-6 h-6" />
          </div>
        </div>

        <div class="stat-card bg-gradient-to-br from-brand-50 to-white dark:from-neutral-900 dark:to-black border-brand-100 dark:border-neutral-800">
          <div>
            <span class="text-xs font-semibold text-brand-700 dark:text-brand-400 block">WhatsApp Reminders</span>
            <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1">Send 1-click automated WhatsApp payment reminders with invoice amounts.</p>
          </div>
          <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
            <IconCheck class="w-3.5 h-3.5" />
            <span>98% Faster Settlement Rate</span>
          </span>
        </div>
      </div>

      {/* Main Ledger Split Screen */}
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Parties List */}
        <div class="lg:col-span-4 stat-card flex flex-col gap-3 !p-4">
          <div class="flex items-center justify-between pb-1">
            <h3 class="font-bold text-sm text-gray-900 dark:text-white">Parties ({filteredParties().length})</h3>
            <button
              class="btn-primary text-xs !py-1 !px-2.5 flex items-center gap-1"
              onClick={() => setShowAddPartyModal(true)}
            >
              <IconPlus class="w-3.5 h-3.5" />
              <span>Add Party</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div class="grid grid-cols-3 bg-gray-100 dark:bg-neutral-900 p-0.5 rounded-lg text-xs font-semibold text-center">
            <button
              onClick={() => setPartyFilter('all')}
              class={`py-1.5 rounded-md transition ${partyFilter() === 'all' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}
            >All</button>
            <button
              onClick={() => setPartyFilter('customer')}
              class={`py-1.5 rounded-md transition ${partyFilter() === 'customer' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}
            >Customers</button>
            <button
              onClick={() => setPartyFilter('supplier')}
              class={`py-1.5 rounded-md transition ${partyFilter() === 'supplier' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}
            >Suppliers</button>
          </div>

          <input
            type="text"
            placeholder="Search party by name or phone..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="input-field text-xs"
          />

          <div class="divide-y divide-gray-50 dark:divide-neutral-800/60 overflow-y-auto max-h-[500px] pr-1">
            <For each={filteredParties()}>
              {(party) => {
                const isReceivable = () => party.currentBalance > 0;
                const isPayable = () => party.currentBalance < 0;

                return (
                  <div
                    onClick={() => setSelectedPartyId(party.id)}
                    class={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      party.id === selectedParty()?.id
                        ? 'bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-700/60 shadow-sm'
                        : 'hover:bg-gray-50 dark:hover:bg-neutral-900/60'
                    }`}
                  >
                    <div>
                      <h4 class="font-bold text-xs text-gray-900 dark:text-white leading-snug">{party.name}</h4>
                      <span class="text-[10px] text-gray-400 dark:text-neutral-400 font-mono">
                        {party.phone || 'No phone'} • {party.address || 'Kathmandu'}
                      </span>
                    </div>
                    <div class="text-right">
                      <span class={`text-xs font-black block ${
                        isReceivable() ? 'text-emerald-600 dark:text-emerald-400' : isPayable() ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-neutral-500'
                      }`}>
                        {formatNepaliCurrency(Math.abs(party.currentBalance))}
                      </span>
                      <span class="text-[9px] text-gray-400 dark:text-neutral-500 font-semibold uppercase">
                        {isReceivable() ? 'Receivable' : isPayable() ? 'Payable' : 'Settled'}
                      </span>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>

        {/* Right: Ledger Details */}
        <div class="lg:col-span-8 stat-card flex flex-col justify-between !p-5">
          <Show
            when={selectedParty()}
            fallback={
              <div class="py-20 text-center text-gray-400 dark:text-neutral-500 text-sm">
                Please select a contact from the left list.
              </div>
            }
          >
            {(current) => (
              <div>
                {/* Party Profile */}
                <div class="flex flex-wrap items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-800 gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="font-black text-lg text-gray-900 dark:text-white">{current().name}</h3>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 uppercase">
                        {current().partyType}
                      </span>
                    </div>
                    <p class="text-xs text-gray-400 dark:text-neutral-400 mt-0.5">
                      Phone: <span class="font-mono text-gray-600 dark:text-neutral-300">{current().phone || 'N/A'}</span> • Address: {current().address || 'N/A'}
                    </p>
                  </div>

                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <span class="text-[10px] text-gray-400 dark:text-neutral-500 block font-semibold uppercase">Current Balance</span>
                      <span class={`text-xl font-black ${
                        current().currentBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                        current().currentBalance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-neutral-500'
                      }`}>
                        {formatNepaliCurrency(Math.abs(current().currentBalance))}
                      </span>
                    </div>

                    {current().currentBalance > 0 && (
                      <button
                        onClick={handleSendWhatsAppReminder}
                        class="btn-primary text-xs flex items-center gap-1.5"
                      >
                        <IconWhatsApp class="w-3.5 h-3.5" />
                        <span>WhatsApp Reminder</span>
                      </button>
                    )}
                  </div>
                </div>

              {/* Liyo / Diyo Buttons */}
              <div class="grid grid-cols-2 gap-3 my-4">
                <button
                  onClick={() => handleOpenEntry('liyo')}
                  class="py-3 px-4 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
                >
                  <IconArrowDown class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Receive Payment (Inflow)</span>
                </button>
                <button
                  onClick={() => handleOpenEntry('diyo')}
                  class="py-3 px-4 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-300 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
                >
                  <IconArrowUp class="w-4 h-4 text-red-500 dark:text-red-400" />
                  <span>Give Goods on Credit (Outflow)</span>
                </button>
              </div>

              {/* Transactions */}
              <div class="mt-4">
                <h4 class="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  Transaction Ledger
                </h4>
                <div class="divide-y divide-gray-50 dark:divide-neutral-800/60 border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <For each={partyTransactions()}>
                    {(entry) => (
                      <div class="p-3 bg-white dark:bg-black flex items-center justify-between text-xs">
                        <div>
                          <div class="flex items-center gap-2">
                            <span class={`font-black text-xs px-2 py-0.5 rounded ${
                              entry.entryType === 'liyo' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400'
                            }`}>
                              {entry.entryType === 'liyo' ? 'Payment Received' : 'Credit Given'}
                            </span>
                            <span class="text-gray-400 dark:text-neutral-500 font-mono">
                              {settings.calendar === 'BS' ? entry.dateBs : entry.dateAd}
                            </span>
                          </div>
                          {entry.notes && <p class="text-gray-500 dark:text-neutral-400 text-[11px] mt-1">{entry.notes}</p>}
                        </div>
                        <span class={`font-black text-sm ${
                          entry.entryType === 'liyo' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                        }`}>
                          {entry.entryType === 'liyo' ? '+' : '-'} {formatNepaliCurrency(entry.amount)}
                        </span>
                      </div>
                    )}
                  </For>

                  {partyTransactions().length === 0 && (
                    <div class="p-6 text-center text-gray-400 dark:text-neutral-500 text-xs bg-white dark:bg-black">
                      No transaction statements recorded for this contact.
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </Show>
        </div>
      </div>

      {/* Entry Modal */}
      <Show when={showEntryModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowEntryModal(false)}>
          <div class="modal-content max-w-sm bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="px-5 py-4 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
              <h3 class="font-bold text-gray-900 dark:text-white text-sm">
                {entryType() === 'liyo' ? 'Record Payment Received' : 'Record Credit Given'}
              </h3>
              <button onClick={() => setShowEntryModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} class="p-5 space-y-3">
              <div>
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-neutral-300 mb-1">Amount (in NPR):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={entryAmount() || ''}
                  onInput={(e) => setEntryAmount(Number(e.currentTarget.value))}
                  placeholder="0.00"
                  class="input-field font-extrabold text-base"
                  autofocus
                />
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-neutral-300 mb-1">Notes / Description:</label>
                <input
                  type="text"
                  value={entryNotes()}
                  onInput={(e) => setEntryNotes(e.currentTarget.value)}
                  placeholder="e.g. Paid in cash, or goods taken on credit..."
                  class="input-field text-xs"
                />
              </div>

              <div class="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  class="btn-outline w-1/2"
                >Cancel</button>
                <button
                  type="submit"
                  class={`w-1/2 py-2.5 font-bold rounded-xl text-xs text-white shadow-sm ${
                    entryType() === 'liyo' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-500 hover:bg-red-400'
                  }`}
                >Save Record</button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* Add New Party Modal */}
      <Show when={showAddPartyModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowAddPartyModal(false)}>
          <div class="modal-content !max-w-md p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <h3 class="font-bold text-base text-gray-900 dark:text-white">Add New Party (Customer / Supplier)</h3>
              <button onClick={() => setShowAddPartyModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateParty} class="space-y-3.5">
              {/* Party Type Radio */}
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1.5">Party Type *</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class={`py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      newPartyType() === 'customer'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-850'
                    }`}
                    onClick={() => setNewPartyType('customer')}
                  >
                    <IconUser class="w-3.5 h-3.5" />
                    <span>Customer (ग्राहक)</span>
                  </button>
                  <button
                    type="button"
                    class={`py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      newPartyType() === 'supplier'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-850'
                    }`}
                    onClick={() => setNewPartyType('supplier')}
                  >
                    <IconAccounts class="w-3.5 h-3.5" />
                    <span>Supplier (साहुजी)</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Party Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ram Bahadur Shrestha"
                  value={newPartyName()}
                  onInput={(e) => setNewPartyName(e.currentTarget.value)}
                  class="input-field"
                  autofocus
                />
              </div>

              {/* Phone & PAN in 2 columns */}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Mobile / Phone</label>
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={newPartyPhone()}
                    onInput={(e) => setNewPartyPhone(e.currentTarget.value)}
                    class="input-field font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">PAN / VAT (Optional)</label>
                  <input
                    type="text"
                    placeholder="9 digits"
                    value={newPartyPan()}
                    onInput={(e) => setNewPartyPan(e.currentTarget.value)}
                    class="input-field font-mono"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Asan, Kathmandu"
                  value={newPartyAddress()}
                  onInput={(e) => setNewPartyAddress(e.currentTarget.value)}
                  class="input-field"
                />
              </div>

              {/* Opening Balance */}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                    Opening Balance (Rs.)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newPartyOpeningBalance() || ''}
                    onInput={(e) => setNewPartyOpeningBalance(Number(e.currentTarget.value))}
                    class="input-field font-mono"
                  />
                  <span class="text-[10px] text-gray-400 dark:text-neutral-500 mt-0.5 block">
                    {newPartyOpeningBalance() > 0 ? 'Receivable (उनीहरूले तिर्नुपर्ने)' : newPartyOpeningBalance() < 0 ? 'Payable (हामीले तिर्नुपर्ने)' : 'No initial dues'}
                  </span>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">Credit Limit (Rs.)</label>
                  <input
                    type="number"
                    value={newPartyCreditLimit() || ''}
                    onInput={(e) => setNewPartyCreditLimit(Number(e.currentTarget.value))}
                    placeholder="50000"
                    class="input-field font-mono"
                  />
                </div>
              </div>

              <div class="pt-3 flex gap-2 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  class="btn-outline flex-1 justify-center text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary flex-1 justify-center text-xs"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};
