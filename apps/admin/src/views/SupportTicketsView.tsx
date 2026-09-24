import { Component, createSignal, For, Show } from 'solid-js';
import {
  getSupportTickets,
  getTicketMessages,
  replyToTicket,
  updateTicketStatus,
  SupportTicket,
  TicketMessage,
} from '../services/adminApi';
import { currentAdmin } from '../services/adminAuth';

export const SupportTicketsView: Component = () => {
  const [tickets, setTickets] = createSignal<SupportTicket[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [search, setSearch] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('all');
  const [categoryFilter, setCategoryFilter] = createSignal('all');

  // Selected Ticket Thread View
  const [activeTicket, setActiveTicket] = createSignal<SupportTicket | null>(null);
  const [messages, setMessages] = createSignal<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = createSignal(false);
  const [replyText, setReplyText] = createSignal('');
  const [sendingReply, setSendingReply] = createSignal(false);
  const [notification, setNotification] = createSignal<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getSupportTickets();
      setTickets(data);
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const openTicketDetail = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    try {
      setLoadingMessages(true);
      const msgs = await getTicketMessages(ticket.id);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load ticket messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async (e: Event) => {
    e.preventDefault();
    const t = activeTicket();
    if (!t || !replyText().trim()) return;

    setSendingReply(true);
    const adminName = currentAdmin()?.fullName || 'Byapar Support Admin';
    const ok = await replyToTicket(t.id, replyText().trim(), adminName);
    setSendingReply(false);

    if (ok) {
      setReplyText('');
      showToast('Reply dispatched to merchant.');
      // Refresh messages
      const msgs = await getTicketMessages(t.id);
      setMessages(msgs);
      loadData();
    } else {
      showToast('Failed to dispatch reply.');
    }
  };

  const handleStatusChange = async (
    status: 'open' | 'in_progress' | 'waiting_on_merchant' | 'resolved' | 'closed'
  ) => {
    const t = activeTicket();
    if (!t) return;

    const ok = await updateTicketStatus(t.id, status);
    if (ok) {
      setActiveTicket({ ...t, status });
      setTickets((curr) => curr.map((item) => (item.id === t.id ? { ...item, status } : item)));
      showToast(`Ticket status updated to ${status.toUpperCase().replace(/_/g, ' ')}.`);
    }
  };

  const filteredTickets = () => {
    return tickets().filter((t) => {
      const matchStatus = statusFilter() === 'all' || t.status === statusFilter();
      const matchCat = categoryFilter() === 'all' || t.category === categoryFilter();
      const matchSearch =
        t.ticketNumber.toLowerCase().includes(search().toLowerCase()) ||
        t.subject.toLowerCase().includes(search().toLowerCase()) ||
        (t.businessName && t.businessName.toLowerCase().includes(search().toLowerCase()));
      return matchStatus && matchCat && matchSearch;
    });
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'normal':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-amber-100 text-amber-800';
      case 'waiting_on_merchant':
        return 'bg-purple-100 text-purple-800';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-800';
      case 'closed':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div class="space-y-6">
      {/* Toast Notification */}
      <Show when={notification()}>
        <div class="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm animate-fade-in border border-gray-700">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{notification()}</span>
        </div>
      </Show>

      {/* Header */}
      <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Operations Desk
            </span>
            <span class="text-xs text-gray-500 font-mono">Phase 2 Engine</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mt-2 font-heading">
            Merchant Support & Helpdesk Desk
          </h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Respond to Kirana merchant issues, FonePay QR disputes, soundbox hardware failures, and VAT invoicing questions in real-time.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            class="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Queue
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Open Tickets</div>
          <div class="text-2xl font-black text-blue-600 mt-2 font-heading">
            {tickets().filter((t) => t.status === 'open').length}
          </div>
          <div class="text-[11px] text-gray-500 mt-1">Awaiting first response</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Urgent / High</div>
          <div class="text-2xl font-black text-rose-600 mt-2 font-heading">
            {tickets().filter((t) => t.priority === 'urgent' || t.priority === 'high').length}
          </div>
          <div class="text-[11px] text-rose-600 font-semibold mt-1">Needs priority triage</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Progress</div>
          <div class="text-2xl font-black text-amber-600 mt-2 font-heading">
            {tickets().filter((t) => t.status === 'in_progress').length}
          </div>
          <div class="text-[11px] text-gray-500 mt-1">Assigned & under review</div>
        </div>

        <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolved Rate</div>
          <div class="text-2xl font-black text-emerald-600 mt-2 font-heading">
            {tickets().length > 0
              ? `${Math.round(
                  (tickets().filter((t) => t.status === 'resolved' || t.status === 'closed').length /
                    tickets().length) *
                    100
                )}%`
              : '100%'}
          </div>
          <div class="text-[11px] text-gray-500 mt-1">Overall resolution pace</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <For each={['all', 'open', 'in_progress', 'resolved']}>
            {(st) => (
              <button
                onClick={() => setStatusFilter(st)}
                class={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition whitespace-nowrap ${
                  statusFilter() === st
                    ? 'bg-[#FF4500] text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            )}
          </For>
        </div>

        <div class="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search ticket #, store, issue..."
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            class="w-full text-xs pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
          />
          <svg class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Tickets List */}
      <div class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-gray-50 text-gray-500 border-b border-gray-200 font-bold uppercase tracking-wider text-[10px]">
                <th class="py-3 px-4">Ticket</th>
                <th class="py-3 px-4">Subject</th>
                <th class="py-3 px-4">Store / Merchant</th>
                <th class="py-3 px-4">Category</th>
                <th class="py-3 px-4">Priority</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <Show
                when={!loading()}
                fallback={
                  <tr>
                    <td colspan="7" class="py-8 text-center text-gray-400 animate-pulse">
                      Loading support desk...
                    </td>
                  </tr>
                }
              >
                <For
                  each={filteredTickets()}
                  fallback={
                    <tr>
                      <td colspan="7" class="py-8 text-center text-gray-400">
                        No support tickets in this view.
                      </td>
                    </tr>
                  }
                >
                  {(t) => (
                    <tr
                      onClick={() => openTicketDetail(t)}
                      class="hover:bg-gray-50/80 cursor-pointer transition"
                    >
                      <td class="py-3.5 px-4 font-mono font-bold text-[#FF4500]">
                        {t.ticketNumber}
                      </td>

                      <td class="py-3.5 px-4 font-semibold text-gray-900 max-w-xs truncate">
                        {t.subject}
                      </td>

                      <td class="py-3.5 px-4 text-gray-700">
                        {t.businessName}
                      </td>

                      <td class="py-3.5 px-4 capitalize">
                        <span class="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold">
                          {t.category.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td class="py-3.5 px-4">
                        <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getPriorityBadge(t.priority)}`}>
                          {t.priority}
                        </span>
                      </td>

                      <td class="py-3.5 px-4">
                        <span class={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(t.status)}`}>
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td class="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTicketDetail(t);
                          }}
                          class="px-3 py-1 bg-gray-100 hover:bg-[#FF4500] hover:text-white rounded-lg text-xs font-semibold text-gray-700 transition shadow-sm"
                        >
                          View Thread →
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Conversation Slide-Over / Modal */}
      <Show when={activeTicket()}>
        <div class="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
          <div class="bg-white h-full w-full max-w-xl shadow-2xl flex flex-col justify-between border-l border-gray-200">
            {/* Thread Header */}
            <div class="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-xs text-[#FF4500] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    {activeTicket()?.ticketNumber}
                  </span>
                  <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(activeTicket()?.priority || 'normal')}`}>
                    {activeTicket()?.priority.toUpperCase()}
                  </span>
                  <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadge(activeTicket()?.status || 'open')}`}>
                    {activeTicket()?.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>

                <h3 class="text-base font-bold text-gray-900 mt-2 font-heading leading-snug">
                  {activeTicket()?.subject}
                </h3>
                <p class="text-xs text-gray-500 mt-1">
                  Merchant: <strong class="text-gray-800">{activeTicket()?.businessName}</strong>
                </p>
              </div>

              <button
                onClick={() => setActiveTicket(null)}
                class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Status Quick Bar */}
            <div class="px-6 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
              <span class="text-gray-500 font-medium">Update Status:</span>
              <div class="flex items-center gap-1.5">
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold border border-amber-200 transition"
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleStatusChange('resolved')}
                  class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold border border-emerald-200 transition"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleStatusChange('closed')}
                  class="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold border border-gray-200 transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div class="flex-1 overflow-y-auto p-6 space-y-4">
              <Show
                when={!loadingMessages()}
                fallback={<div class="text-center text-xs text-gray-400 py-12">Loading messages...</div>}
              >
                <For
                  each={messages()}
                  fallback={
                    <div class="text-center text-xs text-gray-400 py-12">
                      No message history recorded yet for this ticket.
                    </div>
                  }
                >
                  {(m) => {
                    const isAdmin = m.senderType === 'admin';
                    return (
                      <div class={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div class="text-[10px] text-gray-400 mb-1 px-1">
                          <strong class={isAdmin ? 'text-[#FF4500]' : 'text-gray-700'}>
                            {m.senderName}
                          </strong>{' '}
                          • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div
                          class={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                            isAdmin
                              ? 'bg-[#FF4500] text-white rounded-br-none'
                              : 'bg-gray-100 text-gray-900 rounded-bl-none border border-gray-200'
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    );
                  }}
                </For>
              </Show>
            </div>

            {/* Reply Composer */}
            <div class="p-4 border-t border-gray-200 bg-white">
              <form onSubmit={handleSendReply} class="space-y-3">
                <textarea
                  rows="3"
                  required
                  placeholder="Type an official response to the merchant..."
                  value={replyText()}
                  onInput={(e) => setReplyText(e.currentTarget.value)}
                  class="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500] resize-none"
                />

                <div class="flex items-center justify-between">
                  <span class="text-[11px] text-gray-400">
                    Merchant will be notified via mobile push & web alert.
                  </span>
                  <button
                    type="submit"
                    disabled={sendingReply()}
                    class="px-5 py-2 text-xs font-bold text-white bg-[#FF4500] hover:bg-[#E03E00] rounded-xl transition shadow-md flex items-center gap-2"
                  >
                    {sendingReply() ? 'Sending...' : 'Send Reply 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
