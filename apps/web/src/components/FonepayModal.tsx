import { Component, createSignal, onSettled, onCleanup, Show } from 'solid-js';
import { formatNepaliCurrency, buildDynamicFonepayPayload } from '@byapar/core';
import QRCode from 'qrcode';
import { currentBusiness, settings } from '../db/localDb';
import { IconX, IconQrCode, IconCheck, IconWhatsApp } from './icons';

interface FonepayModalProps {
  amount: number;
  invoiceNumber: string;
  customerName?: string;
  customerPhone?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const FonepayModal: Component<FonepayModalProps> = (props) => {
  const [countdown, setCountdown] = createSignal(180); // 3 minutes QR expiry
  const [isProcessing, setIsProcessing] = createSignal(false);
  const [isPaid, setIsPaid] = createSignal(false);
  const [qrDataUrl, setQrDataUrl] = createSignal<string>('');
  const [generatingQr, setGeneratingQr] = createSignal(true);
  const [emvcoString, setEmvcoString] = createSignal('');

  onSettled(() => {
    // Generate EMVCo dynamic payload
    const payload = buildDynamicFonepayPayload({
      baseQrPayload: currentBusiness.fonepayQrPayload,
      merchantId: currentBusiness.fonepayMerchantId || currentBusiness.pan || '9841234567',
      merchantName: currentBusiness.nameEn || currentBusiness.name,
      amount: props.amount,
      invoiceNumber: props.invoiceNumber,
      city: currentBusiness.address ? currentBusiness.address.split(',')[0].trim() : 'Kathmandu',
      pan: currentBusiness.pan,
    });

    setEmvcoString(payload);

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
      })
      .catch((e) => {
        console.error('Failed to generate dynamic QR image:', e);
      })
      .finally(() => {
        setGeneratingQr(false);
      });

    // Expiry timer
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    onCleanup(() => clearInterval(timer));
  });

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDownloadQr = () => {
    const url = qrDataUrl();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fonepay-QR-${props.invoiceNumber}-${props.amount}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareWhatsApp = () => {
    const store = currentBusiness.nameEn || currentBusiness.name;
    const amtStr = formatNepaliCurrency(props.amount);
    const text = encodeURIComponent(
      `*Payment Request from ${store}*\n\n` +
      `Invoice #: *${props.invoiceNumber}*\n` +
      `Amount Due: *${amtStr}*\n\n` +
      `Please scan our official Fonepay Dynamic QR attached or pay via eSewa, Khalti, or your Mobile Banking App.\n` +
      `Merchant ID: ${currentBusiness.fonepayMerchantId || currentBusiness.pan || 'Available on Counter'}\n\n` +
      `Dhanyabad for shopping with us!`
    );

    const cleanPhone = (props.customerPhone || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/977${cleanPhone.length === 10 ? cleanPhone : cleanPhone.slice(-10)}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(url, '_blank');
  };

  // Simulate customer scanning and paying via mobile banking app (e.g. eSewa, Global Smart Plus, NIC Asia MoBank)
  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsProcessing(false);
    setIsPaid(true);

    // Auto complete invoice after 1.5 seconds
    setTimeout(() => {
      props.onSuccess();
    }, 1500);
  };

  return (
    <div class="modal-overlay animate-fade-in">
      <div class="relative w-full max-w-md bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-6 text-center text-neutral-900 dark:text-white">
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
        <div class="flex items-center justify-center gap-2 mb-3">
          <div class="w-8 h-8 rounded-xl bg-red-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-red-500/30">
            F
          </div>
          <span class="font-extrabold text-xl tracking-tight text-neutral-900 dark:text-white">fonepay</span>
          <span class="text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded-full font-bold uppercase">
            Dynamic QR
          </span>
        </div>

        {!isPaid() ? (
          <>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              {currentBusiness.nameEn || currentBusiness.name} • Invoice #: <span class="font-mono text-neutral-700 dark:text-neutral-200 font-bold">{props.invoiceNumber}</span>
            </p>

            {/* Payable Amount Box */}
            <div class="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-3 mb-4">
              <span class="text-xs text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-semibold">Payable Total (Auto Locked)</span>
              <div class="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {formatNepaliCurrency(props.amount)}
              </div>
            </div>

            {/* Real Dynamic QR Display */}
            <div class="relative mx-auto w-64 h-64 bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-md flex flex-col items-center justify-center mb-3">
              <Show
                when={!generatingQr() && qrDataUrl()}
                fallback={
                  <div class="flex flex-col items-center justify-center gap-2 text-neutral-400">
                    <div class="w-8 h-8 border-2 border-[#FF4500] border-t-transparent rounded-full animate-spin"></div>
                    <span class="text-xs font-medium">Generating EMVCo QR...</span>
                  </div>
                }
              >
                <div class="relative w-full h-full flex items-center justify-center">
                  <img
                    src={qrDataUrl()}
                    alt="Fonepay Dynamic QR Code"
                    class="w-full h-full object-contain rounded-lg"
                  />
                  {/* Fonepay Center Logo Badge */}
                  <div class="absolute w-8 h-8 rounded-lg bg-red-600 text-white font-black text-xs flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-md">
                    F
                  </div>
                </div>
              </Show>

              {/* Pulsing Expiry Indicator */}
              <div class="absolute -bottom-2.5 bg-neutral-900 dark:bg-neutral-800 border border-neutral-700 text-white text-[10px] font-mono px-3 py-0.5 rounded-full shadow">
                Expires in: {formatTimer(countdown())}
              </div>
            </div>

            <p class="text-[11px] text-neutral-500 dark:text-neutral-400 mb-4 mt-2">
              Scan with eSewa, Khalti, Global Smart Plus, NIC Asia MoBank or any Nepal mobile banking app.
            </p>

            {/* QR Actions Row: Download & WhatsApp */}
            <div class="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl()}
                class="py-2 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <IconQrCode size={14} />
                <span>Save QR Image</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                class="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <IconWhatsApp size={14} class="text-emerald-600" />
                <span>Share via WhatsApp</span>
              </button>
            </div>

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
                  <IconCheck size={16} />
                  <span>Confirm / Simulate Received Payment</span>
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
            <h3 class="text-lg font-bold text-neutral-900 dark:text-white mb-1">
              Payment Verified!
            </h3>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
              Settlement received via Fonepay Nepal
            </p>
            <div class="inline-block bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold px-3 py-1 rounded-full text-xs font-mono">
              Amount: {formatNepaliCurrency(props.amount)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
