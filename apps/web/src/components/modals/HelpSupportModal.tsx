import { Component, createSignal, For, Show, onSettled } from 'solid-js';
import { showHelpModal, setShowHelpModal, currentBusiness } from '../../db/localDb';
import { currentUser, supabase } from '../../db/auth';
import {
  IconHandshake,
  IconWhatsApp,
  IconPhone,
  IconMail,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconPlus,
  IconCheck,
} from '../icons';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'merchant' | 'admin' | 'system';
  sender_name?: string;
  message: string;
  created_at: string;
}

export const HelpSupportModal: Component = () => {
  const [activeTab, setActiveTab] = createSignal<'faqs' | 'tickets'>('faqs');
  const [activeFaq, setActiveFaq] = createSignal<number | null>(0);
  const [searchQuery, setSearchQuery] = createSignal('');

  // Tickets State
  const [tickets, setTickets] = createSignal<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = createSignal(false);
  const [selectedTicket, setSelectedTicket] = createSignal<SupportTicket | null>(null);
  const [messages, setMessages] = createSignal<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = createSignal(false);
  const [replyText, setReplyText] = createSignal('');
  const [sendingReply, setSendingReply] = createSignal(false);

  // New Ticket Form State
  const [showNewTicketForm, setShowNewTicketForm] = createSignal(false);
  const [newSubject, setNewSubject] = createSignal('');
  const [newCategory, setNewCategory] = createSignal('fonepay_qr');
  const [newPriority, setNewPriority] = createSignal('normal');
  const [newMessage, setNewMessage] = createSignal('');
  const [submittingTicket, setSubmittingTicket] = createSignal(false);

  const faqs = [
    {
      q: 'How do I add a new customer or supplier credit entry?',
      a: 'Navigate to "Parties" from the sidebar. You can click "+ Add Party" to register a customer or supplier. Select their name in the list, then click "+ Liyo (Got Payment)" or "+ Diyo (Gave Credit)" to record transaction amounts with optional remarks.',
    },
    {
      q: 'How does the Fonepay Dynamic QR work?',
      a: 'When you checkout a sale in POS Billing, choose "Fonepay Dynamic QR". A dynamic QR with exact invoice amount locked will be displayed. Customers scan with eSewa, Khalti, or any mobile banking app. You can also save the QR code image or share the payment link directly on WhatsApp.',
    },
    {
      q: 'Is this system compliant with Nepal Inland Revenue Department (IRD) CBMS?',
      a: 'Yes! Byapar implements the Schedule-13 Real-Time Central Billing Monitoring System (CBMS). All issued tax invoices generate sequential invoice numbers, encrypted hash logs, and sync directly with IRD servers when internet connectivity is active.',
    },
    {
      q: 'How do I setup 58mm or 80mm thermal receipt printing?',
      a: 'Go to Settings > Billing & Hardware. Select your preferred thermal printer width (58mm or 80mm). When completing a POS sale, click "Print Receipt" to automatically format with monospace thermal receipt styling.',
    },
    {
      q: 'How does real-time cloud data sync work?',
      a: 'Byapar uses real-time encrypted cloud sync. Every transaction, POS invoice, customer credit khata entry, and inventory update is immediately synchronized to high-speed cloud database servers with end-to-end security and automated backups.',
    },
  ];

  const filteredFaqs = () => {
    const q = searchQuery().toLowerCase().trim();
    if (!q) return faqs;
    return faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  };

  const loadTickets = async () => {
    if (!currentBusiness.id) return;
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTickets(data);
      }
    } catch (err) {
      console.warn('Load tickets notice:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const openTicketThread = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.warn('Load messages notice:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async (e: Event) => {
    e.preventDefault();
    const t = selectedTicket();
    const text = replyText().trim();
    if (!t || !text) return;

    setSendingReply(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: t.id,
          sender_id: currentUser()?.id || null,
          sender_type: 'merchant',
          sender_name: currentUser()?.name || currentBusiness.name,
          message: text,
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) => [...prev, data]);
        setReplyText('');
      }
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateTicket = async (e: Event) => {
    e.preventDefault();
    if (!newSubject().trim() || !newMessage().trim()) return;

    setSubmittingTicket(true);
    try {
      const ticketNum = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Insert Ticket
      const { data: ticket, error: tErr } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNum,
          business_id: currentBusiness.id,
          user_id: currentUser()?.id || null,
          subject: newSubject().trim(),
          category: newCategory(),
          priority: newPriority(),
          status: 'open',
        })
        .select()
        .single();

      if (tErr || !ticket) throw tErr || new Error('Failed to create ticket');

      // 2. Insert Initial Message
      await supabase.from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: currentUser()?.id || null,
        sender_type: 'merchant',
        sender_name: currentUser()?.name || currentBusiness.name,
        message: newMessage().trim(),
      });

      setShowNewTicketForm(false);
      setNewSubject('');
      setNewMessage('');
      await loadTickets();
      openTicketThread(ticket);
    } catch (err: any) {
      alert(`Ticket submission error: ${err.message}`);
    } finally {
      setSubmittingTicket(false);
    }
  };

  return (
    <Show when={showHelpModal()}>
      <div
        class="modal-overlay animate-fade-in"
        onClick={() => setShowHelpModal(false)}
        ref={() => {
          if (activeTab() === 'tickets') loadTickets();
        }}
      >
        <div
          class="modal-content !max-w-2xl p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold shadow-sm">
                <IconHandshake size={20} />
              </div>
              <div>
                <h3 class="font-bold text-base text-neutral-900 dark:text-white font-heading">
                  Help & Support Desk
                </h3>
                <p class="text-xs text-neutral-500">
                  Instant FAQs, 24/7 hotline contacts, and live admin support ticket chat
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 p-1.5 rounded-lg transition"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div class="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-2xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('faqs')}
              class={`flex-1 py-1.5 rounded-xl transition ${
                activeTab() === 'faqs'
                  ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              📖 FAQs & Hotlines
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('tickets');
                loadTickets();
              }}
              class={`flex-1 py-1.5 rounded-xl transition ${
                activeTab() === 'tickets'
                  ? 'bg-[#FF4500] text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              🎫 My Support Tickets ({tickets().length})
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: FAQS & QUICK HOTLINES                                              */}
          {/* ========================================================================= */}
          <Show when={activeTab() === 'faqs'}>
            <div class="space-y-4">
              {/* Quick Contact Cards */}
              <div class="grid grid-cols-3 gap-3">
                <a
                  href="https://wa.me/9779841234567?text=Hello%20Byapar%20Support"
                  target="_blank"
                  class="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-center transition block group"
                >
                  <div class="flex justify-center mb-1">
                    <IconWhatsApp size={22} class="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span class="font-bold text-xs text-emerald-800 dark:text-emerald-300 block">WhatsApp</span>
                  <span class="text-[10px] text-emerald-600 dark:text-emerald-400">Live 24/7 Chat</span>
                </a>

                <a
                  href="tel:9841234567"
                  class="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-center transition block group"
                >
                  <div class="flex justify-center mb-1">
                    <IconPhone size={22} class="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span class="font-bold text-xs text-blue-800 dark:text-blue-300 block">Call Helpline</span>
                  <span class="text-[10px] text-blue-600 dark:text-blue-400">Toll Free Nepal</span>
                </a>

                <a
                  href="mailto:support@byapar.com"
                  class="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-900/40 text-center transition block group"
                >
                  <div class="flex justify-center mb-1">
                    <IconMail size={22} class="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span class="font-bold text-xs text-purple-800 dark:text-purple-300 block">Email Us</span>
                  <span class="text-[10px] text-purple-600 dark:text-purple-400">support@byapar.com</span>
                </a>
              </div>

              {/* FAQ Accordion */}
              <div>
                <h4 class="font-bold text-xs text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                  Frequently Asked Questions
                </h4>
                <input
                  type="text"
                  placeholder="Search help topics..."
                  value={searchQuery()}
                  onInput={(e) => setSearchQuery(e.currentTarget.value)}
                  class="input-field text-xs mb-3"
                />

                <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <For each={filteredFaqs()}>
                    {(faq, idx) => {
                      const isOpen = () => activeFaq() === idx();
                      return (
                        <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                          <button
                            class="w-full p-3 text-left font-semibold text-xs text-neutral-800 dark:text-neutral-200 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100/80 transition"
                            onClick={() => setActiveFaq(isOpen() ? null : idx())}
                          >
                            <span>{faq.q}</span>
                            <span class="text-neutral-400 text-xs">
                              {isOpen() ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                            </span>
                          </button>
                          <Show when={isOpen()}>
                            <div class="p-3 text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-black leading-relaxed border-t border-neutral-100 dark:border-neutral-800">
                              {faq.a}
                            </div>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          </Show>

          {/* ========================================================================= */}
          {/* TAB 2: MY SUPPORT TICKETS & REAL-TIME THREADS                             */}
          {/* ========================================================================= */}
          <Show when={activeTab() === 'tickets'}>
            <div class="space-y-4">
              {/* If viewing a specific ticket thread */}
              <Show
                when={selectedTicket()}
                fallback={
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <div>
                        <h4 class="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider">
                          Support Tickets for {currentBusiness.name}
                        </h4>
                        <p class="text-[11px] text-neutral-500">
                          Direct chat with the Byapar platform engineering & support team
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowNewTicketForm(true)}
                        class="btn-primary text-xs flex items-center gap-1.5 !py-1.5"
                      >
                        <IconPlus size={14} />
                        <span>Open New Ticket</span>
                      </button>
                    </div>

                    {/* New Ticket Form Modal/Card */}
                    <Show when={showNewTicketForm()}>
                      <form
                        onSubmit={handleCreateTicket}
                        class="p-4 rounded-2xl bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 mb-4 space-y-3 text-xs animate-fade-in"
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-orange-900 dark:text-orange-300">
                            Create New Support Ticket
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowNewTicketForm(false)}
                            class="text-neutral-400 font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        <div>
                          <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Subject / Issue Summary *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Issue with Fonepay Dynamic QR settlement"
                            value={newSubject()}
                            onInput={(e) => setNewSubject(e.currentTarget.value)}
                            class="input-field"
                          />
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                          <div>
                            <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              Category
                            </label>
                            <select
                              value={newCategory()}
                              onChange={(e) => setNewCategory(e.currentTarget.value)}
                              class="input-field"
                            >
                              <option value="fonepay_qr">Fonepay Dynamic QR</option>
                              <option value="billing">Subscription & Billing</option>
                              <option value="bug">Software Bug</option>
                              <option value="general">General Support</option>
                            </select>
                          </div>

                          <div>
                            <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                              Priority
                            </label>
                            <select
                              value={newPriority()}
                              onChange={(e) => setNewPriority(e.currentTarget.value)}
                              class="input-field"
                            >
                              <option value="normal">Normal</option>
                              <option value="high">High (Urgent sale impacted)</option>
                              <option value="urgent">Urgent Critical</option>
                              <option value="low">Low inquiry</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                            Detailed Description *
                          </label>
                          <textarea
                            rows={3}
                            required
                            placeholder="Please provide details of what happened, time of incident, amount, or error messages..."
                            value={newMessage()}
                            onInput={(e) => setNewMessage(e.currentTarget.value)}
                            class="input-field"
                          />
                        </div>

                        <div class="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowNewTicketForm(false)}
                            class="btn-secondary text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submittingTicket()}
                            class="btn-primary text-xs flex items-center gap-1.5"
                          >
                            <IconCheck size={14} />
                            <span>{submittingTicket() ? 'Submitting...' : 'Submit Ticket'}</span>
                          </button>
                        </div>
                      </form>
                    </Show>

                    {/* Tickets List */}
                    <div class="space-y-2 max-h-72 overflow-y-auto">
                      <Show
                        when={!loadingTickets() && tickets().length > 0}
                        fallback={
                          <div class="py-10 text-center text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                            {loadingTickets() ? 'Loading tickets...' : 'No support tickets opened yet. Click "+ Open New Ticket" if you need any assistance!'}
                          </div>
                        }
                      >
                        <For each={tickets()}>
                          {(ticket) => (
                            <div
                              onClick={() => openTicketThread(ticket)}
                              class="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-orange-300 bg-white dark:bg-neutral-950 transition cursor-pointer flex items-center justify-between"
                            >
                              <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                  <span class="font-mono text-[10px] text-neutral-400 font-bold">
                                    {ticket.ticket_number}
                                  </span>
                                  <span
                                    class={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                      ticket.status === 'open'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                                        : ticket.status === 'in_progress'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                                        : ticket.status === 'waiting_on_merchant'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                                    }`}
                                  >
                                    {ticket.status.replace(/_/g, ' ')}
                                  </span>
                                  <span class="text-[10px] text-neutral-400 capitalize">
                                    • {ticket.category.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <div class="font-bold text-xs text-neutral-900 dark:text-white">
                                  {ticket.subject}
                                </div>
                                <div class="text-[10px] text-neutral-400">
                                  Created: {new Date(ticket.created_at).toLocaleString()}
                                </div>
                              </div>

                              <span class="text-xs font-bold text-[#FF4500] hover:underline">
                                View Chat →
                              </span>
                            </div>
                          )}
                        </For>
                      </Show>
                    </div>
                  </div>
                }
              >
                {/* Active Ticket Chat Thread */}
                <div class="space-y-3">
                  <div class="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicket(null);
                        loadTickets();
                      }}
                      class="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white font-semibold flex items-center gap-1"
                    >
                      ← Back to All Tickets
                    </button>

                    <div class="flex items-center gap-2">
                      <span class="font-mono text-xs font-bold text-neutral-400">
                        {selectedTicket()?.ticket_number}
                      </span>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize bg-amber-100 text-amber-800">
                        {selectedTicket()?.status}
                      </span>
                    </div>
                  </div>

                  <div class="bg-neutral-50 dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                    <div class="font-bold text-xs text-neutral-900 dark:text-white">
                      {selectedTicket()?.subject}
                    </div>
                  </div>

                  {/* Messages Bubble Area */}
                  <div class="h-64 overflow-y-auto space-y-3 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <Show
                      when={!loadingMessages()}
                      fallback={<div class="text-center text-xs text-neutral-400 py-10">Loading conversation...</div>}
                    >
                      <For each={messages()}>
                        {(msg) => {
                          const isMerchant = msg.sender_type === 'merchant';
                          return (
                            <div class={`flex flex-col ${isMerchant ? 'items-end' : 'items-start'}`}>
                              <div class="text-[10px] text-neutral-400 mb-1 flex items-center gap-1.5">
                                <span>{isMerchant ? 'You (Merchant)' : (msg.sender_name || 'Byapar Support Team')}</span>
                                <span>•</span>
                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div
                                class={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                                  isMerchant
                                    ? 'bg-[#FF4500] text-white rounded-tr-none'
                                    : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-tl-none shadow-sm'
                                }`}
                              >
                                {msg.message}
                              </div>
                            </div>
                          );
                        }}
                      </For>
                    </Show>
                  </div>

                  {/* Reply Input Box */}
                  <form onSubmit={handleSendReply} class="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a message to support team..."
                      value={replyText()}
                      onInput={(e) => setReplyText(e.currentTarget.value)}
                      class="input-field text-xs flex-1"
                    />
                    <button
                      type="submit"
                      disabled={sendingReply() || !replyText().trim()}
                      class="btn-primary text-xs shrink-0 !py-2.5 px-4 font-bold"
                    >
                      {sendingReply() ? 'Sending...' : 'Send Reply'}
                    </button>
                  </form>
                </div>
              </Show>
            </div>
          </Show>

          <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end mt-4">
            <button class="btn-secondary text-xs" onClick={() => setShowHelpModal(false)}>
              Close Desk
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};
