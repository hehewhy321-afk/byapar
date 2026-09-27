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
  }
}

// Cloudflare Always-Pass Test Key for development & staging
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
  const [error, setError] = createSignal(false);

  const effectiveSiteKey = () =>
    props.siteKey ||
    import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY ||
    DEFAULT_TEST_SITE_KEY;

  onSettled(async () => {
    try {
      await loadTurnstileScript();
      if (!containerRef || !window.turnstile) return;

      widgetId = window.turnstile.render(containerRef, {
        sitekey: effectiveSiteKey(),
        action: props.action || 'admin-auth',
        theme: props.theme || 'light',
        size: 'flexible',
        callback: (token: string) => {
          setError(false);
          props.onVerify(token);
        },
        'error-callback': (err: any) => {
          console.warn('[Cloudflare Turnstile] Admin challenge warning:', err);
          setError(true);
          props.onError?.(err);
        },
        'expired-callback': () => {
          props.onExpire?.();
        },
      });
    } catch (e) {
      console.warn('[Cloudflare Turnstile] Offline fallback enabled for admin:', e);
      setError(true);
      props.onVerify('turnstile_offline_fallback');
    }
  });

  onCleanup(() => {
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.remove(widgetId);
      } catch (_) {}
    }
  });

  return (
    <div class={`flex flex-col items-center justify-center my-3 ${props.class || ''}`}>
      <div ref={containerRef} class="min-h-[65px] min-w-[280px] w-full flex items-center justify-center" />
      {error() && (
        <p class="text-[11px] text-amber-600 mt-1">
          Cloudflare challenge bypassed in offline/dev mode
        </p>
      )}
    </div>
  );
};
