import { Component, createSignal, createEffect, onCleanup, Show, For } from 'solid-js';
import { pendingOtpEmail, setPendingOtpEmail, verifyEmailOtp, resendVerificationEmail } from '../../db/auth';
import { setCurrentPage } from '../../db/localDb';
import { IconAlertCircle, IconCheck, IconShield, IconSparkles } from '../icons';

export const OtpVerifyPage: Component = () => {
  // Array of 6 single-digit strings
  const [digits, setDigits] = createSignal<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = createSignal<string>(pendingOtpEmail() || '');
  const [isEditingEmail, setIsEditingEmail] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [successMsg, setSuccessMsg] = createSignal('');
  const [resendCooldown, setResendCooldown] = createSignal(60);
  const [resending, setResending] = createSignal(false);

  let inputRefs: HTMLInputElement[] = [];
  let timerInterval: any = null;

  createEffect(() => {
    // Start countdown timer for resend
    timerInterval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Auto-focus the first empty digit box
    setTimeout(() => {
      if (inputRefs[0]) {
        inputRefs[0].focus();
      }
    }, 100);

    onCleanup(() => {
      if (timerInterval) clearInterval(timerInterval);
    });
  });

  const getCombinedCode = () => digits().join('').trim();

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    const current = [...digits()];

    if (!clean) {
      current[index] = '';
      setDigits(current);
      return;
    }

    // If multiple digits (e.g. pasted or fast typed)
    if (clean.length > 1) {
      handlePastedCode(clean);
      return;
    }

    current[index] = clean;
    setDigits(current);
    setErrorMsg('');

    // Advance focus to next input
    if (index < 5 && clean) {
      inputRefs[index + 1]?.focus();
      inputRefs[index + 1]?.select();
    }

    // If all 6 digits are filled, automatically trigger submission
    if (index === 5 || current.every((d) => d.length === 1)) {
      const code = current.join('');
      if (code.length === 6) {
        submitVerification(code);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!digits()[index] && index > 0) {
        const current = [...digits()];
        current[index - 1] = '';
        setDigits(current);
        inputRefs[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData?.getData('text') || '';
    handlePastedCode(pasted);
  };

  const handlePastedCode = (pasted: string) => {
    const clean = pasted.replace(/[^0-9]/g, '').slice(0, 6);
    if (!clean) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < clean.length; i++) {
      newDigits[i] = clean[i];
    }
    setDigits(newDigits);
    setErrorMsg('');

    // Focus last filled or next empty
    const nextIdx = Math.min(clean.length, 5);
    inputRefs[nextIdx]?.focus();

    if (clean.length === 6) {
      submitVerification(clean);
    }
  };

  const submitVerification = async (explicitCode?: string) => {
    const code = explicitCode || getCombinedCode();
    const targetEmail = email().trim();

    if (!targetEmail) {
      setErrorMsg('Please specify your registered email address.');
      setIsEditingEmail(true);
      return;
    }

    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await verifyEmailOtp(targetEmail, code);
    setLoading(false);

    if (res.success) {
      setSuccessMsg('Email verified successfully! Opening your dashboard...');
      // Clean redirect: currentUser() will now be set and App will transition into dashboard
      setTimeout(() => {
        setCurrentPage('landing');
      }, 500);
    } else {
      setErrorMsg(res.error || 'Invalid or expired verification code.');
    }
  };

  const handleResend = async () => {
    if (resendCooldown() > 0 || resending()) return;
    const targetEmail = email().trim();
    if (!targetEmail) {
      setErrorMsg('Please enter your email to receive a new code.');
      return;
    }

    setResending(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await resendVerificationEmail(targetEmail);
    setResending(false);

    if (res.success) {
      setSuccessMsg(`A new 6-digit code has been sent to ${targetEmail}`);
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs[0]?.focus();
    } else {
      setErrorMsg(res.error || 'Failed to send new code. Please wait a moment.');
    }
  };

  return (
    <div class="min-h-screen bg-[#FFFDF9] flex flex-col justify-between selection:bg-[#FFB7B2]/30 selection:text-[#292524] relative overflow-hidden">
      {/* Subtle Warm Gradient Blobs */}
      <div class="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-orange-100/40 via-amber-50/30 to-transparent rounded-full blur-3xl pointer-events-none -mr-40 -mt-40" />
      <div class="absolute bottom-0 left-0 w-[450px] h-[450px] bg-gradient-to-tr from-rose-100/30 via-orange-50/20 to-transparent rounded-full blur-3xl pointer-events-none -ml-32 -mb-32" />

      {/* Top Navbar */}
      <header class="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <button
          onClick={() => setCurrentPage('auth')}
          class="flex items-center gap-2 text-xs font-heading font-semibold text-[#78716C] hover:text-[#292524] transition-colors px-3 py-1.5 rounded-full hover:bg-stone-100/80"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Login
        </button>

        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF4500] to-[#FF6B35] flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-extrabold text-base">
            B
          </div>
          <span class="text-lg font-heading font-black tracking-tight text-[#292524]">Byapar</span>
        </div>

        <div class="w-20" /> {/* Spacer */}
      </header>

      {/* Main Verification Card */}
      <main class="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        <div class="w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-stone-200/80 p-8 sm:p-11 shadow-2xl shadow-stone-200/50">
          
          {/* Security Badge Icon */}
          <div class="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center mx-auto mb-6 text-2xl shadow-sm">
            🔐
          </div>

          <div class="text-center mb-7">
            <h1 class="text-2xl sm:text-3xl font-heading font-black tracking-tight text-[#292524]">
              Verify your email
            </h1>
            <p class="text-xs sm:text-sm text-[#78716C] mt-2 font-heading leading-relaxed max-w-sm mx-auto">
              Please enter the 6-digit confirmation code sent to your inbox to activate your Byapar store.
            </p>

            {/* Recipient Email Chip */}
            <div class="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100/90 border border-stone-200 text-xs font-heading font-semibold text-[#292524]">
              <Show
                when={!isEditingEmail()}
                fallback={
                  <div class="flex items-center gap-2">
                    <input
                      type="email"
                      value={email()}
                      onInput={(e) => setEmail(e.currentTarget.value)}
                      placeholder="you@store.com"
                      class="px-2 py-0.5 text-xs bg-white border border-stone-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#FF4500]"
                      autofocus
                    />
                    <button
                      onClick={() => {
                        setPendingOtpEmail(email().trim());
                        setIsEditingEmail(false);
                      }}
                      class="text-[11px] text-[#FF4500] hover:underline font-bold"
                    >
                      Save
                    </button>
                  </div>
                }
              >
                <span>✉️ {email() || 'No email specified'}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(true)}
                  class="text-[11px] text-[#FF4500] hover:underline font-semibold ml-1"
                >
                  Change
                </button>
              </Show>
            </div>
          </div>

          {/* Status Notifications */}
          <Show when={errorMsg()}>
            <div class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-6 font-medium flex items-center gap-2.5 font-heading">
              <IconAlertCircle size={16} class="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg()}</span>
            </div>
          </Show>

          <Show when={successMsg()}>
            <div class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs mb-6 font-medium flex items-center gap-2.5 font-heading">
              <IconCheck size={16} class="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg()}</span>
            </div>
          </Show>

          {/* 6 Segmented Digit Inputs */}
          <div class="mb-7" onPaste={handlePaste}>
            <div class="flex items-center justify-center gap-2 sm:gap-3">
              <For each={[0, 1, 2, 3, 4, 5]}>
                {(idx) => (
                  <input
                    ref={(el) => (inputRefs[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    autoComplete="one-time-code"
                    value={digits()[idx]}
                    onInput={(e) => handleDigitChange(idx, e.currentTarget.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    class={`w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-2xl border transition-all outline-none shadow-sm ${
                      digits()[idx]
                        ? 'border-[#FF4500] bg-orange-50/30 text-[#292524] ring-2 ring-[#FF4500]/20'
                        : 'border-stone-200 bg-stone-50/50 text-[#292524] focus:border-[#FF4500] focus:ring-2 focus:ring-[#FF4500]/20'
                    }`}
                  />
                )}
              </For>
            </div>
            <p class="text-center text-[11px] text-stone-400 font-heading mt-2">
              Tip: You can copy and paste all 6 digits directly
            </p>
          </div>

          {/* Verify Primary CTA */}
          <button
            type="button"
            disabled={loading() || getCombinedCode().length !== 6}
            onClick={() => submitVerification()}
            class="w-full py-3.5 rounded-full font-heading font-bold text-sm text-white bg-[#FF4500] hover:bg-[#E03D00] transition-all shadow-lg shadow-[#FF4500]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            <Show when={loading()} fallback={<span>Verify Code & Continue →</span>}>
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying Code...</span>
            </Show>
          </button>

          {/* Resend Code Section */}
          <div class="pt-6 mt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-xs font-heading gap-3">
            <span class="text-[#78716C]">Didn't receive the email code?</span>

            <button
              type="button"
              disabled={resendCooldown() > 0 || resending()}
              onClick={handleResend}
              class={`font-bold transition-colors ${
                resendCooldown() > 0 || resending()
                  ? 'text-stone-400 cursor-not-allowed'
                  : 'text-[#FF4500] hover:text-[#E03D00] hover:underline'
              }`}
            >
              {resending() ? (
                'Sending code...'
              ) : resendCooldown() > 0 ? (
                `Resend code in ${resendCooldown()}s`
              ) : (
                'Resend Code'
              )}
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer class="w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-stone-400 font-heading relative z-10">
        © {new Date().getFullYear()} Byapar • Secured with end-to-end OTP authentication
      </footer>
    </div>
  );
};
