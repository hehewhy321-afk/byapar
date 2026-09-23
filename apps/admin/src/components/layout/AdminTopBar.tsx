import { Component, createSignal } from 'solid-js';
import { runAutomationsEngine, AutomationResult } from '../../services/adminApi';

interface AdminTopBarProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  onNavigateToCampaigns?: () => void;
}

export const AdminTopBar: Component<AdminTopBarProps> = (props) => {
  const [isRunningAutomation, setIsRunningAutomation] = createSignal(false);
  const [lastAutomationResult, setLastAutomationResult] = createSignal<AutomationResult | null>(null);
  const [showToast, setShowToast] = createSignal(false);

  const handleRunAutomations = async () => {
    setIsRunningAutomation(true);
    try {
      const res = await runAutomationsEngine();
      setLastAutomationResult(res);
      setShowToast(true);
      if (props.onRefresh) props.onRefresh();
      setTimeout(() => setShowToast(false), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningAutomation(false);
    }
  };

  return (
    <header class="h-16 border-b border-gray-200 bg-white sticky top-0 z-20 px-6 flex items-center justify-between">
      <div>
        <h1 class="font-heading text-base font-bold text-gray-900">
          {props.title}
        </h1>
        <p class="text-xs text-gray-500">{props.subtitle}</p>
      </div>

      <div class="flex items-center space-x-2.5">
        {/* Realtime Status Indicator */}
        <div class="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Cloud Realtime Synced</span>
        </div>

        {/* Quick Refresh Button */}
        {props.onRefresh && (
          <button
            type="button"
            onClick={props.onRefresh}
            title="Refresh Data"
            class="p-2 rounded-lg bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}

        {/* Run Automations Button */}
        <button
          type="button"
          onClick={handleRunAutomations}
          disabled={isRunningAutomation()}
          class="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-sm"
        >
          <svg
            class={`w-3.5 h-3.5 text-gray-500 ${isRunningAutomation() ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>{isRunningAutomation() ? 'Running...' : 'Run Automations'}</span>
        </button>

        {/* New Broadcast Button */}
        {props.onNavigateToCampaigns && (
          <button
            type="button"
            onClick={props.onNavigateToCampaigns}
            class="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Broadcast</span>
          </button>
        )}
      </div>

      {/* Floating Toast Notification */}
      {showToast() && lastAutomationResult() && (
        <div class="fixed bottom-6 right-6 max-w-sm bg-white border border-gray-200 p-4 rounded-xl shadow-lg z-50 animate-fade-in">
          <div class="flex items-start space-x-3">
            <div class="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-sm">
              ✓
            </div>
            <div>
              <p class="text-xs font-bold text-gray-900">Automations Executed</p>
              <p class="text-xs text-gray-500 mt-0.5">
                Sent {lastAutomationResult()?.notificationsCreated} alert(s) across {lastAutomationResult()?.triggersExecuted} evaluated rules.
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
