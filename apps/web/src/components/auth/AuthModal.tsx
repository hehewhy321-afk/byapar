import { Component, createSignal, Show, For } from 'solid-js';
import { signIn, signUp } from '../../db/auth';
import { showAuthModal, setShowAuthModal, updateBusinessProfile } from '../../db/localDb';
import { IconX, IconAlertCircle, IconCheck } from '../icons';
import { BUSINESS_TYPES, BusinessType } from '@byapar/core';
import { TurnstileWidget } from './TurnstileWidget';

export const AuthModal: Component = () => {
  const [mode, setMode] = createSignal<'login' | 'signup'>('login');
  const [loading, setLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [successMsg, setSuccessMsg] = createSignal('');
  const [turnstileToken, setTurnstileToken] = createSignal('');

  // Login form
  const [loginEmail, setLoginEmail] = createSignal('');
  const [loginPass, setLoginPass] = createSignal('');

  // Signup form
  const [signupStore, setSignupStore] = createSignal('');
  const [signupBusinessType, setSignupBusinessType] = createSignal<BusinessType>('general');
  const [signupOwner, setSignupOwner] = createSignal('');
  const [signupEmail, setSignupEmail] = createSignal('');
  const [signupPhone, setSignupPhone] = createSignal('');
  const [signupPan, setSignupPan] = createSignal('');
  const [signupPass, setSignupPass] = createSignal('');
  const [signupConfirmPass, setSignupConfirmPass] = createSignal('');

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await signIn(loginEmail(), loginPass());
    setLoading(false);

    if (res.success) {
      setShowAuthModal(false);
    } else {
      setErrorMsg(res.error || 'Invalid credentials');
    }
  };

  const handleSignup = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');

    if (signupPass() !== signupConfirmPass()) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);
    const res = await signUp({
      email: signupEmail(),
      pass: signupPass(),
      name: signupOwner(),
      businessName: signupStore(),
      businessType: signupBusinessType(),
      phone: signupPhone(),
      pan: signupPan(),
    });
    setLoading(false);

    if (res.success) {
      updateBusinessProfile({
        name: signupStore(),
        nameEn: signupStore(),
        ownerName: signupOwner(),
        businessType: signupBusinessType(),
        phone: signupPhone(),
        pan: signupPan(),
      });
      setSuccessMsg('Account created successfully!');
      setTimeout(() => {
        setShowAuthModal(false);
        setSuccessMsg('');
      }, 1000);
    } else {
      setErrorMsg(res.error || 'Registration failed');
    }
  };

  return (
    <Show when={showAuthModal()}>
      <div class="modal-overlay animate-fade-in" onClick={() => setShowAuthModal(false)}>
        <div class="modal-content !max-w-md p-6 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div class="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                BY
              </div>
              <h3 class="font-bold text-base text-neutral-900 dark:text-white">
                {mode() === 'login' ? 'Sign In to Byapar Cloud' : 'Create Business Account'}
              </h3>
            </div>
            <button
              onClick={() => setShowAuthModal(false)}
              class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1 rounded-lg transition"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div class="grid grid-cols-2 bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-xl text-xs font-semibold text-center mb-4">
            <button
              type="button"
              class={`py-2 rounded-lg transition-all ${
                mode() === 'login'
                  ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              onClick={() => { setMode('login'); setErrorMsg(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              class={`py-2 rounded-lg transition-all ${
                mode() === 'signup'
                  ? 'bg-white dark:bg-black text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
            >
              Sign Up
            </button>
          </div>

          <Show when={errorMsg()}>
            <div class="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs mb-3 font-medium flex items-center gap-2">
              <IconAlertCircle size={14} class="w-4 h-4 shrink-0" />
              <span>{errorMsg()}</span>
            </div>
          </Show>

          <Show when={successMsg()}>
            <div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs mb-3 font-medium flex items-center gap-2">
              <IconCheck size={14} class="w-4 h-4 shrink-0" />
              <span>{successMsg()}</span>
            </div>
          </Show>

          {/* Login Form */}
          <Show when={mode() === 'login'}>
            <form onSubmit={handleLogin} class="space-y-3.5">
              <div>
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Email or Store ID</label>
                <input
                  type="email"
                  required
                  placeholder="store@byapar.com"
                  value={loginEmail()}
                  onInput={(e) => setLoginEmail(e.currentTarget.value)}
                  class="input-field"
                  autofocus
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPass()}
                  onInput={(e) => setLoginPass(e.currentTarget.value)}
                  class="input-field"
                />
              </div>

              <TurnstileWidget
                action="modal-login"
                onVerify={(token) => setTurnstileToken(token)}
              />

              <button
                type="submit"
                disabled={loading()}
                class="btn-primary w-full justify-center py-2.5 text-xs font-bold shadow-md shadow-brand-500/20"
              >
                {loading() ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </Show>

          {/* Sign Up Form */}
          <Show when={mode() === 'signup'}>
            <form onSubmit={handleSignup} class="space-y-3">
              <div>
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Store / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kathmandu Kirana Mart"
                  value={signupStore()}
                  onInput={(e) => setSignupStore(e.currentTarget.value)}
                  class="input-field"
                  autofocus
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Business / Industry Category *
                </label>
                <select
                  value={signupBusinessType()}
                  onChange={(e) => setSignupBusinessType(e.currentTarget.value as BusinessType)}
                  class="input-field cursor-pointer bg-white dark:bg-neutral-900"
                >
                  <For each={BUSINESS_TYPES}>
                    {(bt) => (
                      <option value={bt.id}>
                        {bt.label} - {bt.sub}
                      </option>
                    )}
                  </For>
                </select>
                <span class="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 block">
                  Tailors preloaded categories, units & inventory items
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Suman Shrestha"
                    value={signupOwner()}
                    onInput={(e) => setSignupOwner(e.currentTarget.value)}
                    class="input-field"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={signupPhone()}
                    onInput={(e) => setSignupPhone(e.currentTarget.value)}
                    class="input-field font-mono"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@store.com"
                    value={signupEmail()}
                    onInput={(e) => setSignupEmail(e.currentTarget.value)}
                    class="input-field"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="9 digits"
                    value={signupPan()}
                    onInput={(e) => setSignupPan(e.currentTarget.value)}
                    class="input-field font-mono"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupPass()}
                    onInput={(e) => setSignupPass(e.currentTarget.value)}
                    class="input-field"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupConfirmPass()}
                    onInput={(e) => setSignupConfirmPass(e.currentTarget.value)}
                    class="input-field"
                  />
                </div>
              </div>

              <TurnstileWidget
                action="modal-signup"
                onVerify={(token) => setTurnstileToken(token)}
              />

              <button
                type="submit"
                disabled={loading()}
                class="btn-primary w-full justify-center py-2.5 text-xs font-bold mt-2 shadow-md shadow-brand-500/20"
              >
                {loading() ? 'Creating Store...' : 'Create Account'}
              </button>
            </form>
          </Show>
        </div>
      </div>
    </Show>
  );
};

