import { Component, Show } from 'solid-js';
import { currentAdmin, logoutAdmin } from '../../services/adminAuth';

export type AdminTab = 'dashboard' | 'shops' | 'subscriptions' | 'campaigns' | 'automations' | 'audit' | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

export const AdminSidebar: Component<AdminSidebarProps> = (props) => {
  const navItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Dashboard',
      icon: (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: 'shops' as AdminTab,
      label: 'Merchants & Shops',
      icon: (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'subscriptions' as AdminTab,
      label: 'Subscriptions',
      icon: (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: 'campaigns' as AdminTab,
      label: 'Notifications & Broadcasts',
      icon: (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: 'automations' as AdminTab,
      label: 'Automation Triggers',
      icon: (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'audit' as AdminTab,
      label: 'System Logs',
      icon: (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'settings' as AdminTab,
      label: 'Firebase & Push',
      icon: (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <aside class="w-[230px] min-w-[230px] bg-white border-r border-gray-200 flex flex-col justify-between h-screen sticky top-0 select-none z-30">
      <div>
        {/* Brand Header (Matches User Web Portal) */}
        <div class="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div class="flex items-center gap-2.5 overflow-hidden">
            <div class="w-8 h-8 rounded-lg bg-[#FF4500] flex items-center justify-center shadow-sm shrink-0">
              <span class="text-white font-bold text-xs tracking-wider font-heading">BY</span>
            </div>
            <div class="truncate">
              <div class="font-heading font-bold text-base text-gray-900 tracking-tight flex items-center gap-1.5">
                Byapar
                <span class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-orange-100 text-[#FF4500]">
                  Admin
                </span>
              </div>
              <p class="text-[10px] text-gray-400">Retail OS Control</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav class="p-2 space-y-1">
          <div class="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Management
          </div>
          {navItems.map((item) => {
            const isActive = () => props.activeTab === item.id;
            return (
              <button
                type="button"
                onClick={() => props.setActiveTab(item.id)}
                class={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                  isActive()
                    ? '!bg-[#FF4500] !text-white shadow-sm shadow-[#FF4500]/25'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span class={isActive() ? 'text-white' : 'text-gray-500'}>
                  {item.icon}
                </span>
                <span class="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div class="p-3 border-t border-gray-100 bg-gray-50/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full bg-orange-100 text-[#FF4500] font-bold text-xs flex items-center justify-center shrink-0">
              {currentAdmin()?.fullName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-gray-800 truncate">
                {currentAdmin()?.fullName || 'Platform Admin'}
              </p>
              <p class="text-[10px] text-gray-400 truncate">
                {currentAdmin()?.email || 'admin@byapar.com'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logoutAdmin()}
            title="Sign out"
            class="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};
