import { Component, createSignal, Show } from 'solid-js';
import {
  getFirebaseConfig,
  sendAdminBroadcast,
} from '../services/adminApi';
import { currentAdmin } from '../services/adminAuth';

export const SettingsView: Component = () => {
  const firebaseConfig = getFirebaseConfig();
  const [testResult, setTestResult] = createSignal<{ success: boolean; msg: string } | null>(null);
  const [isTesting, setIsTesting] = createSignal(false);
  const [customTitle, setCustomTitle] = createSignal('');
  const [customMsg, setCustomMsg] = createSignal('');
  const [isSendingCustom, setIsSendingCustom] = createSignal(false);

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);

    const admin = currentAdmin();
    try {
      if (admin) {
        const res = await sendAdminBroadcast(
          admin.id,
          '🔔 Test Broadcast from Byapar Admin',
          'Firebase & Realtime alerts are active across Mobile, Web, and Admin.',
          'all',
          'system_alert',
          'normal'
        );
        if (res.success) {
          setTestResult({
            success: true,
            msg: `Broadcast successfully dispatched to ${res.sentCount} connected merchant shops!`,
          });
        } else {
          setTestResult({
            success: false,
            msg: res.error || 'Failed to dispatch broadcast',
          });
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: err.message || 'Error sending test broadcast',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendCustomBroadcast = async (e: Event) => {
    e.preventDefault();
    if (!customTitle().trim() || !customMsg().trim()) return;

    setIsSendingCustom(true);
    const admin = currentAdmin();
    if (admin) {
      const res = await sendAdminBroadcast(
        admin.id,
        customTitle().trim(),
        customMsg().trim(),
        'all',
        'announcement',
        'high'
      );
      if (res.success) {
        setTestResult({
          success: true,
          msg: `Custom broadcast "${customTitle()}" sent to ${res.sentCount} merchant shops!`,
        });
        setCustomTitle('');
        setCustomMsg('');
      } else {
        setTestResult({
          success: false,
          msg: res.error || 'Failed to dispatch broadcast',
        });
      }
    }
    setIsSendingCustom(false);
  };

  return (
    <div class="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h2 class="text-xl font-bold font-heading text-gray-900">
          Firebase & Push Notification Settings
        </h2>
        <p class="text-xs text-gray-500">
          Direct Google Firebase (FCM + Analytics) and Supabase cross-platform push synchronization.
        </p>
      </div>

      {/* System Status Banner */}
      <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span class="text-xs font-bold text-gray-900">
              Firebase Status: {firebaseConfig.status}
            </span>
          </div>

          <button
            type="button"
            onClick={handleTestNotification}
            disabled={isTesting()}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF4500]/10 hover:bg-[#FF4500]/20 text-[#FF4500] transition"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {isTesting() ? 'Sending Test...' : 'Send Test Broadcast'}
          </button>
        </div>

        <p class="text-xs text-gray-600 leading-relaxed">
          <strong>Direct Architecture:</strong> Byapar uses direct <strong>Google Firebase</strong> (FCM & Analytics) and Supabase Realtime. No third-party intermediaries are required, ensuring zero monthly SaaS fees, complete data privacy, and direct connection to your Android devices.
        </p>

        <Show when={testResult()}>
          <div
            class={`p-3 rounded-lg text-xs font-medium border ${
              testResult()?.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}
          >
            {testResult()?.msg}
          </div>
        </Show>
      </div>

      {/* Firebase Project Info Card */}
      <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider">
          Firebase Project Details
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Firebase Project ID</span>
            <span class="text-xs font-mono font-semibold text-gray-900 mt-1 block">{firebaseConfig.projectId}</span>
          </div>

          <div class="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Project Number</span>
            <span class="text-xs font-mono font-semibold text-gray-900 mt-1 block">{firebaseConfig.projectNumber}</span>
          </div>

          <div class="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Android Native Config</span>
            <span class="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              google-services.json linked (com.byapar)
            </span>
          </div>

          <div class="p-3.5 rounded-lg bg-gray-50 border border-gray-100">
            <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Google Analytics</span>
            <span class="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Active (firebase-bom:33.7.0 + firebase-analytics)
            </span>
          </div>
        </div>
      </div>

      {/* Broadcast Message to All Shops */}
      <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 class="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
          Send System Announcement Broadcast
        </h3>
        <p class="text-xs text-gray-500 mb-4">
          Dispatch an instant announcement notification to all registered merchant shops across web and mobile.
        </p>

        <form onSubmit={handleSendCustomBroadcast} class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">
              Broadcast Title
            </label>
            <input
              type="text"
              value={customTitle()}
              onInput={(e) => setCustomTitle(e.currentTarget.value)}
              placeholder="e.g. Scheduled System Upgrade at 11:00 PM"
              class="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#FF4500] focus:border-[#FF4500] bg-gray-50/50"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">
              Message Content
            </label>
            <textarea
              rows={3}
              value={customMsg()}
              onInput={(e) => setCustomMsg(e.currentTarget.value)}
              placeholder="Enter message details that will appear on merchant phones and web portals..."
              class="w-full px-3.5 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#FF4500] focus:border-[#FF4500] bg-gray-50/50"
              required
            />
          </div>

          <div class="pt-2 flex items-center justify-between">
            <span class="text-[11px] text-gray-400">
              Dispatches instantly via Supabase Realtime and triggers device notifications.
            </span>
            <button
              type="submit"
              disabled={isSendingCustom()}
              class="px-5 py-2 rounded-lg bg-[#FF4500] hover:bg-[#E03E00] text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              {isSendingCustom() ? 'Broadcasting...' : 'Broadcast to All Merchants'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
