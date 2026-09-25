import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import {
  syncedNotifications,
  unreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  isNotificationLoading,
  sendBrowserNotification,
  requestPushPermission,
} from '../../services/notificationService';
import { currentBusiness, setActiveTab } from '../../db/localDb';
import type { AppNotification, NotificationType } from '@byapar/core';
import {
  IconBell,
  IconCheck,
  IconTrash,
  IconSettings,
  IconSearch,
  IconWhatsApp,
  IconSparkles,
  IconKhata,
  IconPurchase,
  IconInventory,
  IconShield,
  IconX,
} from '../icons';

export const NotificationsView: Component = () => {
  const [activeFilter, setActiveFilter] = createSignal<
    'all' | 'debtor_reminder' | 'supplier_payable' | 'low_stock' | 'system'
  >('all');
  const [searchQuery, setSearchQuery] = createSignal('');
  const [showSettingsModal, setShowSettingsModal] = createSignal(false);
  const [pushEnabled, setPushEnabled] = createSignal(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Filtered Notifications list
  const filteredList = createMemo(() => {
    let list = syncedNotifications();

    if (activeFilter() !== 'all') {
      if (activeFilter() === 'system') {
        list = list.filter((n) => n.type === 'system' || n.type === 'subscription_alert' || n.type === 'admin_broadcast');
      } else {
        list = list.filter((n) => n.type === activeFilter());
      }
    }

    const q = searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          (n.data?.partyName && n.data.partyName.toLowerCase().includes(q))
      );
    }

    return list;
  });

  const counts = createMemo(() => {
    const all = syncedNotifications();
    return {
      all: all.length,
      debtor: all.filter((n) => n.type === 'debtor_reminder').length,
      supplier: all.filter((n) => n.type === 'supplier_payable').length,
      stock: all.filter((n) => n.type === 'low_stock').length,
      system: all.filter((n) => n.type === 'system' || n.type === 'subscription_alert' || n.type === 'admin_broadcast').length,
      unread: all.filter((n) => !n.isRead).length,
    };
  });

  const handleTogglePush = async () => {
    const granted = await requestPushPermission();
    setPushEnabled(granted);
    if (granted) {
      sendBrowserNotification('Notifications Enabled', {
        body: 'You will now receive instant push alerts for Udhar dues and supplier payments!',
      });
    }
  };

  const handleSendWhatsApp = (n: AppNotification) => {
    const phone = n.data?.partyPhone;
    const name = n.data?.partyName || 'Customer';
    const amount = n.data?.amount ? `Rs. ${n.data.amount.toLocaleString()}` : 'outstanding amount';
    const shopName = currentBusiness.name || 'Byapar';

    const text = encodeURIComponent(
      `Namaste ${name} ji,\nThis is a polite reminder from ${shopName} regarding your pending balance of ${amount}. Kindly clear the due at your earliest convenience.\nThank you!`
    );

    const cleanPhone = phone?.replace(/\D/g, '') || '';
    const targetUrl = cleanPhone
      ? `https://wa.me/977${cleanPhone.length === 10 ? cleanPhone : cleanPhone.slice(-10)}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(targetUrl, '_blank');
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div class="p-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-brand-600">
              <IconBell class="w-5 h-5" />
            </div>
            <div>
              <h1 class="text-2xl font-heading font-black text-gray-900 dark:text-white flex items-center gap-2">
                Notification Center
                <Show when={counts().unread > 0}>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white animate-pulse">
                    {counts().unread} Unread
                  </span>
                </Show>
              </h1>
              <p class="text-xs text-gray-500 dark:text-neutral-400">
                Real-time synchronized alerts across web and mobile devices
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto">
          <Show when={counts().unread > 0}>
            <button
              onClick={() => markAllNotificationsAsRead(currentBusiness.id)}
              class="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-900 text-xs font-semibold text-gray-700 dark:text-neutral-300 transition flex items-center gap-1.5"
            >
              <IconCheck class="w-3.5 h-3.5 text-emerald-500" />
              <span>Mark All Read</span>
            </button>
          </Show>

          <button
            onClick={() => setShowSettingsModal(true)}
            class="p-2 rounded-xl border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-900 text-gray-500 dark:text-neutral-400 transition"
            title="Notification Settings"
          >
            <IconSettings class="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Push Permission Callout if not granted */}
      <Show when={!pushEnabled()}>
        <div class="mb-6 p-4 rounded-2xl bg-gradient-to-r from-brand-500/10 via-emerald-500/10 to-transparent border border-brand-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0">
              <IconSparkles class="w-5 h-5" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-gray-900 dark:text-white">Enable Browser Push Notifications</h4>
              <p class="text-xs text-gray-600 dark:text-neutral-300">
                Receive instant alerts for debtor payment due dates and critical stock alerts even when this tab is closed.
              </p>
            </div>
          </div>
          <button
            onClick={handleTogglePush}
            class="btn-primary text-xs px-4 py-2 shrink-0 flex items-center gap-1.5 font-bold"
          >
            <IconBell class="w-3.5 h-3.5" />
            <span>Enable Push</span>
          </button>
        </div>
      </Show>

      {/* Tabs and Search Bar */}
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6 pb-2 border-b border-gray-200 dark:border-neutral-800">
        <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveFilter('all')}
            class={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeFilter() === 'all'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            All ({counts().all})
          </button>
          <button
            onClick={() => setActiveFilter('debtor_reminder')}
            class={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter() === 'debtor_reminder'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            <span class="w-2 h-2 rounded-full bg-rose-500" />
            <span>Khata Udhar ({counts().debtor})</span>
          </button>
          <button
            onClick={() => setActiveFilter('supplier_payable')}
            class={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter() === 'supplier_payable'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            <span class="w-2 h-2 rounded-full bg-blue-500" />
            <span>Suppliers ({counts().supplier})</span>
          </button>
          <button
            onClick={() => setActiveFilter('low_stock')}
            class={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter() === 'low_stock'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            <span class="w-2 h-2 rounded-full bg-amber-500" />
            <span>Low Stock ({counts().stock})</span>
          </button>
          <button
            onClick={() => setActiveFilter('system')}
            class={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeFilter() === 'system'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-900'
            }`}
          >
            <span class="w-2 h-2 rounded-full bg-purple-500" />
            <span>System & Plans ({counts().system})</span>
          </button>
        </div>

        <div class="relative w-full lg:w-64">
          <IconSearch class="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 text-gray-900 dark:text-white outline-none focus:border-brand-500 transition"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div class="space-y-3">
        <For
          each={filteredList()}
          fallback={
            <div class="p-12 text-center rounded-3xl border border-dashed border-gray-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50">
              <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-neutral-900 flex items-center justify-center text-gray-400 mx-auto mb-3">
                <IconBell class="w-8 h-8" />
              </div>
              <h3 class="text-sm font-bold text-gray-800 dark:text-neutral-200">All clear! No notifications found</h3>
              <p class="text-xs text-gray-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Payment due alerts, low inventory warnings, and system notices will appear here in real-time.
              </p>
            </div>
          }
        >
          {(n) => {
            const isUnread = !n.isRead;
            const isDebtor = n.type === 'debtor_reminder';
            const isSupplier = n.type === 'supplier_payable';
            const isStock = n.type === 'low_stock';
            const isSystem = n.type === 'system' || n.type === 'subscription_alert' || n.type === 'admin_broadcast';

            return (
              <div
                class={`p-4 rounded-2xl border transition-all duration-200 relative group ${
                  isUnread
                    ? 'bg-white dark:bg-neutral-950 border-brand-500/40 shadow-sm ring-1 ring-brand-500/10'
                    : 'bg-white/70 dark:bg-black/60 border-gray-100 dark:border-neutral-800/80 hover:border-gray-300 dark:hover:border-neutral-700'
                }`}
              >
                <div class="flex items-start justify-between gap-4">
                  {/* Icon & Category Indicator */}
                  <div class="flex items-start gap-3.5">
                    <div
                      class={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold ${
                        isDebtor
                          ? 'bg-rose-500 shadow-md shadow-rose-500/20'
                          : isSupplier
                          ? 'bg-blue-500 shadow-md shadow-blue-500/20'
                          : isStock
                          ? 'bg-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-purple-500 shadow-md shadow-purple-500/20'
                      }`}
                    >
                      <Show when={isDebtor}><IconKhata class="w-5 h-5" /></Show>
                      <Show when={isSupplier}><IconPurchase class="w-5 h-5" /></Show>
                      <Show when={isStock}><IconInventory class="w-5 h-5" /></Show>
                      <Show when={isSystem}><IconShield class="w-5 h-5" /></Show>
                    </div>

                    <div>
                      <div class="flex items-center gap-2 flex-wrap">
                        <span
                          class={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isDebtor
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : isSupplier
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : isStock
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                          }`}
                        >
                          {isDebtor
                            ? 'Udhar Due'
                            : isSupplier
                            ? 'Supplier Payable'
                            : isStock
                            ? 'Low Stock Alert'
                            : 'System Notice'}
                        </span>

                        <Show when={n.priority === 'urgent' || n.priority === 'high'}>
                          <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
                            Urgent
                          </span>
                        </Show>

                        <span class="text-[11px] text-gray-400 dark:text-neutral-500">
                          {formatRelativeTime(n.createdAt)}
                        </span>

                        <Show when={isUnread}>
                          <span class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                        </Show>
                      </div>

                      <h4 class="text-sm font-bold text-gray-900 dark:text-white mt-1">{n.title}</h4>
                      <p class="text-xs text-gray-600 dark:text-neutral-300 mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      {/* Action buttons inside card */}
                      <div class="flex items-center gap-2 mt-3 flex-wrap">
                        {/* Udhar specific actions */}
                        <Show when={isDebtor}>
                          <button
                            onClick={() => handleSendWhatsApp(n)}
                            class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <IconWhatsApp class="w-3.5 h-3.5" />
                            <span>Send WhatsApp</span>
                          </button>
                          <button
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              setActiveTab('khata');
                            }}
                            class="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-900 text-gray-700 dark:text-neutral-300 text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <IconKhata class="w-3.5 h-3.5" />
                            <span>Collect / Open Khata</span>
                          </button>
                        </Show>

                        {/* Supplier specific actions */}
                        <Show when={isSupplier}>
                          <button
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              setActiveTab('purchase');
                            }}
                            class="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <IconPurchase class="w-3.5 h-3.5" />
                            <span>Pay Supplier / View Bill</span>
                          </button>
                        </Show>

                        {/* Low stock specific actions */}
                        <Show when={isStock}>
                          <button
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              setActiveTab('inventory');
                            }}
                            class="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <IconInventory class="w-3.5 h-3.5" />
                            <span>Reorder Stock / Inventory</span>
                          </button>
                        </Show>

                        {/* Subscription actions */}
                        <Show when={n.type === 'subscription_alert'}>
                          <button
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              setActiveTab('settings');
                            }}
                            class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            <IconShield class="w-3.5 h-3.5" />
                            <span>Renew Subscription</span>
                          </button>
                        </Show>
                      </div>
                    </div>
                  </div>

                  {/* Actions on hover/right */}
                  <div class="flex items-center gap-1 shrink-0">
                    <Show when={isUnread}>
                      <button
                        onClick={() => markNotificationAsRead(n.id)}
                        class="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                        title="Mark as read"
                      >
                        <IconCheck class="w-4 h-4" />
                      </button>
                    </Show>
                    <button
                      onClick={() => deleteNotification(n.id)}
                      class="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete"
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>

      {/* Settings Modal */}
      <Show when={showSettingsModal()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div class="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div class="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-neutral-800">
              <h3 class="text-lg font-heading font-black text-gray-900 dark:text-white flex items-center gap-2">
                <IconSettings class="w-5 h-5 text-brand-500" />
                <span>Notification Preferences</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <IconX class="w-5 h-5" />
              </button>
            </div>

            <div class="py-4 space-y-4">
              <div class="flex items-center justify-between gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-neutral-950">
                <div>
                  <h4 class="text-xs font-bold text-gray-900 dark:text-white">Web Push Alerts</h4>
                  <p class="text-[11px] text-gray-500">Show desktop notifications for urgent reminders</p>
                </div>
                <button
                  onClick={handleTogglePush}
                  class={`w-12 h-6 rounded-full transition-colors relative ${
                    pushEnabled() ? 'bg-brand-600' : 'bg-gray-300 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    class={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      pushEnabled() ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <div class="flex items-center justify-between gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-neutral-950">
                <div>
                  <h4 class="text-xs font-bold text-gray-900 dark:text-white">Customer Udhar Reminders</h4>
                  <p class="text-[11px] text-gray-500">Daily alerts for borrowers who have crossed due date</p>
                </div>
                <span class="text-xs font-bold text-emerald-500">Active</span>
              </div>

              <div class="flex items-center justify-between gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-neutral-950">
                <div>
                  <h4 class="text-xs font-bold text-gray-900 dark:text-white">Supplier Purchase Payables</h4>
                  <p class="text-[11px] text-gray-500">Advance notices 2 days before payment to wholesaler is due</p>
                </div>
                <span class="text-xs font-bold text-emerald-500">Active</span>
              </div>

              <div class="flex items-center justify-between gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-neutral-950">
                <div>
                  <h4 class="text-xs font-bold text-gray-900 dark:text-white">Daily Evening Closing Digest</h4>
                  <p class="text-[11px] text-gray-500">Summary notification of today's sales and cash at 8:00 PM</p>
                </div>
                <span class="text-xs font-bold text-emerald-500">8:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};
