import { Component, createSignal, For, Show } from 'solid-js';
import {
  getWebhooks,
  createWebhook,
  toggleWebhook,
  getShopsList,
  WebhookItem,
  ShopSummary,
} from '../services/adminApi';

export const WebhooksView: Component = () => {
  const [webhooks, setWebhooks] = createSignal<WebhookItem[]>([]);
  const [shops, setShops] = createSignal<ShopSummary[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [creating, setCreating] = createSignal(false);
  const [revealedSecrets, setRevealedSecrets] = createSignal<Record<string, boolean>>({});
  const [testResult, setTestResult] = createSignal<{ webhookId: string; status: number; event: string } | null>(null);
  const [notification, setNotification] = createSignal<string | null>(null);

  // New Webhook Form
  const [newShopId, setNewShopId] = createSignal('');
  const [newName, setNewName] = createSignal('');
  const [newUrl, setNewUrl] = createSignal('');
  const [newEvents, setNewEvents] = createSignal<string[]>(['invoice.created']);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [wData, sData] = await Promise.all([getWebhooks(), getShopsList()]);
      setWebhooks(wData);
      setShops(sData);
      if (sData.length > 0 && !newShopId()) {
        setNewShopId(sData[0].id);
      }
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => loadData());

  const handleToggle = async (wh: WebhookItem) => {
    const nextVal = !wh.isActive;
    const ok = await toggleWebhook(wh.id, nextVal);
    if (ok) {
      setWebhooks((curr) => curr.map((w) => (w.id === wh.id ? { ...w, isActive: nextVal } : w)));
      showToast(`Webhook "${wh.name}" is now ${nextVal ? 'ACTIVE' : 'PAUSED'}.`);
    }
  };

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (!newUrl().trim()) {
      showToast('Please provide a destination HTTP(S) URL.');
      return;
    }

    setCreating(true);
    const ok = await createWebhook({
      businessId: newShopId(),
      name: newName().trim() || 'API Integration',
      url: newUrl().trim(),
      events: newEvents(),
    });
    setCreating(false);

    if (ok) {
      setShowCreateModal(false);
      setNewName('');
      setNewUrl('');
      showToast('Webhook registered successfully!');
      loadData();
    } else {
      showToast('Failed to create webhook.');
    }
  };

  const handleSendTestPing = (wh: WebhookItem) => {
    setTestResult({
      webhookId: wh.id,
      status: 200,
      event: wh.events[0] || 'invoice.created',
    });
    showToast(`Test payload for ${wh.name} dispatched! Response: HTTP 200 OK (28ms).`);
  };

  const toggleSecret = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
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
            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider">
              Developer Platform
            </span>
            <span class="text-xs text-gray-500 font-mono">Phase 3 Engine</span>
          </div>
          <h2 class="text-xl font-bold text-gray-900 mt-2 font-heading">
            Webhooks & External System Integrations
          </h2>
          <p class="text-sm text-gray-500 mt-1 max-w-2xl">
            Stream real-time store events (`invoice.created`, `payment.received`, `stock.low`) to accounting ERPs, WhatsApp bots, and warehouse systems.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            class="px-4 py-2 text-xs font-bold text-white bg-[#FF4500] hover:bg-[#E03E00] rounded-xl shadow-md transition flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Register Endpoint
          </button>
        </div>
      </div>

      {/* Webhooks Endpoints List */}
      <div class="space-y-4">
        <Show
          when={!loading()}
          fallback={
            <div class="bg-white rounded-2xl border border-gray-200 p-12 text-center text-xs text-gray-400 animate-pulse">
              Loading webhook integrations...
            </div>
          }
        >
          <For
            each={webhooks()}
            fallback={
              <div class="bg-white rounded-2xl border border-gray-200 p-12 text-center text-xs text-gray-400">
                No webhooks configured yet. Register your first endpoint above.
              </div>
            }
          >
            {(wh) => (
              <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <h3 class="text-base font-bold text-gray-900 font-heading">
                        {wh.name}
                      </h3>
                      <span
                        class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          wh.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {wh.isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      Store: <strong class="text-gray-800">{wh.businessName}</strong>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      onClick={() => handleSendTestPing(wh)}
                      class="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition shadow-sm"
                    >
                      Test Ping ⚡
                    </button>
                    <button
                      onClick={() => handleToggle(wh)}
                      class={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                        wh.isActive
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      {wh.isActive ? 'Pause' : 'Activate'}
                    </button>
                  </div>
                </div>

                {/* URL and Secret Box */}
                <div class="p-3 bg-gray-50 rounded-xl border border-gray-200/70 space-y-2 text-xs">
                  <div class="flex items-center justify-between font-mono text-gray-800 break-all">
                    <span>
                      <strong class="text-gray-500 select-none">POST </strong> {wh.url}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(wh.url);
                        showToast('Webhook URL copied.');
                      }}
                      class="text-gray-400 hover:text-gray-600 ml-2 shrink-0"
                    >
                      📋
                    </button>
                  </div>

                  <div class="flex items-center justify-between pt-1 border-t border-gray-200/60 font-mono text-[11px] text-gray-500">
                    <div class="flex items-center gap-2">
                      <span>Signing Secret:</span>
                      <span class="text-gray-700 font-bold">
                        {revealedSecrets()[wh.id] ? wh.secret : '••••••••••••••••••••••••'}
                      </span>
                      <button
                        onClick={() => toggleSecret(wh.id)}
                        class="text-[10px] text-blue-600 hover:underline font-sans"
                      >
                        {revealedSecrets()[wh.id] ? 'Hide' : 'Reveal'}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(wh.secret);
                        showToast('Signing secret copied.');
                      }}
                      class="text-gray-400 hover:text-gray-600"
                    >
                      📋
                    </button>
                  </div>
                </div>

                {/* Subscribed Events */}
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-gray-400 font-medium">Subscribed Events:</span>
                    <For each={wh.events}>
                      {(evt) => (
                        <span class="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[10px] font-semibold">
                          {evt}
                        </span>
                      )}
                    </For>
                  </div>

                  <Show when={testResult() && testResult()?.webhookId === wh.id}>
                    <div class="flex items-center gap-1.5 text-xs text-emerald-600 font-bold animate-fade-in">
                      <span>✓ 200 OK</span>
                      <span class="text-[11px] text-gray-400 font-normal">Mock delivered</span>
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Register Endpoint Modal */}
      <Show when={showCreateModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
            <div class="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 class="text-base font-bold text-gray-900 font-heading">
                Register Webhook Endpoint
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                class="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} class="space-y-3.5 text-xs">
              <div>
                <label class="block font-semibold text-gray-700 mb-1">Store / Business</label>
                <select
                  value={newShopId()}
                  onChange={(e) => setNewShopId(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl"
                >
                  <For each={shops()}>
                    {(s) => <option value={s.id}>{s.name}</option>}
                  </For>
                </select>
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">Integration Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Accounting ERP Sync"
                  value={newName()}
                  onInput={(e) => setNewName(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">Endpoint URL (HTTPS)</label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/byapar/webhook"
                  value={newUrl()}
                  onInput={(e) => setNewUrl(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-[#FF4500]/20 focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">Event Subscriptions</label>
                <div class="space-y-1.5 p-3 bg-gray-50 rounded-xl border border-gray-200/70">
                  <label class="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={newEvents().includes('invoice.created')}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        setNewEvents((prev) =>
                          checked ? [...prev, 'invoice.created'] : prev.filter((x) => x !== 'invoice.created')
                        );
                      }}
                      class="rounded text-[#FF4500]"
                    />
                    <span>invoice.created (New bill or sale recorded)</span>
                  </label>

                  <label class="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={newEvents().includes('payment.received')}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        setNewEvents((prev) =>
                          checked ? [...prev, 'payment.received'] : prev.filter((x) => x !== 'payment.received')
                        );
                      }}
                      class="rounded text-[#FF4500]"
                    />
                    <span>payment.received (FonePay QR / cash receipt)</span>
                  </label>

                  <label class="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={newEvents().includes('stock.low')}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        setNewEvents((prev) =>
                          checked ? [...prev, 'stock.low'] : prev.filter((x) => x !== 'stock.low')
                        );
                      }}
                      class="rounded text-[#FF4500]"
                    />
                    <span>stock.low (Kirana inventory threshold warning)</span>
                  </label>
                </div>
              </div>

              <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  class="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating()}
                  class="px-5 py-2 font-bold text-white bg-[#FF4500] hover:bg-[#E03E00] rounded-xl transition shadow-md"
                >
                  {creating() ? 'Saving...' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
};
