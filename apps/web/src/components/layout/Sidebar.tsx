import { Component, createSignal, Show, For } from 'solid-js';
import {
  activeTab,
  setActiveTab,
  currentBusiness,
  type ActiveTab,
  isSidebarCollapsed,
  toggleSidebar,
  isMobileSidebarOpen,
  closeMobileSidebar,
  setShowHelpModal,
  setShowTutorialsModal,
  setShowWhatsNewModal,
} from '../../db/localDb';
import {
  IconDashboard,
  IconKhata,
  IconExpense,
  IconIncome,
  IconAccounts,
  IconPos,
  IconInventory,
  IconReports,
  IconGift,
  IconTools,
  IconHelp,
  IconPlay,
  IconSparkles,
  IconSettings,
  IconMenu,
  IconChevronDown,
  IconX,
  IconBusinessCard,
  IconGreetingCards,
  IconReminders,
  IconBillGallery,
  IconNotebook,
  IconSales,
  IconPurchase,
  IconStaff,
} from '../icons';

interface NavItemProps {
  icon: Component<{ class?: string }>;
  label: string;
  tab: ActiveTab;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

const NavItem: Component<NavItemProps> = (props) => {
  return (
    <button
      class={`nav-item w-full ${activeTab() === props.tab ? 'active' : ''} ${
        props.isCollapsed ? 'justify-center !px-0' : ''
      }`}
      title={props.isCollapsed ? props.label : undefined}
      onClick={() => {
        setActiveTab(props.tab);
        if (props.onNavigate) props.onNavigate();
      }}
    >
      <props.icon class="w-[18px] h-[18px] shrink-0" />
      <Show when={!props.isCollapsed}>
        <span class="truncate">{props.label}</span>
      </Show>
    </button>
  );
};

export const Sidebar: Component = () => {
  const [toolsOpen, setToolsOpen] = createSignal(false);
  const [collapsedToolsOpen, setCollapsedToolsOpen] = createSignal(false);

  const storeInitials = () =>
    (currentBusiness.name || 'Y')
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .substring(0, 1)
      .toUpperCase();

  const usefulTools = [
    { label: 'Business Cards', tab: 'business-cards' as ActiveTab, icon: IconBusinessCard },
    { label: 'Greeting Cards', tab: 'greeting-cards' as ActiveTab, icon: IconGreetingCards },
    { label: 'Reminders', tab: 'reminders' as ActiveTab, icon: IconReminders },
    { label: 'Notebook', tab: 'notebook' as ActiveTab, icon: IconNotebook },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      <Show when={isMobileSidebarOpen()}>
        <div
          class="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={closeMobileSidebar}
        />
      </Show>

      {/* Main Sidebar: Desktop Static + Mobile Drawer */}
      <aside
        class={`h-screen bg-white dark:bg-black border-r border-gray-200 dark:border-neutral-800 flex flex-col overflow-hidden select-none transition-all duration-200 z-50 ${
          isMobileSidebarOpen()
            ? 'fixed inset-y-0 left-0 w-[260px] shadow-2xl animate-slide-in flex'
            : 'hidden lg:flex'
        } ${
          isSidebarCollapsed() ? 'lg:w-[68px] lg:min-w-[68px]' : 'lg:w-[230px] lg:min-w-[230px]'
        }`}
      >
        {/* Brand Header */}
        <div class="px-3.5 py-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                <span class="text-white font-bold text-xs tracking-wider">BY</span>
              </div>
              <Show when={!isSidebarCollapsed() || isMobileSidebarOpen()}>
                <span class="font-heading font-bold text-lg text-gray-900 dark:text-white tracking-tight truncate">
                  Byapar
                </span>
              </Show>
            </div>
            {/* Collapse button on Desktop / Close button on Mobile */}
            <div class="flex items-center">
              <button
                class="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg"
                onClick={closeMobileSidebar}
              >
                <IconX class="w-5 h-5" />
              </button>
              <button
                class="hidden lg:block text-gray-400 hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors"
                title={isSidebarCollapsed() ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
                onClick={toggleSidebar}
              >
                <IconMenu class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Business Switcher */}
        <div class="px-2.5 py-3 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <button
            class={`flex items-center rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-neutral-800 w-full ${
              isSidebarCollapsed() && !isMobileSidebarOpen() ? 'justify-center p-1.5' : 'gap-2.5 px-2 py-2'
            }`}
            title={currentBusiness.nameEn || currentBusiness.name}
          >
            <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
              {storeInitials()}
            </div>
            <Show when={!isSidebarCollapsed() || isMobileSidebarOpen()}>
              <span class="text-xs font-semibold text-gray-800 dark:text-neutral-200 truncate flex-1 text-left">
                {currentBusiness.nameEn || currentBusiness.name}
              </span>
              <IconChevronDown class="w-4 h-4 text-gray-400 shrink-0" />
            </Show>
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav class="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 relative">
          {/* Personal Section */}
          <Show when={!isSidebarCollapsed() || isMobileSidebarOpen()}>
            <div class="nav-section">Personal</div>
          </Show>
          <NavItem
            icon={IconDashboard}
            label="Dashboard"
            tab="dashboard"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconSales}
            label="Sales"
            tab="sales"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconPurchase}
            label="Purchase"
            tab="purchase"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconPos}
            label="POS Billing"
            tab="pos"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconKhata}
            label="Parties"
            tab="khata"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconInventory}
            label="Inventory"
            tab="inventory"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconBillGallery}
            label="Bill Gallery"
            tab="bill-gallery"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconExpense}
            label="Expenses"
            tab="expense"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconIncome}
            label="Income"
            tab="income"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconAccounts}
            label="Manage Accounts"
            tab="accounts"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconStaff}
            label="Manage Staff"
            tab="staff"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
          <NavItem
            icon={IconReports}
            label="Reports"
            tab="reports"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />

          {/* Others Section */}
          <Show when={!isSidebarCollapsed() || isMobileSidebarOpen()}>
            <div class="nav-section">Others</div>
          </Show>

          {/* Useful Tools - Collapsible / Flyout */}
          <Show
            when={!isSidebarCollapsed() || isMobileSidebarOpen()}
            fallback={
              <div class="relative">
                <button
                  class={`nav-item w-full justify-center !px-0 ${
                    usefulTools.some((t) => t.tab === activeTab()) ? 'active' : ''
                  }`}
                  title="Useful Tools"
                  onClick={() => setCollapsedToolsOpen(!collapsedToolsOpen())}
                >
                  <IconTools class="w-[18px] h-[18px] shrink-0" />
                </button>

                {/* Collapsed Popover Flyout */}
                <Show when={collapsedToolsOpen()}>
                  <div
                    class="fixed inset-0 z-40"
                    onClick={() => setCollapsedToolsOpen(false)}
                  />
                  <div class="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-black rounded-xl shadow-2xl border border-gray-200 dark:border-neutral-800 p-1.5 z-50 space-y-0.5 animate-fade-in">
                    <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500 border-b border-gray-100 dark:border-neutral-800 mb-1">
                      Useful Tools
                    </div>
                    <For each={usefulTools}>
                      {(tool) => (
                        <button
                          class={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                            activeTab() === tool.tab
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-900'
                          }`}
                          onClick={() => {
                            setActiveTab(tool.tab);
                            setCollapsedToolsOpen(false);
                          }}
                        >
                          <tool.icon class="w-4 h-4 shrink-0" />
                          <span>{tool.label}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            }
          >
            <button
              class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer w-full ${
                usefulTools.some((t) => t.tab === activeTab())
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-900 hover:text-gray-900 dark:hover:text-white'
              }`}
              onClick={() => setToolsOpen(!toolsOpen())}
            >
              <IconTools class="w-[18px] h-[18px] shrink-0" />
              <span class="flex-1 text-left truncate">Useful Tools</span>
              <IconChevronDown
                class={`w-4 h-4 transition-transform duration-200 ${toolsOpen() ? 'rotate-180' : ''}`}
              />
            </button>

            <Show when={toolsOpen()}>
              <div class="animate-fade-in pl-8 pr-1 py-1 space-y-0.5">
                <For each={usefulTools}>
                  {(tool) => (
                    <button
                      class={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                        activeTab() === tool.tab
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/40'
                          : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-900'
                      }`}
                      onClick={() => {
                        setActiveTab(tool.tab);
                        closeMobileSidebar();
                      }}
                    >
                      <tool.icon class="w-3.5 h-3.5 shrink-0 opacity-75" />
                      <span>{tool.label}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Show>

          <button
            class={`nav-item w-full ${isSidebarCollapsed() && !isMobileSidebarOpen() ? 'justify-center !px-0' : ''}`}
            title={isSidebarCollapsed() && !isMobileSidebarOpen() ? 'Help & Support' : undefined}
            onClick={() => {
              setShowHelpModal(true);
              closeMobileSidebar();
            }}
          >
            <IconHelp class="w-[18px] h-[18px] shrink-0" />
            <Show when={!isSidebarCollapsed() || isMobileSidebarOpen()}>
              <span>Help & Support</span>
            </Show>
          </button>

          <button
            class={`nav-item w-full ${isSidebarCollapsed() && !isMobileSidebarOpen() ? 'justify-center !px-0' : ''}`}
            title={isSidebarCollapsed() && !isMobileSidebarOpen() ? 'Tutorials' : undefined}
            onClick={() => {
              setShowTutorialsModal(true);
              closeMobileSidebar();
            }}
          >
            <IconPlay class="w-[18px] h-[18px] shrink-0" />
            <Show when={!isSidebarCollapsed() || isMobileSidebarOpen()}>
              <span>Tutorials</span>
            </Show>
          </button>

          <button
            class={`nav-item w-full ${isSidebarCollapsed() && !isMobileSidebarOpen() ? 'justify-center !px-0' : ''}`}
            title={isSidebarCollapsed() && !isMobileSidebarOpen() ? "What's New" : undefined}
            onClick={() => {
              setShowWhatsNewModal(true);
              closeMobileSidebar();
            }}
          >
            <IconSparkles class="w-[18px] h-[18px] shrink-0" />
            <Show when={!isSidebarCollapsed() || isMobileSidebarOpen()}>
              <span>What's New</span>
            </Show>
          </button>

          <NavItem
            icon={IconSettings}
            label="Settings"
            tab="settings"
            isCollapsed={isSidebarCollapsed() && !isMobileSidebarOpen()}
            onNavigate={closeMobileSidebar}
          />
        </nav>
      </aside>
    </>
  );
};
