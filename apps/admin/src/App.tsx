import { Component, createSignal, Show, Switch, Match, onSettled } from 'solid-js';
import { currentAdmin, initAdminSession } from './services/adminAuth';
import { AdminSidebar, AdminTab } from './components/layout/AdminSidebar';
import { AdminTopBar } from './components/layout/AdminTopBar';
import { CommandPalette } from './components/CommandPalette';
import { AdminLoginView } from './views/AdminLoginView';
import { DashboardView } from './views/DashboardView';
import { ShopsView } from './views/ShopsView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { CampaignsView } from './views/CampaignsView';
import { AutomationsView } from './views/AutomationsView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';
import { AnalyticsView } from './views/AnalyticsView';
import { KhataOverview } from './views/KhataOverview';
import { UsersView } from './views/UsersView';
import { FeatureFlagsView } from './views/FeatureFlagsView';
import { PromoCodesView } from './views/PromoCodesView';
import { SupportTicketsView } from './views/SupportTicketsView';
import { SystemHealthView } from './views/SystemHealthView';
import { WebhooksView } from './views/WebhooksView';
import { MerchantBrandingView } from './views/MerchantBrandingView';
import { ComplianceExportsView } from './views/ComplianceExportsView';
import { AdminRolesView } from './views/AdminRolesView';
import { NewUsersLeadsView } from './views/NewUsersLeadsView';

export const App: Component = () => {
  const [activeTab, setActiveTab] = createSignal<AdminTab>('dashboard');
  const [refreshKey, setRefreshKey] = createSignal(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false);

  initAdminSession();

  const getTabTitle = () => {
    switch (activeTab()) {
      case 'dashboard':
        return { title: 'Platform Overview', subtitle: 'Real-time platform metrics and merchant activity' };
      case 'leads':
        return { title: 'Recent Signups & Client Leads', subtitle: 'Search, filter, and convert new retail signups into active clients' };
      case 'shops':
        return { title: 'Merchants & Tenant Directory', subtitle: 'Manage Kirana stores and subscription overrides' };
      case 'subscriptions':
        return { title: 'Subscriptions & Billing Hub', subtitle: 'Watchlist for renewals, expirations, and plan extensions' };
      case 'campaigns':
        return { title: 'Notification Campaigns', subtitle: 'Cross-platform broadcast manager to mobile and web' };
      case 'automations':
        return { title: 'Automation Triggers Engine', subtitle: 'Intelligent lifecycle, renewal, and retention bots' };
      case 'audit':
        return { title: 'System & Audit Logs', subtitle: 'Chronological activity stream of administrative events' };
      case 'settings':
        return { title: 'Firebase Push & Notifications', subtitle: 'Google Firebase project and direct push configuration' };
      case 'analytics':
        return { title: 'Revenue & Transaction Analytics', subtitle: 'Platform-wide invoice breakdown, payment modes, and trends' };
      case 'khata':
        return { title: 'Khata & Credit Risk Monitor', subtitle: 'Outstanding credit exposure, aging analysis, and top debtors' };
      case 'users':
        return { title: 'Users & Staff Analytics', subtitle: 'Platform user directory, role distribution, and staff insights' };
      case 'feature_flags':
        return { title: 'Enterprise Feature Flags', subtitle: 'Targeted feature rollouts, AI receipt scanner, and store overrides' };
      case 'promos':
        return { title: 'Coupons & Promo Engine', subtitle: 'Discount vouchers, seasonal promotions, and redemption analytics' };
      case 'tickets':
        return { title: 'Support & Helpdesk Desk', subtitle: 'Merchant inquiries, billing triage, and QR tickets' };
      case 'system_health':
        return { title: 'System & API Health Telemetry', subtitle: 'Live infrastructure pulse, database latency, and gateway SLA' };
      case 'webhooks':
        return { title: 'Webhooks & External Integrations', subtitle: 'Real-time store event streaming and ERP connectors' };
      case 'branding':
        return { title: 'White-Label Branding & Receipts', subtitle: 'Custom thermal printer templates, brand accents, and store slugs' };
      case 'compliance':
        return { title: 'Compliance & Tax Export Station', subtitle: 'IRD VAT registers, legal data archives, and audit packages' };
      case 'roles':
        return { title: 'Admin Team & Multi-Role RBAC', subtitle: 'Administrative access controls, role assignments, and permissions' };
      default:
        return { title: 'Admin Console', subtitle: 'Byapar Retail OS' };
    }
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // Global Ctrl+K handler
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen((v) => !v);
    }
  };

  onSettled(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  });

  return (
    <Show
      when={currentAdmin()}
      fallback={<AdminLoginView onSuccess={() => setActiveTab('dashboard')} />}
    >
      <div class="flex min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">
        {/* Left Sidebar */}
        <AdminSidebar activeTab={activeTab()} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <div class="flex-1 flex flex-col min-w-0">
          <AdminTopBar
            title={getTabTitle().title}
            subtitle={getTabTitle().subtitle}
            onRefresh={handleRefresh}
            onNavigateToCampaigns={() => setActiveTab('campaigns')}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />

          <main class="flex-1 overflow-y-auto">
            <Switch>
              <Match when={activeTab() === 'dashboard'}>
                <DashboardView onNavigate={(tab) => setActiveTab(tab)} />
              </Match>
              <Match when={activeTab() === 'leads'}>
                <NewUsersLeadsView />
              </Match>
              <Match when={activeTab() === 'shops'}>
                <ShopsView />
              </Match>
              <Match when={activeTab() === 'subscriptions'}>
                <SubscriptionsView />
              </Match>
              <Match when={activeTab() === 'campaigns'}>
                <CampaignsView />
              </Match>
              <Match when={activeTab() === 'automations'}>
                <AutomationsView />
              </Match>
              <Match when={activeTab() === 'audit'}>
                <AuditLogsView />
              </Match>
              <Match when={activeTab() === 'settings'}>
                <SettingsView />
              </Match>
              <Match when={activeTab() === 'analytics'}>
                <AnalyticsView />
              </Match>
              <Match when={activeTab() === 'khata'}>
                <KhataOverview />
              </Match>
              <Match when={activeTab() === 'users'}>
                <UsersView onNavigate={(tab) => setActiveTab(tab as AdminTab)} />
              </Match>
              <Match when={activeTab() === 'feature_flags'}>
                <FeatureFlagsView />
              </Match>
              <Match when={activeTab() === 'promos'}>
                <PromoCodesView />
              </Match>
              <Match when={activeTab() === 'tickets'}>
                <SupportTicketsView />
              </Match>
              <Match when={activeTab() === 'system_health'}>
                <SystemHealthView />
              </Match>
              <Match when={activeTab() === 'webhooks'}>
                <WebhooksView />
              </Match>
              <Match when={activeTab() === 'branding'}>
                <MerchantBrandingView />
              </Match>
              <Match when={activeTab() === 'compliance'}>
                <ComplianceExportsView />
              </Match>
              <Match when={activeTab() === 'roles'}>
                <AdminRolesView />
              </Match>
            </Switch>
          </main>
        </div>

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen()}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      </div>
    </Show>
  );
};

export default App;
