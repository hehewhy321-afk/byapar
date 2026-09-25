import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  parties,
  khataEntries,
  addKhataEntry,
  addParty,
  addReminder,
  currentBusiness,
  settings,
} from '../db/localDb';
import { formatNepaliCurrency, KhataEntry, Party } from '@byapar/core';
import { currentLang } from '../services/i18n';
import { checkTransactionImageLimit, recordReceiptUpload } from '../services/planLimits';
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconPlus,
  IconWhatsApp,
  IconUser,
  IconAccounts,
  IconX,
  IconPhone,
  IconClock,
  IconFileText,
  IconPrint,
  IconDownload,
  IconShare,
  IconCalendar,
  IconReceipt,
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

  const [entryReceiptUrl, setEntryReceiptUrl] = createSignal<string | null>(null);
  const [viewReceiptModal, setViewReceiptModal] = createSignal<string | null>(null);

  const handleOpenEntry = (type: 'liyo' | 'diyo') => {
    setEntryType(type);
    setEntryAmount(0);
    setEntryNotes('');
    setEntryReceiptUrl(null);
    setShowEntryModal(true);
  };

  const handleEntryReceiptUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const limitCheck = await checkTransactionImageLimit(currentBusiness.id);
    if (!limitCheck.allowed) {
      alert(limitCheck.message || 'Monthly receipt upload limit reached. Upgrade plan to attach more images.');
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setEntryReceiptUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEntry = async (e: Event) => {
    e.preventDefault();
    const p = selectedParty();
    if (entryAmount() <= 0 || !p) return;

    await addKhataEntry({
      partyId: p.id,
      entryType: entryType(),
      amount: entryAmount(),
      notes: entryNotes() || (entryType() === 'liyo' ? 'Cash Payment Received' : 'Goods on Credit'),
      receiptImageUrl: entryReceiptUrl() || undefined,
    });

    if (entryReceiptUrl()) {
      recordReceiptUpload();
    }

    setEntryReceiptUrl(null);
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

  // Reminder Modal State
  const [showReminderModal, setShowReminderModal] = createSignal(false);
  const [reminderTitle, setReminderTitle] = createSignal('');
  const [reminderAmount, setReminderAmount] = createSignal<number>(0);
  const [reminderDueDate, setReminderDueDate] = createSignal('');
  const [reminderDueTime, setReminderDueTime] = createSignal('10:00');
  const [reminderType, setReminderType] = createSignal<'payment_reminder' | 'task_reminder' | 'event_reminder'>('payment_reminder');
  const [reminderNotes, setReminderNotes] = createSignal('');

  const openReminderModal = (p: Party) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const formattedDate = tomorrow.toISOString().split('T')[0];

    const defaultTitle = currentLang() === 'ne'
      ? `${p.name} - भुक्तानी रिमाइन्डर`
      : `Payment reminder for ${p.name}`;

    setReminderTitle(defaultTitle);
    setReminderAmount(p.currentBalance > 0 ? p.currentBalance : 0);
    setReminderDueDate(formattedDate);
    setReminderDueTime('10:00');
    setReminderType('payment_reminder');
    setReminderNotes(
      p.currentBalance > 0
        ? `Outstanding balance: Rs. ${p.currentBalance}`
        : ''
    );
    setShowReminderModal(true);
  };

  const handleSaveReminder = async (e: Event) => {
    e.preventDefault();
    const p = selectedParty();
    if (!reminderTitle().trim()) return;

    await addReminder({
      title: reminderTitle().trim(),
      partyId: p?.id,
      partyName: p?.name,
      amount: reminderAmount() || undefined,
      dueDate: reminderDueDate(),
      dueTime: reminderDueTime(),
      reminderType: reminderType(),
      note: reminderNotes() || undefined,
      status: 'upcoming',
    });

    setShowReminderModal(false);
  };

  // View Report Modal State
  const [showReportModal, setShowReportModal] = createSignal(false);
  const [reportFilter, setReportFilter] = createSignal<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
  const [reportStartDate, setReportStartDate] = createSignal('');
  const [reportEndDate, setReportEndDate] = createSignal('');

  const reportTransactions = createMemo(() => {
    const p = selectedParty();
    if (!p) return [];
    const entries = khataEntries.filter((k) => k.partyId === p.id);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (reportFilter() === 'all') return entries;

    return entries.filter((e) => {
      const entryDate = e.dateAd || e.createdAt?.split('T')[0] || '';
      if (!entryDate) return true;

      if (reportFilter() === 'today') {
        return entryDate === todayStr;
      }
      if (reportFilter() === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return entryDate === y.toISOString().split('T')[0];
      }
      if (reportFilter() === 'week') {
        const w = new Date(now);
        w.setDate(w.getDate() - 7);
        return entryDate >= w.toISOString().split('T')[0] && entryDate <= todayStr;
      }
      if (reportFilter() === 'month') {
        const m = new Date(now);
        m.setMonth(m.getMonth() - 1);
        return entryDate >= m.toISOString().split('T')[0] && entryDate <= todayStr;
      }
      if (reportFilter() === 'year') {
        const yr = new Date(now);
        yr.setFullYear(yr.getFullYear() - 1);
        return entryDate >= yr.toISOString().split('T')[0] && entryDate <= todayStr;
      }
      if (reportFilter() === 'custom') {
        const start = reportStartDate();
        const end = reportEndDate();
        if (start && entryDate < start) return false;
        if (end && entryDate > end) return false;
        return true;
      }
      return true;
    });
  });

  const reportTotals = createMemo(() => {
    const list = reportTransactions();
    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of list) {
      if (item.entryType === 'diyo') {
        totalDebit += item.amount;
      } else {
        totalCredit += item.amount;
      }
    }
    return {
      totalDebit,
      totalCredit,
      net: totalDebit - totalCredit,
    };
  });

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const p = selectedParty();
    if (!p) return;
    const list = reportTransactions();
    const headers = ['Date', 'Type', 'Notes / Description', 'Credit Given (Debit)', 'Payment Received (Credit)', 'Balance'];
    let running = p.openingBalance || 0;
    const rows = list.map((item) => {
      if (item.entryType === 'diyo') {
        running += item.amount;
      } else {
        running -= item.amount;
      }
      return [
        `"${settings.calendar === 'BS' ? item.dateBs : item.dateAd}"`,
        `"${item.entryType === 'diyo' ? 'Credit Given' : 'Payment Received'}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.entryType === 'diyo' ? item.amount : 0,
        item.entryType === 'liyo' ? item.amount : 0,
        running,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name.replace(/\s+/g, '_')}_Khata_Statement.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWhatsAppShareReport = () => {
    const p = selectedParty();
    if (!p) return;
    const totals = reportTotals();
    const phone = p.phone ? `977${p.phone}` : '';
    const text = encodeURIComponent(
      `*Account Statement - ${currentBusiness.name}*\n` +
      `Customer: ${p.name}\n` +
      `Phone: ${p.phone || 'N/A'}\n` +
      `Period: ${reportFilter() === 'all' ? 'All Time' : reportFilter().toUpperCase()}\n\n` +
      `• Total Credit (Outflow): Rs. ${totals.totalDebit.toLocaleString()}\n` +
      `• Total Received (Inflow): Rs. ${totals.totalCredit.toLocaleString()}\n` +
      `*Current Outstanding Balance: Rs. ${Math.abs(p.currentBalance).toLocaleString()}* (${p.currentBalance > 0 ? 'To Pay' : 'Settled'})\n\n` +
      `Thank you for doing business with ${currentBusiness.name}!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleSystemShareReport = async () => {
    const p = selectedParty();
    if (!p) return;
    const totals = reportTotals();
    const shareText =
      `Account Statement for ${p.name}\n` +
      `Store: ${currentBusiness.name}\n` +
      `Total Credit: Rs. ${totals.totalDebit.toLocaleString()}\n` +
      `Total Received: Rs. ${totals.totalCredit.toLocaleString()}\n` +
      `Current Balance: Rs. ${Math.abs(p.currentBalance).toLocaleString()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${p.name} - Statement`,
          text: shareText,
        });
      } catch {
        // Ignored
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert(currentLang() === 'ne' ? 'स्टेटमेन्ट विवरण क्लिपबोर्डमा कपी गरियो!' : 'Statement copied to clipboard!');
    }
  };


  return (
    <div class="p-4 space-y-4 animate-fade-in">
      {/* Top Stats */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="stat-card flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 block uppercase tracking-wider">{currentLang() === 'ne' ? 'लिन बाँकी' : 'Total Receivables'}</span>
            <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{formatNepaliCurrency(totalReceivable())}</span>
            <span class="text-[11px] text-gray-400 dark:text-neutral-500">{currentLang() === 'ne' ? 'ग्राहकले दिनुपर्ने' : 'Customer credit outstanding'}</span>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <IconArrowDown class="w-6 h-6" />
          </div>
        </div>

        <div class="stat-card flex items-center justify-between">
          <div>
            <span class="text-xs font-semibold text-gray-500 dark:text-neutral-400 block uppercase tracking-wider">{currentLang() === 'ne' ? 'दिन बाँकी' : 'Total Payables'}</span>
            <span class="text-2xl font-black text-red-500 dark:text-red-400 mt-1 block">{formatNepaliCurrency(totalPayable())}</span>
            <span class="text-[11px] text-gray-400 dark:text-neutral-500">{currentLang() === 'ne' ? 'आपूर्तिकर्तालाई दिनुपर्ने' : 'Owed to suppliers'}</span>
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
            <h3 class="font-bold text-sm text-gray-900 dark:text-white">{currentLang() === 'ne' ? `सम्पर्क (${filteredParties().length})` : `Parties (${filteredParties().length})`}</h3>
            <button
              class="btn-primary text-xs !py-1 !px-2.5 flex items-center gap-1"
              onClick={() => setShowAddPartyModal(true)}
            >
              <IconPlus class="w-3.5 h-3.5" />
              <span>{currentLang() === 'ne' ? 'थप्नुहोस्' : 'Add Party'}</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div class="grid grid-cols-3 bg-gray-100 dark:bg-neutral-900 p-0.5 rounded-lg text-xs font-semibold text-center">
            <button
              onClick={() => setPartyFilter('all')}
              class={`py-1.5 rounded-md transition ${partyFilter() === 'all' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}
            >{currentLang() === 'ne' ? 'सबै' : 'All'}</button>
            <button
              onClick={() => setPartyFilter('customer')}
              class={`py-1.5 rounded-md transition ${partyFilter() === 'customer' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}
            >{currentLang() === 'ne' ? 'ग्राहक' : 'Customers'}</button>
            <button
              onClick={() => setPartyFilter('supplier')}
              class={`py-1.5 rounded-md transition ${partyFilter() === 'supplier' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}
            >{currentLang() === 'ne' ? 'आपूर्तिकर्ता' : 'Suppliers'}</button>
          </div>

          <input
            type="text"
            placeholder={currentLang() === 'ne' ? 'नाम वा फोनले खोज्नुहोस्...' : 'Search party by name or phone...'}
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
                        {isReceivable() ? (currentLang() === 'ne' ? 'लिन बाँकी' : 'Receivable') : isPayable() ? (currentLang() === 'ne' ? 'दिन बाँकी' : 'Payable') : (currentLang() === 'ne' ? 'सर्मियो' : 'Settled')}
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

                  <div class="flex flex-wrap items-center gap-2">
                    <div class="text-right mr-2">
                      <span class="text-[10px] text-gray-400 dark:text-neutral-500 block font-semibold uppercase">{currentLang() === 'ne' ? 'अहिलेको मौज्दात' : 'Current Balance'}</span>
                      <span class={`text-xl font-black ${
                        current().currentBalance > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                        current().currentBalance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-neutral-500'
                      }`}>
                        {formatNepaliCurrency(Math.abs(current().currentBalance))}
                      </span>
                    </div>

                    <Show when={current().phone}>
                      <a
                        href={`tel:${current().phone}`}
                        class="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/50 flex items-center gap-1.5 text-xs font-bold transition shadow-xs"
                        title={currentLang() === 'ne' ? 'फोन डायल गर्नुहोस्' : 'Open Phone Dialer'}
                      >
                        <IconPhone class="w-3.5 h-3.5" />
                        <span>{currentLang() === 'ne' ? 'कल' : 'Call'}</span>
                      </a>
                    </Show>

                    <button
                      onClick={() => openReminderModal(current())}
                      class="px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/50 flex items-center gap-1.5 text-xs font-bold transition shadow-xs"
                      title={currentLang() === 'ne' ? 'रिमाइन्डर सेट गर्नुहोस्' : 'Set Reminder'}
                    >
                      <IconClock class="w-3.5 h-3.5" />
                      <span>{currentLang() === 'ne' ? 'रिमाइन्डर' : 'Reminder'}</span>
                    </button>

                    <button
                      onClick={() => setShowReportModal(true)}
                      class="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-100 hover:bg-slate-200 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 flex items-center gap-1.5 text-xs font-bold transition shadow-xs"
                      title={currentLang() === 'ne' ? 'खाता स्टेटमेन्ट (A4)' : 'View Account Statement'}
                    >
                      <IconFileText class="w-3.5 h-3.5 text-brand-500" />
                      <span>{currentLang() === 'ne' ? 'रिपोर्ट (A4)' : 'View Report'}</span>
                    </button>

                    {current().currentBalance > 0 && (
                      <button
                        onClick={handleSendWhatsAppReminder}
                        class="btn-primary text-xs flex items-center gap-1.5"
                      >
                        <IconWhatsApp class="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
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
                  <span>{currentLang() === 'ne' ? 'भुक्तानी पाइयो' : 'Receive Payment (Inflow)'}</span>
                </button>
                <button
                  onClick={() => handleOpenEntry('diyo')}
                  class="py-3 px-4 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-300 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
                >
                  <IconArrowUp class="w-4 h-4 text-red-500 dark:text-red-400" />
                  <span>{currentLang() === 'ne' ? 'उधारोमा सामान दियो' : 'Give Goods on Credit (Outflow)'}</span>
                </button>
              </div>

              {/* Transactions */}
              <div class="mt-4">
                <h4 class="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  {currentLang() === 'ne' ? 'लेनदेन विवरण' : 'Transaction Ledger'}
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
                              {entry.entryType === 'liyo' ? (currentLang() === 'ne' ? 'भुक्तानी आयो' : 'Payment Received') : (currentLang() === 'ne' ? 'उधारो दियो' : 'Credit Given')}
                            </span>
                            <span class="text-gray-400 dark:text-neutral-500 font-mono">
                              {settings.calendar === 'BS' ? entry.dateBs : entry.dateAd}
                            </span>
                          </div>
                          {entry.notes && <p class="text-gray-500 dark:text-neutral-400 text-[11px] mt-1">{entry.notes}</p>}
                          <Show when={entry.receiptImageUrl}>
                            <button
                              type="button"
                              onClick={() => setViewReceiptModal(entry.receiptImageUrl!)}
                              class="mt-1 flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                            >
                              <IconReceipt class="w-3 h-3" />
                              <span>{currentLang() === 'ne' ? 'रसिद हेर्नुहोस्' : 'View Slip'}</span>
                            </button>
                          </Show>
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
                      {currentLang() === 'ne' ? 'यस सम्पर्कको कुनै लेनदेन दर्ता छैन।' : 'No transaction statements recorded for this contact.'}
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
                {entryType() === 'liyo'
                  ? (currentLang() === 'ne' ? 'भुक्तानी दर्ता गर्नुहोस्' : 'Record Payment Received')
                  : (currentLang() === 'ne' ? 'उधारो दर्ता गर्नुहोस्' : 'Record Credit Given')}
              </h3>
              <button onClick={() => setShowEntryModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} class="p-5 space-y-3">
              <div>
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-neutral-300 mb-1">{currentLang() === 'ne' ? 'रकम (रु.):' : 'Amount (in NPR):'}</label>
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
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-neutral-300 mb-1">{currentLang() === 'ne' ? 'कैफियत:' : 'Notes / Description:'}</label>
                <input
                  type="text"
                  value={entryNotes()}
                  onInput={(e) => setEntryNotes(e.currentTarget.value)}
                  placeholder="e.g. Paid in cash, or goods taken on credit..."
                  class="input-field text-xs"
                />
              </div>

              <div>
                <label class="block text-[11px] font-semibold text-gray-500 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'रसिद / भौचर संलग्न गर्नुहोस् (वैकल्पिक)' : 'Attach Receipt / Slip (Optional)'}
                </label>
                <div class="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEntryReceiptUpload}
                    class="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 dark:file:bg-neutral-800 file:text-gray-700 dark:file:text-neutral-200 cursor-pointer"
                  />
                  <Show when={entryReceiptUrl()}>
                    <div class="relative inline-block shrink-0">
                      <img src={entryReceiptUrl()!} alt="Slip" class="w-8 h-8 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setEntryReceiptUrl(null)}
                        class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 text-[9px] flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  </Show>
                </div>
              </div>

              <div class="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  class="btn-outline w-1/2"
                >{currentLang() === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}</button>
                <button
                  type="submit"
                  class={`w-1/2 py-2.5 font-bold rounded-xl text-xs text-white shadow-sm ${
                    entryType() === 'liyo' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-500 hover:bg-red-400'
                  }`}
                >{currentLang() === 'ne' ? 'सेभ गर्नुहोस्' : 'Save Record'}</button>
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
                    <span>{currentLang() === 'ne' ? 'ग्राहक' : 'Customer'}</span>
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
                    <span>{currentLang() === 'ne' ? 'आपूर्तिकर्ता' : 'Supplier'}</span>
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
                    {newPartyOpeningBalance() > 0
                      ? (currentLang() === 'ne' ? 'उनीहरूले तिर्नुपर्ने' : 'Receivable from them')
                      : newPartyOpeningBalance() < 0
                      ? (currentLang() === 'ne' ? 'हामीले तिर्नुपर्ने' : 'We owe them')
                      : (currentLang() === 'ne' ? 'कुनै बाँकी छैन' : 'No initial dues')}
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

      {/* Party Multi-Type Reminder Modal */}
      <Show when={showReminderModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowReminderModal(false)}>
          <div class="modal-content !max-w-md p-6 bg-white dark:bg-black border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800 mb-4">
              <div>
                <h3 class="font-bold text-base text-gray-900 dark:text-white">
                  {currentLang() === 'ne' ? 'रिमाइन्डर सेट गर्नुहोस्' : 'Set Contact Reminder'}
                </h3>
                <p class="text-xs text-gray-400 dark:text-neutral-400 mt-0.5">
                  {selectedParty()?.name}
                </p>
              </div>
              <button onClick={() => setShowReminderModal(false)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReminder} class="space-y-3.5">
              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'रिमाइन्डर शीर्षक *' : 'Reminder Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={reminderTitle()}
                  onInput={(e) => setReminderTitle(e.currentTarget.value)}
                  class="input-field"
                  autofocus
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'रिमाइन्डर प्रकार' : 'Reminder Type'}
                </label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    class={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                      reminderType() === 'payment_reminder'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-400'
                    }`}
                    onClick={() => setReminderType('payment_reminder')}
                  >
                    {currentLang() === 'ne' ? 'भुक्तानी' : 'Payment'}
                  </button>
                  <button
                    type="button"
                    class={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                      reminderType() === 'task_reminder'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-400'
                    }`}
                    onClick={() => setReminderType('task_reminder')}
                  >
                    {currentLang() === 'ne' ? 'कार्य' : 'Task'}
                  </button>
                  <button
                    type="button"
                    class={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                      reminderType() === 'event_reminder'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300'
                        : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-neutral-400'
                    }`}
                    onClick={() => setReminderType('event_reminder')}
                  >
                    {currentLang() === 'ne' ? 'कार्यक्रम' : 'Event'}
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                    {currentLang() === 'ne' ? 'मिति *' : 'Due Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={reminderDueDate()}
                    onInput={(e) => setReminderDueDate(e.currentTarget.value)}
                    class="input-field font-mono"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                    {currentLang() === 'ne' ? 'समय' : 'Due Time'}
                  </label>
                  <input
                    type="time"
                    value={reminderDueTime()}
                    onInput={(e) => setReminderDueTime(e.currentTarget.value)}
                    class="input-field font-mono"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'रकम (वैकल्पिक)' : 'Amount (Optional NPR)'}
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={reminderAmount() || ''}
                  onInput={(e) => setReminderAmount(Number(e.currentTarget.value))}
                  class="input-field font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 dark:text-neutral-300 mb-1">
                  {currentLang() === 'ne' ? 'थप कैफियत' : 'Notes / Remarks'}
                </label>
                <textarea
                  rows="2"
                  value={reminderNotes()}
                  onInput={(e) => setReminderNotes(e.currentTarget.value)}
                  placeholder="e.g. Call regarding balance payment..."
                  class="input-field text-xs"
                />
              </div>

              <div class="pt-3 flex gap-2 border-t border-gray-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  class="btn-outline flex-1 justify-center text-xs"
                >
                  {currentLang() === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  class="btn-primary flex-1 justify-center text-xs"
                >
                  {currentLang() === 'ne' ? 'रिमाइन्डर सेभ गर्नुहोस्' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* A4 Statement Report Modal */}
      <Show when={showReportModal()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setShowReportModal(false)}>
          <div
            class="modal-content !max-w-4xl p-6 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Actions toolbar */}
            <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-neutral-800 shrink-0">
              <div>
                <h3 class="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <IconFileText class="w-4 h-4 text-brand-500" />
                  <span>{currentLang() === 'ne' ? 'ग्राहक खाता हिसाब विवरण (A4)' : 'Customer Statement of Account (A4)'}</span>
                </h3>
                <p class="text-xs text-gray-400 dark:text-neutral-400 mt-0.5">
                  {selectedParty()?.name} • {selectedParty()?.phone || 'No phone'}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  class="btn-primary text-xs flex items-center gap-1.5"
                  title="Print / Save as PDF"
                >
                  <IconPrint class="w-3.5 h-3.5" />
                  <span>{currentLang() === 'ne' ? 'प्रिन्ट / PDF' : 'Print / PDF'}</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  class="btn-outline text-xs flex items-center gap-1.5"
                  title="Export to Excel / CSV"
                >
                  <IconDownload class="w-3.5 h-3.5" />
                  <span>Excel / CSV</span>
                </button>

                <button
                  onClick={handleWhatsAppShareReport}
                  class="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5 text-xs font-bold transition"
                  title="Share to WhatsApp"
                >
                  <IconWhatsApp class="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  onClick={handleSystemShareReport}
                  class="p-2 rounded-xl bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-700 transition"
                  title="Share Statement"
                >
                  <IconShare class="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setShowReportModal(false)}
                  class="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <IconX class="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Date Filters Bar */}
            <div class="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-neutral-800 text-xs shrink-0">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-gray-400 dark:text-neutral-500 font-semibold mr-1">Filter:</span>
                {(['all', 'today', 'yesterday', 'week', 'month', 'year', 'custom'] as const).map((mode) => (
                  <button
                    onClick={() => setReportFilter(mode)}
                    class={`px-2.5 py-1 rounded-lg font-bold transition capitalize ${
                      reportFilter() === mode
                        ? 'bg-brand-500 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {mode === 'all'
                      ? (currentLang() === 'ne' ? 'सबै' : 'All Time')
                      : mode === 'today'
                      ? (currentLang() === 'ne' ? 'आज' : 'Today')
                      : mode === 'yesterday'
                      ? (currentLang() === 'ne' ? 'हिजो' : 'Yesterday')
                      : mode === 'week'
                      ? (currentLang() === 'ne' ? 'यो हप्ता' : 'This Week')
                      : mode === 'month'
                      ? (currentLang() === 'ne' ? 'यो महिना' : 'This Month')
                      : mode === 'year'
                      ? (currentLang() === 'ne' ? 'यो वर्ष' : 'This Year')
                      : (currentLang() === 'ne' ? 'कस्टम' : 'Custom')}
                  </button>
                ))}
              </div>

              <Show when={reportFilter() === 'custom'}>
                <div class="flex items-center gap-2">
                  <input
                    type="date"
                    value={reportStartDate()}
                    onInput={(e) => setReportStartDate(e.currentTarget.value)}
                    class="input-field !py-1 !text-xs font-mono"
                    placeholder="From"
                  />
                  <span class="text-gray-400">—</span>
                  <input
                    type="date"
                    value={reportEndDate()}
                    onInput={(e) => setReportEndDate(e.currentTarget.value)}
                    class="input-field !py-1 !text-xs font-mono"
                    placeholder="To"
                  />
                </div>
              </Show>
            </div>

            {/* Printable A4 Statement Sheet */}
            <div class="overflow-y-auto flex-1 mt-3 pr-1">
              <div
                id="party-statement-print-area"
                class="bg-white text-black p-8 rounded-lg shadow-sm border border-gray-200 mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between font-sans print:p-0 print:border-none print:shadow-none"
              >
                <div>
                  {/* Shop & Statement Header */}
                  <div class="flex justify-between items-start pb-4 border-b-2 border-black gap-4">
                    <div>
                      <h2 class="text-2xl font-black uppercase tracking-tight text-gray-950">
                        {currentBusiness.name || 'Byapar Store'}
                      </h2>
                      <p class="text-xs text-gray-700 mt-0.5">
                        {currentBusiness.address || 'Nepal'}
                      </p>
                      <p class="text-xs text-gray-700">
                        Phone: {currentBusiness.phone || 'N/A'} {currentBusiness.pan ? `• PAN/VAT: ${currentBusiness.pan}` : ''}
                      </p>
                    </div>

                    <div class="text-right">
                      <span class="inline-block px-3 py-1 bg-gray-100 text-black text-xs font-extrabold uppercase tracking-wider rounded border border-gray-300">
                        ACCOUNT STATEMENT
                      </span>
                      <p class="text-[11px] text-gray-600 font-mono mt-1">
                        Date: {new Date().toISOString().split('T')[0]}
                      </p>
                      <p class="text-[11px] text-gray-600 font-semibold mt-0.5">
                        Period: {reportFilter().toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {/* Customer Information Card */}
                  <div class="my-4 p-3 bg-gray-50 border border-gray-200 rounded-md flex justify-between items-center text-xs">
                    <div>
                      <p class="font-bold text-sm text-gray-900">{selectedParty()?.name}</p>
                      <p class="text-gray-600 mt-0.5">
                        Phone: <span class="font-mono font-medium">{selectedParty()?.phone || 'N/A'}</span>
                        {(selectedParty()?.panVatNumber || selectedParty()?.pan) ? ` • PAN: ${selectedParty()?.panVatNumber || selectedParty()?.pan}` : ''}
                      </p>
                      <p class="text-gray-600">Address: {selectedParty()?.address || 'N/A'}</p>
                    </div>

                    <div class="text-right">
                      <span class="text-[10px] text-gray-500 font-semibold uppercase block">Account Balance</span>
                      <span class="text-base font-black text-gray-950">
                        Rs. {Math.abs(selectedParty()?.currentBalance || 0).toLocaleString()}
                      </span>
                      <span class="text-[10px] font-bold block text-gray-600">
                        {(selectedParty()?.currentBalance || 0) > 0 ? '(RECEIVABLE / लिन बाँकी)' : '(PAYABLE / दिन बाँकी)'}
                      </span>
                    </div>
                  </div>

                  {/* Financial Metrics Summary Banner */}
                  <div class="grid grid-cols-3 gap-3 mb-5 text-center">
                    <div class="p-2.5 bg-red-50 border border-red-200 rounded">
                      <span class="text-[10px] font-bold uppercase text-red-600 block">Total Goods on Credit (Outflow)</span>
                      <span class="text-base font-black text-red-700">Rs. {reportTotals().totalDebit.toLocaleString()}</span>
                    </div>
                    <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded">
                      <span class="text-[10px] font-bold uppercase text-emerald-600 block">Total Payment Received (Inflow)</span>
                      <span class="text-base font-black text-emerald-700">Rs. {reportTotals().totalCredit.toLocaleString()}</span>
                    </div>
                    <div class="p-2.5 bg-blue-50 border border-blue-200 rounded">
                      <span class="text-[10px] font-bold uppercase text-blue-600 block">Net Period Movement</span>
                      <span class="text-base font-black text-blue-800">Rs. {Math.abs(reportTotals().net).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Transaction Table */}
                  <div class="border border-gray-200 rounded overflow-hidden">
                    <table class="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr class="bg-gray-100 border-b border-gray-200 text-gray-700 font-bold uppercase text-[10px]">
                          <th class="py-2 px-2.5">Date</th>
                          <th class="py-2 px-2.5">Transaction Type</th>
                          <th class="py-2 px-2.5">Particulars / Remarks</th>
                          <th class="py-2 px-2.5 text-right">Debit (Out)</th>
                          <th class="py-2 px-2.5 text-right">Credit (In)</th>
                          <th class="py-2 px-2.5 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-gray-100">
                        <For each={reportTransactions()}>
                          {(tx, idx) => {
                            let runningBal = selectedParty()?.openingBalance || 0;
                            // Calculate running balance up to this item
                            const all = reportTransactions();
                            for (let i = 0; i <= idx(); i++) {
                              if (all[i].entryType === 'diyo') {
                                runningBal += all[i].amount;
                              } else {
                                runningBal -= all[i].amount;
                              }
                            }

                            return (
                              <tr class="hover:bg-gray-50/50">
                                <td class="py-2 px-2.5 font-mono text-gray-700">
                                  {settings.calendar === 'BS' ? tx.dateBs : tx.dateAd}
                                </td>
                                <td class="py-2 px-2.5 font-semibold">
                                  <span class={`px-1.5 py-0.5 rounded text-[10px] ${
                                    tx.entryType === 'diyo'
                                      ? 'bg-red-50 text-red-700'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}>
                                    {tx.entryType === 'diyo' ? 'Credit Given' : 'Payment Received'}
                                  </span>
                                </td>
                                <td class="py-2 px-2.5 text-gray-600">
                                  {tx.notes || '—'}
                                </td>
                                <td class="py-2 px-2.5 text-right font-mono font-medium text-red-600">
                                  {tx.entryType === 'diyo' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                                </td>
                                <td class="py-2 px-2.5 text-right font-mono font-medium text-emerald-600">
                                  {tx.entryType === 'liyo' ? `Rs. ${tx.amount.toLocaleString()}` : '—'}
                                </td>
                                <td class="py-2 px-2.5 text-right font-mono font-bold text-gray-900">
                                  Rs. {runningBal.toLocaleString()}
                                </td>
                              </tr>
                            );
                          }}
                        </For>

                        <Show when={reportTransactions().length === 0}>
                          <tr>
                            <td colspan="6" class="py-8 text-center text-gray-400 text-xs">
                              No statement entries found for the selected period.
                            </td>
                          </tr>
                        </Show>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* A4 Statement Footer / Signatures */}
                <div class="pt-10 mt-12 border-t border-gray-200">
                  <div class="flex justify-between items-end text-xs text-gray-600">
                    <div class="text-center w-48">
                      <div class="border-b border-gray-400 pb-1 mb-1"></div>
                      <p class="font-bold text-gray-900">Customer Signature</p>
                      <p class="text-[10px] text-gray-500">I confirm the above balance</p>
                    </div>

                    <div class="text-center">
                      <p class="text-[10px] text-gray-400 font-mono">
                        Generated by Byapar Retail OS • {currentBusiness.name}
                      </p>
                    </div>

                    <div class="text-center w-48">
                      <div class="border-b border-gray-400 pb-1 mb-1"></div>
                      <p class="font-bold text-gray-900">Authorized Signature</p>
                      <p class="text-[10px] text-gray-500">Store Stamp & Date</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* View Receipt Image Modal */}
      <Show when={viewReceiptModal()}>
        <div class="modal-overlay animate-fade-in z-50" onClick={() => setViewReceiptModal(null)}>
          <div class="modal-content max-w-lg bg-white dark:bg-black p-4 border border-gray-200 dark:border-neutral-800" onClick={(e) => e.stopPropagation()}>
            <div class="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-neutral-800">
              <h3 class="font-bold text-sm text-gray-900 dark:text-white">
                {currentLang() === 'ne' ? 'भौचर / रसिद प्रतिलिपि' : 'Transaction Receipt / Slip'}
              </h3>
              <button onClick={() => setViewReceiptModal(null)} class="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <IconX class="w-5 h-5" />
              </button>
            </div>
            <div class="mt-4 flex justify-center bg-gray-50 dark:bg-neutral-900 rounded-lg p-2 max-h-[70vh] overflow-auto">
              <img src={viewReceiptModal()!} alt="Receipt Slip" class="max-w-full max-h-[65vh] object-contain rounded" />
            </div>
            <div class="mt-4 flex justify-end gap-2">
              <a
                href={viewReceiptModal()!}
                download="transaction-receipt.png"
                class="btn-outline text-xs flex items-center gap-1.5"
              >
                <IconDownload class="w-3.5 h-3.5" />
                <span>{currentLang() === 'ne' ? 'डाउनलोड गर्नुहोस्' : 'Download'}</span>
              </a>
              <button
                type="button"
                onClick={() => setViewReceiptModal(null)}
                class="btn-primary text-xs"
              >
                {currentLang() === 'ne' ? 'बन्द गर्नुहोस्' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

