import { Component, createSignal, onSettled, Show } from 'solid-js';
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
  BusinessSubscriptionState,
} from '../../services/subscriptionService';
import { IconShield, IconLock, IconStore, IconEdit, IconCrown, IconQrCode } from '../icons';

export const SettingsView: Component = () => {
  const [sub, setSub] = createSignal<BusinessSubscriptionState | null>(null);
  const [fonepayId, setFonepayId] = createSignal(currentBusiness.fonepayMerchantId || '');
  const [savingFonepay, setSavingFonepay] = createSignal(false);
  const [fonepaySuccess, setFonepaySuccess] = createSignal(false);
  const [uploadedQrPreview, setUploadedQrPreview] = createSignal<string>(currentBusiness.fonepayQrImage || '');

  onSettled(() => {
    (async () => {
      try {
        const s = await getBusinessSubscription(currentBusiness.id);
        setSub(s);
      } catch (e) {
        console.warn('Subscription fetch warning in settings:', e);
      }
    })();
  });

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
    <div class="p-6 animate-fade-in max-w-2xl">
      {/* Header */}
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
      </div>

      <div class="space-y-4">
        {/* Subscription & Plan Status */}
        <div class="stat-card border border-orange-500/30 bg-gradient-to-br from-orange-50/40 via-white to-transparent dark:from-orange-950/20 dark:via-black dark:to-transparent">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <IconCrown class="w-4 h-4 text-[#FF4500]" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Subscription & Licensing</h3>
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
                  Manage Subscription
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
                <p class="text-sm text-gray-700 dark:text-neutral-200">Language</p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">Currently: {settings.lang === 'en' ? 'English' : 'Nepali'}</p>
              </div>
              <button class="btn-outline text-xs" onClick={toggleLang}>
                Switch to {settings.lang === 'en' ? 'Nepali' : 'English'}
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
    </div>
  );
};
