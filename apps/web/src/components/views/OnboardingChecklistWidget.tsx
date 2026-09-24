import { Component, createSignal, Show, For } from 'solid-js';
import { currentBusiness, setActiveTab, setShowProfileModal } from '../../db/localDb';
import { supabase } from '../../db/auth';
import { IconCheck, IconSparkles, IconX } from '../icons';

export interface OnboardingState {
  profile_completed: boolean;
  first_item_added: boolean;
  first_invoice_created: boolean;
  fonepay_qr_linked: boolean;
  staff_invited: boolean;
  mobile_app_paired: boolean;
  backup_configured: boolean;
  completion_percentage: number;
}

const DEFAULT_ONBOARDING: OnboardingState = {
  profile_completed: true,
  first_item_added: true,
  first_invoice_created: true,
  fonepay_qr_linked: false,
  staff_invited: false,
  mobile_app_paired: false,
  backup_configured: true,
  completion_percentage: 57,
};

export const OnboardingChecklistWidget: Component = () => {
  const [onboarding, setOnboarding] = createSignal<OnboardingState>(DEFAULT_ONBOARDING);
  const [dismissed, setDismissed] = createSignal(false);
  const [updating, setUpdating] = createSignal(false);

  const loadOnboarding = async () => {
    if (!currentBusiness.id) return;
    try {
      const { data, error } = await supabase
        .from('merchant_onboarding')
        .select('*')
        .eq('business_id', currentBusiness.id)
        .single();

      if (!error && data) {
        setOnboarding(data);
      }
    } catch (err) {
      console.warn('Onboarding load notice:', err);
    }
  };

  queueMicrotask(() => {
    loadOnboarding();
  });

  const toggleMilestone = async (key: keyof OnboardingState) => {
    if (typeof onboarding()[key] !== 'boolean') return;
    const nextVal = !onboarding()[key];

    const updated = {
      ...onboarding(),
      [key]: nextVal,
    };

    // Calculate completion percentage
    const boolKeys: (keyof OnboardingState)[] = [
      'profile_completed',
      'first_item_added',
      'first_invoice_created',
      'fonepay_qr_linked',
      'staff_invited',
      'mobile_app_paired',
      'backup_configured',
    ];
    const completedCount = boolKeys.filter((k) => updated[k] === true).length;
    const percentage = Math.round((completedCount / boolKeys.length) * 100);
    updated.completion_percentage = percentage;

    setOnboarding(updated);
    setUpdating(true);

    try {
      await supabase
        .from('merchant_onboarding')
        .upsert({
          business_id: currentBusiness.id,
          profile_completed: updated.profile_completed,
          first_item_added: updated.first_item_added,
          first_invoice_created: updated.first_invoice_created,
          fonepay_qr_linked: updated.fonepay_qr_linked,
          staff_invited: updated.staff_invited,
          mobile_app_paired: updated.mobile_app_paired,
          backup_configured: updated.backup_configured,
          completion_percentage: percentage,
          last_milestone_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.warn('Onboarding milestone update notice:', err);
    } finally {
      setUpdating(false);
    }
  };

  const steps = [
    {
      key: 'profile_completed' as const,
      label: 'Complete Store Profile & PAN',
      desc: 'Add owner name, registered address and tax PAN',
      action: () => setShowProfileModal(true),
    },
    {
      key: 'first_item_added' as const,
      label: 'Add Products to Inventory',
      desc: 'Set selling prices, units, and barcode details',
      action: () => setActiveTab('inventory'),
    },
    {
      key: 'first_invoice_created' as const,
      label: 'Generate First POS Invoice',
      desc: 'Issue a fast receipt with thermal printing',
      action: () => setActiveTab('pos'),
    },
    {
      key: 'fonepay_qr_linked' as const,
      label: 'Configure Fonepay Dynamic QR',
      desc: 'Set up automatic balance-locked QR payments',
      action: () => setActiveTab('settings'),
    },
    {
      key: 'staff_invited' as const,
      label: 'Invite Cashier or Staff Member',
      desc: 'Assign granular billing and reports roles',
      action: () => setActiveTab('staff'),
    },
    {
      key: 'mobile_app_paired' as const,
      label: 'Pair Byapar Mobile App',
      desc: 'Scan QR to sync your kirana store to Android/iOS',
      action: () => setActiveTab('settings'),
    },
    {
      key: 'backup_configured' as const,
      label: 'Verify Automated Cloud Backup',
      desc: 'Keep accounts safe with encrypted cloud sync',
      action: () => setActiveTab('settings'),
    },
  ];

  return (
    <Show when={!dismissed()}>
      <div class="bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-neutral-950 dark:via-black dark:to-neutral-950 rounded-2xl p-5 border border-orange-200/80 dark:border-neutral-800 shadow-sm relative animate-fade-in mb-6">
        <div class="flex items-center justify-between gap-4 mb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-[#FF4500] text-white flex items-center justify-center font-bold shadow-sm">
              <IconSparkles size={16} />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-neutral-900 dark:text-white font-heading">
                  Merchant Setup & Launch Checklist
                </h3>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF4500]">
                  {onboarding().completion_percentage}% Completed
                </span>
              </div>
              <p class="text-xs text-neutral-500">
                Complete these initial milestones to unlock the full potential of Byapar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            class="text-neutral-400 hover:text-neutral-600 p-1"
            title="Minimize"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Progress Bar */}
        <div class="w-full h-2 bg-orange-100 dark:bg-neutral-800 rounded-full overflow-hidden mb-4">
          <div
            class="h-full bg-gradient-to-r from-[#FF4500] to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${onboarding().completion_percentage}%` }}
          />
        </div>

        {/* Milestones Horizontal List / Grid */}
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <For each={steps.slice(0, 4)}>
            {(step) => {
              const isDone = () => onboarding()[step.key] === true;
              return (
                <div
                  onClick={() => toggleMilestone(step.key)}
                  class={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                    isDone()
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-orange-300 text-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  <div
                    class={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                      isDone()
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-neutral-300 dark:border-neutral-700 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class={`text-xs font-bold leading-tight ${isDone() ? 'line-through text-neutral-400' : ''}`}>
                      {step.label}
                    </div>
                    <div class="text-[10px] text-neutral-400 mt-0.5 truncate">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </Show>
  );
};
