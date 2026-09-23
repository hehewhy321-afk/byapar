import { Component, createSignal, For, Show } from 'solid-js';
import { sendAdminBroadcast, getBroadcastHistory, BroadcastLog } from '../services/adminApi';
import { currentAdmin } from '../services/adminAuth';

export const CampaignsView: Component = () => {
  const [broadcasts, setBroadcasts] = createSignal<BroadcastLog[]>([]);
  const [loading, setLoading] = createSignal(true);

  // Form states
  const [title, setTitle] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [targetSegment, setTargetSegment] = createSignal<'all' | 'free' | 'pro' | 'expiring'>('all');
  const [category, setCategory] = createSignal<'announcement' | 'offer' | 'system_alert' | 'maintenance'>('announcement');
  const [priority, setPriority] = createSignal<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const [isSending, setIsSending] = createSignal(false);
  const [sendSuccess, setSendSuccess] = createSignal<string | null>(null);
  const [sendError, setSendError] = createSignal<string | null>(null);

  const loadBroadcasts = async () => {
    try {
      const data = await getBroadcastHistory();
      setBroadcasts(data);
    } catch (err) {
      console.error('loadBroadcasts error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => {
    loadBroadcasts();
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
      loadBroadcasts();
    } else {
      setSendError(res.error || 'Failed to dispatch broadcast');
    }
  };

  return (
    <div class="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h2 class="text-xl font-bold font-heading text-gray-900">
          Notification Campaigns & Broadcasts
        </h2>
        <p class="text-xs text-gray-500">
          Send push and web notifications directly to merchant panels in real-time
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Campaign Composer Form */}
        <div class="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div class="font-bold text-xs text-gray-900 uppercase tracking-wider">
            Compose Broadcast
          </div>

          <Show when={sendSuccess()}>
            <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              {sendSuccess()}
            </div>
          </Show>

          <Show when={sendError()}>
            <div class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {sendError()}
            </div>
          </Show>

          <form onSubmit={handleSend} class="space-y-3.5 text-xs">
            {/* Target Segment */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1.5 uppercase tracking-wider text-[11px]">
                Target Audience
              </label>
              <div class="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'All Shops' },
                  { id: 'free', label: 'Free Tier' },
                  { id: 'pro', label: 'Active Pro' },
                  { id: 'expiring', label: 'Expiring Soon' },
                ].map((seg) => (
                  <button
                    type="button"
                    onClick={() => setTargetSegment(seg.id as any)}
                    class={`py-1.5 px-2.5 rounded-lg border text-xs font-medium transition-all ${
                      targetSegment() === seg.id
                        ? 'bg-orange-50 border-[#FF4500] text-[#FF4500] font-bold'
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
                <label class="block font-semibold text-gray-700 mb-1 uppercase tracking-wider text-[11px]">
                  Category
                </label>
                <select
                  value={category()}
                  onChange={(e) => setCategory(e.currentTarget.value as any)}
                  class="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-800 text-xs focus:outline-none focus:border-[#FF4500]"
                >
                  <option value="announcement">Announcement</option>
                  <option value="offer">Promotional Offer</option>
                  <option value="system_alert">System Alert</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1 uppercase tracking-wider text-[11px]">
                  Priority
                </label>
                <select
                  value={priority()}
                  onChange={(e) => setPriority(e.currentTarget.value as any)}
                  class="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-800 text-xs focus:outline-none focus:border-[#FF4500]"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Notification Title */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1 uppercase tracking-wider text-[11px]">
                Title
              </label>
              <input
                type="text"
                placeholder="e.g. 📢 Dashain Special: Renew for 20% Off"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                required
                class="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]"
              />
            </div>

            {/* Notification Message */}
            <div>
              <label class="block font-semibold text-gray-700 mb-1 uppercase tracking-wider text-[11px]">
                Message Body
              </label>
              <textarea
                rows="3"
                placeholder="Type your notification message to appear on mobile and web..."
                value={message()}
                onInput={(e) => setMessage(e.currentTarget.value)}
                required
                class="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500]"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSending()}
              class="w-full py-2 px-3 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white font-semibold text-xs shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              {isSending() ? (
                <span>Dispatching...</span>
              ) : (
                <span>Send Broadcast Alert</span>
              )}
            </button>
          </form>
        </div>

        {/* Broadcast History Table */}
        <div class="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-xs font-bold text-gray-900 uppercase tracking-wider">
              Dispatch History
            </h3>
            <span class="text-xs text-gray-400 font-mono">
              {broadcasts().length} logs
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                  <th class="py-2.5 px-3">Title & Message</th>
                  <th class="py-2.5 px-3">Target</th>
                  <th class="py-2.5 px-3">Sent</th>
                  <th class="py-2.5 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <Show
                  when={!loading() && broadcasts().length > 0}
                  fallback={
                    <tr>
                      <td colspan="4" class="py-8 text-center text-gray-400">
                        {loading() ? 'Loading history...' : 'No broadcasts sent yet.'}
                      </td>
                    </tr>
                  }
                >
                  <For each={broadcasts()}>
                    {(b) => (
                      <tr class="hover:bg-gray-50/50 transition-colors">
                        <td class="py-2.5 px-3 max-w-xs">
                          <div class="font-semibold text-gray-900 truncate">{b.title}</div>
                          <div class="text-[11px] text-gray-500 truncate mt-0.5">{b.message}</div>
                        </td>
                        <td class="py-2.5 px-3">
                          <span class="inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] capitalize">
                            {b.targetSegment}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 font-semibold text-emerald-600 font-mono">
                          {b.sentCount}
                        </td>
                        <td class="py-2.5 px-3 text-right text-gray-400 font-mono text-[11px]">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
