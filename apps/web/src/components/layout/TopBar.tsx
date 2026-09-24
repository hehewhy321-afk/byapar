import { Component, createSignal, onSettled, Show, For } from 'solid-js';
import {
  currentBusiness,
  settings,
  setSettings,
  persistState,
  isDarkMode,
  toggleDarkMode,
  notifications,
  setShowProfileModal,
  setShowChangePasswordModal,
  setShowSubscriptionModal,
  setShowKeyboardShortcutsModal,
  setShowAuthModal,
  setActiveTab,
  toggleMobileSidebar,
} from '../../db/localDb';
import { currentUser, signOut } from '../../db/auth';
import {
  getBusinessSubscription,
  BusinessSubscriptionState,
} from '../../services/subscriptionService';
import {
  syncedNotifications,
  unreadNotificationCount,
  markNotificationAsRead,
} from '../../services/notificationService';
import {
  IconSearch,
  IconBell,
  IconSun,
  IconMoon,
  IconKeyboard,
  IconGlobe,
  IconUser,
  IconSparkles,
  IconLock,
  IconLogOut,
  IconMenu,
  IconChevronDown,
} from '../icons';

export const TopBar: Component = () => {
  const [searchFocused, setSearchFocused] = createSignal(false);
  const [profileOpen, setProfileOpen] = createSignal(false);
  const [notificationsOpen, setNotificationsOpen] = createSignal(false);
  const [sub, setSub] = createSignal<BusinessSubscriptionState | null>(null);

  onSettled(() => {
    (async () => {
      try {
        const s = await getBusinessSubscription(currentBusiness.id);
        setSub(s);
      } catch (e) {
        console.warn('Subscription fetch warning in TopBar:', e);
      }
    })();
  });

  const toggleLanguage = () => {
    setSettings((draft) => {
      draft.lang = draft.lang === 'ne' ? 'en' : 'ne';
    });
    persistState();
  };


  const userInitial = () => {
    const name = currentUser()?.name || currentBusiness.ownerName || currentBusiness.name || 'Y';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header class="sticky top-0 z-30 bg-white dark:bg-black border-b border-gray-200 dark:border-neutral-800 px-4 sm:px-6 py-2.5 transition-colors">
      <div class="flex items-center justify-between gap-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={toggleMobileSidebar}
          class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 text-gray-500 dark:text-neutral-300 transition lg:hidden"
          title="Open Menu"
        >
          <IconMenu class="w-5 h-5" />
        </button>

        {/* Search Bar (Centered layout) */}
        <div class="flex-1 flex justify-center max-w-2xl mx-auto">
          <div
            class={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border transition-all duration-150 w-full max-w-lg cursor-pointer ${
              searchFocused()
                ? 'border-brand-500 ring-2 ring-brand-500/20 bg-white dark:bg-black'
                : 'border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 hover:bg-white dark:hover:bg-black'
            }`}
            onClick={() => {
              // Trigger command palette keyboard event
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
            }}
          >
            <IconSearch class="w-4 h-4 text-gray-400 dark:text-neutral-500 shrink-0" />
            <input
              type="text"
              readonly
              placeholder={settings.lang === 'ne' ? 'सामान, खाता वा कारोबार खोज्नुहोस्...' : 'Search or create anything...'}
              class="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 outline-none cursor-pointer"
            />
            <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-gray-200 dark:border-neutral-800 bg-white dark:bg-black text-[10px] font-medium text-gray-400 dark:text-neutral-400">
              Ctrl + K
            </kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div class="flex items-center gap-1.5 shrink-0">
          {/* Language Switcher with Modern Globe Icon */}
          <button
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 text-gray-600 dark:text-neutral-300 transition-colors text-xs font-semibold"
            title={`Switch to ${settings.lang === 'ne' ? 'English' : 'Nepali'}`}
            onClick={toggleLanguage}
          >
            <IconGlobe class="w-4 h-4" />
            <span>{settings.lang === 'ne' ? 'नेपाली' : 'EN'}</span>
          </button>

          {/* Keyboard Shortcuts */}
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors text-gray-500 dark:text-neutral-400"
            title="Keyboard Shortcuts (Ctrl + K)"
            onClick={() => setShowKeyboardShortcutsModal(true)}
          >
            <IconKeyboard class="w-[18px] h-[18px]" />
          </button>

          {/* Notifications */}
          <div class="relative">
            <button
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors text-gray-500 dark:text-neutral-400 relative"
              title="Notifications"
              onClick={() => setNotificationsOpen(!notificationsOpen())}
            >
              <IconBell class="w-[18px] h-[18px]" />
              <Show when={unreadNotificationCount() > 0}>
                <span class="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                  {unreadNotificationCount() > 9 ? '9+' : unreadNotificationCount()}
                </span>
              </Show>
            </button>

            {/* Notifications Dropdown Panel */}
            <Show when={notificationsOpen()}>
              <div
                class="fixed inset-0 z-40"
                onClick={() => setNotificationsOpen(false)}
              />
              <div class="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 py-2 animate-fade-in z-50">
                <div class="px-4 py-2 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-white">
                      Alerts
                    </h4>
                    <Show when={unreadNotificationCount() > 0}>
                      <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                        {unreadNotificationCount()} unread
                      </span>
                    </Show>
                  </div>
                  <button
                    class="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:underline"
                    onClick={() => {
                      setNotificationsOpen(false);
                      setActiveTab('notifications');
                    }}
                  >
                    View All
                  </button>
                </div>

                <div class="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-neutral-900">
                  <For
                    each={syncedNotifications().slice(0, 5)}
                    fallback={
                      <div class="py-8 text-center text-xs text-gray-400 dark:text-neutral-500">
                        No notifications yet
                      </div>
                    }
                  >
                    {(n) => (
                      <div
                        class={`p-3 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition cursor-pointer ${
                          !n.isRead ? 'bg-brand-50/20 dark:bg-neutral-950' : ''
                        }`}
                        onClick={() => {
                          setNotificationsOpen(false);
                          markNotificationAsRead(n.id);
                          if (n.data?.linkScreen) {
                            setActiveTab(n.data.linkScreen as any);
                          } else if (n.type === 'debtor_reminder') {
                            setActiveTab('khata');
                          } else if (n.type === 'supplier_payable') {
                            setActiveTab('purchase');
                          } else if (n.type === 'low_stock') {
                            setActiveTab('inventory');
                          } else {
                            setActiveTab('notifications');
                          }
                        }}
                      >
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              n.type === 'low_stock'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                                : n.type === 'debtor_reminder'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                                : n.type === 'supplier_payable'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            }`}
                          >
                            {n.title}
                          </span>
                          <Show when={!n.isRead}>
                            <span class="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          </Show>
                        </div>
                        <p class="text-xs text-gray-700 dark:text-neutral-300 mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    )}
                  </For>
                </div>

                <div class="px-3 pt-2 border-t border-gray-100 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      setActiveTab('notifications');
                    }}
                    class="w-full py-1.5 rounded-xl bg-gray-50 dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-xs font-bold text-gray-700 dark:text-neutral-200 transition text-center"
                  >
                    Open Notification Center →
                  </button>
                </div>
              </div>
            </Show>
          </div>

          {/* Contrast / AMOLED Dark Mode Toggle */}
          <button
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors text-gray-600 dark:text-neutral-300"
            title={isDarkMode() ? 'Switch to Light Theme' : 'Switch to AMOLED Dark Theme (Ctrl + D)'}
            onClick={toggleDarkMode}
          >
            {isDarkMode() ? (
              <IconSun class="w-[18px] h-[18px] text-amber-400" />
            ) : (
              <IconMoon class="w-[18px] h-[18px] text-gray-600" />
            )}
          </button>

          {/* Subscription Tier Badge & Conditional Upgrade Button */}
          <div class="hidden sm:flex items-center gap-1.5 mr-1">
            <span
              class={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition ${
                sub()?.planTier === 'free'
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700'
                  : sub()?.planTier === 'starter_49'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : sub()?.planTier === 'pro_99'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
              }`}
            >
              {sub()?.planName || 'Free Tier'}
            </span>

            {/* Upgrade button only shown if user is on Free Tier */}
            <Show when={sub()?.planTier === 'free'}>
              <button
                type="button"
                onClick={() => setShowSubscriptionModal(true)}
                class="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#FF4500] to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 transition active:scale-95"
                title="Upgrade to unlock full limits"
              >
                <IconSparkles class="w-3 h-3" />
                <span>Upgrade</span>
              </button>
            </Show>
          </div>

          {/* User Profile Badge */}
          <div class="relative">
            <button
              class="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-900 transition-colors"
              onClick={() => setProfileOpen(!profileOpen())}
            >
              <div class="w-7 h-7 rounded-md bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {userInitial()}
              </div>
              <span class="text-xs font-medium text-gray-700 dark:text-neutral-200 hidden md:block truncate max-w-[140px]">
                {currentBusiness.ownerName || currentUser()?.name || currentBusiness.nameEn || currentBusiness.name}
              </span>
              <IconChevronDown class="w-3.5 h-3.5 text-gray-400 shrink-0" />
            </button>

            <Show when={profileOpen()}>
              <div
                class="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              />
              <div class="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 py-2 animate-fade-in z-50">
                <div class="px-3.5 py-2 border-b border-gray-100 dark:border-neutral-800">
                  <p class="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {currentBusiness.nameEn || currentBusiness.name || currentUser()?.businessName || 'My Store'}
                  </p>
                  <p class="text-[11px] text-gray-400 dark:text-neutral-500 truncate">
                    {currentBusiness.ownerName ? `Owner: ${currentBusiness.ownerName}` : (currentUser()?.email || (currentBusiness.pan ? 'PAN: ' + currentBusiness.pan : 'Store Profile'))}
                  </p>
                </div>

                <button
                  class="w-full text-left px-3.5 py-2 text-xs text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors flex items-center gap-2.5"
                  onClick={() => {
                    setProfileOpen(false);
                    setShowProfileModal(true);
                  }}
                >
                  <IconUser class="w-4 h-4 text-gray-400 dark:text-neutral-400" />
                  <span>Store Profile & Details</span>
                </button>

                <button
                  class="w-full text-left px-3.5 py-2 text-xs text-[#FF4500] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors flex items-center gap-2.5 font-semibold"
                  onClick={() => {
                    setProfileOpen(false);
                    setShowSubscriptionModal(true);
                  }}
                >
                  <IconSparkles class="w-4 h-4 text-[#FF4500]" />
                  <span>Subscription & Plans</span>
                </button>

                <button
                  class="w-full text-left px-3.5 py-2 text-xs text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors flex items-center gap-2.5"
                  onClick={() => {
                    setProfileOpen(false);
                    import('../../db/auth').then(({ setShowCreateStoreModal }) => setShowCreateStoreModal(true));
                  }}
                >
                  <span class="w-4 text-center font-bold text-sm leading-none text-emerald-600">+</span>
                  <span>Add New Store Branch</span>
                </button>

                <Show when={currentUser()}>
                  <button
                    class="w-full text-left px-3.5 py-2 text-xs text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors flex items-center gap-2.5"
                    onClick={() => {
                      setProfileOpen(false);
                      setShowChangePasswordModal(true);
                    }}
                  >
                    <IconLock class="w-4 h-4 text-[#FF4500]" />
                    <span>Change Password</span>
                  </button>

                  <button
                    class="w-full text-left px-3.5 py-2 text-xs text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors flex items-center gap-2.5"
                    onClick={() => {
                      setProfileOpen(false);
                      signOut();
                      setShowAuthModal(true);
                    }}
                  >
                    <IconUser class="w-4 h-4 text-brand-500" />
                    <span>Switch Account</span>
                  </button>
                </Show>

                <Show when={!currentUser()}>
                  <button
                    class="w-full text-left px-3.5 py-2 text-xs text-brand-600 dark:text-emerald-400 hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors flex items-center gap-2.5"
                    onClick={() => {
                      setProfileOpen(false);
                      setShowAuthModal(true);
                    }}
                  >
                    <IconLock class="w-4 h-4 text-emerald-500" />
                    <span>Sign In / Register</span>
                  </button>
                </Show>

                <Show when={currentUser()}>
                  <div class="border-t border-gray-100 dark:border-neutral-800 mt-1 pt-1">
                    <button
                      class="w-full text-left px-3.5 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors flex items-center gap-2.5"
                      onClick={() => {
                        setProfileOpen(false);
                        signOut();
                      }}
                    >
                      <IconLogOut class="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </header>
  );
};
