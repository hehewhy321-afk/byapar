import { Component, createSignal, For, Show, createMemo } from 'solid-js';
import {
  getRecentLeadsList,
  updateLeadMetadata,
  RecentUserLead,
  LeadStatus,
} from '../services/adminApi';
import { exportToCSV } from '../services/exportUtils';

export const NewUsersLeadsView: Component = () => {
  const [leads, setLeads] = createSignal<RecentUserLead[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal<string>('all');
  const [timeFilter, setTimeFilter] = createSignal<'all' | 'today' | '7days' | '30days'>('all');
  const [planFilter, setPlanFilter] = createSignal<string>('all');
  
  // Note editing state
  const [editingNoteLead, setEditingNoteLead] = createSignal<RecentUserLead | null>(null);
  const [tempNoteText, setTempNoteText] = createSignal('');

  // Quick outreach modal
  const [outreachLead, setOutreachLead] = createSignal<RecentUserLead | null>(null);
  const [selectedTemplate, setSelectedTemplate] = createSignal<'welcome' | 'pro_offer' | 'checkin'>('welcome');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getRecentLeadsList();
      setLeads(data);
    } catch (e) {
      console.error('Failed to load recent leads:', e);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  // Filtered Leads Memo
  const filteredLeads = createMemo(() => {
    const now = new Date();
    const query = searchQuery().toLowerCase().trim();
    const status = statusFilter();
    const time = timeFilter();
    const plan = planFilter();

    return leads().filter((lead) => {
      // Search filter
      if (query) {
        const matchName = lead.fullName.toLowerCase().includes(query);
        const matchEmail = lead.email ? lead.email.toLowerCase().includes(query) : false;
        const matchPhone = lead.phone ? lead.phone.includes(query) : false;
        const matchStore = lead.storeName ? lead.storeName.toLowerCase().includes(query) : false;
        const matchAddress = lead.address ? lead.address.toLowerCase().includes(query) : false;
        if (!matchName && !matchEmail && !matchPhone && !matchStore && !matchAddress) {
          return false;
        }
      }

      // Status filter
      if (status !== 'all' && lead.leadStatus !== status) {
        return false;
      }

      // Plan filter
      if (plan !== 'all') {
        if (plan === 'paid' && (lead.planTier === 'free' || lead.planTier === 'no_store')) return false;
        if (plan === 'free' && lead.planTier !== 'free') return false;
        if (plan === 'no_store' && lead.planTier !== 'no_store') return false;
      }

      // Time filter
      if (time !== 'all') {
        const createdDate = new Date(lead.createdAt);
        const diffMs = now.getTime() - createdDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (time === 'today' && diffHours > 24) return false;
        if (time === '7days' && diffHours > 24 * 7) return false;
        if (time === '30days' && diffHours > 24 * 30) return false;
      }

      return true;
    });
  });

  // Metrics
  const metrics = createMemo(() => {
    const all = leads();
    const now = new Date();
    const last7DaysCount = all.filter((l) => (now.getTime() - new Date(l.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000).length;
    const convertedCount = all.filter((l) => l.leadStatus === 'converted').length;
    const contactedCount = all.filter((l) => l.leadStatus === 'contacted' || l.leadStatus === 'interested').length;
    const conversionRate = all.length > 0 ? Math.round((convertedCount / all.length) * 100) : 0;

    return {
      total: all.length,
      last7DaysCount,
      contactedCount,
      convertedCount,
      conversionRate,
    };
  });

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    updateLeadMetadata(leadId, { status: newStatus });
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, leadStatus: newStatus } : l))
    );
  };

  const handleOpenNoteModal = (lead: RecentUserLead) => {
    setEditingNoteLead(lead);
    setTempNoteText(lead.notes || '');
  };

  const handleSaveNote = () => {
    const lead = editingNoteLead();
    if (!lead) return;
    const note = tempNoteText().trim();
    updateLeadMetadata(lead.id, { notes: note });
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, notes: note } : l))
    );
    setEditingNoteLead(null);
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  const getWhatsAppLink = (lead: RecentUserLead, messageText: string) => {
    let clean = getCleanPhone(lead.phone);
    if (!clean) return '#';
    if (!clean.startsWith('977') && clean.length === 10) {
      clean = '977' + clean;
    }
    return `https://wa.me/${clean}?text=${encodeURIComponent(messageText)}`;
  };

  const getOutreachMessage = (lead: RecentUserLead, template: 'welcome' | 'pro_offer' | 'checkin') => {
    const store = lead.storeName || 'तपाईंको पसल';
    const name = lead.fullName || 'साथी';

    switch (template) {
      case 'welcome':
        return `नमस्ते ${name} जी! Byapar Retail OS मा यहाँलाई हार्दिक स्वागत छ। तपाईंको ${store} को लागि एप/वेब सहज रूपमा चलिरहेको छ? केही सहयोग वा तालिम आवश्यक परेमा हामीलाई सम्झनुहोला। धन्यवाद!`;
      case 'pro_offer':
        return `नमस्ते ${name} जी, Byapar Retail OS बाट। ${store} को लागि हाम्रो Pro Cloud Unlimited प्लानमा विशेष २०% छुट उपलब्ध छ। आजै अनलाइन बिलिङ र अटो-ह्वाट्सएप रिमाइन्डर सक्रिय गर्न हामीलाई सन्देश पठाउनुहोस्!`;
      case 'checkin':
        return `Hello ${name} ji, checking in from Byapar support. How has your experience been with POS sales and Khata ledger for ${store}? Feel free to reply here anytime.`;
    }
  };

  const handleExport = () => {
    exportToCSV(
      filteredLeads().map((l) => ({
        fullName: l.fullName,
        phone: l.phone || '—',
        email: l.email || '—',
        storeName: l.storeName || '—',
        address: l.address || '—',
        planTier: l.planTier,
        leadStatus: l.leadStatus,
        notes: l.notes || '—',
        registeredAt: new Date(l.createdAt).toLocaleDateString(),
      })),
      'recent_user_leads',
      [
        { key: 'fullName', label: 'Full Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'storeName', label: 'Store Name' },
        { key: 'address', label: 'Address' },
        { key: 'planTier', label: 'Plan Tier' },
        { key: 'leadStatus', label: 'Lead / Client Status' },
        { key: 'notes', label: 'Sales Followup Notes' },
        { key: 'registeredAt', label: 'Registered Date' },
      ]
    );
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recent';
    }
  };

  const statusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return { label: 'New Signup', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'contacted':
        return { label: 'Contacted', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'interested':
        return { label: 'Interested / Demo', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'converted':
        return { label: 'Converted Client', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' };
      case 'not_interested':
        return { label: 'Not Interested', bg: 'bg-gray-100 text-gray-500 border-gray-200' };
    }
  };

  return (
    <div class="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-[#FF4500] text-[11px] font-bold">
            <span class="w-1.5 h-1.5 rounded-full bg-[#FF4500] animate-pulse" />
            Merchant Growth & Conversion Hub
          </div>
          <h2 class="text-xl font-bold font-heading text-gray-900 mt-1">Recently Joined Users & Leads</h2>
          <p class="text-xs text-gray-500 mt-0.5">
            Identify new retail signups, inspect store details, contact them via WhatsApp/Phone, and convert them to paying clients.
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            class="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold shadow-sm transition"
          >
            🔄 Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            class="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#292524] hover:bg-[#1c1917] text-white text-xs font-semibold shadow-sm transition"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Leads CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>New (Last 7 Days)</span>
            <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              ⚡
            </div>
          </div>
          <div class="mt-2 text-2xl font-bold font-heading text-gray-900">
            {loading() ? '...' : metrics().last7DaysCount}
          </div>
          <p class="text-[11px] text-gray-400 mt-0.5">Fresh retail signups to contact</p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>In Discussion</span>
            <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              💬
            </div>
          </div>
          <div class="mt-2 text-2xl font-bold font-heading text-gray-900">
            {loading() ? '...' : metrics().contactedCount}
          </div>
          <p class="text-[11px] text-gray-400 mt-0.5">Contacted or undergoing demo</p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Converted Clients</span>
            <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>
          <div class="mt-2 text-2xl font-bold font-heading text-emerald-600">
            {loading() ? '...' : metrics().convertedCount}
          </div>
          <p class="text-[11px] text-gray-400 mt-0.5">Successfully upgraded to paying</p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div class="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Conversion Rate</span>
            <div class="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              %
            </div>
          </div>
          <div class="mt-2 text-2xl font-bold font-heading text-purple-600">
            {loading() ? '...' : `${metrics().conversionRate}%`}
          </div>
          <p class="text-[11px] text-gray-400 mt-0.5">Lead to active client ratio</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div class="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name, phone, email, store name, or location..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
            />
            <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Show when={searchQuery()}>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            </Show>
          </div>

          {/* Timeframe Pills */}
          <div class="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium self-start md:self-auto">
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              class={`px-3 py-1 rounded-md transition ${timeFilter() === 'all' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              class={`px-3 py-1 rounded-md transition ${timeFilter() === 'today' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('7days')}
              class={`px-3 py-1 rounded-md transition ${timeFilter() === '7days' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('30days')}
              class={`px-3 py-1 rounded-md transition ${timeFilter() === '30days' ? 'bg-white shadow-xs text-gray-900 font-bold' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Status & Plan Dropdowns */}
        <div class="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-gray-500 font-medium">Lead Status:</span>
            <select
              value={statusFilter()}
              onChange={(e) => setStatusFilter(e.currentTarget.value)}
              class="py-1 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs focus:outline-none focus:border-[#FF4500]"
            >
              <option value="all">All Statuses ({leads().length})</option>
              <option value="new">New Signup</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested / Demo</option>
              <option value="converted">Converted Client</option>
              <option value="not_interested">Not Interested</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-gray-500 font-medium">Plan Tier:</span>
            <select
              value={planFilter()}
              onChange={(e) => setPlanFilter(e.currentTarget.value)}
              class="py-1 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 text-xs focus:outline-none focus:border-[#FF4500]"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free Tier</option>
              <option value="paid">Pro / Paid Plans</option>
              <option value="no_store">No Store Setup Yet</option>
            </select>
          </div>

          <div class="ml-auto text-[11px] text-gray-400">
            Showing <span class="font-bold text-gray-700">{filteredLeads().length}</span> of {leads().length} users
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                <th class="py-3 px-5">User & Contact</th>
                <th class="py-3 px-4">Store & Location</th>
                <th class="py-3 px-4">Joined</th>
                <th class="py-3 px-4">Plan Tier</th>
                <th class="py-3 px-4">Lead / Client Status</th>
                <th class="py-3 px-4">Followup Notes</th>
                <th class="py-3 px-5 text-right">Quick Outreach</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show
                when={!loading() && filteredLeads().length > 0}
                fallback={
                  <tr>
                    <td colspan="7" class="py-12 text-center text-gray-400 text-xs">
                      {loading() ? 'Loading recent user leads...' : 'No users match your filters'}
                    </td>
                  </tr>
                }
              >
                <For each={filteredLeads()}>
                  {(lead) => {
                    const badge = statusBadge(lead.leadStatus);
                    return (
                      <tr class="hover:bg-gray-50/60 transition-colors">
                        {/* User & Contact */}
                        <td class="py-3.5 px-5">
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0 border border-stone-200">
                              {lead.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div class="font-bold text-gray-900 text-sm">{lead.fullName}</div>
                              <div class="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                <Show when={lead.phone}>
                                  <a
                                    href={`tel:${lead.phone}`}
                                    class="text-blue-600 hover:underline font-mono"
                                  >
                                    📞 {lead.phone}
                                  </a>
                                </Show>
                                <Show when={lead.email}>
                                  <span class="text-gray-300">•</span>
                                  <a
                                    href={`mailto:${lead.email}`}
                                    class="text-gray-600 hover:underline truncate max-w-[140px]"
                                  >
                                    ✉️ {lead.email}
                                  </a>
                                </Show>
                                <Show when={!lead.phone && !lead.email}>
                                  <span class="text-gray-400">No contact provided</span>
                                </Show>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Store & Location */}
                        <td class="py-3.5 px-4">
                          <Show
                            when={lead.storeName}
                            fallback={<span class="text-amber-600 text-[11px] font-medium bg-amber-50 px-2 py-0.5 rounded">Store not created yet</span>}
                          >
                            <div class="font-semibold text-gray-800">{lead.storeName}</div>
                            <div class="text-[11px] text-gray-400 truncate max-w-[160px]">
                              {lead.address || lead.businessType || 'General Retail'}
                            </div>
                          </Show>
                        </td>

                        {/* Joined Date */}
                        <td class="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                          <div>{formatRelativeTime(lead.createdAt)}</div>
                          <div class="text-[10px] text-gray-400">
                            {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                          </div>
                        </td>

                        {/* Plan Tier */}
                        <td class="py-3.5 px-4">
                          <span
                            class={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              lead.planTier === 'free'
                                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                : lead.planTier === 'no_store'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {lead.planTier.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Lead / Client Status Selector */}
                        <td class="py-3.5 px-4">
                          <select
                            value={lead.leadStatus}
                            onChange={(e) => handleStatusChange(lead.id, e.currentTarget.value as LeadStatus)}
                            class={`px-2 py-1 rounded text-[11px] font-semibold border focus:outline-none transition cursor-pointer ${badge.bg}`}
                          >
                            <option value="new">New Signup</option>
                            <option value="contacted">Contacted</option>
                            <option value="interested">Interested / Demo</option>
                            <option value="converted">✓ Converted Client</option>
                            <option value="not_interested">Not Interested</option>
                          </select>
                        </td>

                        {/* Followup Notes */}
                        <td class="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(lead)}
                            class="text-left group flex items-start gap-1 max-w-[160px]"
                          >
                            <span class="text-xs text-gray-400 group-hover:text-gray-600">📝</span>
                            <span class="text-[11px] text-gray-600 group-hover:text-gray-900 truncate">
                              {lead.notes || <span class="italic text-gray-400">Add sales note...</span>}
                            </span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td class="py-3.5 px-5 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <Show when={lead.phone}>
                              <a
                                href={getWhatsAppLink(lead, getOutreachMessage(lead, 'welcome'))}
                                target="_blank"
                                rel="noreferrer"
                                title="Open WhatsApp Chat"
                                class="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition border border-emerald-200"
                              >
                                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z" />
                                </svg>
                              </a>
                            </Show>

                            <button
                              type="button"
                              onClick={() => {
                                setOutreachLead(lead);
                                setSelectedTemplate('welcome');
                              }}
                              title="Smart Outreach Message"
                              class="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition"
                            >
                              Message
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* Note Editing Modal */}
      <Show when={editingNoteLead()}>
        <div class="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div class="flex items-center justify-between">
              <h3 class="font-heading font-bold text-sm text-gray-900">
                Sales & Client Followup Notes
              </h3>
              <button
                type="button"
                onClick={() => setEditingNoteLead(null)}
                class="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div class="text-xs text-gray-500">
              For: <span class="font-bold text-gray-800">{editingNoteLead()?.fullName}</span>
              {editingNoteLead()?.storeName ? ` (${editingNoteLead()?.storeName})` : ''}
            </div>

            <textarea
              rows={4}
              value={tempNoteText()}
              onInput={(e) => setTempNoteText(e.currentTarget.value)}
              placeholder="e.g. Called owner on Friday. Very interested in Pro annual billing and thermal barcode printer setup. Follow up on Monday..."
              class="w-full p-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
            />

            <div class="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingNoteLead(null)}
                class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-[#292524] text-white hover:bg-[#1c1917]"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Smart Outreach Modal */}
      <Show when={outreachLead()}>
        <div class="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-heading font-bold text-sm text-gray-900">
                  Quick Outreach to {outreachLead()?.fullName}
                </h3>
                <p class="text-xs text-gray-500">{outreachLead()?.storeName || 'New Merchant'}</p>
              </div>
              <button
                type="button"
                onClick={() => setOutreachLead(null)}
                class="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Template selector */}
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate('welcome')}
                class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedTemplate() === 'welcome'
                    ? 'bg-orange-100 text-[#FF4500]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🎉 Welcome & Onboarding
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate('pro_offer')}
                class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedTemplate() === 'pro_offer'
                    ? 'bg-orange-100 text-[#FF4500]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ⚡ Pro Upgrade Offer
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate('checkin')}
                class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedTemplate() === 'checkin'
                    ? 'bg-orange-100 text-[#FF4500]'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                💬 Support Check-in
              </button>
            </div>

            {/* Message preview */}
            <div class="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-700 leading-relaxed font-sans whitespace-pre-wrap">
              {outreachLead() && getOutreachMessage(outreachLead()!, selectedTemplate())}
            </div>

            <div class="flex items-center justify-between pt-2">
              <span class="text-[11px] text-gray-400">
                Opens directly in WhatsApp with phone number filled
              </span>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOutreachLead(null)}
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Close
                </button>
                <Show when={outreachLead()?.phone}>
                  <a
                    href={getWhatsAppLink(outreachLead()!, getOutreachMessage(outreachLead()!, selectedTemplate()))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (outreachLead()) {
                        handleStatusChange(outreachLead()!.id, 'contacted');
                      }
                      setOutreachLead(null);
                    }}
                    class="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Send via WhatsApp</span>
                    <span>→</span>
                  </a>
                </Show>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
