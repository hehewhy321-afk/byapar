import { Component, createSignal, onCleanup } from 'solid-js';
import { loginAdmin, isAuthLoading } from '../services/adminAuth';
import { TurnstileWidget } from '../components/TurnstileWidget';

interface AdminLoginViewProps {
  onSuccess: () => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export const AdminLoginView: Component<AdminLoginViewProps> = (props) => {
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [turnstileToken, setTurnstileToken] = createSignal('');
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
  const [failedAttempts, setFailedAttempts] = createSignal(0);
  const [lockoutRemaining, setLockoutRemaining] = createSignal(0);

  let timer: any = null;
  onCleanup(() => {
    if (timer) clearInterval(timer);
  });

  const startLockout = () => {
    setLockoutRemaining(LOCKOUT_SECONDS);
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorMessage(null);

    if (lockoutRemaining() > 0) {
      setErrorMessage(`Too many failed login attempts. Please wait ${lockoutRemaining()}s before retrying.`);
      return;
    }

    const cleanEmail = email().trim().toLowerCase();
    const cleanPassword = password();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both admin email and password.');
      return;
    }

    if (!turnstileToken()) {
      setErrorMessage('Security challenge verification required before signing in.');
      return;
    }

    const res = await loginAdmin(cleanEmail, cleanPassword);
    if (res.success) {
      setPassword('');
      props.onSuccess();
    } else {
      setPassword(''); // Clear password from memory on failure
      const attempts = failedAttempts() + 1;
      setFailedAttempts(attempts);

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        startLockout();
        setErrorMessage(`Account temporarily locked for ${LOCKOUT_SECONDS}s due to consecutive failed attempts.`);
      } else {
        const remaining = MAX_FAILED_ATTEMPTS - attempts;
        setErrorMessage(
          `${res.error || 'Authentication failed. Please verify credentials.'} (${remaining} attempt${remaining > 1 ? 's' : ''} left)`
        );
      }
    }
  };

  return (
    <div class="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
      <div class="w-full max-w-sm bg-white p-7 rounded-2xl border border-gray-200/90 shadow-xl shadow-gray-200/50 relative overflow-hidden">
        {/* Top Security Stripe */}
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-red-500" />

        {/* Brand Header */}
        <div class="text-center mb-6">
          <div class="inline-flex w-12 h-12 rounded-xl bg-[#FF4500] items-center justify-center text-white font-bold text-xl font-heading mb-3 shadow-md shadow-orange-500/20">
            BY
          </div>
          <h1 class="text-xl font-bold font-heading text-gray-900 tracking-tight">
            Byapar Admin Console
          </h1>
          <p class="text-xs text-gray-500 mt-1">
            Zero Trust Protected Operations Hub
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage() && (
          <div class="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex items-start space-x-2 animate-shake">
            <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span class="leading-relaxed">{errorMessage()}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} class="space-y-4" autocomplete="off">
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
              disabled={lockoutRemaining() > 0 || isAuthLoading()}
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              disabled={lockoutRemaining() > 0 || isAuthLoading()}
              class="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 text-xs focus:outline-none focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Cloudflare Anti-Bot Turnstile Challenge */}
          <div class="pt-1">
            <TurnstileWidget
              action="admin-login"
              theme="light"
              onVerify={(token) => {
                setTurnstileToken(token);
                setErrorMessage(null);
              }}
              onError={() => {
                setTurnstileToken('');
              }}
              onExpire={() => {
                setTurnstileToken('');
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isAuthLoading() || lockoutRemaining() > 0}
            class="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#FF4500] hover:bg-[#E03D00] text-white font-semibold text-xs shadow-md shadow-orange-500/10 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isAuthLoading() ? (
              <span class="flex items-center gap-2">
                <svg class="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying Credentials...
              </span>
            ) : lockoutRemaining() > 0 ? (
              <span>Locked ({lockoutRemaining()}s)</span>
            ) : (
              <span>Sign In to Admin Console</span>
            )}
          </button>
        </form>

        {/* Security Notice */}
        <div class="mt-6 pt-4 border-t border-gray-100 text-center space-y-1">
          <div class="flex items-center justify-center gap-1.5 text-[11px] font-medium text-emerald-600">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Cloudflare Edge & Turnstile Shielded</span>
          </div>
          <p class="text-[10px] text-gray-400">
            Restricted access for authorized Byapar platform administrators only.
          </p>
        </div>
      </div>
    </div>
  );
};
