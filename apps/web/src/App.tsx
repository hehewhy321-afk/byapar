import { Component, Switch, Match, onSettled, createSignal, Show, For } from 'solid-js';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/views/DashboardView';
import { NotificationsView } from './components/views/NotificationsView';
import { RemindersView } from './components/views/RemindersView';
import { initNotificationSync } from './services/notificationService';
import { initOfflineSync } from './services/offlineSyncService';
import { ExpenseIncomeView } from './components/views/ExpenseIncomeView';
import { AccountsView } from './components/views/AccountsView';
import { SettingsView } from './components/views/SettingsView';
import { BillGalleryView } from './components/views/BillGalleryView';
import { NotebookView } from './components/views/NotebookView';
import { BusinessCardView } from './components/views/BusinessCardView';
import { SalesView } from './components/views/SalesView';
import { PurchaseView } from './components/views/PurchaseView';
import { StaffView } from './components/views/StaffView';
import { PosView } from './components/PosView';
import { KhataView } from './components/KhataView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { UtilitiesView } from './components/views/UtilitiesView';
import { HelpSupportModal } from './components/modals/HelpSupportModal';
import { TutorialsModal } from './components/modals/TutorialsModal';
import { WhatsNewModal } from './components/modals/WhatsNewModal';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { SubscriptionModal } from './components/modals/SubscriptionModal';
import { CreateStoreModal } from './components/modals/CreateStoreModal';
import { AuthModal } from './components/auth/AuthModal';
import { AuthPage } from './components/auth/AuthPage';
import { LandingPage } from './components/landing/LandingPage';
import { AboutPage } from './components/pages/AboutPage';
import { FaqPage } from './components/pages/FaqPage';
import { LegalPage } from './components/pages/LegalPage';
import { PricingPage } from './components/pages/PricingPage';
import { currentUser } from './db/auth';
import { activeTab, setActiveTab, currentBusiness, currentPage, toggleSidebar, toggleDarkMode } from './db/localDb';
import {
  IconDashboard,
  IconSales,
  IconPurchase,
  IconStaff,
  IconKhata,
  IconPos,
  IconExpense,
  IconIncome,
  IconAccounts,
  IconInventory,
  IconReports,
  IconReminders,
  IconBillGallery,
  IconNotebook,
  IconBusinessCard,
  IconGreetingCards,
  IconSettings,
  IconSearch,
  IconMapPin,
  IconPhone,
  IconShield,
  IconWhatsApp,
  IconSparkles,
  IconParty,
  IconHeart,
  IconBell,
} from './components/icons';

