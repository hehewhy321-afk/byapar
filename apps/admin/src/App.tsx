import { Component, createSignal, Show, Switch, Match } from 'solid-js';
import { currentAdmin, initAdminSession } from './services/adminAuth';
import { AdminSidebar, AdminTab } from './components/layout/AdminSidebar';
import { AdminTopBar } from './components/layout/AdminTopBar';
import { AdminLoginView } from './views/AdminLoginView';
import { DashboardView } from './views/DashboardView';
import { ShopsView } from './views/ShopsView';
import { SubscriptionsView } from './views/SubscriptionsView';
import { CampaignsView } from './views/CampaignsView';
import { AutomationsView } from './views/AutomationsView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';

export const App: Component = () => {
  const [activeTab, setActiveTab] = createSignal<AdminTab>('dashboard');
  const [refreshKey, setRefreshKey] = createSignal(0);

  initAdminSession();

  const getTabTitle = () => {
    switch (activeTab()) {
      case 'dashboard':
        return { title: 'Platform Overview', subtitle: 'Real-time platform metrics and merchant activity' };
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
      default:
        return { title: 'Admin Console', subtitle: 'Byapar Retail OS' };
    }
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

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
          />

          <main class="flex-1 overflow-y-auto">
            <Switch>
              <Match when={activeTab() === 'dashboard'}>
                <DashboardView onNavigate={(tab) => setActiveTab(tab)} />
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
            </Switch>
          </main>
        </div>
      </div>
    </Show>
  );
};

export default App;
