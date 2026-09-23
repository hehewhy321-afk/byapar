import { Component, createSignal, For, Show } from 'solid-js';
import { runAutomationsEngine, AutomationResult } from '../services/adminApi';

export const AutomationsView: Component = () => {
  const [isRunning, setIsRunning] = createSignal(false);
  const [lastResult, setLastResult] = createSignal<AutomationResult | null>(null);

  const rules = [
    {
      id: 'sub_7d',
      title: '7-Day Subscription Expiry Warning',
      description: 'Scans all active subscriptions. Automatically sends gentle renewal reminder when validity is between 4 to 7 days.',
      frequency: 'Daily at 08:00 AM',
      status: 'Active',
      icon: '⏳',
    },
    {
      id: 'sub_3d',
      title: '3-Day Urgent Renewal Alert',
      description: 'Flags merchants with 3 or fewer days remaining. Sends high-priority push and web banner to prevent service interruption.',
      frequency: 'Daily at 09:00 AM',
      status: 'Active',
      icon: '⚠️',
    },
    {
      id: 'sub_expired',
      title: 'Expired Account Winback & Retention',
      description: 'Detects lapsed subscriptions and sends an automated merchant reactivation incentive with promo pricing.',
      frequency: 'Every 3 Days',
      status: 'Active',
      icon: '🎁',
    },
    {
      id: 'debtor_sync',
      title: 'Cross-Device Khata Sync Watcher',
      description: 'Ensures real-time debtor reminders and supplier payable alerts are mirrored between mobile and web instances.',
      frequency: 'Continuous Realtime',
      status: 'Active',
      icon: '⚡',
    },
  ];

  const handleRunNow = async () => {
    setIsRunning(true);
    try {
      const res = await runAutomationsEngine();
      setLastResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div class="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header and Action */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold font-heading text-gray-900">
            Automated Notification Rules
          </h2>
          <p class="text-xs text-gray-500">
            Automated background jobs for subscription lifecycle and debtor alerts
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunNow}
          disabled={isRunning()}
          class="px-4 py-2 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
        >
          <svg
            class={`w-3.5 h-3.5 ${isRunning() ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{isRunning() ? 'Evaluating...' : 'Run Automation Scan Now'}</span>
        </button>
      </div>

      {/* Rules Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <For each={rules}>
          {(rule) => (
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                    {rule.icon}
                  </div>
                  <div>
                    <h3 class="font-bold text-gray-900 text-xs">
                      {rule.title}
                    </h3>
                    <span class="text-[10px] text-gray-400">{rule.frequency}</span>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {rule.status}
                </span>
              </div>

              <p class="text-xs text-gray-600 leading-relaxed">
                {rule.description}
              </p>

              <div class="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Target: All Subscribed Shops</span>
                <span class="text-gray-600 font-medium">Automatic</span>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Execution Terminal */}
      <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-900 uppercase tracking-wider">
            Execution Log Console
          </h3>
          <Show when={lastResult()}>
            <span class="text-[11px] text-gray-500 font-mono">
              Last Run: {lastResult()?.runAt}
            </span>
          </Show>
        </div>

        <div class="bg-gray-900 text-gray-200 rounded-lg p-3.5 font-mono text-xs space-y-1.5 min-h-[100px]">
          <Show
            when={lastResult()}
            fallback={
              <div class="text-gray-500 py-4 text-center">
                Click "Run Automation Scan Now" to evaluate rules against real database records.
              </div>
            }
          >
            <div class="text-orange-400 font-semibold">
              [BYAPAR_AUTOMATIONS] Cycle initialized at {lastResult()?.runAt}...
            </div>
            <For each={lastResult()?.details}>
              {(line) => <div class="text-gray-300">&gt; {line}</div>}
            </For>
            <div class="text-emerald-400 font-semibold mt-2">
              ✓ Completed: Created {lastResult()?.notificationsCreated} alert(s) across {lastResult()?.triggersExecuted} evaluated rule(s).
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};
