import { Component, Show, For, createSignal } from 'solid-js';
import { showSubscriptionModal, setShowSubscriptionModal, currentBusiness } from '../../db/localDb';
import { currentUser } from '../../db/auth';
import {
  SubscriptionPlan,
  fetchSubscriptionPlans,
  getBusinessSubscription,
  BusinessSubscriptionState,
  validatePromoCode,
  PromoValidationResult,
  upgradeBusinessSubscription,
  downgradeBusinessSubscription,
  initiateEsewaPayment,
  DEFAULT_PLANS,
} from '../../services/subscriptionService';
import { IconCrown, IconX, IconCheck, IconSparkles } from '../icons';

export const SubscriptionModal: Component = () => {
  const [plans, setPlans] = createSignal<SubscriptionPlan[]>(DEFAULT_PLANS);
  const [currentSub, setCurrentSub] = createSignal<BusinessSubscriptionState | null>(null);
  const [selectedPlanId, setSelectedPlanId] = createSignal<string>('pro_99');
  const [billingCycle, setBillingCycle] = createSignal<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = createSignal(false);
  const [promoCode, setPromoCode] = createSignal('');
  const [promoResult, setPromoResult] = createSignal<PromoValidationResult | null>(null);
  const [validatingPromo, setValidatingPromo] = createSignal(false);
  const [upgrading, setUpgrading] = createSignal(false);
  const [upgradeSuccess, setUpgradeSuccess] = createSignal<string | null>(null);

  const planRank = (id?: string) => {
    if (!id || id === 'free') return 0;
    if (id.includes('starter')) return 1;
    if (id.includes('pro')) return 2;
    if (id.includes('enterprise')) return 3;
    return 0;
  };

  const currentRank = () => planRank(currentSub()?.planTier);
  const selectedRank = () => planRank(selectedPlanId());
  const isDowngrade = () => selectedRank() < currentRank();
  const isCurrentActive = () => selectedRank() === currentRank() && currentSub()?.planTier !== 'free';

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPlans, sub] = await Promise.all([
        fetchSubscriptionPlans(),
        getBusinessSubscription(currentBusiness.id),
      ]);
      setPlans(allPlans);
      setCurrentSub(sub);

      // Default selected plan to current plan or pro
      if (sub.planTier && sub.planTier !== 'free') {
        const found = allPlans.find((p) => p.id === sub.planTier);
        if (found) setSelectedPlanId(found.id);
      } else {
        setSelectedPlanId('pro_99');
      }
    } catch (err) {
      console.warn('Subscription load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-load when modal is opened
  const handleOpen = () => {
    loadData();
    setPromoCode('');
    setPromoResult(null);
    setUpgradeSuccess(null);
  };

  // Compute selected plan
  const selectedPlan = () => {
    const list = plans();
    return list.find((p) => p.id === selectedPlanId()) || list[0];
  };

  // Compute active base price
  const basePrice = () => {
    const p = selectedPlan();
    if (!p) return 0;
    return billingCycle() === 'annual' ? p.annual_price : p.monthly_price;
  };

  // Compute final payable price
  const finalPrice = () => {
    const pr = promoResult();
    if (pr && pr.valid) {
      return pr.finalPrice;
    }
    return basePrice();
  };

  const handleApplyPromo = async () => {
    const code = promoCode().trim();
    if (!code) return;

    setValidatingPromo(true);
    const p = selectedPlan();
    const res = await validatePromoCode(code, p?.id || 'pro_99', basePrice());
    setPromoResult(res);
    setValidatingPromo(false);
  };

  const handleAction = async () => {
    const p = selectedPlan();
    if (!p) return;

    // 1. Handle Downgrade
    if (isDowngrade()) {
      const ok = confirm(
        `Are you sure you want to downgrade from your current plan to ${p.name}?\n\n` +
        `• Daily bill uploads will be capped at ${p.daily_bill_upload_limit === -1 ? 'Unlimited' : p.daily_bill_upload_limit}\n` +
        `• Staff accounts will be capped at ${p.max_staff_accounts === -1 ? 'Unlimited' : p.max_staff_accounts}\n` +
        `• Store branches will be capped at ${p.max_stores_allowed}`
      );
      if (!ok) return;

      setUpgrading(true);
      const res = await downgradeBusinessSubscription({
        businessId: currentBusiness.id,
        targetPlanId: p.id,
      });
      setUpgrading(false);

      if (res.success) {
        setUpgradeSuccess(`Plan downgraded to ${p.name}. Limits have been adjusted.`);
        loadData();
        setTimeout(() => {
          setUpgradeSuccess(null);
          setShowSubscriptionModal(false);
        }, 2500);
      } else {
        alert(`Downgrade error: ${res.error}`);
      }
      return;
    }

    // 2. Handle Free Plan Activation (or 100% discount promo)
    if (finalPrice() <= 0) {
      setUpgrading(true);
      const res = await upgradeBusinessSubscription({
        businessId: currentBusiness.id,
        planId: p.id,
        billingCycle: billingCycle(),
        userId: currentUser()?.id,
        promoCode: promoResult()?.valid ? promoResult()?.code : undefined,
      });
      setUpgrading(false);

      if (res.success) {
        setUpgradeSuccess(`🎉 Successfully activated ${p.name}! All features and limits are now unlocked.`);
        loadData();
        setTimeout(() => {
          setUpgradeSuccess(null);
          setShowSubscriptionModal(false);
        }, 3000);
      } else {
        alert(`Upgrade failed: ${res.error}`);
      }
      return;
    }

    // 3. Handle Paid Upgrade via eSewa Gateway (Web)
    setUpgrading(true);
    try {
      await initiateEsewaPayment({
        businessId: currentBusiness.id,
        businessName: currentBusiness.nameEn || currentBusiness.name,
        planId: p.id,
        billingCycle: billingCycle(),
        promoCode: promoResult()?.valid ? promoResult()?.code : undefined,
      });
      // Browser redirects to eSewa gateway automatically!
    } catch (err: any) {
      setUpgrading(false);
      alert(`Could not redirect to eSewa: ${err.message || err}`);
    }
  };

  return (
    <Show when={showSubscriptionModal()}>
      <div
        class="modal-overlay animate-fade-in"
        onClick={() => setShowSubscriptionModal(false)}
        ref={() => handleOpen()}
      >
        <div
          class="modal-content !max-w-4xl p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-3xl max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF4500] flex items-center justify-center font-bold shadow-sm">
                <IconCrown size={20} />
              </div>
              <div>
                <h3 class="font-bold text-base text-neutral-900 dark:text-white font-heading">
                  Byapar Cloud Plans & Licensing
                </h3>
                <p class="text-xs text-neutral-500">
                  Choose the right plan for your shop. Controlled and verified directly from the Admin console.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSubscriptionModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1.5 rounded-lg transition"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Success Banner */}
          <Show when={upgradeSuccess()}>
            <div class="p-3 mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
              <span>{upgradeSuccess()}</span>
              <button onClick={() => setUpgradeSuccess(null)} class="text-emerald-600 font-bold">✕</button>
            </div>
          </Show>

          {/* Current Active Plan Status Bar */}
          <Show when={currentSub()}>
            <div class="rounded-2xl p-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-black text-white mb-5 shadow-sm border border-neutral-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 text-lg">
                  👑
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-neutral-200">Current Active Tier:</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-500 text-white">
                      {currentSub()?.planName}
                    </span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold capitalize">
                      {currentSub()?.status}
                    </span>
                  </div>
                  <div class="text-[11px] text-neutral-400 mt-0.5">
                    {currentSub()?.daysRemaining !== undefined && currentSub()!.daysRemaining >= 0
                      ? `${currentSub()?.daysRemaining} days remaining in current period`
                      : 'Expired or unlimited'}
                  </div>
                </div>
              </div>

              {/* Quick Limits summary */}
              <div class="flex items-center gap-3 text-[11px] text-neutral-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <div>
                  <span class="text-neutral-400">Bills: </span>
                  <span class="font-bold text-white">
                    {currentSub()?.planConfig.daily_bill_upload_limit === -1 ? 'Unlimited' : `${currentSub()?.planConfig.daily_bill_upload_limit}/day`}
                  </span>
                </div>
                <div class="w-px h-3 bg-neutral-700" />
                <div>
                  <span class="text-neutral-400">Staff: </span>
                  <span class="font-bold text-white">
                    {currentSub()?.planConfig.max_staff_accounts === -1 ? 'Unlimited' : `${currentSub()?.planConfig.max_staff_accounts} max`}
                  </span>
                </div>
                <div class="w-px h-3 bg-neutral-700" />
                <div>
                  <span class="text-neutral-400">Stores: </span>
                  <span class="font-bold text-emerald-400">
                    {currentSub()?.planConfig.max_stores_allowed === -1 ? 'Unlimited' : `${currentSub()?.planConfig.max_stores_allowed} max`}
                  </span>
                </div>
              </div>
            </div>
          </Show>

          {/* Billing Cycle Switcher */}
          <div class="flex justify-center mb-5">
            <div class="inline-flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setBillingCycle('monthly');
                  setPromoResult(null);
                }}
                class={`px-4 py-1.5 rounded-xl font-semibold transition-all ${
                  billingCycle() === 'monthly'
                    ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => {
                  setBillingCycle('annual');
                  setPromoResult(null);
                }}
                class={`px-4 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle() === 'annual'
                    ? 'bg-[#FF4500] text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <span>Annual Billing</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 font-bold">
                  2 Months Free
                </span>
              </button>
            </div>
          </div>

          {/* 4 Plan Cards */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <For each={plans()}>
              {(p) => {
                const isSelected = () => selectedPlanId() === p.id;
                const isCurrent = () => currentSub()?.planTier === p.id;
                const price = () => (billingCycle() === 'annual' ? p.annual_price : p.monthly_price);

                return (
                  <div
                    onClick={() => {
                      setSelectedPlanId(p.id);
                      setPromoResult(null);
                    }}
                    class={`rounded-2xl border p-4 flex flex-col justify-between cursor-pointer transition-all relative ${
                      isSelected()
                        ? 'border-[#FF4500] ring-2 ring-orange-400/30 bg-orange-50/20 dark:bg-orange-950/10 shadow-md'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300'
                    }`}
                  >
                    {/* Badge */}
                    <Show when={p.badge_text}>
                      <span
                        class={`absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          p.is_popular
                            ? 'bg-[#FF4500] text-white shadow-sm'
                            : 'bg-neutral-800 text-white'
                        }`}
                      >
                        {p.badge_text}
                      </span>
                    </Show>

                    <div>
                      <div class="flex items-center justify-between mb-1">
                        <h4 class="font-bold text-sm text-neutral-900 dark:text-white">
                          {p.name}
                        </h4>
                        <Show when={isCurrent()}>
                          <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            Current
                          </span>
                        </Show>
                      </div>

                      <p class="text-[11px] text-neutral-500 line-clamp-2 min-h-[30px] mb-3">
                        {p.description}
                      </p>

                      {/* Pricing Tag */}
                      <div class="pb-3 mb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <div class="flex items-baseline gap-1">
                          <span class="text-xl font-extrabold text-neutral-900 dark:text-white font-heading">
                            रु {price()}
                          </span>
                          <span class="text-[10px] text-neutral-400">
                            / {billingCycle() === 'annual' ? 'yr' : 'mo'}
                          </span>
                        </div>
                      </div>

                      {/* Specific Limits Highlight */}
                      <div class="space-y-1.5 bg-neutral-50 dark:bg-neutral-900/60 p-2.5 rounded-xl text-[11px] mb-3 border border-neutral-100 dark:border-neutral-800">
                        <div class="flex justify-between items-center">
                          <span class="text-neutral-500">Bill Uploads:</span>
                          <span class="font-bold text-neutral-900 dark:text-white">
                            {p.daily_bill_upload_limit === -1 ? 'Unlimited' : `${p.daily_bill_upload_limit} / day`}
                          </span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-neutral-500">Staff Accounts:</span>
                          <span class="font-bold text-neutral-900 dark:text-white">
                            {p.max_staff_accounts === -1 ? 'Unlimited' : `${p.max_staff_accounts} staff`}
                          </span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-neutral-500">Branches:</span>
                          <span class="font-bold text-emerald-600 dark:text-emerald-400">
                            {p.max_stores_allowed === -1 ? 'Unlimited' : `${p.max_stores_allowed} store${p.max_stores_allowed > 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>

                      {/* Feature check list */}
                      <div class="space-y-1.5 text-[11px]">
                        <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                          <IconCheck size={12} class={p.features.whatsapp_reminders ? 'text-emerald-500 shrink-0' : 'text-neutral-300 shrink-0'} />
                          <span class={p.features.whatsapp_reminders ? '' : 'line-through text-neutral-400'}>
                            WhatsApp Reminders
                          </span>
                        </div>
                        <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                          <IconCheck size={12} class={p.features.fonepay_qr_generation ? 'text-emerald-500 shrink-0' : 'text-neutral-300 shrink-0'} />
                          <span class={p.features.fonepay_qr_generation ? 'font-medium text-neutral-800 dark:text-neutral-200' : 'line-through text-neutral-400'}>
                            Dynamic Fonepay QR
                          </span>
                        </div>
                        <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                          <IconCheck size={12} class={p.features.ird_vat_audit ? 'text-emerald-500 shrink-0' : 'text-neutral-300 shrink-0'} />
                          <span class={p.features.ird_vat_audit ? '' : 'line-through text-neutral-400'}>
                            Nepal IRD CBMS Sync
                          </span>
                        </div>
                        <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                          <IconCheck size={12} class={p.features.advanced_analytics ? 'text-emerald-500 shrink-0' : 'text-neutral-300 shrink-0'} />
                          <span class={p.features.advanced_analytics ? 'font-medium text-neutral-800 dark:text-neutral-200' : 'line-through text-neutral-400'}>
                            Advanced Financial Analytics
                          </span>
                        </div>
                        <div class="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                          <IconCheck size={12} class={p.features.custom_branding ? 'text-emerald-500 shrink-0' : 'text-neutral-300 shrink-0'} />
                          <span class={p.features.custom_branding ? '' : 'line-through text-neutral-400'}>
                            White-Label Branding
                          </span>
                        </div>
                      </div>
                    </div>

                    <div class="mt-4 pt-2">
                      <button
                        type="button"
                        class={`w-full py-1.5 rounded-xl text-xs font-bold transition ${
                          isSelected()
                            ? 'bg-[#FF4500] text-white shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                        }`}
                      >
                        {isSelected() ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>

          {/* Promo Code & Checkout Box */}
          <div class="bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 mb-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Promo Code Input */}
              <div class="flex-1 max-w-sm">
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Have a Coupon / Promo Code?
                </label>
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. DASHAIN2026, WELCOME50"
                    value={promoCode()}
                    onInput={(e) => setPromoCode(e.currentTarget.value)}
                    class="input-field uppercase tracking-wider text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={validatingPromo() || !promoCode().trim()}
                    class="btn-secondary text-xs shrink-0 !py-2"
                  >
                    {validatingPromo() ? 'Verifying...' : 'Apply Code'}
                  </button>
                </div>

                <Show when={promoResult()}>
                  <div
                    class={`mt-1.5 text-xs font-semibold ${
                      promoResult()?.valid ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {promoResult()?.message}
                  </div>
                </Show>
              </div>

              {/* Pricing & Checkout Button */}
              <div class="flex items-center justify-end gap-4 shrink-0">
                <div class="text-right">
                  <div class="text-xs text-neutral-500">Total Payable:</div>
                  <div class="flex items-center gap-2">
                    <Show when={promoResult()?.valid && promoResult()!.discountAmount > 0}>
                      <span class="text-xs text-neutral-400 line-through">
                        रु {basePrice()}
                      </span>
                    </Show>
                    <span class="text-xl font-extrabold text-[#FF4500] font-heading">
                      रु {finalPrice()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAction}
                  disabled={upgrading()}
                  class={`text-xs font-bold !py-3 !px-6 shadow-lg flex items-center gap-2 rounded-xl transition ${
                    isDowngrade()
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                      : 'btn-primary'
                  }`}
                >
                  <IconSparkles size={16} />
                  <span>
                    {upgrading()
                      ? 'Processing...'
                      : isDowngrade()
                      ? `Downgrade to ${selectedPlan().name}`
                      : isCurrentActive()
                      ? `Renew ${selectedPlan().name} via eSewa`
                      : finalPrice() === 0
                      ? 'Activate Free Tier'
                      : `Pay & Upgrade via eSewa (रु ${finalPrice()})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
