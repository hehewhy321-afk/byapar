import { Component, Show } from 'solid-js';
import {
  settings,
  setSettings,
  currentBusiness,
  persistState,
  setActiveTab,
  setShowChangePasswordModal,
  setShowAuthModal,
  setShowProfileModal,
} from '../../db/localDb';
import { currentUser } from '../../db/auth';
import { IconShield, IconLock, IconStore, IconEdit } from '../icons';

export const SettingsView: Component = () => {
  const toggleCalendar = () => {
    setSettings((draft) => {
      draft.calendar = draft.calendar === 'BS' ? 'AD' : 'BS';
    });
    persistState();
  };

  const toggleLang = () => {
    setSettings((draft) => {
      draft.lang = draft.lang === 'ne' ? 'en' : 'ne';
    });
    persistState();
  };

  return (
    <div class="p-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div class="flex items-center gap-3 mb-6">
        <button
          class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-500 dark:text-neutral-400"
          onClick={() => setActiveTab('dashboard')}
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 class="text-xl font-heading font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div class="space-y-4">
        {/* Account & Security */}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <IconShield class="w-4 h-4 text-[#FF4500]" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Account & Security</h3>
            </div>
            <Show when={currentUser()}>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Cloud Synced
              </span>
            </Show>
          </div>

          <div class="space-y-3 text-sm">
            <Show
              when={currentUser()}
              fallback={
                <div class="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold text-gray-800 dark:text-neutral-200">Local Guest Mode</p>
                    <p class="text-[11px] text-gray-500 dark:text-neutral-400">Sign in to back up and sync your business across devices</p>
                  </div>
                  <button
                    class="px-3.5 py-1.5 bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign In
                  </button>
                </div>
              }
            >
              <div class="flex justify-between py-1.5">
                <span class="text-gray-500 dark:text-neutral-400">Signed In Account</span>
                <span class="text-gray-900 dark:text-white font-medium">{currentUser()?.email}</span>
              </div>
              <div class="flex justify-between py-1.5 border-t border-gray-100 dark:border-neutral-800">
                <span class="text-gray-500 dark:text-neutral-400">Account Role</span>
                <span class="text-gray-900 dark:text-white font-medium capitalize">{currentUser()?.role || 'Owner'}</span>
              </div>
              <div class="flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 pt-3">
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-neutral-200">Password & Security</p>
                  <p class="text-xs text-gray-400 dark:text-neutral-500">Requires your current password to update</p>
                </div>
                <button
                  class="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-neutral-200 text-xs font-semibold shadow-sm transition flex items-center gap-2"
                  onClick={() => setShowChangePasswordModal(true)}
                >
                  <IconLock class="w-3.5 h-3.5 text-[#FF4500]" />
                  <span>Change Password</span>
                </button>
              </div>
            </Show>
          </div>
        </div>

        {/* Business Profile */}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <IconStore class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Business Profile</h3>
            </div>
            <button
              class="px-3 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-brand-600 dark:text-emerald-400 text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
              onClick={() => setShowProfileModal(true)}
            >
              <IconEdit class="w-3.5 h-3.5" />
              <span>Edit Store Details</span>
            </button>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between py-1.5">
              <span class="text-gray-500 dark:text-neutral-400">Store / Business Name</span>
              <span class="text-gray-900 dark:text-white font-medium">{currentBusiness.nameEn || currentBusiness.name}</span>
            </div>
            <div class="flex justify-between py-1.5 border-t border-gray-100 dark:border-neutral-800">
              <span class="text-gray-500 dark:text-neutral-400">Owner Name</span>
              <span class="text-gray-900 dark:text-white font-medium">{currentBusiness.ownerName || 'Store Owner'}</span>
            </div>
            <div class="flex justify-between py-1.5 border-t border-gray-100 dark:border-neutral-800">
              <span class="text-gray-500 dark:text-neutral-400">PAN / VAT Number</span>
              <span class="text-gray-900 dark:text-white font-medium font-mono">{currentBusiness.pan || 'N/A'}</span>
            </div>
            <div class="flex justify-between py-1.5 border-t border-gray-100 dark:border-neutral-800">
              <span class="text-gray-500 dark:text-neutral-400">Address</span>
              <span class="text-gray-900 dark:text-white font-medium">{currentBusiness.address || 'N/A'}</span>
            </div>
            <div class="flex justify-between py-1.5 border-t border-gray-100 dark:border-neutral-800">
              <span class="text-gray-500 dark:text-neutral-400">Phone</span>
              <span class="text-gray-900 dark:text-white font-medium font-mono">{currentBusiness.phone || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div class="stat-card">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Preferences</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-700 dark:text-neutral-200">Calendar System</p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">Currently: {settings.calendar === 'BS' ? 'Bikram Sambat' : 'AD (Gregorian)'}</p>
              </div>
              <button class="btn-outline text-xs" onClick={toggleCalendar}>
                Switch to {settings.calendar === 'BS' ? 'AD' : 'BS'}
              </button>
            </div>
            <div class="flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 pt-3">
              <div>
                <p class="text-sm text-gray-700 dark:text-neutral-200">Language</p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">Currently: {settings.lang === 'en' ? 'English' : 'Nepali'}</p>
              </div>
              <button class="btn-outline text-xs" onClick={toggleLang}>
                Switch to {settings.lang === 'en' ? 'Nepali' : 'English'}
              </button>
            </div>
          </div>
        </div>

        {/* Billing & Hardware */}
        <div class="stat-card">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Billing & Hardware</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-700 dark:text-neutral-200">Thermal Printer Width</p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">Currently: {settings.thermalPrinterWidth}</p>
              </div>
              <button
                class="btn-outline text-xs"
                onClick={() => {
                  setSettings((draft) => {
                    draft.thermalPrinterWidth = draft.thermalPrinterWidth === '58mm' ? '80mm' : '58mm';
                  });
                  persistState();
                }}
              >
                Switch to {settings.thermalPrinterWidth === '58mm' ? '80mm' : '58mm'}
              </button>
            </div>
            <div class="flex items-center justify-between border-t border-gray-100 dark:border-neutral-800 pt-3">
              <div>
                <p class="text-sm text-gray-700 dark:text-neutral-200">Voice Soundbox</p>
                <p class="text-xs text-gray-400 dark:text-neutral-500">{settings.voiceSoundboxEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
              <button
                class="btn-outline text-xs"
                onClick={() => {
                  setSettings((draft) => {
                    draft.voiceSoundboxEnabled = !draft.voiceSoundboxEnabled;
                  });
                  persistState();
                }}
              >
                {settings.voiceSoundboxEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
