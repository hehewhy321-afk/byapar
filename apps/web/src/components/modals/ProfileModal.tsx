import { Component, createSignal, createEffect, onSettled, Show } from 'solid-js';
import { currentBusiness, updateBusinessProfile, showProfileModal, setShowProfileModal } from '../../db/localDb';
import { currentUser } from '../../db/auth';
import { IconStore, IconX, IconCheck } from '../icons';

export const ProfileModal: Component = () => {
  const [name, setName] = createSignal(currentBusiness.name || '');
  const [owner, setOwner] = createSignal(currentBusiness.ownerName || '');
  const [pan, setPan] = createSignal(currentBusiness.pan || '');
  const [phone, setPhone] = createSignal(currentBusiness.phone || '');
  const [address, setAddress] = createSignal(currentBusiness.address || '');
  const [isVat, setIsVat] = createSignal(Boolean(currentBusiness.isVatRegistered));
  const [saving, setSaving] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null);
  const [successMsg, setSuccessMsg] = createSignal<string | null>(null);

  // Synchronize modal state whenever opened
  createEffect(
    () => showProfileModal(),
    (isOpen) => {
      if (isOpen) {
        setName(currentBusiness.name || '');
        setOwner(currentBusiness.ownerName || currentUser()?.name || '');
        setPan(currentBusiness.pan || '');
        setPhone(currentBusiness.phone || currentUser()?.phone || '');
        setAddress(currentBusiness.address || currentUser()?.address || '');
        setIsVat(Boolean(currentBusiness.isVatRegistered));
        setErrorMsg(null);
        setSuccessMsg(null);
        setSaving(false);
      }
    }
  );

  // Handle ESC key to dismiss
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showProfileModal()) {
      setShowProfileModal(false);
    }
  };
  onSettled(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleSave = async (e: Event) => {
    e.preventDefault();
    const trimmedName = name().trim();
    if (!trimmedName) {
      setErrorMsg('Store / Business name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const trimmedOwner = owner().trim();
      const trimmedPan = pan().trim();
      const trimmedPhone = phone().trim();
      const trimmedAddress = address().trim();
      const vatStatus = isVat();

      await updateBusinessProfile({
        name: trimmedName,
        nameEn: trimmedName,
        ownerName: trimmedOwner,
        pan: trimmedPan,
        phone: trimmedPhone,
        address: trimmedAddress,
        isVatRegistered: vatStatus,
      });

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setShowProfileModal(false);
        setSuccessMsg(null);
        setSaving(false);
      }, 350);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update business profile.');
      setSaving(false);
    }
  };

  return (
    <Show when={showProfileModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowProfileModal(false)}>
        <div
          class="modal-content !max-w-md p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <IconStore size={18} />
              </div>
              <div>
                <h3 class="font-bold text-sm sm:text-base text-neutral-900 dark:text-white">Store & Business Profile</h3>
                <p class="text-[11px] text-neutral-500 dark:text-neutral-400">Update your store details, owner name, and address</p>
              </div>
            </div>
            <button
              onClick={() => setShowProfileModal(false)}
              class="text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
              title="Close (Esc)"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Error & Success Feedback Alerts */}
          <Show when={errorMsg()}>
            <div class="mb-3 p-2.5 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 text-red-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span>{errorMsg()}</span>
            </div>
          </Show>

          <Show when={successMsg()}>
            <div class="mb-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
              <IconCheck size={14} class="shrink-0" />
              <span>{successMsg()}</span>
            </div>
          </Show>

          <form onSubmit={handleSave} class="space-y-3.5">
            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Store / Business Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                placeholder="e.g. Shrestha Mart & General Store"
                class="input-field font-semibold text-sm"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Owner / Proprietor Full Name
              </label>
              <input
                type="text"
                value={owner()}
                onInput={(e) => setOwner(e.currentTarget.value)}
                placeholder="e.g. Suman Shrestha"
                class="input-field text-sm"
              />
              <p class="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Used on invoices, receipts, and profile header</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  PAN / VAT Number
                </label>
                <input
                  type="text"
                  value={pan()}
                  onInput={(e) => setPan(e.currentTarget.value)}
                  placeholder="e.g. 302918274"
                  class="input-field font-mono font-bold text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone()}
                  onInput={(e) => setPhone(e.currentTarget.value)}
                  placeholder="e.g. 9841234567"
                  class="input-field font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Store Location / Address
              </label>
              <input
                type="text"
                value={address()}
                onInput={(e) => setAddress(e.currentTarget.value)}
                placeholder="e.g. New Road, Ward 8, Kathmandu"
                class="input-field text-sm"
              />
            </div>

            <div class="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="vatReg"
                checked={isVat()}
                onChange={(e) => setIsVat(e.currentTarget.checked)}
                class="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black cursor-pointer"
              />
              <label for="vatReg" class="text-xs text-neutral-700 dark:text-neutral-300 font-medium cursor-pointer leading-tight">
                Business is VAT Registered (13% VAT on taxable goods and invoices)
              </label>
            </div>

            <div class="pt-3 flex gap-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                disabled={saving()}
                class="btn-outline flex-1 justify-center text-xs py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving()}
                class="btn-primary flex-1 justify-center text-xs py-2 shadow-sm font-semibold disabled:opacity-50"
              >
                {saving() ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
