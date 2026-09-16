import { Component, createSignal, Show } from 'solid-js';
import { showChangePasswordModal, setShowChangePasswordModal } from '../../db/localDb';
import { currentUser, changePassword } from '../../db/auth';
import { IconLock, IconX, IconEye, IconEyeOff, IconAlertCircle, IconCheck } from '../icons';

export const ChangePasswordModal: Component = () => {
  const [oldPassword, setOldPassword] = createSignal('');
  const [newPassword, setNewPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');

  const [showOld, setShowOld] = createSignal(false);
  const [showNew, setShowNew] = createSignal(false);
  const [showConfirm, setShowConfirm] = createSignal(false);

  const [loading, setLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [successMsg, setSuccessMsg] = createSignal('');

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(false);
  };

  const handleClose = () => {
    if (loading()) return;
    resetForm();
    setShowChangePasswordModal(false);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const oldP = oldPassword().trim();
    const newP = newPassword();
    const confP = confirmPassword();

    if (!oldP) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (!newP || newP.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newP !== confP) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    if (oldP === newP) {
      setErrorMsg('New password must be different from your current password.');
      return;
    }

    setLoading(true);

    try {
      const res = await changePassword(oldP, newP);
      setLoading(false);

      if (res.success) {
        setSuccessMsg('Your password has been changed successfully!');
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Failed to update password. Please check your current password.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    }
  };

  return (
    <Show when={showChangePasswordModal()}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
      >
        <div
          class="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-[#FF4500]">
                <IconLock class="w-5 h-5" />
              </div>
              <div>
                <h3 class="text-base font-bold text-neutral-900 dark:text-white">Change Password</h3>
                <p class="text-xs text-neutral-500 dark:text-neutral-400">
                  {currentUser()?.email ? `Account: ${currentUser()?.email}` : 'Enter your old and new password'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading()}
              class="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"
            >
              <IconX class="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} class="p-6 space-y-4">
            {/* Feedback Banners */}
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <IconAlertCircle class="w-4 h-4 shrink-0" />
                <span>{errorMsg()}</span>
              </div>
            </Show>

            <Show when={successMsg()}>
              <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <IconCheck class="w-4 h-4 shrink-0" />
                <span>{successMsg()}</span>
              </div>
            </Show>

            {/* Current Password Field */}
            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Current Password <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  type={showOld() ? 'text' : 'password'}
                  required
                  value={oldPassword()}
                  onInput={(e) => setOldPassword(e.currentTarget.value)}
                  placeholder="Enter current password"
                  class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld())}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <Show when={showOld()} fallback={<IconEye class="w-4 h-4" />}>
                    <IconEyeOff class="w-4 h-4" />
                  </Show>
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                New Password <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  type={showNew() ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword()}
                  onInput={(e) => setNewPassword(e.currentTarget.value)}
                  placeholder="At least 6 characters"
                  class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew())}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <Show when={showNew()} fallback={<IconEye class="w-4 h-4" />}>
                    <IconEyeOff class="w-4 h-4" />
                  </Show>
                </button>
              </div>
              <p class="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                Must contain at least 6 characters.
              </p>
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Confirm New Password <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <input
                  type={showConfirm() ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword()}
                  onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                  placeholder="Re-enter new password"
                  class="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FF4500] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm())}
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <Show when={showConfirm()} fallback={<IconEye class="w-4 h-4" />}>
                    <IconEyeOff class="w-4 h-4" />
                  </Show>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div class="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading()}
                class="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading()}
                class="px-5 py-2.5 rounded-xl bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <Show when={loading()}>
                  <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </Show>
                <span>{loading() ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
