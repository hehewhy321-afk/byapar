import { Component, Switch, Match, onSettled, createSignal, Show, For } from 'solid-js';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DashboardView } from './components/views/DashboardView';
import { RemindersView } from './components/views/RemindersView';
import { ExpenseIncomeView } from './components/views/ExpenseIncomeView';
import { AccountsView } from './components/views/AccountsView';
import { SettingsView } from './components/views/SettingsView';
import { BillGalleryView } from './components/views/BillGalleryView';
import { NotebookView } from './components/views/NotebookView';
import { SalesView } from './components/views/SalesView';
import { PurchaseView } from './components/views/PurchaseView';
import { StaffView } from './components/views/StaffView';
import { PosView } from './components/PosView';
import { KhataView } from './components/KhataView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { HelpSupportModal } from './components/modals/HelpSupportModal';
import { TutorialsModal } from './components/modals/TutorialsModal';
import { WhatsNewModal } from './components/modals/WhatsNewModal';
import { KeyboardShortcutsModal } from './components/modals/KeyboardShortcutsModal';
import { ProfileModal } from './components/modals/ProfileModal';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { SubscriptionModal } from './components/modals/SubscriptionModal';
import { AuthModal } from './components/auth/AuthModal';
import { AuthPage } from './components/auth/AuthPage';
import { LandingPage } from './components/landing/LandingPage';
import { AboutPage } from './components/pages/AboutPage';
import { FaqPage } from './components/pages/FaqPage';
import { LegalPage } from './components/pages/LegalPage';
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
              <div class="p-6 animate-fade-in max-w-4xl">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-3">
                    <button
                      class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors text-gray-500"
                      onClick={() => setActiveTab('dashboard')}
                    >
                      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </button>
                    <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">
                      Digital Business Card
                    </h1>
                  </div>
                </div>
                {/* Business Card Preview */}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div class="bg-gradient-to-br from-emerald-800 via-emerald-900 to-black text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-emerald-700/40">
                    <div class="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
                    <div class="flex justify-between items-start mb-6">
                      <div>
                        <span class="text-[10px] uppercase font-bold tracking-widest text-emerald-300">
                          Official Store
                        </span>
                        <h2 class="text-xl font-bold font-heading mt-0.5">{currentBusiness.name}</h2>
                        <p class="text-xs text-emerald-200 mt-0.5">{currentBusiness.nameEn}</p>
                      </div>
                      <div class="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-base">
                        BY
                      </div>
                    </div>
                    <div class="space-y-2 text-xs text-emerald-100">
                      <div class="flex items-center gap-2">
                        <IconMapPin class="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span>{currentBusiness.address}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <IconPhone class="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span>+977 {currentBusiness.phone}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <IconShield class="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span>PAN: {currentBusiness.pan}</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-card space-y-3 !p-5">
                    <h3 class="font-bold text-sm text-gray-900 dark:text-white">Share Your Store Card</h3>
                    <p class="text-xs text-gray-500 dark:text-neutral-400 leading-relaxed">
                      Share your digital business card directly with customers via WhatsApp so they always have your store details, phone number, and payment information.
                    </p>
                    <div class="pt-2 flex gap-3">
                      <button
                        class="btn-primary text-xs flex-1 justify-center"
                        onClick={() => {
                          const text = encodeURIComponent(`*${currentBusiness.name}*\nLocation: ${currentBusiness.address}\nPhone: ${currentBusiness.phone}\nPAN/VAT: ${currentBusiness.pan}`);
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }}
                      >
                        <IconWhatsApp class="w-4 h-4 shrink-0" />
                        <span>Share on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Match>
            <Match when={activeTab() === 'greeting-cards'}>
              <div class="p-6 animate-fade-in max-w-4xl">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-3">
                    <button
                      class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors text-gray-500"
                      onClick={() => setActiveTab('dashboard')}
                    >
                      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                    </button>
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
      <AuthModal />
    </div>
  </Show>
  );
};
