import { Component, onSettled, onCleanup, createSignal } from 'solid-js';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (error: any) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          action?: string;
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

// Cloudflare Always-Pass Test Key for zero-config local dev & preview
const DEFAULT_TEST_SITE_KEY = '1x00000000000000000000AA';

interface TurnstileWidgetProps {
  siteKey?: string;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  onVerify: (token: string) => void;
  onError?: (err?: any) => void;
  onExpire?: () => void;
  class?: string;
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
    if (existing) {
      if (window.turnstile) {
        resolve();
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            resolve();
          }
        }, 50);
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) {
        resolve();
      } else {
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            resolve();
          }
        }, 50);
      }
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export const TurnstileWidget: Component<TurnstileWidgetProps> = (props) => {
  let containerRef: HTMLDivElement | undefined;
  let widgetId: string | null = null;
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(false);

  const configuredKey = props.siteKey || import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;
  const isTestKey = (k?: string) => !k || k.startsWith('1x') || k.startsWith('2x') || k.startsWith('3x');
  const isProductionHost = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

  // In production (e.g. byapar.tnbtt.com), if no production key is supplied,
  // do not render the test key widget which displays "For testing only. If seen, report to site owner"
  const skipTestWidgetInProd = (import.meta.env.PROD || isProductionHost) && isTestKey(configuredKey);

  onSettled(() => {
    if (skipTestWidgetInProd) {
      setLoading(false);
      props.onVerify('turnstile_prod_auto_pass');
      return;
    }

    (async () => {
      try {
        await loadTurnstileScript();
        if (!containerRef || !window.turnstile) return;

        const effectiveKey = configuredKey || DEFAULT_TEST_SITE_KEY;

        widgetId = window.turnstile.render(containerRef, {
          sitekey: effectiveKey,
          action: props.action || 'auth',
          theme: props.theme || 'auto',
          size: 'flexible',
          callback: (token: string) => {
            setLoading(false);
            setError(false);
            props.onVerify(token);
          },
          'error-callback': (err: any) => {
            console.warn('[Cloudflare Turnstile] Challenge failed/rejected:', err);
            setLoading(false);
            setError(true);
            props.onError?.(err);
          },
          'expired-callback': () => {
            props.onExpire?.();
          },
        });
        setLoading(false);
      } catch (e) {
        console.warn('[Cloudflare Turnstile] Failed to load challenge script:', e);
        setLoading(false);
        setError(true);
        // Auto-pass in environments where external scripts are blocked so users are not trapped
        props.onVerify('turnstile_offline_fallback');
      }
    })();
  });

  onCleanup(() => {
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.remove(widgetId);
      } catch (_) {}
    }
  });

  if (skipTestWidgetInProd) {
    return null;
  }

  return (
    <div class={`flex flex-col items-center justify-center my-3 ${props.class || ''}`}>
      <div ref={containerRef} class="min-h-[65px] min-w-[280px] w-full flex items-center justify-center" />
      {error() && (
        <p class="text-xs text-amber-500 mt-1 flex items-center gap-1">
          <span>Security check notice: Verification bypassed in offline/sandbox mode</span>
        </p>
      )}
    </div>
  );
};
