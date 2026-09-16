import { Component, createSignal, onSettled } from 'solid-js';
import { formatNepaliCurrency, soundbox } from '@byapar/core';
import { currentBusiness, settings } from '../db/localDb';
import { IconX, IconQrCode, IconCheck } from './icons';

interface FonepayModalProps {
  amount: number;
  invoiceNumber: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const FonepayModal: Component<FonepayModalProps> = (props) => {
  const [countdown, setCountdown] = createSignal(180); // 3 minutes QR expiry
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [isPaid, setIsPaid] = createSignal(false);

  onSettled(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  });

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Simulate customer scanning and paying via mobile banking app (e.g. eSewa, Global Smart Plus, NIC Asia MoBank)
  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsProcessing(false);
    setIsPaid(true);

    // Trigger Soundbox voice announcement
    if (settings.voiceSoundboxEnabled) {
      await soundbox.announcePayment(props.amount, 'Fonepay', settings.lang);
    }

    // Auto complete invoice after 1.5 seconds
    setTimeout(() => {
      props.onSuccess();
    }, 1500);
  };

  return (
    <div class="modal-overlay animate-fade-in">
      <div class="relative w-full max-w-md bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 text-center text-neutral-900 dark:text-white">
        {/* Close Button */}
        {!isPaid() && (
          <button
            onClick={props.onClose}
            class="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <IconX size={16} />
          </button>
        )}

        {/* Fonepay Header */}
        <div class="flex items-center justify-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg bg-red-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-red-500/30">
            F
          </div>
          <span class="font-extrabold text-lg tracking-tight text-neutral-900 dark:text-white">fonepay</span>
          <span class="text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-full font-bold uppercase">
            Dynamic QR
          </span>
        </div>

        {!isPaid() ? (
          <>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              {currentBusiness.name} • Invoice #: <span class="font-mono text-neutral-700 dark:text-neutral-200 font-semibold">{props.invoiceNumber}</span>
            </p>

            {/* Payable Amount Box */}
            <div class="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3 mb-5">
              <span class="text-xs text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-semibold">Payable Total</span>
              <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatNepaliCurrency(props.amount)}
              </div>
            </div>

            {/* Simulated Dynamic QR Box */}
            <div class="relative mx-auto w-56 h-56 bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center mb-4">
              {/* Mock QR SVG Pattern */}
              <div class="w-full h-full border-4 border-neutral-900 dark:border-neutral-100 rounded-lg p-2 flex flex-col justify-between">
                <div class="flex justify-between">
                  <div class="w-10 h-10 border-4 border-neutral-900 dark:border-neutral-100 flex items-center justify-center">
                    <div class="w-4 h-4 bg-neutral-900 dark:bg-neutral-100"></div>
                  </div>
                  <div class="w-10 h-10 border-4 border-neutral-900 dark:border-neutral-100 flex items-center justify-center">
                    <div class="w-4 h-4 bg-neutral-900 dark:bg-neutral-100"></div>
                  </div>
                </div>

                {/* Central Fonepay Logo Badge */}
                <div class="self-center w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md">
                  F
                </div>

                <div class="flex justify-between items-end">
                  <div class="w-10 h-10 border-4 border-neutral-900 dark:border-neutral-100 flex items-center justify-center">
                    <div class="w-4 h-4 bg-neutral-900 dark:bg-neutral-100"></div>
                  </div>
                  <div class="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 font-bold">
                    AMOUNT LOCKED
                  </div>
                </div>
              </div>

              {/* Pulsing indicator */}
              <div class="absolute -bottom-2.5 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 text-white text-[10px] font-mono px-2.5 py-0.5 rounded-full shadow">
                Expires in: {formatTimer(countdown())}
              </div>
            </div>

            <p class="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
              Scan with any mobile banking app or digital wallet (Fonepay, eSewa, Khalti).
            </p>

            {/* Test Simulation Button */}
            <button
              onClick={handleSimulatePayment}
              disabled={isProcessing()}
              class="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {isProcessing() ? (
                <>
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying bank settlement...</span>
                </>
              ) : (
                <>
                  <IconQrCode size={16} />
                  <span>Simulate Mobile Banking Payment</span>
                </>
              )}
            </button>
          </>
        ) : (
          /* Payment Success View */
          <div class="py-6">
            <div class="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <IconCheck size={32} />
            </div>
            <h3 class="text-xl font-bold text-neutral-900 dark:text-white mb-1">Payment Successful!</h3>
            <p class="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-4">
              Received {formatNepaliCurrency(props.amount)} via Fonepay QR.
            </p>
            <div class="text-xs text-neutral-500 dark:text-neutral-400 font-mono bg-neutral-50 dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
              Trace ID: FP-{Math.floor(10000000 + Math.random() * 90000000)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

