import { Component, createSignal, Show, For } from 'solid-js';
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
              placeholder="Search or create anything..."
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
              <Show when={notifications().length > 0}>
                <span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </Show>
            </button>

            {/* Notifications Dropdown Panel */}
            <Show when={notificationsOpen()}>
              <div
                class="fixed inset-0 z-40"
                onClick={() => setNotificationsOpen(false)}
              />
              <div class="absolute right-0 top-full mt-1.5 w-80 bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-100 dark:border-neutral-800 py-2 animate-fade-in z-50">
                <div class="px-4 py-2 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-white">
                    Notifications ({notifications().length})
                  </h4>
                  <button
                    class="text-[10px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    Close
                  </button>
                </div>

                <div class="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-neutral-900">
                  <For
                    each={notifications()}
                    fallback={
                      <div class="py-8 text-center text-xs text-gray-400 dark:text-neutral-500">
                        No unread alerts
                      </div>
                    }
                  >
                    {(n) => (
                      <div
                        class="p-3 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition cursor-pointer"
                        onClick={() => {
                          setNotificationsOpen(false);
                          if (n.type === 'stock') setActiveTab('inventory');
                          if (n.type === 'khata') setActiveTab('khata');
                          if (n.type === 'cbms') setActiveTab('reports');
                        }}
                      >
                        <div class="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              n.type === 'stock'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 dark:border dark:border-amber-800/40'
                                : n.type === 'khata'
                                ? 'bg-red-100 text-red-800 dark:bg-rose-950/60 dark:text-rose-400 dark:border dark:border-rose-800/40'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border dark:border-emerald-800/40'
                            }`}
                          >
                            {n.title}
                          </span>
                          <span class="text-[10px] text-gray-400 dark:text-neutral-500">{n.time}</span>
                        </div>
                        <p class="text-xs text-gray-700 dark:text-neutral-300 mt-1">{n.desc}</p>
                      </div>
                    )}
                  </For>
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
