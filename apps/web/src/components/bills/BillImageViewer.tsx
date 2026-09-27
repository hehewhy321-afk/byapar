import { Component, createSignal, createEffect, Show } from 'solid-js';
import { getBillImageUrl } from '../../services/billImageUploadService';
import { currentBusiness } from '../../db/localDb';

interface Props {
  imageUrl?: string;
  primaryImageId?: string;
  businessId?: string;
  alt?: string;
  class?: string;
  imgClass?: string;
  fallbackIconClass?: string;
}

export const BillImageViewer: Component<Props> = (props) => {
  const [resolvedUrl, setResolvedUrl] = createSignal<string>('');
  const [loading, setLoading] = createSignal<boolean>(false);
  const [hasError, setHasError] = createSignal<boolean>(false);

  createEffect(
    () => ({
      directUrl: props.imageUrl,
      imageId: props.primaryImageId,
      bizId: props.businessId || currentBusiness.id,
    }),
    ({ directUrl, imageId, bizId }) => {
      // 1. Direct image URL (e.g. blob:, http:, or data:) - ignore local mobile file paths
      const isUsableDirectUrl =
        directUrl &&
        directUrl.trim().length > 0 &&
        !directUrl.startsWith('file://') &&
        !directUrl.startsWith('content://');

      if (isUsableDirectUrl) {
        setResolvedUrl(directUrl);
        setLoading(false);
        setHasError(false);
        return;
      }

      // 2. Fetch presigned GET URL for private Cloudflare R2 image
      if (imageId && bizId) {
        setLoading(true);
        setHasError(false);
        getBillImageUrl(imageId, bizId)
          .then((url) => {
            setResolvedUrl(url);
            setLoading(false);
          })
          .catch((err) => {
            console.warn('[BillImageViewer] Error fetching signed URL:', err);
            setHasError(true);
            setLoading(false);
          });
      } else {
        setResolvedUrl('');
        setLoading(false);
      }
    }
  );

  return (
    <div class={`relative overflow-hidden flex items-center justify-center ${props.class || ''}`}>
      <Show when={loading()}>
        <div class="absolute inset-0 flex items-center justify-center bg-gray-100/60 dark:bg-neutral-900/60 backdrop-blur-xs z-10">
          <div class="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Show>

      <Show
        when={resolvedUrl() && !hasError()}
        fallback={
          <div class="flex flex-col items-center justify-center text-gray-400 dark:text-neutral-500 p-2">
            <svg class={props.fallbackIconClass || 'w-8 h-8'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-[10px] mt-1 font-mono uppercase">{hasError() ? 'Failed to load' : 'No receipt'}</span>
          </div>
        }
      >
        <img
          src={resolvedUrl()}
          alt={props.alt || 'Bill receipt'}
          class={props.imgClass || 'w-full h-full object-cover transition duration-200'}
          onError={() => setHasError(true)}
        />
      </Show>
    </div>
  );
};
