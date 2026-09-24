import { Component, createSignal } from 'solid-js';
import { loginAdmin, isAuthLoading, bypassLoginDev } from '../services/adminAuth';

interface AdminLoginViewProps {
  onSuccess: () => void;
}

export const AdminLoginView: Component<AdminLoginViewProps> = (props) => {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email() || !password()) {
      setErrorMessage('Please enter both admin email and password.');
      return;
    }

    const res = await loginAdmin(email(), password());
    if (res.success) {
      props.onSuccess();
    } else {
      setErrorMessage(res.error || 'Login failed. Verify your admin credentials.');
    }
  };

  return (
    <div class="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div class="w-full max-w-sm bg-white p-7 rounded-2xl border border-gray-200 shadow-sm relative">
        {/* Brand Header */}
        <div class="text-center mb-6">
          <div class="inline-flex w-12 h-12 rounded-xl bg-[#FF4500] items-center justify-center text-white font-bold text-xl font-heading mb-3 shadow-sm">
            BY
          </div>
          <h1 class="text-xl font-bold font-heading text-gray-900">
            Byapar Admin
          </h1>
          <p class="text-xs text-gray-500 mt-1">
            Platform Operations & Multi-Tenant Control
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage() && (
          <div class="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-center space-x-2">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage()}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">
              Admin Email
            </label>
            <input
              type="email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              placeholder="admin@byapar.com"
              required
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              placeholder="••••••••••••"
              required
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isAuthLoading()}
            class="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white font-semibold text-xs shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isAuthLoading() ? (
              <span>Authenticating...</span>
            ) : (
              <span>Sign In to Admin Console</span>
            )}
          </button>
        </form>

        {/* Quick Demo Autofill */}
        <div class="mt-5 pt-4 border-t border-gray-100 space-y-2">
          <button
            type="button"
            onClick={() => {
              bypassLoginDev();
              props.onSuccess();
            }}
            class="w-full py-2 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <span>⚡ Enter Admin Console (Fast-Track Dev)</span>
          </button>
          <div class="flex items-center justify-between text-xs pt-1">
            <span class="text-gray-400">Admin Email:</span>
            <button
              type="button"
              onClick={() => {
                setEmail('hehewhy.321@gmail.com');
              }}
              class="text-[#FF4500] hover:underline font-mono text-[11px]"
            >
              hehewhy.321@gmail.com
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div class="mt-4 text-center">
          <p class="text-[10px] text-gray-400">
            Protected Platform Console for authorized Byapar admins only.
          </p>
        </div>
      </div>
    </div>
  );
};
