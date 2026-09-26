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
    <div class="min-h-screen flex bg-[#FDFCF8] text-[#292524] font-sans antialiased selection:bg-[#FFB7B2]/30 softly-page relative overflow-x-hidden">
      
      {/* ─── GRAIN OVERLAY ─── */}
      <div class="softly-grain" aria-hidden="true">
        <svg>
          <filter id="softlyNoiseAuth">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#softlyNoiseAuth)" />
        </svg>
      </div>

      {/* ─── FLOATING BACKGROUND BLOBS ─── */}
      <div class="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          class="softly-blob absolute top-10 left-10 w-[380px] h-[380px] opacity-40"
          style={{ background: '#FFE4E1', filter: 'blur(100px)' }}
        />
        <div
          class="softly-blob-reverse absolute bottom-10 right-10 w-[360px] h-[360px] opacity-40"
          style={{ background: '#E6E6FA', filter: 'blur(100px)' }}
        />
      </div>

      {/* Left Branding Panel (Softly styling with warm tones and tactile cards) */}
      <div class="hidden lg:flex lg:w-1/2 p-12 relative flex-col justify-between z-10 border-r border-stone-200/50 bg-[#F5F2EA]/40">
        <div>
          {/* Back to home */}
          <button
            onClick={() => setCurrentPage('landing')}
            class="inline-flex items-center gap-2 text-xs font-heading font-medium text-[#78716C] hover:text-[#292524] transition-colors mb-14 px-3.5 py-1.5 rounded-full bg-white/70 border border-stone-200/60 shadow-sm"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </button>

          <div class="flex items-center gap-2.5 mb-8">
            <div class="w-8 h-8 rounded-full bg-[#FFB7B2] flex items-center justify-center shadow-sm">
              <div class="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <span class="text-xl font-heading font-bold tracking-tight text-[#292524]">Byapar</span>
          </div>

          <h1 class="text-3xl xl:text-4xl font-heading font-black leading-tight tracking-tight text-[#292524] mb-4">
            Manage your shop,<br />
            <span class="font-cursive font-normal text-[#FFB7B2] text-4xl xl:text-5xl inline-block rotate-[-2deg]">peacefully & simply.</span>
          </h1>

          <p class="text-[#78716C] text-sm leading-relaxed max-w-md mb-10 font-normal">
            Record bills digitally in seconds, track Khata debts with automated WhatsApp reminders, and protect your store profits — free forever for Nepal's retail shops.
          </p>

          <div class="space-y-3.5 max-w-md">
            {[
              { title: '2-Second Thermal Billing', desc: 'Scan barcodes, print 58mm/80mm receipts, auto-calculate tax' },
              { title: 'Digital Udhar Khata', desc: '1-click WhatsApp payment reminders with your store Fonepay QR' },
              { title: 'Live Inventory & Alerts', desc: 'Auto-deducts items on checkout, warns before stocks run out' },
              { title: 'Real-Time Cloud Sync', desc: 'Bill on shop counter while checking profits on phone from home' },
            ].map((item, idx) => (
              <div class="p-4 rounded-2xl bg-white/80 border border-stone-100 softly-card flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-[#FFB7B2] mt-1.5 shrink-0" />
                <div>
                  <div class="text-xs font-heading font-bold text-[#292524]">{item.title}</div>
                  <div class="text-[11px] text-[#78716C] mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div class="text-[11px] text-stone-400 font-heading pt-6">
          © {new Date().getFullYear()} Byapar • Made with care in Nepal
        </div>
      </div>

      {/* Right Form Panel */}
      <div class="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 relative z-10">
        <div class="w-full max-w-md bg-white/90 backdrop-blur-md rounded-[2rem] border border-stone-100 p-8 sm:p-10 softly-card">
          {/* Mobile: Back + Logo */}
          <div class="lg:hidden mb-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage('landing')}
              class="flex items-center gap-1.5 text-xs font-heading font-medium text-[#78716C] hover:text-[#292524] transition-colors"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back
            </button>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-[#FFB7B2] flex items-center justify-center shadow-sm">
                <div class="w-2 h-2 rounded-full bg-white" />
              </div>
              <span class="text-sm font-heading font-bold tracking-tight text-[#292524]">Byapar</span>
            </div>
          </div>

          {/* Title */}
          <div class="mb-6">
            <h2 class="text-2xl font-heading font-bold tracking-tight text-[#292524]">
              {mode() === 'login' ? 'Welcome back' : 'Create your store'}
            </h2>
            <p class="text-xs sm:text-sm text-[#78716C] mt-1 font-heading">
              {mode() === 'login'
                ? 'Sign in to access your business register'
                : 'Set up your shop in under 2 minutes'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div class="grid grid-cols-2 bg-stone-100 p-1 rounded-full text-xs font-heading font-semibold text-center mb-6">
            <button
              type="button"
              class={`py-2 rounded-full transition-all ${
                mode() === 'login'
                  ? 'bg-white text-[#292524] shadow-sm'
                  : 'text-[#78716C] hover:text-[#292524]'
              }`}
              onClick={() => { setMode('login'); setErrorMsg(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              class={`py-2 rounded-full transition-all ${
                mode() === 'signup'
                  ? 'bg-white text-[#292524] shadow-sm'
                  : 'text-[#78716C] hover:text-[#292524]'
              }`}
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
            >
              Create Account
            </button>
          </div>

          {/* Error */}
          <Show when={errorMsg()}>
            <div class="p-3 rounded-2xl bg-[#FFE4E1]/50 border border-[#FFB7B2]/40 text-[#991B1B] text-xs mb-4 font-medium flex items-center gap-2 font-heading">
              <IconAlertCircle size={14} class="w-4 h-4 shrink-0 text-[#EF4444]" />
              <span>{errorMsg()}</span>
            </div>
          </Show>

          {/* Success */}
          <Show when={successMsg()}>
            <div class="p-3 rounded-2xl bg-[#E8EFE8] border border-[#A7F3D0] text-[#065F46] text-xs mb-4 font-medium flex items-center gap-2 font-heading">
              <IconCheck size={14} class="w-4 h-4 shrink-0 text-[#10B981]" />
              <span>{successMsg()}</span>
            </div>
          </Show>

          {/* Login Form */}
          <Show when={mode() === 'login'}>
            <form onSubmit={handleLogin} class="space-y-4">
              <div>
                <label class="block text-xs font-heading font-semibold text-[#292524] mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={loginEmail()}
                  onInput={(e) => setLoginEmail(e.currentTarget.value)}
                  class="w-full px-4 py-2.5 rounded-full border border-stone-200 bg-stone-50/50 text-sm text-[#292524] placeholder-stone-400 font-heading transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                  autofocus
                />
              </div>
              <div>
                <label class="block text-xs font-heading font-semibold text-[#292524] mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPass()}
                  onInput={(e) => setLoginPass(e.currentTarget.value)}
                  class="w-full px-4 py-2.5 rounded-full border border-stone-200 bg-stone-50/50 text-sm text-[#292524] placeholder-stone-400 font-heading transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                />
              </div>
              <button
                type="submit"
                disabled={loading()}
                class="w-full py-3 bg-[#292524] hover:bg-[#1c1917] text-white rounded-full text-xs font-heading font-semibold transition-all softly-cta-scale active:scale-95 disabled:opacity-50 mt-2 shadow-sm"
              >
                {loading() ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </Show>

          {/* Signup Form */}
          <Show when={mode() === 'signup'}>
            <form onSubmit={handleSignup} class="space-y-3.5">
              <div>
                <label class="block text-xs font-heading font-semibold text-[#292524] mb-1">Store / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Krishna Kirana Mart"
                  value={signupStore()}
                  onInput={(e) => setSignupStore(e.currentTarget.value)}
                  class="w-full px-4 py-2 rounded-full border border-stone-200 bg-stone-50/50 text-xs text-[#292524] placeholder-stone-400 font-heading transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                  autofocus
                />
              </div>

              <div>
                <label class="block text-xs font-heading font-semibold text-[#292524] mb-1">Business Category *</label>
                <select
                  value={signupBusinessType()}
                  onChange={(e) => setSignupBusinessType(e.currentTarget.value as BusinessType)}
                  class="w-full px-4 py-2 rounded-full border border-stone-200 bg-stone-50/50 text-xs text-[#292524] font-heading transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40 cursor-pointer"
                >
                  <For each={BUSINESS_TYPES}>
                    {(bt) => (
                      <option value={bt.id}>{bt.label} — {bt.sub}</option>
                    )}
                  </For>
                </select>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-[11px] font-heading font-semibold text-[#292524] mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Suman Shrestha"
                    value={signupOwner()}
                    onInput={(e) => setSignupOwner(e.currentTarget.value)}
                    class="w-full px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50/50 text-xs text-[#292524] placeholder-stone-400 font-heading transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-heading font-semibold text-[#292524] mb-1">Mobile</label>
                  <input
                    type="tel"
                    placeholder="98XXXXXXXX"
                    value={signupPhone()}
                    onInput={(e) => setSignupPhone(e.currentTarget.value)}
                    class="w-full px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50/50 text-xs text-[#292524] placeholder-stone-400 font-mono transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-[11px] font-heading font-semibold text-[#292524] mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="you@store.com"
                    value={signupEmail()}
                    onInput={(e) => setSignupEmail(e.currentTarget.value)}
                    class="w-full px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50/50 text-xs text-[#292524] placeholder-stone-400 font-heading transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-heading font-semibold text-[#292524] mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="9 digits"
                    value={signupPan()}
                    onInput={(e) => setSignupPan(e.currentTarget.value)}
                    class="w-full px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50/50 text-xs text-[#292524] placeholder-stone-400 font-mono transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                <div>
                  <label class="block text-[11px] font-heading font-semibold text-[#292524] mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupPass()}
                    onInput={(e) => setSignupPass(e.currentTarget.value)}
                    class="w-full px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50/50 text-xs text-[#292524] placeholder-stone-400 font-heading transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-heading font-semibold text-[#292524] mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupConfirmPass()}
                    onInput={(e) => setSignupConfirmPass(e.currentTarget.value)}
                    class="w-full px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50/50 text-xs text-[#292524] placeholder-stone-400 font-heading transition-all focus:outline-none focus:ring-2 focus:ring-[#FFB7B2]/20 focus:border-[#FFB7B2]/40"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading()}
                class="w-full py-3 bg-[#FFB7B2] hover:bg-[#E8948E] text-white rounded-full text-xs font-heading font-semibold transition-all softly-cta-scale active:scale-95 disabled:opacity-50 mt-2 shadow-md shadow-[#FFB7B2]/30"
              >
                {loading() ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </Show>

          {/* Footer note */}
          <p class="text-xs text-[#78716C] text-center mt-6 font-heading">
            {mode() === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode() === 'login' ? 'signup' : 'login'); setErrorMsg(''); }}
              class="text-[#292524] font-bold hover:underline"
            >
              {mode() === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
