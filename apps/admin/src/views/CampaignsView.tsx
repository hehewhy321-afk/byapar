import { Component, createSignal, For, Show } from 'solid-js';
import {
  sendAdminBroadcast,
  getBroadcastHistory,
  getScheduledBroadcasts,
  createScheduledBroadcast,
  cancelScheduledBroadcast,
  BroadcastLog,
  ScheduledBroadcast,
} from '../services/adminApi';
import { currentAdmin } from '../services/adminAuth';

export const CampaignsView: Component = () => {
  const [broadcasts, setBroadcasts] = createSignal<BroadcastLog[]>([]);
  const [scheduled, setScheduled] = createSignal<ScheduledBroadcast[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [viewTab, setViewTab] = createSignal<'history' | 'scheduled'>('history');

  // Form states
  const [title, setTitle] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [targetSegment, setTargetSegment] = createSignal<'all' | 'free' | 'pro' | 'expiring'>('all');
  const [category, setCategory] = createSignal<'announcement' | 'offer' | 'system_alert' | 'maintenance'>('announcement');
  const [priority, setPriority] = createSignal<'low' | 'normal' | 'high' | 'urgent'>('normal');

  // Mode: instant vs scheduled
  const [deliveryMode, setDeliveryMode] = createSignal<'now' | 'scheduled'>('now');
  const [scheduleDate, setScheduleDate] = createSignal(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)
  );

  const [isSending, setIsSending] = createSignal(false);
  const [sendSuccess, setSendSuccess] = createSignal<string | null>(null);
  const [sendError, setSendError] = createSignal<string | null>(null);

  const loadData = async () => {
    try {
      const [bData, sData] = await Promise.all([getBroadcastHistory(), getScheduledBroadcasts()]);
      setBroadcasts(bData);
      setScheduled(sData);
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => {
    loadData();
  });

  const handleSend = async (e: Event) => {
    e.preventDefault();
    setSendSuccess(null);
    setSendError(null);

    if (!title().trim() || !message().trim()) {
      setSendError('Please provide both notification title and message.');
      return;
    }

    const admin = currentAdmin();
    if (!admin) {
      setSendError('You must be signed in as admin to dispatch broadcasts.');
      return;
    }

    setIsSending(true);

    if (deliveryMode() === 'scheduled') {
      const ok = await createScheduledBroadcast({
        title: title().trim(),
        message: message().trim(),
        category: category(),
        targetAudience: targetSegment(),
        scheduledFor: new Date(scheduleDate()).toISOString(),
      });
      setIsSending(false);

      if (ok) {
        setSendSuccess('Broadcast campaign scheduled successfully!');
        setTitle('');
        setMessage('');
        setViewTab('scheduled');
        loadData();
      } else {
        setSendError('Failed to schedule broadcast campaign.');
      }
      return;
    }

    const res = await sendAdminBroadcast(
      admin.id,
      title(),
      message(),
      targetSegment(),
      category(),
      priority()
    );

    setIsSending(false);

    if (res.success) {
      setSendSuccess(`Dispatched broadcast to ${res.sentCount} shop(s) successfully!`);
      setTitle('');
      setMessage('');
      loadData();
    } else {
      setSendError(res.error || 'Failed to dispatch broadcast');
    }
  };

  const handleCancelScheduled = async (id: string) => {
    const ok = await cancelScheduledBroadcast(id);
    if (ok) {
      setScheduled((curr) => curr.map((s) => (s.id === id ? { ...s, status: 'cancelled' } : s)));
      setSendSuccess('Scheduled broadcast cancelled.');
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-100 text-[#FF4500] border border-orange-200 uppercase tracking-wider">
              Outreach Engine
            </span>
            <span class="text-xs text-gray-500 font-mono">Phase 2 Scheduled Engine</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mt-2 font-heading">
            Notification Campaigns & Scheduled Broadcasts
          </h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Dispatch instant notifications or schedule timed broadcasts for upcoming Nepali festivals, system downtime, and billing renewal prompts.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            class="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition flex items-center gap-2 shadow-sm"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Campaign Composer Form */}
        <div class="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <div class="font-bold text-sm text-gray-900 font-heading">
              Compose Campaign
            </div>
            {/* Delivery Timing Toggle */}
            <div class="flex bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setDeliveryMode('now')}
                class={`px-2.5 py-1 rounded-md transition ${
                  deliveryMode() === 'now' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                Send Now ⚡
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMode('scheduled')}
                class={`px-2.5 py-1 rounded-md transition ${
                  deliveryMode() === 'scheduled' ? 'bg-[#FF4500] text-white shadow-sm' : 'text-gray-500'
                }`}
              >
                Schedule 📅
              </button>
            </div>
          </div>

          <Show when={sendSuccess()}>
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {sendSuccess()}
            </div>
          </Show>

          <Show when={sendError()}>
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {sendError()}
            </div>
          </Show>

          <form onSubmit={handleSend} class="space-y-3.5 text-xs">
            {/* Target Segment */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1.5 uppercase tracking-wider text-[10px]">
                Target Audience
              </label>
              <div class="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'All Registered Shops' },
                  { id: 'free', label: 'Free Tier Only' },
                  { id: 'pro', label: 'Active Pro Merchants' },
                  { id: 'expiring', label: 'Expiring in 7 Days' },
                ].map((seg) => (
                  <button
                    type="button"
                    onClick={() => setTargetSegment(seg.id as any)}
                    class={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      targetSegment() === seg.id
                        ? 'bg-orange-50 border-[#FF4500] text-[#FF4500] shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category & Priority */}
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
                  Category
                </label>
                <select
                  value={category()}
                  onChange={(e) => setCategory(e.currentTarget.value as any)}
                  class="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-gray-800 text-xs focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
                >
                  <option value="announcement">Announcement</option>
                  <option value="offer">Festival / Offer</option>
                  <option value="system_alert">System Alert</option>
                  <option value="maintenance">Maintenance Notice</option>
                </select>
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
                  Priority
                </label>
                <select
                  value={priority()}
                  onChange={(e) => setPriority(e.currentTarget.value as any)}
                  class="w-full px-2.5 py-2 rounded-xl border border-gray-200 text-gray-800 text-xs focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent Alert</option>
                  <option value="low">Low (Silent)</option>
                </select>
              </div>
            </div>

            {/* Scheduled Date/Time Input */}
            <Show when={deliveryMode() === 'scheduled'}>
              <div class="p-3 bg-orange-50/60 border border-orange-200 rounded-xl space-y-1">
                <label class="block font-bold text-[#FF4500] uppercase tracking-wider text-[10px]">
                  Dispatch Date & Time (Nepal Time)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleDate()}
                  onInput={(e) => setScheduleDate(e.currentTarget.value)}
                  class="w-full px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-xs font-mono"
                />
              </div>
            </Show>

            {/* Notification Title */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
                Notification Headline
              </label>
              <input
                type="text"
                placeholder="e.g. 📢 Dashain Special: Renew for 20% Off"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                required
                class="w-full px-3 py-2 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-xs focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
              />
            </div>

            {/* Notification Message */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1 uppercase tracking-wider text-[10px]">
                Message Body (Supports Nepali & English)
              </label>
              <textarea
                rows="3"
                placeholder="Type your notification message to appear on mobile and web..."
                value={message()}
                onInput={(e) => setMessage(e.currentTarget.value)}
                required
                class="w-full px-3 py-2 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-xs focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSending()}
              class="w-full py-2.5 px-4 rounded-xl bg-[#FF4500] hover:bg-[#E03E00] text-white font-bold text-xs shadow-md transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              {isSending() ? (
                <span>Processing Campaign...</span>
              ) : deliveryMode() === 'scheduled' ? (
                <span>Schedule Campaign for Future 📅</span>
              ) : (
                <span>Dispatch Instant Broadcast 🚀</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Tab: History vs Scheduled Queue */}
        <div class="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <div class="flex items-center gap-2">
              <button
                onClick={() => setViewTab('history')}
                class={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewTab() === 'history'
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Dispatch History ({broadcasts().length})
              </button>
              <button
                onClick={() => setViewTab('scheduled')}
                class={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  viewTab() === 'scheduled'
                    ? 'bg-[#FF4500] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Scheduled Queue ({scheduled().length})
              </button>
            </div>
          </div>

          {/* Table: History */}
          <Show when={viewTab() === 'history'}>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th class="py-2.5 px-3">Title & Message</th>
                    <th class="py-2.5 px-3">Target</th>
                    <th class="py-2.5 px-3">Sent Count</th>
                    <th class="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <Show
                    when={!loading() && broadcasts().length > 0}
                    fallback={
                      <tr>
                        <td colspan="4" class="py-8 text-center text-gray-400">
                          {loading() ? 'Loading history...' : 'No broadcasts dispatched yet.'}
                        </td>
                      </tr>
                    }
                  >
                    <For each={broadcasts()}>
                      {(b) => (
                        <tr class="hover:bg-gray-50/50 transition">
                          <td class="py-3 px-3 max-w-xs">
                            <div class="font-bold text-gray-900 truncate">{b.title}</div>
                            <div class="text-[11px] text-gray-500 truncate mt-0.5">{b.message}</div>
                          </td>
                          <td class="py-3 px-3">
                            <span class="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-semibold capitalize">
                              {b.targetSegment}
                            </span>
                          </td>
                          <td class="py-3 px-3 font-bold text-emerald-600 font-mono">
                            {b.sentCount}
                          </td>
                          <td class="py-3 px-3 text-right text-gray-400 font-mono text-[11px]">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </tbody>
              </table>
            </div>
          </Show>

          {/* Table: Scheduled Queue */}
          <Show when={viewTab() === 'scheduled'}>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th class="py-2.5 px-3">Campaign</th>
                    <th class="py-2.5 px-3">Target</th>
                    <th class="py-2.5 px-3">Scheduled For</th>
                    <th class="py-2.5 px-3">Status</th>
                    <th class="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <Show
                    when={scheduled().length > 0}
                    fallback={
                      <tr>
                        <td colspan="5" class="py-8 text-center text-gray-400">
                          No broadcasts currently in the scheduled queue.
                        </td>
                      </tr>
                    }
                  >
                    <For each={scheduled()}>
                      {(s) => (
                        <tr class="hover:bg-gray-50/50 transition">
                          <td class="py-3 px-3 max-w-xs">
                            <div class="font-bold text-gray-900 truncate">{s.title}</div>
                            <div class="text-[11px] text-gray-500 truncate mt-0.5">{s.message}</div>
                          </td>
                          <td class="py-3 px-3">
                            <span class="inline-block px-2 py-0.5 rounded-full bg-orange-50 text-[#FF4500] text-[10px] font-semibold capitalize">
                              {s.targetAudience}
                            </span>
                          </td>
                          <td class="py-3 px-3 font-mono text-gray-700">
                            {new Date(s.scheduledFor).toLocaleString()}
                          </td>
                          <td class="py-3 px-3">
                            <span
                              class={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                s.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : s.status === 'sent'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td class="py-3 px-3 text-right">
                            <Show when={s.status === 'pending'}>
                              <button
                                onClick={() => handleCancelScheduled(s.id)}
                                class="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-semibold transition"
                              >
                                Cancel
                              </button>
                            </Show>
                          </td>
                        </tr>
                      )}
                    </For>
                  </Show>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};
