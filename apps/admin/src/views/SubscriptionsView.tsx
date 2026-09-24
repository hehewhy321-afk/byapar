import { Component, createSignal, For, Show } from 'solid-js';
import {
  getSubscriptionsList,
  updateShopSubscription,
  SubscriptionItem,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  SubscriptionPlanConfig,
  getSubscriptionTransactions,
  SubscriptionTransactionRecord,
  checkAndSyncEsewaTransaction,
  cancelSubscriptionTransaction,
} from '../services/adminApi';

export const SubscriptionsView: Component = () => {
  const [activeMainTab, setActiveMainTab] = createSignal<'subscriptions' | 'plans' | 'transactions'>('subscriptions');
  const [subscriptions, setSubscriptions] = createSignal<SubscriptionItem[]>([]);
  const [plans, setPlans] = createSignal<SubscriptionPlanConfig[]>([]);
  const [transactions, setTransactions] = createSignal<SubscriptionTransactionRecord[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [activeSubTab, setActiveSubTab] = createSignal<'all' | 'expiring' | 'expired' | 'active'>('expiring');
  const [actionSuccess, setActionSuccess] = createSignal<string | null>(null);

  // eSewa Audit & Sync State
  const [checkingTxUuid, setCheckingTxUuid] = createSignal<string | null>(null);
  const [viewingPayload, setViewingPayload] = createSignal<SubscriptionTransactionRecord | null>(null);

  // Edit Plan Modal State
  const [editingPlan, setEditingPlan] = createSignal<SubscriptionPlanConfig | null>(null);
  const [savingPlan, setSavingPlan] = createSignal(false);

  // Edit Merchant License Modal State
  const [editingSub, setEditingSub] = createSignal<SubscriptionItem | null>(null);
  const [editTier, setEditTier] = createSignal<string>('free');
  const [editStatus, setEditStatus] = createSignal<string>('active');
  const [editDays, setEditDays] = createSignal<number>(30);
  const [savingSub, setSavingSub] = createSignal(false);

  const handleCheckEsewa = async (t: SubscriptionTransactionRecord) => {
    setCheckingTxUuid(t.transaction_uuid);
    const res = await checkAndSyncEsewaTransaction(t.transaction_uuid);
    setCheckingTxUuid(null);
    if (res.success) {
      setActionSuccess(`✅ eSewa Sync: Transaction is ${res.status.toUpperCase()}! (Ref: #${res.refId || 'N/A'})`);
    } else {
      setActionSuccess(`ℹ️ eSewa Status: ${res.status.toUpperCase()} (${res.message})`);
    }
    loadData();
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const handleCancelTx = async (t: SubscriptionTransactionRecord) => {
    if (!confirm(`Cancel pending transaction ${t.transaction_uuid} for ${t.business_name || t.business_id}?`)) return;
    const res = await cancelSubscriptionTransaction(t.transaction_uuid, 'Admin manually cancelled transaction');
    if (res.success) {
      setActionSuccess(`Transaction marked as cancelled.`);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      alert(`Failed to cancel: ${res.message}`);
    }
  };

  const loadData = async () => {
    try {
      const [subsData, plansData, txnsData] = await Promise.all([
        getSubscriptionsList(),
        getSubscriptionPlans(),
        getSubscriptionTransactions(),
      ]);
      setSubscriptions(subsData);
      setPlans(plansData);
      setTransactions(txnsData);
    } catch (err) {
      console.error('loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  queueMicrotask(() => {
    loadData();
  });

  const filteredSubs = () => {
    const list = subscriptions();
    const tab = activeSubTab();

    if (tab === 'expiring') {
      return list.filter((s) => s.daysRemaining !== undefined && s.daysRemaining >= 0 && s.daysRemaining <= 7);
    }
    if (tab === 'expired') {
      return list.filter((s) => s.status === 'expired' || (s.daysRemaining !== undefined && s.daysRemaining < 0));
    }
    if (tab === 'active') {
      return list.filter((s) => s.status === 'active');
    }
    return list;
  };

  const handleQuickExtend = async (sub: SubscriptionItem, days: number) => {
    const res = await updateShopSubscription(
      sub.businessId,
      (sub.planTier as any) || 'pro',
      'active',
      days
    );

    if (res.success) {
      setActionSuccess(`Extended ${sub.businessName} by +${days} days!`);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      alert(`Extension failed: ${res.error}`);
    }
  };

  const handleSavePlan = async (e: Event) => {
    e.preventDefault();
    const plan = editingPlan();
    if (!plan) return;

    setSavingPlan(true);
    const res = await updateSubscriptionPlan(plan);
    setSavingPlan(false);

    if (res.success) {
      setActionSuccess(`Plan "${plan.name}" updated successfully! Changes are live across Web & Mobile.`);
      setEditingPlan(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      alert(`Failed to save plan: ${res.error}`);
    }
  };

  const handleSaveSub = async (e: Event) => {
    e.preventDefault();
    const sub = editingSub();
    if (!sub) return;

    setSavingSub(true);
    const res = await updateShopSubscription(
      sub.businessId,
      editTier() as any,
      editStatus() as any,
      Number(editDays())
    );
    setSavingSub(false);

    if (res.success) {
      setActionSuccess(`Updated subscription license for ${sub.businessName}!`);
      setEditingSub(null);
      loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      alert(`Failed to update subscription: ${res.error}`);
    }
  };

  return (
    <div class="space-y-5 p-6 max-w-7xl mx-auto">
      {/* Top Header & Main Mode Toggle */}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold font-heading text-gray-900">
            Subscription & Licensing Management
          </h2>
          <p class="text-xs text-gray-500">
            Control dynamic subscription pricing tiers, feature limits, and merchant license renewals
          </p>
        </div>

        {/* Primary Tab Switcher */}
        <div class="flex items-center bg-gray-200/80 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveMainTab('subscriptions')}
            class={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
              activeMainTab() === 'subscriptions'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Merchant Licenses ({subscriptions().length})
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('plans')}
            class={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
              activeMainTab() === 'plans'
                ? 'bg-[#FF4500] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚙️ Plan Tiers & Limits ({plans().length})
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('transactions')}
            class={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
              activeMainTab() === 'transactions'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💳 Payment Transactions ({transactions().length})
          </button>
        </div>
      </div>

      <Show when={actionSuccess()}>
        <div class="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center justify-between animate-fade-in">
          <span>{actionSuccess()}</span>
          <button type="button" onClick={() => setActionSuccess(null)} class="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </Show>

      {/* ========================================================================= */}
      {/* VIEW 1: MERCHANT SUBSCRIPTIONS (RENEWAL HUB)                              */}
      {/* ========================================================================= */}
      <Show when={activeMainTab() === 'subscriptions'}>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-gray-700">Active Merchant Subscriptions</h3>
            <div class="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveSubTab('expiring')}
                class={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeSubTab() === 'expiring'
                    ? 'bg-white text-amber-700 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Expiring (&le; 7d)
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('expired')}
                class={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeSubTab() === 'expired'
                    ? 'bg-white text-red-700 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Expired
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('active')}
                class={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeSubTab() === 'active'
                    ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('all')}
                class={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeSubTab() === 'all'
                    ? 'bg-white text-gray-900 shadow-sm font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-gray-200 bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
                    <th class="py-3 px-5">Store Name</th>
                    <th class="py-3 px-5">Tier</th>
                    <th class="py-3 px-5">Status</th>
                    <th class="py-3 px-5">End Date</th>
                    <th class="py-3 px-5">Remaining</th>
                    <th class="py-3 px-5 text-right">Quick Extend</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <Show
                    when={!loading() && filteredSubs().length > 0}
                    fallback={
                      <tr>
                        <td colspan="6" class="py-10 text-center text-gray-400">
                          {loading() ? 'Loading subscriptions...' : 'No subscriptions found in this view.'}
                        </td>
                      </tr>
                    }
                  >
                    <For each={filteredSubs()}>
                      {(sub) => {
                        const isUrgent = () => sub.daysRemaining !== undefined && sub.daysRemaining <= 3 && sub.daysRemaining >= 0;
                        const isExpiring = () => sub.daysRemaining !== undefined && sub.daysRemaining <= 7 && sub.daysRemaining > 3;
                        const isExpired = () => sub.status === 'expired' || (sub.daysRemaining !== undefined && sub.daysRemaining < 0);

                        return (
                          <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="py-3.5 px-5 font-semibold text-gray-900">
                              <div>{sub.businessName}</div>
                              <div class="text-[10px] font-mono text-gray-400 font-normal">{sub.businessId}</div>
                            </td>
                            <td class="py-3.5 px-5">
                              <span
                                class={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  sub.planTier.includes('pro')
                                    ? 'bg-orange-50 text-[#FF4500] border border-orange-200'
                                    : sub.planTier.includes('enterprise')
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : sub.planTier.includes('starter')
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {sub.planTier}
                              </span>
                            </td>
                            <td class="py-3.5 px-5">
                              <span
                                class={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                  sub.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : sub.status === 'trialing'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </td>
                            <td class="py-3.5 px-5 text-gray-600 font-mono">
                              {sub.currentPeriodEnd
                                ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                                : 'N/A'}
                            </td>
                            <td class="py-3.5 px-5">
                              <span
                                class={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                                  isUrgent()
                                    ? 'bg-red-50 text-red-600'
                                    : isExpiring()
                                    ? 'bg-amber-50 text-amber-700'
                                    : isExpired()
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                <span>●</span>
                                <span>
                                  {sub.daysRemaining !== undefined
                                    ? sub.daysRemaining < 0
                                      ? `Expired (${Math.abs(sub.daysRemaining)}d)`
                                      : `${sub.daysRemaining} days`
                                    : 'Unlimited'}
                                </span>
                              </span>
                            </td>
                            <td class="py-3.5 px-5 text-right">
                              <div class="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickExtend(sub, 30)}
                                  class="px-2 py-1 rounded bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-medium shadow-sm transition-all"
                                  title="Add 30 days"
                                >
                                  +30d
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickExtend(sub, 365)}
                                  class="px-2 py-1 rounded bg-orange-50 hover:bg-orange-100 text-[#FF4500] border border-orange-200 text-xs font-semibold shadow-sm transition-all"
                                  title="Add 1 year"
                                >
                                  +1yr
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSub(sub);
                                    setEditTier(sub.planTier || 'free');
                                    setEditStatus(sub.status || 'active');
                                    setEditDays(sub.daysRemaining && sub.daysRemaining > 0 ? sub.daysRemaining : 30);
                                  }}
                                  class="px-2.5 py-1 rounded bg-gray-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-all"
                                >
                                  Edit License
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                  </Show>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>

      {/* ========================================================================= */}
      {/* VIEW 2: PLAN TIER SETTINGS & LIMITS (ADMIN MASTER CONTROL)                 */}
      {/* ========================================================================= */}
      <Show when={activeMainTab() === 'plans'}>
        <div class="space-y-4">
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-base">⚡</span>
              <div>
                <span class="font-bold">Admin Master Controls:</span> Any adjustments to prices, daily bill limits, staff seats, or stores made here reflect dynamically in real-time across both the <strong>Web App</strong> and <strong>Mobile App</strong>.
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <For each={plans()}>
              {(p) => (
                <div
                  class={`bg-white rounded-2xl border transition-all shadow-sm p-5 flex flex-col justify-between relative ${
                    p.is_popular
                      ? 'border-[#FF4500] ring-2 ring-orange-200 shadow-md'
                      : 'border-gray-200'
                  }`}
                >
                  <Show when={p.badge_text}>
                    <span
                      class={`absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.is_popular
                          ? 'bg-[#FF4500] text-white shadow-sm'
                          : 'bg-gray-800 text-white'
                      }`}
                    >
                      {p.badge_text}
                    </span>
                  </Show>

                  <div>
                    <h4 class="text-base font-bold text-gray-900">{p.name}</h4>
                    <p class="text-xs text-gray-500 mt-1 min-h-[32px]">{p.description}</p>

                    {/* Pricing */}
                    <div class="mt-4 pt-3 border-t border-gray-100">
                      <div class="flex items-baseline gap-1">
                        <span class="text-2xl font-extrabold text-gray-900 font-heading">
                          रु {p.monthly_price}
                        </span>
                        <span class="text-xs text-gray-500 font-medium">/ month</span>
                      </div>
                      <div class="text-[11px] text-gray-400 mt-0.5">
                        रु {p.annual_price} / year (save 2 months)
                      </div>
                    </div>

                    {/* Core Hard Limits */}
                    <div class="mt-4 space-y-2 bg-gray-50 rounded-xl p-3 text-xs border border-gray-100">
                      <div class="flex justify-between items-center">
                        <span class="text-gray-600 font-medium">Daily Bill Uploads:</span>
                        <span class="font-bold text-gray-900">
                          {p.daily_bill_upload_limit === -1 ? 'Unlimited' : `${p.daily_bill_upload_limit} / day`}
                        </span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-600 font-medium">Staff Accounts:</span>
                        <span class="font-bold text-gray-900">
                          {p.max_staff_accounts === -1 ? 'Unlimited' : `${p.max_staff_accounts} max`}
                        </span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-600 font-medium">Stores in Account:</span>
                        <span class="font-bold text-emerald-700">
                          {p.max_stores_allowed === -1 ? 'Unlimited' : `${p.max_stores_allowed} store${p.max_stores_allowed > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div class="mt-4 space-y-1.5 text-[11px]">
                      <div class="font-semibold text-gray-700 uppercase tracking-wider text-[10px] mb-2">
                        Features Included:
                      </div>
                      <div class="flex items-center gap-2 text-gray-700">
                        <span class={p.features.fonepay_qr_generation ? 'text-emerald-600 font-bold' : 'text-gray-300'}>
                          {p.features.fonepay_qr_generation ? '✓' : '✕'}
                        </span>
                        <span class={p.features.fonepay_qr_generation ? 'font-medium' : 'text-gray-400'}>
                          Dynamic Fonepay QR Payments
                        </span>
                      </div>
                      <div class="flex items-center gap-2 text-gray-700">
                        <span class={p.features.whatsapp_reminders ? 'text-emerald-600 font-bold' : 'text-gray-300'}>
                          {p.features.whatsapp_reminders ? '✓' : '✕'}
                        </span>
                        <span class={p.features.whatsapp_reminders ? 'font-medium' : 'text-gray-400'}>
                          WhatsApp Khata Reminders
                        </span>
                      </div>
                      <div class="flex items-center gap-2 text-gray-700">
                        <span class={p.features.ird_vat_audit ? 'text-emerald-600 font-bold' : 'text-gray-300'}>
                          {p.features.ird_vat_audit ? '✓' : '✕'}
                        </span>
                        <span class={p.features.ird_vat_audit ? 'font-medium' : 'text-gray-400'}>
                          Nepal IRD VAT/PAN Audit Sync
                        </span>
                      </div>
                      <div class="flex items-center gap-2 text-gray-700">
                        <span class={p.features.advanced_analytics ? 'text-emerald-600 font-bold' : 'text-gray-300'}>
                          {p.features.advanced_analytics ? '✓' : '✕'}
                        </span>
                        <span class={p.features.advanced_analytics ? 'font-medium' : 'text-gray-400'}>
                          Advanced Financial Analytics & Charts
                        </span>
                      </div>
                      <div class="flex items-center gap-2 text-gray-700">
                        <span class={p.features.custom_branding ? 'text-emerald-600 font-bold' : 'text-gray-300'}>
                          {p.features.custom_branding ? '✓' : '✕'}
                        </span>
                        <span class={p.features.custom_branding ? 'font-medium' : 'text-gray-400'}>
                          Custom Logo & Invoice Branding
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="mt-6 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setEditingPlan({ ...p, features: { ...p.features } })}
                      class="w-full py-2 rounded-xl bg-gray-50 hover:bg-orange-50 hover:text-[#FF4500] hover:border-orange-200 border border-gray-200 text-xs font-bold text-gray-700 transition"
                    >
                      ✏️ Edit Plan & Limits
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* ========================================================================= */}
      {/* VIEW 3: PAYMENT TRANSACTIONS & AUDIT LOG (eSewa & RevenueCat)            */}
      {/* ========================================================================= */}
      <Show when={activeMainTab() === 'transactions'}>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-gray-700">Payment Transactions & Audit Log</h3>
              <p class="text-xs text-gray-400">All live payments verified via eSewa (Web) and RevenueCat (Play Store)</p>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Total Recorded: {transactions().length}
            </span>
          </div>

          <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th class="p-3.5">Date & Time</th>
                    <th class="p-3.5">Merchant / Business</th>
                    <th class="p-3.5">Gateway</th>
                    <th class="p-3.5">Plan Tier</th>
                    <th class="p-3.5">Cycle</th>
                    <th class="p-3.5 text-right">Amount</th>
                    <th class="p-3.5">Promo</th>
                    <th class="p-3.5 text-center">Status</th>
                    <th class="p-3.5">Txn Reference & eSewa Ref</th>
                    <th class="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-gray-700">
                  <For
                    each={transactions()}
                    fallback={
                      <tr>
                        <td colspan="10" class="p-8 text-center text-gray-400">
                          No transactions found yet. Live eSewa & RevenueCat payments will appear here automatically.
                        </td>
                      </tr>
                    }
                  >
                    {(t) => (
                      <tr class="hover:bg-gray-50/60 transition">
                        <td class="p-3.5 font-mono text-gray-500 whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td class="p-3.5 font-semibold text-gray-900">
                          <div>{t.business_name || 'Shop'}</div>
                          <div class="text-[10px] font-mono text-gray-400 font-normal">{t.business_id.slice(0, 8)}...</div>
                        </td>
                        <td class="p-3.5">
                          <Show
                            when={t.gateway === 'esewa'}
                            fallback={
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                📱 PlayStore (RC)
                              </span>
                            }
                          >
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 eSewa ePay
                            </span>
                          </Show>
                        </td>
                        <td class="p-3.5 font-bold uppercase text-[11px] text-gray-800">
                          {t.plan_tier}
                        </td>
                        <td class="p-3.5 capitalize text-gray-500">
                          {t.billing_cycle}
                        </td>
                        <td class="p-3.5 text-right font-black text-gray-900">
                          रु {t.amount.toLocaleString()}
                        </td>
                        <td class="p-3.5">
                          {t.promo_code ? (
                            <span class="font-mono text-[10px] font-bold text-[#FF4500] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                              {t.promo_code} (-रु {t.discount_amount})
                            </span>
                          ) : (
                            <span class="text-gray-400">—</span>
                          )}
                        </td>
                        <td class="p-3.5 text-center">
                          <span
                            class={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'cancelled'
                                ? 'bg-gray-200 text-gray-700 border border-gray-300'
                                : t.status === 'failed'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td class="p-3.5 font-mono text-[11px]">
                          <Show
                            when={t.transaction_code}
                            fallback={<span class="text-gray-400 text-[10px]">{t.transaction_uuid}</span>}
                          >
                            <div class="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block border border-emerald-200">
                              #{t.transaction_code}
                            </div>
                            <div class="text-[9px] text-gray-400 truncate max-w-[120px]" title={t.transaction_uuid}>
                              {t.transaction_uuid}
                            </div>
                          </Show>
                        </td>
                        <td class="p-3.5 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <Show when={t.gateway === 'esewa'}>
                              <button
                                type="button"
                                disabled={checkingTxUuid() === t.transaction_uuid}
                                onClick={() => handleCheckEsewa(t)}
                                class="px-2 py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-[10px] font-semibold transition shadow-sm flex items-center gap-1"
                                title="Query eSewa Status API in real time"
                              >
                                <span>{checkingTxUuid() === t.transaction_uuid ? 'Checking...' : '🔍 Sync eSewa'}</span>
                              </button>
                            </Show>

                            <Show when={t.status === 'pending'}>
                              <button
                                type="button"
                                onClick={() => handleCancelTx(t)}
                                class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-semibold transition"
                                title="Mark this pending transaction as cancelled"
                              >
                                Cancel
                              </button>
                            </Show>

                            <button
                              type="button"
                              onClick={() => setViewingPayload(t)}
                              class="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-medium transition"
                              title="View eSewa API audit payload"
                            >
                              Audit
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Show>

      {/* ========================================================================= */}
      {/* EDIT PLAN MODAL                                                           */}
      {/* ========================================================================= */}
      <Show when={editingPlan()}>
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto animate-fade-in">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 class="text-base font-bold text-gray-900">
                Edit Plan: {editingPlan()?.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                class="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} class="space-y-4 text-xs">
              <div>
                <label class="block font-semibold text-gray-700 mb-1">Plan Display Name</label>
                <input
                  type="text"
                  required
                  value={editingPlan()?.name || ''}
                  onInput={(e) => setEditingPlan((p) => p ? ({ ...p, name: e.currentTarget.value }) : null)}
                  class="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingPlan()?.description || ''}
                  onInput={(e) => setEditingPlan((p) => p ? ({ ...p, description: e.currentTarget.value }) : null)}
                  class="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-semibold text-gray-700 mb-1">Monthly Price (NPR)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPlan()?.monthly_price || 0}
                    onInput={(e) => setEditingPlan((p) => p ? ({ ...p, monthly_price: Number(e.currentTarget.value) }) : null)}
                    class="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label class="block font-semibold text-gray-700 mb-1">Annual Price (NPR)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingPlan()?.annual_price || 0}
                    onInput={(e) => setEditingPlan((p) => p ? ({ ...p, annual_price: Number(e.currentTarget.value) }) : null)}
                    class="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
              </div>

              <div class="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div class="font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                  Limits & Caps (-1 for Unlimited)
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-[10px] font-semibold text-gray-600 mb-0.5">Daily Bills Upload</label>
                    <input
                      type="number"
                      value={editingPlan()?.daily_bill_upload_limit}
                      onInput={(e) => setEditingPlan((p) => p ? ({ ...p, daily_bill_upload_limit: Number(e.currentTarget.value) }) : null)}
                      class="w-full px-2.5 py-1.5 border rounded-lg border-gray-200 focus:outline-none focus:border-[#FF4500]"
                    />
                  </div>
                  <div>
                    <label class="block text-[10px] font-semibold text-gray-600 mb-0.5">Max Staff Seats</label>
                    <input
                      type="number"
                      value={editingPlan()?.max_staff_accounts}
                      onInput={(e) => setEditingPlan((p) => p ? ({ ...p, max_staff_accounts: Number(e.currentTarget.value) }) : null)}
                      class="w-full px-2.5 py-1.5 border rounded-lg border-gray-200 focus:outline-none focus:border-[#FF4500]"
                    />
                  </div>
                  <div>
                    <label class="block text-[10px] font-semibold text-gray-600 mb-0.5">Stores Allowed</label>
                    <input
                      type="number"
                      value={editingPlan()?.max_stores_allowed}
                      onInput={(e) => setEditingPlan((p) => p ? ({ ...p, max_stores_allowed: Number(e.currentTarget.value) }) : null)}
                      class="w-full px-2.5 py-1.5 border rounded-lg border-gray-200 focus:outline-none focus:border-[#FF4500]"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Toggles */}
              <div class="space-y-2">
                <div class="font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                  Feature Flags for this Tier
                </div>
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <label class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editingPlan()?.features?.fonepay_qr_generation || false}
                      onChange={(e) => setEditingPlan((p) => p ? ({ ...p, features: { ...p.features, fonepay_qr_generation: e.currentTarget.checked } }) : null)}
                    />
                    <span>Dynamic Fonepay QR</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editingPlan()?.features?.whatsapp_reminders || false}
                      onChange={(e) => setEditingPlan((p) => p ? ({ ...p, features: { ...p.features, whatsapp_reminders: e.currentTarget.checked } }) : null)}
                    />
                    <span>WhatsApp Dues Reminders</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editingPlan()?.features?.ird_vat_audit || false}
                      onChange={(e) => setEditingPlan((p) => p ? ({ ...p, features: { ...p.features, ird_vat_audit: e.currentTarget.checked } }) : null)}
                    />
                    <span>Nepal IRD VAT Audit</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editingPlan()?.features?.advanced_analytics || false}
                      onChange={(e) => setEditingPlan((p) => p ? ({ ...p, features: { ...p.features, advanced_analytics: e.currentTarget.checked } }) : null)}
                    />
                    <span>Advanced Financial Analytics</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editingPlan()?.features?.custom_branding || false}
                      onChange={(e) => setEditingPlan((p) => p ? ({ ...p, features: { ...p.features, custom_branding: e.currentTarget.checked } }) : null)}
                    />
                    <span>Custom Logo / Branding</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={editingPlan()?.features?.webhooks || false}
                      onChange={(e) => setEditingPlan((p) => p ? ({ ...p, features: { ...p.features, webhooks: e.currentTarget.checked } }) : null)}
                    />
                    <span>Webhooks Integration</span>
                  </label>
                </div>
              </div>

              <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  class="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan()}
                  class="px-5 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white rounded-xl font-bold shadow-md disabled:opacity-50 transition"
                >
                  {savingPlan() ? 'Saving Changes...' : 'Save Plan & Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* ========================================================================= */}
      {/* EDIT MERCHANT LICENSE MODAL                                               */}
      {/* ========================================================================= */}
      <Show when={editingSub()}>
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-fade-in">
            <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 class="text-base font-bold text-gray-900">
                  Edit Store License
                </h3>
                <p class="text-xs text-gray-500 font-medium">
                  {editingSub()?.businessName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                class="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSub} class="space-y-4 text-xs">
              <div>
                <label class="block font-semibold text-gray-700 mb-1">
                  Plan Tier
                </label>
                <select
                  value={editTier()}
                  onChange={(e) => setEditTier(e.currentTarget.value)}
                  class="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-[#FF4500] font-medium"
                >
                  <option value="free">Free Tier (3 bills, 1 staff, 1 store)</option>
                  <option value="starter_49">Starter Tier (15 bills, 2 staff, 1 store)</option>
                  <option value="pro_99">Pro Tier (50 bills, 5 staff, 2 stores)</option>
                  <option value="enterprise_149">Enterprise Tier (Unlimited bills & staff, 5 stores)</option>
                </select>
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">
                  License Status
                </label>
                <select
                  value={editStatus()}
                  onChange={(e) => setEditStatus(e.currentTarget.value)}
                  class="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-[#FF4500] font-medium"
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="expired">Expired</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              <div>
                <label class="block font-semibold text-gray-700 mb-1">
                  Active Duration / Extension (Days from now)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editDays()}
                  onInput={(e) => setEditDays(Number(e.currentTarget.value))}
                  class="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-[#FF4500]"
                />
                <p class="text-[10px] text-gray-400 mt-1">
                  e.g., 30 for 1 month, 90 for 3 months, 365 for 1 full year.
                </p>
              </div>

              <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  class="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSub()}
                  class="px-5 py-2 bg-[#FF4500] hover:bg-[#e03d00] text-white rounded-xl font-bold shadow-md disabled:opacity-50 transition"
                >
                  {savingSub() ? 'Saving...' : 'Update License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>

      {/* ========================================================================= */}
      {/* VIEW 4: TRANSACTION AUDIT & ESEWA API PAYLOAD MODAL                       */}
      {/* ========================================================================= */}
      <Show when={viewingPayload()}>
        {(t) => {
          const item = t();
          return (
            <div
              class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
              onClick={() => setViewingPayload(null)}
            >
              <div
                class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div>
                    <h3 class="text-base font-bold text-gray-900 font-heading">
                      eSewa Transaction Audit Log
                    </h3>
                    <p class="text-xs text-gray-400">
                      Live verification and raw gateway payload from eSewa ePay API
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingPayload(null)}
                    class="text-gray-400 hover:text-gray-600 p-1"
                  >
                    ✕
                  </button>
                </div>

                <div class="space-y-4 text-xs">
                  {/* Primary Card */}
                  <div class="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 font-mono">
                    <div>
                      <span class="text-gray-400 text-[10px] uppercase block">Merchant Store</span>
                      <span class="font-bold text-gray-900 text-xs font-sans">
                        {item.business_name || item.business_id}
                      </span>
                    </div>
                    <div>
                      <span class="text-gray-400 text-[10px] uppercase block">Current Status</span>
                      <span class={`font-bold capitalize ${
                        item.status === 'completed'
                          ? 'text-emerald-700'
                          : item.status === 'cancelled'
                          ? 'text-gray-600'
                          : 'text-amber-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div>
                      <span class="text-gray-400 text-[10px] uppercase block">eSewa Ref / Txn Code</span>
                      <span class="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {item.transaction_code || item.gateway_response?.ref_id || 'Not assigned'}
                      </span>
                    </div>
                    <div>
                      <span class="text-gray-400 text-[10px] uppercase block">Total Amount</span>
                      <span class="font-bold text-gray-900 text-xs">
                        रु {item.amount.toLocaleString()} NPR
                      </span>
                    </div>
                    <div class="col-span-2">
                      <span class="text-gray-400 text-[10px] uppercase block">Transaction UUID</span>
                      <span class="text-gray-600 break-all select-all">
                        {item.transaction_uuid}
                      </span>
                    </div>
                  </div>

                  {/* Raw eSewa Payload Box */}
                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="font-bold text-gray-700">Raw eSewa API Gateway Response</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(item.gateway_response || {}, null, 2));
                          setActionSuccess('Copied raw eSewa payload to clipboard!');
                          setTimeout(() => setActionSuccess(null), 3000);
                        }}
                        class="text-[10px] text-blue-600 hover:underline font-mono"
                      >
                        Copy JSON
                      </button>
                    </div>
                    <pre class="bg-gray-900 text-gray-100 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed shadow-inner border border-gray-800">
                      {JSON.stringify(item.gateway_response || { notice: 'No raw gateway response recorded yet.' }, null, 2)}
                    </pre>
                  </div>

                  <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                    <Show when={item.gateway === 'esewa'}>
                      <button
                        type="button"
                        disabled={checkingTxUuid() === item.transaction_uuid}
                        onClick={async () => {
                          await handleCheckEsewa(item);
                          setViewingPayload(null);
                        }}
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 transition"
                      >
                        <span>🔄 Query eSewa Status API Now</span>
                      </button>
                    </Show>
                    <button
                      type="button"
                      onClick={() => setViewingPayload(null)}
                      class="px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-semibold ml-auto"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
};
