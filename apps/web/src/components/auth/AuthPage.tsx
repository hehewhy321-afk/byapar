import { Component, createSignal, Show, For } from 'solid-js';
import { signIn, signUp } from '../../db/auth';
import { setCurrentPage, updateBusinessProfile } from '../../db/localDb';
import { IconAlertCircle, IconCheck } from '../icons';
import { BUSINESS_TYPES, BusinessType } from '@byapar/core';

export const AuthPage: Component = () => {
  const [mode, setMode] = createSignal<'login' | 'signup'>('login');
  const [loading, setLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [successMsg, setSuccessMsg] = createSignal('');

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
    if (!res.success) {
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
    } else {
      setErrorMsg(res.error || 'Registration failed');
    }
  };

  return (
    <div class="min-h-screen flex bg-white font-sans antialiased">
      {/* Left Branding Panel */}
      <div class="hidden lg:flex lg:w-1/2 bg-black text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Back to home */}
        <div>
          <button
            onClick={() => setCurrentPage('landing')}
            class="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors mb-16"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </button>

          <div class="flex items-center gap-3 mb-12">
            <div class="w-10 h-10 bg-white text-black flex items-center justify-center text-sm font-black rounded-lg">
              BY
            </div>
            <span class="text-xl font-black tracking-tight">Byapar</span>
          </div>

          <h1 class="text-3xl xl:text-4xl font-black leading-tight tracking-tight mb-6">
            Manage your business,<br />
            simple and smart.
          </h1>

          <p class="text-white/50 text-sm leading-relaxed max-w-md mb-12">
            Record bills digitally, track income & expenses, manage udhar (credit), and get full business insights — all from one app.
          </p>

          <div class="space-y-5">
            {[
              { icon: '📝', text: 'Record sales, purchases & expenses instantly' },
              { icon: '📒', text: 'Digital khata — track every rupee of udhar' },
              { icon: '📊', text: 'Business reports & profit/loss insights' },
              { icon: '📱', text: 'Works on mobile & desktop, syncs everywhere' },
            ].map((item) => (
              <div class="flex items-center gap-3">
                <span class="text-lg">{item.icon}</span>
                <span class="text-sm text-white/70">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div class="text-[11px] text-white/30 font-mono">
          © 2024 Byapar • Made in Nepal
        </div>

        {/* Decorative elements */}
        <div class="absolute -right-24 -bottom-24 w-64 h-64 border border-white/5 rounded-full" />
        <div class="absolute -right-12 -bottom-12 w-40 h-40 border border-white/5 rounded-full" />
      </div>

      {/* Right Form Panel */}
      <div class="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div class="w-full max-w-md">
          {/* Mobile: Back + Logo */}
          <div class="lg:hidden mb-8">
            <button
              onClick={() => setCurrentPage('landing')}
              class="flex items-center gap-2 text-sm text-gray-400 hover:text-black transition-colors mb-6"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 bg-black text-white flex items-center justify-center text-xs font-black rounded-lg">BY</div>
              <span class="text-base font-black tracking-tight">Byapar</span>
            </div>
          </div>

          {/* Title */}
          <div class="mb-8">
            <h2 class="text-2xl font-black tracking-tight text-gray-900">
              {mode() === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p class="text-sm text-gray-400 mt-1.5">
              {mode() === 'login'
                ? 'Sign in to access your business dashboard'
                : 'Set up your business in under 2 minutes'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div class="grid grid-cols-2 bg-gray-100 p-1 rounded-xl text-xs font-semibold text-center mb-6">
            <button
              type="button"
              class={`py-2.5 rounded-lg transition-all ${
                mode() === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => { setMode('login'); setErrorMsg(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              class={`py-2.5 rounded-lg transition-all ${
                mode() === 'signup'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
            >
              Create Account
            </button>
          </div>

          {/* Error */}
          <Show when={errorMsg()}>
            <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs mb-4 font-medium flex items-center gap-2">
              <IconAlertCircle size={14} class="w-4 h-4 shrink-0" />
              <span>{errorMsg()}</span>
            </div>
          </Show>

          {/* Success */}
          <Show when={successMsg()}>
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs mb-4 font-medium flex items-center gap-2">
              <IconCheck size={14} class="w-4 h-4 shrink-0" />
              <span>{successMsg()}</span>
            </div>
          </Show>

          {/* Login Form */}
          <Show when={mode() === 'login'}>
            <form onSubmit={handleLogin} class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={loginEmail()}
                  onInput={(e) => setLoginEmail(e.currentTarget.value)}
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                  autofocus
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPass()}
                  onInput={(e) => setLoginPass(e.currentTarget.value)}
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                />
              </div>
              <button
                type="submit"
                disabled={loading()}
                class="w-full py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-black/85 transition-colors disabled:opacity-50"
              >
                {loading() ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </Show>

          {/* Signup Form */}
          <Show when={mode() === 'signup'}>
            <form onSubmit={handleSignup} class="space-y-3.5">
              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1.5">Store / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Krishna Kirana Mart"
                  value={signupStore()}
                  onInput={(e) => setSignupStore(e.currentTarget.value)}
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                  autofocus
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1.5">Business Category *</label>
                <select
                  value={signupBusinessType()}
                  onChange={(e) => setSignupBusinessType(e.currentTarget.value as BusinessType)}
                  class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 cursor-pointer"
                >
                  <For each={BUSINESS_TYPES}>
                    {(bt) => (
                      <option value={bt.id}>{bt.label} — {bt.sub}</option>
                    )}
                  </For>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Suman Shrestha"
                    value={signupOwner()}
                    onInput={(e) => setSignupOwner(e.currentTarget.value)}
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Mobile</label>
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={signupPhone()}
                    onInput={(e) => setSignupPhone(e.currentTarget.value)}
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 font-mono transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="you@store.com"
                    value={signupEmail()}
                    onInput={(e) => setSignupEmail(e.currentTarget.value)}
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">PAN Number</label>
                  <input
                    type="text"
                    placeholder="9 digits"
                    value={signupPan()}
                    onInput={(e) => setSignupPan(e.currentTarget.value)}
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 font-mono transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupPass()}
                    onInput={(e) => setSignupPass(e.currentTarget.value)}
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-700 mb-1.5">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupConfirmPass()}
                    onInput={(e) => setSignupConfirmPass(e.currentTarget.value)}
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading()}
                class="w-full py-3 bg-black text-white rounded-xl text-sm font-bold hover:bg-black/85 transition-colors disabled:opacity-50 mt-1"
              >
                {loading() ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </Show>

          {/* Footer note */}
          <p class="text-[11px] text-gray-400 text-center mt-6">
            {mode() === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode() === 'login' ? 'signup' : 'login'); setErrorMsg(''); }}
              class="text-black font-semibold hover:underline"
            >
              {mode() === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
