import { Component, createSignal, Show } from 'solid-js';
import {
  showCreateStoreModal,
  setShowCreateStoreModal,
  createNewUserStore,
  userStores,
} from '../../db/auth';
import { setShowSubscriptionModal, currentBusiness } from '../../db/localDb';
import { checkStoreLimit } from '../../services/planLimits';
import { getBusinessSubscription } from '../../services/subscriptionService';
import type { BusinessType } from '@byapar/core';
import { IconX, IconShop, IconPlus } from '../icons';

export const CreateStoreModal: Component = () => {
  const [storeName, setStoreName] = createSignal('');
  const [phone, setPhone] = createSignal('');
  const [pan, setPan] = createSignal('');
  const [address, setAddress] = createSignal('');
  const [businessType, setBusinessType] = createSignal<BusinessType>('general');
  const [loading, setLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!storeName().trim()) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Check Store Limit based on active subscription
      const sub = await getBusinessSubscription(currentBusiness.id);
      const limitCheck = await checkStoreLimit(userStores().length, sub.planTier);

      if (!limitCheck.allowed) {
        setLoading(false);
        setShowCreateStoreModal(false);
        alert(limitCheck.message);
        setShowSubscriptionModal(true);
        return;
      }

      // 2. Create the store
      const res = await createNewUserStore({
        name: storeName().trim(),
        phone: phone().trim(),
        pan: pan().trim(),
        address: address().trim(),
        businessType: businessType(),
      });

      if (res.success) {
        setShowCreateStoreModal(false);
        setStoreName('');
        setPhone('');
        setPan('');
        setAddress('');
      } else {
        setErrorMsg(res.error || 'Failed to create new store');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Show when={showCreateStoreModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowCreateStoreModal(false)}>
        <div
          class="modal-content !max-w-md p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#FF4500] flex items-center justify-center font-bold">
                <IconShop size={18} />
              </div>
              <div>
                <h3 class="font-bold text-sm text-neutral-900 dark:text-white">
                  Add New Store / Branch
                </h3>
                <p class="text-[11px] text-neutral-500">
                  Create another store branch under your account
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateStoreModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 p-1"
            >
              <IconX size={16} />
            </button>
          </div>

          <Show when={errorMsg()}>
            <div class="p-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg()}
            </div>
          </Show>

          <form onSubmit={handleSubmit} class="space-y-3 text-xs">
            <div>
              <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kathmandu Mart - Branch 2"
                value={storeName()}
                onInput={(e) => setStoreName(e.currentTarget.value)}
                class="input-field"
              />
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Store Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="98XXXXXXXX"
                  value={phone()}
                  onInput={(e) => setPhone(e.currentTarget.value)}
                  class="input-field"
                />
              </div>

              <div>
                <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  PAN / VAT Number
                </label>
                <input
                  type="text"
                  placeholder="9-digit PAN (optional)"
                  value={pan()}
                  onInput={(e) => setPan(e.currentTarget.value)}
                  class="input-field"
                />
              </div>
            </div>

            <div>
              <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Store Location / Address
              </label>
              <input
                type="text"
                placeholder="e.g. Baneshwor, Kathmandu"
                value={address()}
                onInput={(e) => setAddress(e.currentTarget.value)}
                class="input-field"
              />
            </div>

            <div>
              <label class="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Business Type
              </label>
              <select
                value={businessType()}
                onChange={(e) => setBusinessType(e.currentTarget.value as BusinessType)}
                class="input-field"
              >
                <option value="general">General Kirana & Retail</option>
                <option value="foods">Food & Grocery Mart</option>
                <option value="pharmacy">Pharmacy & Health</option>
                <option value="electronics">Electronics & Mobile</option>
                <option value="clothing">Garments & Clothing</option>
              </select>
            </div>

            <div class="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateStoreModal(false)}
                class="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading()}
                class="btn-primary text-xs flex items-center gap-1.5"
              >
                <IconPlus size={14} />
                <span>{loading() ? 'Creating Branch...' : 'Create & Switch Store'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
