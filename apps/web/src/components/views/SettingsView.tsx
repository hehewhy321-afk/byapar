import { Component, createSignal, onSettled, Show, For } from 'solid-js';
import {
  settings,
  setSettings,
  currentBusiness,
  updateBusinessProfile,
  persistState,
  setActiveTab,
  setShowChangePasswordModal,
  setShowAuthModal,
  setShowProfileModal,
  setShowSubscriptionModal,
} from '../../db/localDb';
import { currentUser } from '../../db/auth';
import {
  getBusinessSubscription,
  fetchSubscriptionHistory,
  cancelEsewaPayment,
  BusinessSubscriptionState,
  SubscriptionHistoryItem,
} from '../../services/subscriptionService';
import { SubscriptionInvoiceModal } from '../modals/SubscriptionInvoiceModal';
import { IconShield, IconLock, IconStore, IconEdit, IconCrown, IconQrCode, IconCheck, IconBusinessCard } from '../icons';
import { currentLang } from '../../services/i18n';

export const SettingsView: Component = () => {
  const [sub, setSub] = createSignal<BusinessSubscriptionState | null>(null);
  const [subHistory, setSubHistory] = createSignal<SubscriptionHistoryItem[]>([]);
  const [selectedInvoice, setSelectedInvoice] = createSignal<SubscriptionHistoryItem | null>(null);
  const [cancellingTxUuid, setCancellingTxUuid] = createSignal<string | null>(null);
  const [fonepayId, setFonepayId] = createSignal(currentBusiness.fonepayMerchantId || '');
  const [savingFonepay, setSavingFonepay] = createSignal(false);
  const [fonepaySuccess, setFonepaySuccess] = createSignal(false);
  const [uploadedQrPreview, setUploadedQrPreview] = createSignal<string>(currentBusiness.fonepayQrImage || '');

  const refreshData = async () => {
    if (!currentBusiness.id) return;
    try {
      const [s, h] = await Promise.all([
        getBusinessSubscription(currentBusiness.id),
        fetchSubscriptionHistory(currentBusiness.id),
      ]);
      setSub(s);
      setSubHistory(h);
    } catch (e) {
      console.warn('Subscription fetch warning in settings:', e);
    }
  };

  onSettled(() => {
    refreshData();
  });

  const handleCancelPending = async (txUuid: string) => {
    if (!confirm('Are you sure you want to cancel this pending payment request?')) return;
    setCancellingTxUuid(txUuid);
    await cancelEsewaPayment(txUuid, 'Merchant manually cancelled pending transaction');
    setCancellingTxUuid(null);
    refreshData();
  };

  const toggleCalendar = () => {
    setSettings((draft) => {
      draft.calendar = draft.calendar === 'BS' ? 'AD' : 'BS';
    });
    persistState();
  };

  const toggleLang = () => {
    setSettings((draft) => {
      draft.lang = draft.lang === 'ne' ? 'en' : 'ne';
    });
    persistState();
  };

  const handleQrFileUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedQrPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFonepay = async () => {
    setSavingFonepay(true);
    setFonepaySuccess(false);
    try {
      await updateBusinessProfile({
        fonepayMerchantId: fonepayId().trim(),
        fonepayQrImage: uploadedQrPreview(),
      });
      setFonepaySuccess(true);
      setTimeout(() => setFonepaySuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save Fonepay profile:', err);
    } finally {
      setSavingFonepay(false);
    }
  };

  return (
    <div class="p-6 animate-fade-in max-w-3xl">
      {/* Header
      <div class="flex items-center gap-3 mb-6">
        <button
          class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400"
          onClick={() => setActiveTab('dashboard')}
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">Settings</h1>
      </div> */}

      <div class="space-y-5">
        {/* Subscription & Plan Status */}
        <div class="stat-card border border-orange-500/30 bg-gradient-to-br from-orange-50/40 via-white to-transparent dark:from-orange-950/20 dark:via-black dark:to-transparent">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <IconCrown class="w-4 h-4 text-[#FF4500]" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Active Subscription & License</h3>
            </div>
            <span class={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
              sub()?.planTier === 'free' 
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700' 
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}>
              {sub()?.planName || 'Free Tier'}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div>
              <p class="text-xs font-semibold text-gray-800 dark:text-neutral-200">
                {sub()?.planTier === 'free' 
                  ? 'Free Plan • Lifetime Access' 
                  : `${sub()?.daysRemaining || 0} Days Remaining in Current Billing Cycle`}
              </p>
              <p class="text-[11px] text-gray-400 dark:text-neutral-500 mt-0.5">
                Daily Bills: {sub()?.planConfig?.daily_bill_upload_limit === -1 ? 'Unlimited' : sub()?.planConfig?.daily_bill_upload_limit} • Staff Limit: {sub()?.planConfig?.max_staff_accounts === -1 ? 'Unlimited' : sub()?.planConfig?.max_staff_accounts} • Multi-Store: {sub()?.planConfig?.max_stores_allowed}
              </p>
            </div>

            <Show
              when={sub()?.planTier === 'free'}
              fallback={
                <button
                  type="button"
                  onClick={() => setShowSubscriptionModal(true)}
                  class="btn-outline text-xs !py-1.5 shrink-0"
                >
                  Manage / Upgrade Plan
                </button>
              }
            >
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(true)}
                class="btn-primary text-xs !py-1.5 !px-3.5 flex items-center gap-1.5 shadow-md shadow-orange-500/20 shrink-0"
              >
                <span>⚡ Upgrade to Pro</span>
              </button>
            </Show>
          </div>
        </div>

        {/* Subscription Bought Timeline & Official Tax Invoices */}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📋 Billing History & Tax Invoices</span>
              </h3>
              <p class="text-[11px] text-gray-400">
                Audit timeline of all subscription purchases, eSewa transactions, and downloadable invoices
              </p>
            </div>
            <button
              type="button"
              onClick={refreshData}
              class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              title="Refresh timeline"
            >
              🔄
            </button>
          </div>

          <div class="space-y-3 mt-3">
            <For
              each={subHistory()}
              fallback={
                <div class="text-center py-6 text-xs text-neutral-400 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  No subscription purchases recorded yet. When you upgrade via eSewa, your timeline and invoices will appear here automatically.
                </div>
              }
            >
              {(t) => (
                <div class="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all hover:border-neutral-300 dark:hover:border-neutral-700">
                  <div class="flex items-start gap-3">
                    <div class={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      t.status === 'completed'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                        : t.status === 'cancelled'
                        ? 'bg-gray-100 dark:bg-neutral-800 text-neutral-400'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                    }`}>
                      {t.status === 'completed' ? '✓' : t.status === 'cancelled' ? '✕' : '⏳'}
                    </div>

                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-neutral-900 dark:text-white">
                          {t.planName}
                        </span>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold capitalize bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {t.billingCycle}
                        </span>
                        <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          t.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : t.status === 'cancelled'
                            ? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      <div class="text-[11px] text-neutral-400 mt-1 flex items-center gap-2 flex-wrap font-mono">
                        <span>
                          {new Date(t.createdAt).toLocaleString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span>Gateway: eSewa</span>
                        <Show when={t.transactionCode}>
                          <span>•</span>
                          <span class="text-neutral-500 font-bold">Ref: #{t.transactionCode}</span>
                        </Show>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800">
                    <div class="text-right">
                      <div class="font-extrabold text-sm text-neutral-900 dark:text-white font-mono">
                        रु {t.amount.toLocaleString()}
                      </div>
                      <Show when={t.discountAmount && t.discountAmount > 0}>
                        <div class="text-[10px] text-emerald-600 font-mono">
                          Saved रु {t.discountAmount}
                        </div>
                      </Show>
                    </div>

                    <div class="flex items-center gap-2">
                      <Show when={t.status === 'completed'}>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(t)}
                          class="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-[#FF4500] font-bold text-xs flex items-center gap-1 transition shadow-sm"
                        >
                          <span>📄 Invoice</span>
                        </button>
                      </Show>

                      <Show when={t.status === 'pending'}>
                        <button
                          type="button"
                          disabled={cancellingTxUuid() === t.transactionUuid}
                          onClick={() => handleCancelPending(t.transactionUuid)}
                          class="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition"
                        >
                          {cancellingTxUuid() === t.transactionUuid ? 'Cancelling...' : 'Cancel'}
                        </button>
                      </Show>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Fonepay QR Integration */}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-5 h-5 rounded bg-red-600 text-white font-bold flex items-center justify-center text-[10px]">
                F
              </div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Fonepay QR Merchant Setup</h3>
            </div>
            <span class="text-[10px] bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-full font-bold uppercase border border-red-200 dark:border-red-900/40">
              EMVCo Dynamic
            </span>
          </div>

          <p class="text-xs text-gray-500 dark:text-neutral-400 mb-3">
            Configure your counter Fonepay QR code or Merchant ID. Byapar dynamically calculates and locks the customer's exact invoice balance into the QR code during counter billing and WhatsApp reminders.
          </p>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                Fonepay Merchant ID / Terminal ID / Mobile
              </label>
              <input
                type="text"
                placeholder="e.g. 9841234567 or FP-MERCHANT-01"
                value={fonepayId()}
                onInput={(e) => setFonepayId(e.currentTarget.value)}
                class="input-field text-xs font-mono"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                Upload Counter Fonepay Standee QR Image (Optional)
              </label>
              <div class="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQrFileUpload}
                  class="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-100 dark:file:bg-neutral-800 file:text-gray-700 dark:file:text-neutral-200 cursor-pointer"
                />
                <Show when={uploadedQrPreview()}>
                  <img
                    src={uploadedQrPreview()}
                    alt="Fonepay Standee QR"
                    class="w-10 h-10 object-contain rounded border border-gray-200 dark:border-neutral-700"
                  />
                </Show>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <Show when={fonepaySuccess()}>
                <span class="text-xs font-semibold text-emerald-600">✓ Fonepay configuration saved!</span>
              </Show>
              <button
                type="button"
                onClick={handleSaveFonepay}
                disabled={savingFonepay()}
                class="btn-primary text-xs ml-auto"
              >
                {savingFonepay() ? 'Saving...' : 'Save Fonepay QR'}
              </button>
            </div>
          </div>
        </div>

        {/* Digital Business Card Studio Shortcut */}
        <div class="stat-card bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-start gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <IconBusinessCard class="w-5 h-5" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-gray-900 dark:text-white">
                    {currentLang() === 'ne' ? 'डिजिटल भिजिटिङ कार्ड स्टुडियो' : 'Digital Business Card Studio'}
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    5 Templates
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1 max-w-xl">
                  {currentLang() === 'ne'
                    ? 'आफ्नो पसलको नाम, ठेगाना, फोन र ह्वाट्सएप नम्बर राखी ५ फरक डिजाइनमा कार्ड बनाउनुहोस्, इमेज डाउनलोड गर्नुहोस् र ह्वाट्सएपमा सेयर गर्नुहोस्।'
                    : 'Create attractive digital cards for your store with custom details, 5 design templates, dynamic color themes, PNG download & WhatsApp sharing.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              class="btn-primary text-xs flex items-center gap-1.5"
              onClick={() => setActiveTab('business-cards')}
            >
              <span>{currentLang() === 'ne' ? 'कार्ड बनाउनुहोस्' : 'Open Card Studio'}</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Account & Security */}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <IconShield class="w-4 h-4 text-[#FF4500]" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Account & Security</h3>
            </div>
            <Show when={currentUser()}>
              <span class="text-xs text-brand-600 dark:text-brand-400 font-medium">Logged In</span>
            </Show>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-700 dark:text-neutral-200">Store Profile</p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">
                  {currentBusiness.nameEn || currentBusiness.name}
                  {currentBusiness.pan ? ` • PAN: ${currentBusiness.pan}` : ''}
                </p>
              </div>
              <button
                class="btn-outline text-xs flex items-center gap-1.5"
                onClick={() => setShowProfileModal(true)}
              >
                <IconStore class="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>

            <Show
              when={currentUser()}
              fallback={
                <div class="flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 pt-3">
                  <div>
                    <p class="text-sm text-gray-700 dark:text-neutral-200">Cloud Sync & Backup</p>
                    <p class="text-xs text-gray-400 dark:text-neutral-500">Sign in to sync your data across devices</p>
                  </div>
                  <button
                    class="btn-primary text-xs flex items-center gap-1.5"
                    onClick={() => setShowAuthModal(true)}
                  >
                    <IconLock class="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                </div>
              }
            >
              <div class="flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 pt-3">
                <div>
                  <p class="text-sm text-gray-700 dark:text-neutral-200">Account Password</p>
                  <p class="text-xs text-gray-400 dark:text-neutral-500">Update your sign-in password</p>
                </div>
                <button
                  class="btn-outline text-xs flex items-center gap-1.5"
                  onClick={() => setShowChangePasswordModal(true)}
                >
                  <IconLock class="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
              </div>
            </Show>
          </div>
        </div>

        {/* Preferences */}
        <div class="stat-card">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Preferences</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-700 dark:text-neutral-200">Calendar System</p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">Currently: {settings.calendar === 'BS' ? 'Bikram Sambat' : 'AD (Gregorian)'}</p>
              </div>
              <button class="btn-outline text-xs" onClick={toggleCalendar}>
                Switch to {settings.calendar === 'BS' ? 'AD' : 'BS'}
              </button>
            </div>
            <div class="flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 pt-3">
              <div>
                <p class="text-sm font-medium text-gray-700 dark:text-neutral-200">
                  {settings.lang === 'ne' ? 'भाषा' : 'Language'}
                </p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">
                  {settings.lang === 'ne' ? 'हाल: नेपाली' : 'Currently: English'}
                </p>
              </div>
              <button class="btn-outline text-xs font-semibold" onClick={toggleLang}>
                {settings.lang === 'en' ? 'नेपालीमा बदल्नुहोस्' : 'Switch to English'}
              </button>
            </div>
          </div>
        </div>

        {/* Billing & Hardware */}
        <div class="stat-card">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Billing & Hardware</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-700 dark:text-neutral-200">Thermal Printer Width</p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">Currently: {settings.thermalPrinterWidth}</p>
              </div>
              <button
                class="btn-outline text-xs"
                onClick={() => {
                  setSettings((draft) => {
                    draft.thermalPrinterWidth = draft.thermalPrinterWidth === '58mm' ? '80mm' : '58mm';
                  });
                  persistState();
                }}
              >
                Switch to {settings.thermalPrinterWidth === '58mm' ? '80mm' : '58mm'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <SubscriptionInvoiceModal
        transaction={selectedInvoice()}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
};
