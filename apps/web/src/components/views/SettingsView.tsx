import { Component } from 'solid-js';
import {
  settings,
  setSettings,
  currentBusiness,
  persistState,
  setActiveTab,
} from '../../db/localDb';

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
        {/* Business Profile */}
        <div class="stat-card">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Business Profile</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between py-1.5">
              <span class="text-gray-500 dark:text-neutral-400">Business Name</span>
              <span class="text-gray-900 dark:text-white font-medium">{currentBusiness.nameEn}</span>
            </div>
            <div class="flex justify-between py-1.5 border-t border-gray-100 dark:border-neutral-800">
              <span class="text-gray-500 dark:text-neutral-400">PAN Number</span>
              <span class="text-gray-900 dark:text-white font-medium font-mono">{currentBusiness.pan}</span>
            </div>
            <div class="flex justify-between py-1.5 border-t border-gray-100 dark:border-neutral-800">
              <span class="text-gray-500 dark:text-neutral-400">Address</span>
              <span class="text-gray-900 dark:text-white font-medium">{currentBusiness.address}</span>
            </div>
            <div class="flex justify-between py-1.5 border-t border-gray-100 dark:border-neutral-800">
              <span class="text-gray-500 dark:text-neutral-400">Phone</span>
              <span class="text-gray-900 dark:text-white font-medium font-mono">{currentBusiness.phone}</span>
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
