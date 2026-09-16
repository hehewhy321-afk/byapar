import { Component, createSignal, Show } from 'solid-js';
import { currentBusiness, updateBusinessProfile, showProfileModal, setShowProfileModal } from '../../db/localDb';
import { updateAuthProfile } from '../../db/auth';
import { IconStore, IconX } from '../icons';

export const ProfileModal: Component = () => {
  const [name, setName] = createSignal(currentBusiness.name);
  const [owner, setOwner] = createSignal(currentBusiness.ownerName || '');
  const [pan, setPan] = createSignal(currentBusiness.pan);
  const [phone, setPhone] = createSignal(currentBusiness.phone);
  const [address, setAddress] = createSignal(currentBusiness.address);
  const [isVat, setIsVat] = createSignal(currentBusiness.isVatRegistered);

  const handleSave = (e: Event) => {
    e.preventDefault();
    updateBusinessProfile({
      name: name().trim(),
      nameEn: name().trim(),
      ownerName: owner().trim(),
      pan: pan().trim(),
      phone: phone().trim(),
      address: address().trim(),
      isVatRegistered: isVat(),
    });

    updateAuthProfile({
      name: owner().trim() || name().trim(),
      businessName: name().trim(),
      phone: phone().trim(),
      pan: pan().trim(),
      address: address().trim(),
    });

    setShowProfileModal(false);
  };

  return (
    <Show when={showProfileModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowProfileModal(false)}>
        <div class="modal-content !max-w-md p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2">
              <IconStore size={20} class="text-brand-600 dark:text-brand-400" />
              <h3 class="font-bold text-base text-neutral-900 dark:text-white">Store & Business Profile</h3>
            </div>
            <button
              onClick={() => setShowProfileModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1 rounded-lg transition"
            >
              <IconX size={16} />
            </button>
          </div>

          <form onSubmit={handleSave} class="space-y-3.5">
            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Store / Business Name *</label>
              <input
                type="text"
                required
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                class="input-field font-semibold"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Owner Full Name</label>
              <input
                type="text"
                value={owner()}
                onInput={(e) => setOwner(e.currentTarget.value)}
                placeholder="e.g. Suman Shrestha"
                class="input-field"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">PAN / VAT Number *</label>
                <input
                  type="text"
                  required
                  value={pan()}
                  onInput={(e) => setPan(e.currentTarget.value)}
                  class="input-field font-mono font-bold"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone()}
                  onInput={(e) => setPhone(e.currentTarget.value)}
                  class="input-field font-mono"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Store Location / Address</label>
              <input
                type="text"
                value={address()}
                onInput={(e) => setAddress(e.currentTarget.value)}
                class="input-field"
              />
            </div>

            <div class="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="vatReg"
                checked={isVat()}
                onChange={(e) => setIsVat(e.currentTarget.checked)}
                class="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black cursor-pointer"
              />
              <label for="vatReg" class="text-xs text-neutral-700 dark:text-neutral-300 font-medium cursor-pointer">
                Business is VAT Registered (13% VAT on taxable goods)
              </label>
            </div>

            <div class="pt-3 flex gap-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                class="btn-outline flex-1 justify-center text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn-primary flex-1 justify-center text-xs shadow-md shadow-brand-500/20"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};

