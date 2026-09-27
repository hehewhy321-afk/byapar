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
import {
  IconShield,
  IconLock,
  IconStore,
  IconCrown,
  IconBusinessCard,
  IconReceipt,
  IconQrCode,
  IconPrinter,
  IconGlobe,
  IconCheck,
  IconEdit,
  IconPhone,
  IconMapPin,
  IconCopy,
  IconCalendar,
  IconClock,
  IconCloud,
  IconChevronRight,
  IconSparkles,
  IconUser,
  IconFileText,
  IconTrendingUp,
} from '../icons';
import { currentLang } from '../../services/i18n';

type SettingsTab =
  | 'store'
  | 'subscription'
  | 'invoices'
  | 'fonepay'
  | 'hardware'
  | 'preferences'
  | 'security';

export const SettingsView: Component = () => {
  const [activeSettingsTab, setActiveSettingsTab] = createSignal<SettingsTab>('store');

  const [sub, setSub] = createSignal<BusinessSubscriptionState | null>(null);
  const [subHistory, setSubHistory] = createSignal<SubscriptionHistoryItem[]>([]);
  const [selectedInvoice, setSelectedInvoice] = createSignal<SubscriptionHistoryItem | null>(null);
  const [cancellingTxUuid, setCancellingTxUuid] = createSignal<string | null>(null);
  const [fonepayId, setFonepayId] = createSignal(currentBusiness.fonepayMerchantId || '');
  const [savingFonepay, setSavingFonepay] = createSignal(false);
  const [fonepaySuccess, setFonepaySuccess] = createSignal(false);
  const [uploadedQrPreview, setUploadedQrPreview] = createSignal<string>(currentBusiness.fonepayQrImage || '');
  const [copiedField, setCopiedField] = createSignal<string | null>(null);

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

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCancelPending = async (txUuid: string) => {
    if (!confirm('Are you sure you want to cancel this pending payment request?')) return;
    setCancellingTxUuid(txUuid);
    await cancelEsewaPayment(txUuid, 'Merchant manually cancelled pending transaction');
    setCancellingTxUuid(null);
    refreshData();
  };

  const setCalendarPref = (cal: 'BS' | 'AD') => {
    setSettings((draft) => {
      draft.calendar = cal;
    });
    persistState();
  };

  const setLanguagePref = (l: 'ne' | 'en') => {
    setSettings((draft) => {
      draft.lang = l;
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

  const navItems = [
    {
      id: 'store' as SettingsTab,
      label: currentLang() === 'ne' ? 'पसल प्रोफाइल' : 'Store Profile',
      icon: IconStore,
      desc: currentLang() === 'ne' ? 'नाम, प्यान नम्बर र भिजिटिङ कार्ड' : 'Store details, PAN & cards',
      colorClass: 'emerald',
      activeGradient: 'from-emerald-500 to-teal-600',
      tagColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    },
    {
      id: 'subscription' as SettingsTab,
      label: currentLang() === 'ne' ? 'प्लान तथा इजाजत' : 'Plan & Subscription',
      icon: IconCrown,
      badge: sub()?.planTier === 'free' ? 'Free Forever' : 'Pro Active',
      desc: currentLang() === 'ne' ? 'सक्रिय लाइसेन्स र फिचरहरू' : 'Active tier & features',
      colorClass: 'amber',
      activeGradient: 'from-amber-500 to-orange-500',
      tagColor: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    },
    {
      id: 'invoices' as SettingsTab,
      label: currentLang() === 'ne' ? 'बिलिङ र रसिदहरू' : 'Billing & Invoices',
      icon: IconReceipt,
      desc: currentLang() === 'ne' ? 'eSewa भुक्तानी र भ्याट बिल' : 'Payment history & tax bills',
      colorClass: 'blue',
      activeGradient: 'from-blue-600 to-indigo-600',
      tagColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    },
    {
      id: 'fonepay' as SettingsTab,
      label: currentLang() === 'ne' ? 'Fonepay QR सेटअप' : 'Fonepay QR Setup',
      icon: IconQrCode,
      desc: currentLang() === 'ne' ? 'काउन्टर QR र भुक्तानी कोड' : 'Merchant ID & counter QR',
      colorClass: 'rose',
      activeGradient: 'from-rose-500 to-red-600',
      tagColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    },
    {
      id: 'hardware' as SettingsTab,
      label: currentLang() === 'ne' ? 'प्रिन्टर तथा हार्डवेयर' : 'Printer & Hardware',
      icon: IconPrinter,
      desc: currentLang() === 'ne' ? 'थर्मल रसिद चौडाइ ५८/८०mm' : 'Thermal paper width',
      colorClass: 'teal',
      activeGradient: 'from-teal-500 to-cyan-600',
      tagColor: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    },
    {
      id: 'preferences' as SettingsTab,
      label: currentLang() === 'ne' ? 'भाषा तथा पात्रो' : 'Language & Region',
      icon: IconGlobe,
      desc: currentLang() === 'ne' ? 'नेपाली/English र BS/AD पात्रो' : 'Calendar BS/AD, Nepali',
      colorClass: 'purple',
      activeGradient: 'from-purple-600 to-pink-600',
      tagColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    },
    {
      id: 'security' as SettingsTab,
      label: currentLang() === 'ne' ? 'सुरक्षा तथा क्लाउड' : 'Security & Cloud',
      icon: IconShield,
      desc: currentLang() === 'ne' ? 'पासवर्ड र क्लाउड सिंक' : 'Password & Cloud Sync',
      colorClass: 'orange',
      activeGradient: 'from-[#FF4500] to-amber-500',
      tagColor: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    },
  ];

  return (
    <div class="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in space-y-6">
      {/* Top Header Banner */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-orange-100/70 dark:border-orange-900/30">
        <div>
          <h1 class="text-2xl font-black font-heading text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{currentLang() === 'ne' ? 'सेटिङहरू' : 'System Settings'}</span>
          </h1>
          <p class="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            {currentLang() === 'ne'
              ? 'आफ्नो पसल प्रोफाइल, Fonepay QR, थर्मल प्रिन्टर, सदस्यता तथा भाषा मिलाउनुहोस्'
              : 'Customize store identity, Fonepay counter standee, POS printer hardware, plans, and regional locales'}
          </p>
        </div>
      </div>

      {/* Main Settings Two-Column Layout */}
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Navigation Menu */}
        <div class="md:col-span-4 bg-gradient-to-b from-white via-orange-50/20 to-white dark:from-neutral-900 dark:via-[#171412] dark:to-neutral-900 rounded-3xl border border-orange-100 dark:border-orange-950/60 p-3 shadow-md shadow-orange-500/5 space-y-1.5">
          <For each={navItems}>
            {(item) => {
              const isActive = () => activeSettingsTab() === item.id;
              const IconComp = item.icon;
              return (
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab(item.id)}
                  class={`w-full flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all group ${
                    isActive()
                      ? 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 dark:from-orange-950/60 dark:via-amber-950/40 dark:to-orange-950/20 border border-orange-300 dark:border-orange-800/80 shadow-sm'
                      : 'hover:bg-orange-50/40 dark:hover:bg-neutral-800/60 border border-transparent'
                  }`}
                >
                  <div
                    class={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isActive()
                        ? `bg-gradient-to-br ${item.activeGradient} text-white shadow-sm shadow-orange-500/30 scale-105`
                        : 'bg-orange-50 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 group-hover:text-[#FF4500] group-hover:bg-orange-100/60 dark:group-hover:bg-neutral-700'
                    }`}
                  >
                    <IconComp class="w-4 h-4" />
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-1">
                      <span
                        class={`text-xs font-bold truncate transition-colors ${
                          isActive()
                            ? 'text-[#FF4500] dark:text-orange-400'
                            : 'text-gray-900 dark:text-white group-hover:text-[#FF4500]'
                        }`}
                      >
                        {item.label}
                      </span>
                      <Show when={item.badge}>
                        <span class={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          isActive()
                            ? 'bg-[#FF4500] text-white shadow-xs'
                            : 'bg-orange-100 text-[#FF4500] dark:bg-orange-950/60 dark:text-orange-300'
                        }`}>
                          {item.badge}
                        </span>
                      </Show>
                    </div>
                    <p class="text-[11px] truncate mt-0.5 text-gray-400 dark:text-neutral-500">
                      {item.desc}
                    </p>
                  </div>

                  <IconChevronRight
                    class={`w-4 h-4 shrink-0 transition-transform ${
                      isActive()
                        ? 'text-[#FF4500] dark:text-orange-400 translate-x-0.5'
                        : 'text-gray-300 dark:text-neutral-600 group-hover:text-gray-500'
                    }`}
                  />
                </button>
              );
            }}
          </For>
        </div>

        {/* Right Active Content Panel: Rich, warm, colorful aesthetic container */}
        <div class="md:col-span-8">
          <div class="bg-gradient-to-br from-white via-orange-50/15 to-white dark:from-[#161311] dark:via-[#191512] dark:to-[#141210] rounded-3xl border border-orange-200/80 dark:border-orange-900/40 p-6 sm:p-7 shadow-xl shadow-orange-500/5 relative overflow-hidden space-y-6">
            {/* Ambient Warm Gradient Accents */}
            <div class="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br from-orange-400/10 via-amber-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-amber-400/10 via-orange-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* =========================================================
                TAB 1: STORE PROFILE
                ========================================================= */}
            <Show when={activeSettingsTab() === 'store'}>
              <div class="space-y-6 relative z-10 animate-fade-in">
                {/* Header */}
                <div class="flex items-center justify-between pb-4 border-b border-orange-100 dark:border-orange-950/60">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <IconStore class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-heading font-black text-base text-gray-900 dark:text-white">
                        {currentLang() === 'ne' ? 'पसल प्रोफाइल तथा विवरण' : 'Store Identity & Registration'}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-neutral-400">
                        Official business information printed automatically on customer receipts
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    class="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF4500] to-[#FF7A00] text-white text-xs font-bold hover:opacity-95 transition-all flex items-center gap-1.5 shadow-md shadow-orange-500/25 active:scale-95 cursor-pointer"
                  >
                    <IconEdit class="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>

                {/* Hero Showcase Card */}
                <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-orange-500/5 border border-emerald-500/20 dark:border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center text-xl font-black font-heading shadow-md shadow-emerald-500/30">
                      {(currentBusiness.nameEn || currentBusiness.name || 'B').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <h4 class="font-heading font-black text-lg text-gray-900 dark:text-white">
                          {currentBusiness.nameEn || currentBusiness.name || 'Store Name Not Set'}
                        </h4>
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <IconCheck class="w-2.5 h-2.5" />
                          <span>Verified Store</span>
                        </span>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-neutral-400 mt-0.5 flex items-center gap-2">
                        <span class="flex items-center gap-1">
                          <IconUser class="w-3 h-3 text-emerald-600" />
                          <span>{currentBusiness.ownerName || 'Owner'}</span>
                        </span>
                        <span class="w-1 h-1 rounded-full bg-gray-300 dark:bg-neutral-600" />
                        <span class="flex items-center gap-1">
                          <IconMapPin class="w-3 h-3 text-emerald-600" />
                          <span>{currentBusiness.address || 'Nepal'}</span>
                        </span>
                      </p>
                    </div>
                  </div>

                  <div class="sm:text-right">
                    <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">PAN / VAT Status</span>
                    <div class="font-mono font-bold text-sm text-[#FF4500]">
                      {currentBusiness.pan ? `PAN: ${currentBusiness.pan}` : 'Non-VAT Retail'}
                    </div>
                  </div>
                </div>

                {/* 4 Detail Info Cards with Clean SVG Icons */}
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Store Name Card */}
                  <div class="p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-orange-100 dark:border-neutral-800 shadow-xs hover:border-orange-300 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-orange-100 text-[#FF4500] dark:bg-orange-950/60 flex items-center justify-center">
                          <IconStore class="w-3.5 h-3.5" />
                        </div>
                        <span class="text-gray-500 dark:text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">Store Name</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentBusiness.name || '', 'name')}
                        class="p-1 text-gray-400 hover:text-[#FF4500] transition"
                        title="Copy Name"
                      >
                        <Show when={copiedField() === 'name'} fallback={<IconCopy class="w-3.5 h-3.5" />}>
                          <IconCheck class="w-3.5 h-3.5 text-emerald-500" />
                        </Show>
                      </button>
                    </div>
                    <div class="text-sm font-bold text-gray-900 dark:text-white mt-2">
                      {currentBusiness.nameEn || currentBusiness.name || 'Not specified'}
                    </div>
                  </div>

                  {/* PAN/VAT Card */}
                  <div class="p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-orange-100 dark:border-neutral-800 shadow-xs hover:border-orange-300 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 flex items-center justify-center">
                          <IconReceipt class="w-3.5 h-3.5" />
                        </div>
                        <span class="text-gray-500 dark:text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">PAN / VAT Registration</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentBusiness.pan || '', 'pan')}
                        class="p-1 text-gray-400 hover:text-[#FF4500] transition"
                        title="Copy PAN"
                      >
                        <Show when={copiedField() === 'pan'} fallback={<IconCopy class="w-3.5 h-3.5" />}>
                          <IconCheck class="w-3.5 h-3.5 text-emerald-500" />
                        </Show>
                      </button>
                    </div>
                    <div class="text-sm font-mono font-bold text-gray-900 dark:text-white mt-2">
                      {currentBusiness.pan || 'Not provided'}
                    </div>
                  </div>

                  {/* Contact Phone Card */}
                  <div class="p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-orange-100 dark:border-neutral-800 shadow-xs hover:border-orange-300 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 flex items-center justify-center">
                          <IconPhone class="w-3.5 h-3.5" />
                        </div>
                        <span class="text-gray-500 dark:text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">Contact Phone</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentBusiness.phone || '', 'phone')}
                        class="p-1 text-gray-400 hover:text-[#FF4500] transition"
                        title="Copy Phone"
                      >
                        <Show when={copiedField() === 'phone'} fallback={<IconCopy class="w-3.5 h-3.5" />}>
                          <IconCheck class="w-3.5 h-3.5 text-emerald-500" />
                        </Show>
                      </button>
                    </div>
                    <div class="text-sm font-mono font-bold text-gray-900 dark:text-white mt-2">
                      {currentBusiness.phone || 'Not provided'}
                    </div>
                  </div>

                  {/* Store Address Card */}
                  <div class="p-4 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-orange-100 dark:border-neutral-800 shadow-xs hover:border-orange-300 transition-colors">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/60 flex items-center justify-center">
                          <IconMapPin class="w-3.5 h-3.5" />
                        </div>
                        <span class="text-gray-500 dark:text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">Store Location</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentBusiness.address || '', 'address')}
                        class="p-1 text-gray-400 hover:text-[#FF4500] transition"
                        title="Copy Address"
                      >
                        <Show when={copiedField() === 'address'} fallback={<IconCopy class="w-3.5 h-3.5" />}>
                          <IconCheck class="w-3.5 h-3.5 text-emerald-500" />
                        </Show>
                      </button>
                    </div>
                    <div class="text-sm font-bold text-gray-900 dark:text-white mt-2">
                      {currentBusiness.address || 'Kathmandu, Nepal'}
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* =========================================================
                TAB 2: SUBSCRIPTION & PLAN
                ========================================================= */}
            <Show when={activeSettingsTab() === 'subscription'}>
              <div class="space-y-6 relative z-10 animate-fade-in">
                {/* Header */}
                <div class="flex items-center justify-between pb-4 border-b border-orange-100 dark:border-orange-950/60">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                      <IconCrown class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-heading font-black text-base text-gray-900 dark:text-white">
                        {currentLang() === 'ne' ? 'सक्रिय सदस्यता तथा इजाजत' : 'Active Plan & Software License'}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-neutral-400">
                        View current feature limits, cloud quotas, and subscription cycle status
                      </p>
                    </div>
                  </div>

                  <span class={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    sub()?.planTier === 'free'
                      ? 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'
                      : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {sub()?.planName || 'Free Forever'}
                  </span>
                </div>

                {/* Status Hero Card */}
                <div class="p-6 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-400/30 dark:border-amber-700/40 space-y-4">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div class="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <IconSparkles class="w-3.5 h-3.5 text-amber-600" />
                        <span>Current Subscription State</span>
                      </div>
                      <div class="text-2xl font-black font-heading text-gray-900 dark:text-white mt-1">
                        {sub()?.planTier === 'free'
                          ? 'Free Forever Tier'
                          : `${sub()?.daysRemaining || 0} Days Active in Current Cycle`}
                      </div>
                      <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1">
                        {sub()?.planTier === 'free'
                          ? 'Full Android App + Web single counter access with no monthly fees'
                          : `Next renewal managed via eSewa with 7-day prior grace notification`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSubscriptionModal(true)}
                      class="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#FF4500] to-[#FF7A00] text-white hover:opacity-95 text-xs font-bold shadow-lg shadow-orange-500/30 shrink-0 self-start sm:self-auto active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <IconCrown class="w-4 h-4" />
                      <span>{sub()?.planTier === 'free' ? 'Upgrade to Pro' : 'Manage Subscription'}</span>
                    </button>
                  </div>

                  {/* Limit Metrics Grid */}
                  <div class="grid grid-cols-3 gap-3 pt-3 border-t border-amber-200/60 dark:border-neutral-800 text-xs">
                    <div class="p-3 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-amber-100 dark:border-neutral-800">
                      <span class="text-[10px] text-gray-400 uppercase font-bold">Daily Bill Uploads</span>
                      <div class="font-bold text-sm text-gray-900 dark:text-white mt-0.5 font-mono">
                        {sub()?.planConfig?.daily_bill_upload_limit === -1 ? 'Unlimited' : (sub()?.planConfig?.daily_bill_upload_limit || '10/day')}
                      </div>
                    </div>
                    <div class="p-3 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-amber-100 dark:border-neutral-800">
                      <span class="text-[10px] text-gray-400 uppercase font-bold">Staff Accounts</span>
                      <div class="font-bold text-sm text-gray-900 dark:text-white mt-0.5 font-mono">
                        {sub()?.planConfig?.max_staff_accounts === -1 ? 'Unlimited' : (sub()?.planConfig?.max_staff_accounts || '1')}
                      </div>
                    </div>
                    <div class="p-3 rounded-xl bg-white/70 dark:bg-neutral-900/60 border border-amber-100 dark:border-neutral-800">
                      <span class="text-[10px] text-gray-400 uppercase font-bold">Allowed Stores</span>
                      <div class="font-bold text-sm text-gray-900 dark:text-white mt-0.5 font-mono">
                        {sub()?.planConfig?.max_stores_allowed || '1 Store'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature Highlights Grid */}
                <div class="space-y-2.5">
                  <h4 class="text-xs font-bold text-gray-700 dark:text-neutral-300 uppercase tracking-wider">
                    Included Core Capabilities
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-emerald-100 dark:border-neutral-800 shadow-xs">
                      <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                        <IconCheck class="w-3.5 h-3.5" />
                      </div>
                      <span class="text-gray-800 dark:text-neutral-200 font-medium">Android App & Web 100% Free Access</span>
                    </div>

                    <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-emerald-100 dark:border-neutral-800 shadow-xs">
                      <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                        <IconCheck class="w-3.5 h-3.5" />
                      </div>
                      <span class="text-gray-800 dark:text-neutral-200 font-medium">App Security Lock (PIN & Biometrics)</span>
                    </div>

                    <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-emerald-100 dark:border-neutral-800 shadow-xs">
                      <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                        <IconCheck class="w-3.5 h-3.5" />
                      </div>
                      <span class="text-gray-800 dark:text-neutral-200 font-medium">Notes, Reminders & Auto WhatsApp</span>
                    </div>

                    <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-emerald-100 dark:border-neutral-800 shadow-xs">
                      <div class="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                        <IconCheck class="w-3.5 h-3.5" />
                      </div>
                      <span class="text-gray-800 dark:text-neutral-200 font-medium">Detailed Reports with PDF/Excel Export</span>
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* =========================================================
                TAB 3: INVOICES & BILLING TIMELINE
                ========================================================= */}
            <Show when={activeSettingsTab() === 'invoices'}>
              <div class="space-y-6 relative z-10 animate-fade-in">
                {/* Header */}
                <div class="flex items-center justify-between pb-4 border-b border-orange-100 dark:border-orange-950/60">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                      <IconReceipt class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-heading font-black text-base text-gray-900 dark:text-white">
                        {currentLang() === 'ne' ? 'बिलिङ इतिहास तथा भ्याट रसिद' : 'Billing History & Tax Invoices'}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-neutral-400">
                        Official eSewa transactions and downloadable tax-compliant invoices
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={refreshData}
                    class="px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-200 dark:border-neutral-700 hover:bg-blue-50 dark:hover:bg-neutral-800 text-blue-600 dark:text-blue-400 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Refresh Invoices"
                  >
                    <IconClock class="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div class="space-y-3">
                  <For
                    each={subHistory()}
                    fallback={
                      <div class="text-center py-12 px-4 bg-gradient-to-br from-blue-50/50 via-white to-orange-50/30 dark:from-neutral-900/60 dark:to-neutral-950 rounded-2xl border border-blue-100 dark:border-neutral-800">
                        <div class="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center mb-3">
                          <IconFileText class="w-6 h-6" />
                        </div>
                        <h4 class="font-bold text-sm text-gray-900 dark:text-white">No Subscription Purchases Yet</h4>
                        <p class="text-xs text-gray-500 dark:text-neutral-400 max-w-sm mx-auto mt-1">
                          When you upgrade your tier using eSewa, your official tax invoices will be generated and archived here.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowSubscriptionModal(true)}
                          class="mt-4 px-4 py-2 rounded-xl bg-[#FF4500] text-white text-xs font-bold hover:bg-[#E03E00] shadow-sm cursor-pointer"
                        >
                          Explore Pro Plans
                        </button>
                      </div>
                    }
                  >
                    {(t) => (
                      <div class="p-4 rounded-2xl border border-orange-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs hover:border-orange-300 transition-colors">
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-900 dark:text-white text-sm">{t.planName}</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {t.billingCycle}
                            </span>
                            <span class={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <div class="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                            <span>{new Date(t.createdAt).toLocaleDateString('en-GB')}</span>
                            <span>•</span>
                            <span>eSewa Gateway</span>
                            <span>•</span>
                            <span class="font-mono">Ref: #{t.transactionCode || 'Pending'}</span>
                          </div>
                        </div>

                        <div class="flex items-center gap-3">
                          <div class="text-right">
                            <div class="font-black font-heading text-base text-gray-900 dark:text-white">
                              रु {t.amount.toLocaleString()}
                            </div>
                          </div>

                          <Show when={t.status === 'completed'}>
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(t)}
                              class="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF4500] font-bold text-xs flex items-center gap-1.5 transition border border-orange-200 dark:border-orange-800 cursor-pointer shadow-xs"
                            >
                              <IconReceipt class="w-3.5 h-3.5" />
                              <span>Invoice</span>
                            </button>
                          </Show>

                          <Show when={t.status === 'pending'}>
                            <button
                              type="button"
                              disabled={cancellingTxUuid() === t.transactionUuid}
                              onClick={() => handleCancelPending(t.transactionUuid)}
                              class="px-3 py-1.5 rounded-xl text-rose-600 border border-rose-200 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            {/* =========================================================
                TAB 4: FONEPAY QR SETUP
                ========================================================= */}
            <Show when={activeSettingsTab() === 'fonepay'}>
              <div class="space-y-6 relative z-10 animate-fade-in">
                {/* Header */}
                <div class="flex items-center justify-between pb-4 border-b border-orange-100 dark:border-orange-950/60">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/20">
                      <IconQrCode class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-heading font-black text-base text-gray-900 dark:text-white">
                        {currentLang() === 'ne' ? 'काउन्टर Fonepay QR एकीकरण' : 'Counter Fonepay QR Integration'}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-neutral-400">
                        Configure store Fonepay ID to show dynamic bill payment QR codes directly at counter
                      </p>
                    </div>
                  </div>

                  <span class="text-[10px] bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300 px-3 py-1 rounded-full font-bold uppercase border border-red-200">
                    EMVCo Dynamic
                  </span>
                </div>

                <div class="space-y-5">
                  {/* Fonepay Merchant ID input */}
                  <div class="p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-orange-100 dark:border-neutral-800 space-y-2">
                    <label class="block text-xs font-bold text-gray-800 dark:text-neutral-200">
                      Fonepay Merchant ID / Terminal Mobile Number
                    </label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-red-500">
                        <IconQrCode class="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 9841234567 or FP-MERCHANT-01"
                        value={fonepayId()}
                        onInput={(e) => setFonepayId(e.currentTarget.value)}
                        class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                      />
                    </div>
                    <p class="text-[11px] text-gray-400">
                      This ID is embedded into checkout QR codes so customer payments route directly into your bank account.
                    </p>
                  </div>

                  {/* Physical Standee QR Upload */}
                  <div class="p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-orange-100 dark:border-neutral-800 space-y-3">
                    <label class="block text-xs font-bold text-gray-800 dark:text-neutral-200">
                      Upload Physical Counter Standee QR Image (Optional)
                    </label>
                    <div class="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrFileUpload}
                        class="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 dark:file:bg-red-950 dark:file:text-red-300 hover:file:bg-red-100 cursor-pointer"
                      />
                      <Show when={uploadedQrPreview()}>
                        <div class="relative group">
                          <img
                            src={uploadedQrPreview()}
                            alt="Fonepay Standee"
                            class="w-14 h-14 object-contain rounded-xl border border-red-200 shadow-sm bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setUploadedQrPreview('')}
                            class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-xs"
                            title="Remove QR"
                          >
                            ×
                          </button>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Save action */}
                  <div class="flex items-center justify-between pt-2">
                    <Show when={fonepaySuccess()}>
                      <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <IconCheck class="w-4 h-4" />
                        <span>Fonepay settings saved successfully!</span>
                      </span>
                    </Show>

                    <button
                      type="button"
                      onClick={handleSaveFonepay}
                      disabled={savingFonepay()}
                      class="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white hover:opacity-95 text-xs font-bold transition shadow-md shadow-red-500/25 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {savingFonepay() ? 'Saving Configuration...' : 'Save Fonepay Settings'}
                    </button>
                  </div>
                </div>
              </div>
            </Show>

            {/* =========================================================
                TAB 5: HARDWARE & PRINTER
                ========================================================= */}
            <Show when={activeSettingsTab() === 'hardware'}>
              <div class="space-y-6 relative z-10 animate-fade-in">
                {/* Header */}
                <div class="flex items-center justify-between pb-4 border-b border-orange-100 dark:border-orange-950/60">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
                      <IconPrinter class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-heading font-black text-base text-gray-900 dark:text-white">
                        {currentLang() === 'ne' ? 'थर्मल प्रिन्टर तथा हार्डवेयर' : 'Thermal Printer & POS Hardware'}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-neutral-400">
                        Configure counter receipt roll paper width and layout formatting
                      </p>
                    </div>
                  </div>

                  <span class="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 px-3 py-1 rounded-full font-bold uppercase border border-teal-200">
                    ESC/POS Ready
                  </span>
                </div>

                {/* Thermal paper width interactive visual cards */}
                <div class="space-y-3">
                  <label class="block text-xs font-bold text-gray-800 dark:text-neutral-200">
                    Thermal Paper Width Selector
                  </label>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 58mm Card */}
                    <div
                      onClick={() => {
                        setSettings((draft) => { draft.thermalPrinterWidth = '58mm'; });
                        persistState();
                      }}
                      class={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                        settings.thermalPrinterWidth === '58mm'
                          ? 'border-[#FF4500] bg-orange-50/50 dark:bg-orange-950/40 shadow-md shadow-orange-500/10'
                          : 'border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-gray-300'
                      }`}
                    >
                      <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 flex items-center justify-center font-bold text-xs">
                            58
                          </div>
                          <div>
                            <h4 class="font-bold text-xs text-gray-900 dark:text-white">58mm (2-inch Standard)</h4>
                            <span class="text-[10px] text-gray-400">Bluetooth / Handheld POS</span>
                          </div>
                        </div>
                        <Show when={settings.thermalPrinterWidth === '58mm'}>
                          <span class="w-5 h-5 rounded-full bg-[#FF4500] text-white flex items-center justify-center">
                            <IconCheck class="w-3 h-3" />
                          </span>
                        </Show>
                      </div>

                      <div class="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-dashed border-gray-300 dark:border-neutral-700 text-[10px] font-mono text-gray-600 dark:text-neutral-300">
                        <div>-------------------------</div>
                        <div class="font-bold text-center">BYAPAR RETAIL (58mm)</div>
                        <div>Item 1 x 2 .... रु 120</div>
                        <div>TOTAL: ....... रु 120</div>
                        <div>-------------------------</div>
                      </div>
                    </div>

                    {/* 80mm Card */}
                    <div
                      onClick={() => {
                        setSettings((draft) => { draft.thermalPrinterWidth = '80mm'; });
                        persistState();
                      }}
                      class={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                        settings.thermalPrinterWidth === '80mm'
                          ? 'border-[#FF4500] bg-orange-50/50 dark:bg-orange-950/40 shadow-md shadow-orange-500/10'
                          : 'border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-gray-300'
                      }`}
                    >
                      <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 flex items-center justify-center font-bold text-xs">
                            80
                          </div>
                          <div>
                            <h4 class="font-bold text-xs text-gray-900 dark:text-white">80mm (3-inch Wide)</h4>
                            <span class="text-[10px] text-gray-400">Desktop USB / LAN Thermal</span>
                          </div>
                        </div>
                        <Show when={settings.thermalPrinterWidth === '80mm'}>
                          <span class="w-5 h-5 rounded-full bg-[#FF4500] text-white flex items-center justify-center">
                            <IconCheck class="w-3 h-3" />
                          </span>
                        </Show>
                      </div>

                      <div class="p-2.5 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-dashed border-gray-300 dark:border-neutral-700 text-[10px] font-mono text-gray-600 dark:text-neutral-300">
                        <div>-----------------------------------</div>
                        <div class="font-bold text-center">BYAPAR SUPERMARKET (80mm WIDE)</div>
                        <div>Wai Wai Noodle x 5 @ 25 ..... रु 125</div>
                        <div>NET PAYABLE: ................ रु 125</div>
                        <div>-----------------------------------</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* =========================================================
                TAB 6: PREFERENCES
                ========================================================= */}
            <Show when={activeSettingsTab() === 'preferences'}>
              <div class="space-y-6 relative z-10 animate-fade-in">
                {/* Header */}
                <div class="flex items-center justify-between pb-4 border-b border-orange-100 dark:border-orange-950/60">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
                      <IconGlobe class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-heading font-black text-base text-gray-900 dark:text-white">
                        {currentLang() === 'ne' ? 'भाषा तथा क्षेत्रीय प्राथमिकता' : 'Language & Regional Locales'}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-neutral-400">
                        Choose your calendar system (BS/AD) and user interface language
                      </p>
                    </div>
                  </div>

                  <span class="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 px-3 py-1 rounded-full font-bold uppercase border border-purple-200">
                    Bilingual
                  </span>
                </div>

                {/* Calendar System Interactive Cards */}
                <div class="space-y-3">
                  <label class="block text-xs font-bold text-gray-800 dark:text-neutral-200">
                    Calendar System (पात्रो प्रणाली)
                  </label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setCalendarPref('BS')}
                      class={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        settings.calendar === 'BS'
                          ? 'border-[#FF4500] bg-orange-50/50 dark:bg-orange-950/40 shadow-sm'
                          : 'border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-gray-300'
                      }`}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 flex items-center justify-center font-bold text-xs">
                            वि.सं.
                          </div>
                          <div>
                            <h4 class="font-bold text-xs text-gray-900 dark:text-white">Bikram Sambat (वि.सं.)</h4>
                            <p class="text-[11px] text-gray-400">Nepali official calendar format</p>
                          </div>
                        </div>
                        <Show when={settings.calendar === 'BS'}>
                          <span class="w-5 h-5 rounded-full bg-[#FF4500] text-white flex items-center justify-center">
                            <IconCheck class="w-3 h-3" />
                          </span>
                        </Show>
                      </div>
                    </div>

                    <div
                      onClick={() => setCalendarPref('AD')}
                      class={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        settings.calendar === 'AD'
                          ? 'border-[#FF4500] bg-orange-50/50 dark:bg-orange-950/40 shadow-sm'
                          : 'border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-gray-300'
                      }`}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 flex items-center justify-center font-bold text-xs">
                            AD
                          </div>
                          <div>
                            <h4 class="font-bold text-xs text-gray-900 dark:text-white">Gregorian (ई.सं.)</h4>
                            <p class="text-[11px] text-gray-400">Standard international calendar</p>
                          </div>
                        </div>
                        <Show when={settings.calendar === 'AD'}>
                          <span class="w-5 h-5 rounded-full bg-[#FF4500] text-white flex items-center justify-center">
                            <IconCheck class="w-3 h-3" />
                          </span>
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Application Language Interactive Cards */}
                <div class="space-y-3 pt-2">
                  <label class="block text-xs font-bold text-gray-800 dark:text-neutral-200">
                    Application Language (भाषा)
                  </label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setLanguagePref('ne')}
                      class={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        settings.lang === 'ne'
                          ? 'border-[#FF4500] bg-orange-50/50 dark:bg-orange-950/40 shadow-sm'
                          : 'border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-gray-300'
                      }`}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-xl bg-red-100 text-red-600 dark:bg-red-950 flex items-center justify-center font-bold text-xs">
                            ने
                          </div>
                          <div>
                            <h4 class="font-bold text-xs text-gray-900 dark:text-white">नेपाली (Nepali)</h4>
                            <p class="text-[11px] text-gray-400">पूर्ण नेपाली भाषा इन्टरफेस</p>
                          </div>
                        </div>
                        <Show when={settings.lang === 'ne'}>
                          <span class="w-5 h-5 rounded-full bg-[#FF4500] text-white flex items-center justify-center">
                            <IconCheck class="w-3 h-3" />
                          </span>
                        </Show>
                      </div>
                    </div>

                    <div
                      onClick={() => setLanguagePref('en')}
                      class={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        settings.lang === 'en'
                          ? 'border-[#FF4500] bg-orange-50/50 dark:bg-orange-950/40 shadow-sm'
                          : 'border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-gray-300'
                      }`}
                    >
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 flex items-center justify-center font-bold text-xs">
                            EN
                          </div>
                          <div>
                            <h4 class="font-bold text-xs text-gray-900 dark:text-white">English</h4>
                            <p class="text-[11px] text-gray-400">English retail terminology</p>
                          </div>
                        </div>
                        <Show when={settings.lang === 'en'}>
                          <span class="w-5 h-5 rounded-full bg-[#FF4500] text-white flex items-center justify-center">
                            <IconCheck class="w-3 h-3" />
                          </span>
                        </Show>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Show>

            {/* =========================================================
                TAB 7: SECURITY & CLOUD
                ========================================================= */}
            <Show when={activeSettingsTab() === 'security'}>
              <div class="space-y-6 relative z-10 animate-fade-in">
                {/* Header */}
                <div class="flex items-center justify-between pb-4 border-b border-orange-100 dark:border-orange-950/60">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF4500] to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                      <IconShield class="w-5 h-5" />
                    </div>
                    <div>
                      <h3 class="font-heading font-black text-base text-gray-900 dark:text-white">
                        {currentLang() === 'ne' ? 'सुरक्षा तथा क्लाउड ब्याकअप' : 'Account Security & Cloud Sync'}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-neutral-400">
                        Manage your authenticated session, password credentials, and multi-device backup
                      </p>
                    </div>
                  </div>

                  <span class="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-3 py-1 rounded-full font-bold uppercase border border-emerald-200 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-Time Sync</span>
                  </span>
                </div>

                <div class="space-y-4">
                  {/* Cloud status card */}
                  <div class="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-200 dark:border-neutral-800 flex items-center justify-between">
                    <div class="flex items-center gap-3.5">
                      <div class="w-10 h-10 rounded-xl bg-orange-100 text-[#FF4500] dark:bg-orange-950/60 flex items-center justify-center">
                        <IconCloud class="w-5 h-5" />
                      </div>
                      <div>
                        <h4 class="font-bold text-xs text-gray-900 dark:text-white">Cloud Multi-Device Sync</h4>
                        <p class="text-[11px] text-gray-500 dark:text-neutral-400 mt-0.5">
                          {currentUser() ? 'Authenticated & syncing across devices automatically' : 'Sign in to sync your kirana store data to cloud'}
                        </p>
                      </div>
                    </div>

                    <Show
                      when={currentUser()}
                      fallback={
                        <button
                          type="button"
                          onClick={() => setShowAuthModal(true)}
                          class="px-4 py-2 rounded-xl bg-[#FF4500] text-white text-xs font-bold shadow-xs hover:bg-[#E03E00] cursor-pointer"
                        >
                          Sign In
                        </button>
                      }
                    >
                      <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <IconCheck class="w-4 h-4" />
                        <span>Sync Active</span>
                      </span>
                    </Show>
                  </div>

                  {/* Password Card */}
                  <Show when={currentUser()}>
                    <div class="p-5 rounded-2xl bg-white/80 dark:bg-neutral-900/60 border border-orange-100 dark:border-neutral-800 flex items-center justify-between">
                      <div class="flex items-center gap-3.5">
                        <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 flex items-center justify-center">
                          <IconLock class="w-5 h-5" />
                        </div>
                        <div>
                          <h4 class="font-bold text-xs text-gray-900 dark:text-white">Account Password</h4>
                          <p class="text-[11px] text-gray-500 dark:text-neutral-400 mt-0.5">
                            Update your login credentials and master business encryption key
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowChangePasswordModal(true)}
                        class="px-4 py-2 rounded-xl bg-white dark:bg-neutral-800 border border-orange-200 dark:border-orange-800 text-xs font-bold text-[#FF4500] hover:bg-orange-50 dark:hover:bg-neutral-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <IconLock class="w-3.5 h-3.5" />
                        <span>Change Password</span>
                      </button>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>
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