export const App: Component = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false);
  const [commandSearch, setCommandSearch] = createSignal('');

  const commands = [
    { label: 'Dashboard', icon: IconDashboard, tab: 'dashboard', category: 'Navigation' },
    { label: 'Sales Management (Invoices, Quotations, Returns)', icon: IconSales, tab: 'sales', category: 'Sales' },
    { label: 'Purchase Management (Bills, Vendors, Returns)', icon: IconPurchase, tab: 'purchase', category: 'Purchase' },
    { label: 'Parties / Khata (Ledger)', icon: IconKhata, tab: 'khata', category: 'Navigation' },
    { label: 'POS Billing (Cash Register)', icon: IconPos, tab: 'pos', category: 'Sales' },
    { label: 'Manage Staff & Permissions', icon: IconStaff, tab: 'staff', category: 'Administration' },
    { label: 'Record New Expense', icon: IconExpense, tab: 'expense', category: 'Finance' },
    { label: 'Record Other Income', icon: IconIncome, tab: 'income', category: 'Finance' },
    { label: 'Manage Accounts (Cash & Bank)', icon: IconAccounts, tab: 'accounts', category: 'Finance' },
    { label: 'Product Inventory & Stock', icon: IconInventory, tab: 'inventory', category: 'Inventory' },
    { label: 'Reports & CBMS Invoices', icon: IconReports, tab: 'reports', category: 'Reports' },
    { label: 'Payment Reminders', icon: IconReminders, tab: 'reminders', category: 'Tools' },
    { label: 'Notifications & Alerts Center', icon: IconBell, tab: 'notifications', category: 'Tools' },
    { label: 'Bill Gallery & Uploads', icon: IconBillGallery, tab: 'bill-gallery', category: 'Tools' },
    { label: 'Notebook & Business Scratchpad', icon: IconNotebook, tab: 'notebook', category: 'Tools' },
    { label: 'Business Digital Cards', icon: IconBusinessCard, tab: 'business-cards', category: 'Tools' },
    { label: 'Customer Greeting Cards', icon: IconGreetingCards, tab: 'greeting-cards', category: 'Tools' },
    { label: 'Store Settings & Hardware', icon: IconSettings, tab: 'settings', category: 'Preferences' },
  ];

  const filteredCommands = () => {
    const q = commandSearch().toLowerCase().trim();
    if (!q) return commands;
    return commands.filter(c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
  };

  // Global Keyboard Shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl + K for command palette
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(true);
    }
    // Ctrl + B for sidebar toggle
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    // Ctrl + D for dark mode toggle
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggleDarkMode();
    }
    if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
    if (e.key === 'F1') { e.preventDefault(); setActiveTab('dashboard'); }
    if (e.key === 'F2') { e.preventDefault(); setActiveTab('pos'); }
    if (e.key === 'F3') { e.preventDefault(); setActiveTab('khata'); }
    if (e.key === 'F4') { e.preventDefault(); setActiveTab('inventory'); }
    if (e.key === 'F6') { e.preventDefault(); setActiveTab('reports'); }
  };

  onSettled(() => {
    window.addEventListener('keydown', handleKeyDown);

    // Initialize Synced Realtime Notifications
    if (currentBusiness.id) {
      initNotificationSync(currentBusiness.id);
    }

    // Initialize Offline Resilience and Outbox Sync Queue
    initOfflineSync();

    // Clean up Supabase Auth tokens from URL after email verification redirect
    if (typeof window !== 'undefined') {
      const href = window.location.href;
      if (href.includes('type=signup') || href.includes('access_token=')) {
        setTimeout(() => {
          if (window.location.hash.includes('access_token') || window.location.hash.includes('type=')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }, 1000);
      }
    }

    // Handle eSewa Callback if returning from payment gateway
    (async () => {
      try {
        const fullHref = window.location.href;
        const isEsewaSuccess = fullHref.includes('payment=esewa_success') || fullHref.includes('status=COMPLETE');
        const isEsewaFailure = fullHref.includes('payment=esewa_failure') || fullHref.includes('status=CANCELED') || fullHref.includes('status=CANCELLED');

        if (!isEsewaSuccess && !isEsewaFailure) return;

        // Extract base64 'data' parameter from query string or URL
        let encodedData: string | null = null;
        const dataMatch = fullHref.match(/[?&]data=([^&#]+)/);
        if (dataMatch && dataMatch[1]) {
          encodedData = decodeURIComponent(dataMatch[1]);
        }

        // Also extract transaction UUID if present in URL
        let transactionUuid: string | undefined = undefined;
        const uuidMatch = fullHref.match(/[?&]transaction_uuid=([^&#]+)/);
        if (uuidMatch && uuidMatch[1]) {
          transactionUuid = decodeURIComponent(uuidMatch[1]);
        }

        if (isEsewaSuccess && (encodedData || transactionUuid)) {
          const { verifyAndHandleEsewaResponse } = await import('./services/subscriptionService');
          const verifyRes = await verifyAndHandleEsewaResponse({
            encodedData: encodedData || undefined,
            transactionUuid,
            businessId: currentBusiness.id,
          });

          window.history.replaceState({}, '', window.location.pathname);

          if (verifyRes.success) {
            alert(`🎉 Payment Verified Successfully!\n${verifyRes.message}\nYour subscription tier is now active.`);
            // Reload window to re-hydrate all features & limits
            window.location.reload();
          } else {
            alert(`eSewa Verification Notice: ${verifyRes.message}`);
          }
        } else if (isEsewaFailure) {
          const { cancelEsewaPayment } = await import('./services/subscriptionService');
          await cancelEsewaPayment(transactionUuid, 'User cancelled on eSewa gateway');

          window.history.replaceState({}, '', window.location.pathname);
          alert('ℹ️ eSewa transaction was cancelled. No charges were made.');
        }
      } catch (cbErr) {
        console.error('eSewa callback handling notice:', cbErr);
      }
    })();

    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <Show
      when={currentUser()}
      fallback={
        <Switch fallback={<LandingPage />}>
          <Match when={currentPage() === 'landing'}>
            <LandingPage />
          </Match>
          <Match when={currentPage() === 'auth'}>
            <AuthPage />
          </Match>
          <Match when={currentPage() === 'about'}>
            <AboutPage />
          </Match>
          <Match when={currentPage() === 'faq'}>
            <FaqPage />
          </Match>
          <Match when={currentPage() === 'pricing'}>
            <PricingPage />
          </Match>
          <Match when={currentPage() === 'privacy'}>
            <LegalPage type="privacy" />
          </Match>
          <Match when={currentPage() === 'terms'}>
            <LegalPage type="terms" />
          </Match>
        </Switch>
      }
    >
      <div class="flex h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white font-sans overflow-hidden transition-colors">
        {/* Left Sidebar (Desktop Rail + Mobile Drawer) */}
        <Sidebar />

      {/* Main Content Area */}
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <main class="flex-1 overflow-y-auto bg-gray-50 dark:bg-black transition-colors p-10">
          <Switch>
            <Match when={activeTab() === 'dashboard'}>
              <DashboardView />
            </Match>
            <Match when={activeTab() === 'sales'}>
              <SalesView />
            </Match>
            <Match when={activeTab() === 'purchase'}>
              <PurchaseView />
            </Match>
            <Match when={activeTab() === 'staff'}>
              <StaffView />
            </Match>
            <Match when={activeTab() === 'pos'}>
              <PosView />
            </Match>
            <Match when={activeTab() === 'khata'}>
              <KhataView />
            </Match>
            <Match when={activeTab() === 'inventory'}>
              <InventoryView />
            </Match>
            <Match when={activeTab() === 'reports'}>
              <ReportsView />
            </Match>
            <Match when={activeTab() === 'expense'}>
              <ExpenseIncomeView type="expense" />
            </Match>
            <Match when={activeTab() === 'income'}>
              <ExpenseIncomeView type="income" />
            </Match>
            <Match when={activeTab() === 'accounts'}>
              <AccountsView />
            </Match>
            <Match when={activeTab() === 'reminders'}>
              <RemindersView />
            </Match>
            <Match when={activeTab() === 'notifications'}>
              <NotificationsView />
            </Match>
            <Match when={activeTab() === 'bill-gallery'}>
              <BillGalleryView />
            </Match>
            <Match when={activeTab() === 'notebook'}>
              <NotebookView />
            </Match>
            <Match when={activeTab() === 'settings'}>
              <SettingsView />
            </Match>
            <Match when={activeTab() === 'business-cards'}>
              <BusinessCardView />
            </Match>
            <Match when={activeTab() === 'utilities'}>
              <UtilitiesView />
            </Match>
            <Match when={activeTab() === 'greeting-cards'}>
              <div class="p-6 animate-fade-in max-w-4xl">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-3">
                    <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">
                      Festival & Greeting Cards
                    </h1>
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  <div class="stat-card bg-gradient-to-br from-amber-600 via-orange-600 to-black text-white !p-5 flex flex-col justify-between h-48 rounded-2xl border border-amber-500/30">
                    <div>
                      <div class="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-amber-200">
                        <IconSparkles class="w-3.5 h-3.5" />
                        <span>Festival Special</span>
                      </div>
                      <h3 class="text-base font-bold mt-1">Bijaya Dashami Subhakamana</h3>
                      <p class="text-xs text-amber-100 mt-2">Warm wishes from {currentBusiness.name}!</p>
                    </div>
                    <button class="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-1.5 px-3 rounded-lg backdrop-blur-sm self-start">
                      Send to Customers
                    </button>
                  </div>
                  <div class="stat-card bg-gradient-to-br from-emerald-600 via-teal-700 to-black text-white !p-5 flex flex-col justify-between h-48 rounded-2xl border border-emerald-500/30">
                    <div>
                      <div class="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-emerald-200">
                        <IconParty class="w-3.5 h-3.5" />
                        <span>Festive Season</span>
                      </div>
                      <h3 class="text-base font-bold mt-1">Deepawali & Tihar</h3>
                      <p class="text-xs text-emerald-100 mt-2">Special festival discounts available!</p>
                    </div>
                    <button class="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-1.5 px-3 rounded-lg backdrop-blur-sm self-start">
                      Send to Customers
                    </button>
                  </div>
                  <div class="stat-card bg-gradient-to-br from-blue-700 via-indigo-800 to-black text-white !p-5 flex flex-col justify-between h-48 rounded-2xl border border-blue-500/30">
                    <div>
                      <div class="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-blue-200">
                        <IconHeart class="w-3.5 h-3.5" />
                        <span>Customer Appreciation</span>
                      </div>
                      <h3 class="text-base font-bold mt-1">Thank You For Shopping!</h3>
                      <p class="text-xs text-blue-100 mt-2">We appreciate your continued patronage.</p>
                    </div>
                    <button class="bg-white/20 hover:bg-white/30 text-white font-bold text-xs py-1.5 px-3 rounded-lg backdrop-blur-sm self-start">
                      Send to Customers
                    </button>
                  </div>
                </div>
              </div>
            </Match>
          </Switch>
        </main>
      </div>

      {/* Global Command Palette (Ctrl + K) */}
      <Show when={commandPaletteOpen()}>
        <div class="modal-overlay animate-fade-in" onClick={() => setCommandPaletteOpen(false)}>
          <div
            class="bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 w-full max-w-xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="p-3 border-b border-gray-100 dark:border-neutral-800 flex items-center gap-3">
              <IconSearch class="w-4 h-4 text-gray-400 dark:text-neutral-500 pl-0.5" />
              <input
                type="text"
                placeholder="Type a command or search feature..."
                value={commandSearch()}
                onInput={(e) => setCommandSearch(e.currentTarget.value)}
                class="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 outline-none"
                autofocus
              />
              <kbd class="px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-neutral-900 text-gray-500 dark:text-neutral-400 font-mono">
                ESC
              </kbd>
            </div>
            <div class="max-h-72 overflow-y-auto p-2 space-y-1">
              <For each={filteredCommands()}>
                {(cmd) => (
                  <button
                    class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900 text-left transition-colors"
                    onClick={() => {
                      setActiveTab(cmd.tab as any);
                      setCommandPaletteOpen(false);
                      setCommandSearch('');
                    }}
                  >
                    <div class="flex items-center gap-3">
                      <cmd.icon class="w-4 h-4 text-gray-500 dark:text-neutral-400 shrink-0" />
                      <span class="text-sm font-medium text-gray-800 dark:text-neutral-200">
                        {cmd.label}
                      </span>
                    </div>
                    <span class="text-[10px] uppercase font-bold text-gray-400 dark:text-neutral-500 bg-gray-100 dark:bg-neutral-900 px-2 py-0.5 rounded">
                      {cmd.category}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
      </Show>

      {/* Global Interactive Feature Modals */}
      <HelpSupportModal />
      <TutorialsModal />
      <WhatsNewModal />
      <KeyboardShortcutsModal />
      <ProfileModal />
      <ChangePasswordModal />
      <SubscriptionModal />
      <CreateStoreModal />
      <AuthModal />
    </div>
  </Show>
  );
};
