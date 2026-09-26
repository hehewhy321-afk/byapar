/**
 * BYAPAR (व्यापार) - Web Bill Image Upload & Private Delivery Service
 * Coordinates presigned PUT uploads to Cloudflare R2, authoritative verification,
 * and signed GET URL resolution for private receipt images in SolidJS web.
 */

import { supabase } from '../db/auth';
import {
  CreateBillUploadRequest,
  CreateBillUploadResponse,
  CompleteBillUploadRequest,
  CompleteBillUploadResponse,
  GetBillImageUrlResponse,
  BillImage,
} from '@byapar/core';
import { compressWebImage, WebCompressedImageResult } from './imageCompressionService';

// In-memory cache for presigned GET URLs with TTL
interface CachedUrl {
  signedUrl: string;
  expiresAt: number;
}
const urlCache: Map<string, CachedUrl> = new Map();

export interface WebUploadBillImageParams {
  fileOrBlob: File | Blob | WebCompressedImageResult;
  businessId: string;
  billId?: string;
  onProgress?: (progressPercent: number) => void;
}

export interface WebUploadBillImageResult {
  imageId: string;
  previewUrl: string;
  record: BillImage;
}

/**
 * Extracts a user-friendly error message from a Supabase FunctionsHttpError.
 */
async function extractEdgeFunctionError(err: any, fallbackMessage: string): Promise<string> {
  if (!err) return fallbackMessage;

  // Check if context contains Response object
  if (err.context && typeof err.context.json === 'function') {
    try {
      const data = await err.context.json();
      if (data?.error) return data.error;
      if (data?.message) return data.message;
    } catch {
      // Body may have already been consumed
    }
  }

  // Check details if present
  if (err.details) return err.details;
  if (err.message && err.message !== 'Edge Function returned a non-2xx status code') {
    return err.message;
  }

  return fallbackMessage;
}

/**
 * High-level orchestration for uploading a bill image from the web browser:
 * 1. Client-side downscaling & compression (bypassed if already compressed during preview)
 * 2. Edge Function call to authorize & obtain presigned S3 PUT URL for Cloudflare R2
 * 3. Direct binary streaming PUT to Cloudflare R2 with real-time XMLHttpRequest progress
 * 4. Authoritative Edge Function completion call (HeadObject verification + size guard)
 */
export async function uploadBillImageWeb(
  params: WebUploadBillImageParams
): Promise<WebUploadBillImageResult> {
  const { fileOrBlob, businessId, billId, onProgress } = params;

  // 1. Client-side downscaling & compression (instant reuse if already compressed during preview)
  let compressed: WebCompressedImageResult;
  if ('blob' in fileOrBlob && 'fileSizeBytes' in fileOrBlob) {
    compressed = fileOrBlob as WebCompressedImageResult;
    onProgress?.(20);
  } else {
    onProgress?.(10);
    compressed = await compressWebImage(fileOrBlob as File | Blob);
    onProgress?.(20);
  }

  // 2. Request presigned upload URL from Supabase Edge Function
  const createPayload: CreateBillUploadRequest = {
    businessId,
    billId,
    mimeType: compressed.mimeType,
    fileSizeBytes: compressed.fileSizeBytes,
    width: compressed.width,
    height: compressed.height,
  };

  const { data: createData, error: createError } =
    await supabase.functions.invoke<CreateBillUploadResponse>('create-bill-upload', {
      body: createPayload,
    });

  if (createError || !createData || !createData.uploadUrl) {
    const errorMsg = await extractEdgeFunctionError(
      createError,
      createData?.message || 'Failed to initiate secure upload session. Please ensure you are logged in.'
    );
    throw new Error(errorMsg);
  }

  const { imageId, uploadUrl } = createData;
  onProgress?.(30);

  // 3. Direct binary PUT upload to Cloudflare R2 with live streaming progress
  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', compressed.mimeType);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          // Smooth live progress from 30% to 85% as chunks stream
          const pct = Math.round(30 + (evt.loaded / evt.total) * 55);
          onProgress?.(pct);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Cloudflare R2 direct upload failed (HTTP ${xhr.status}). Check bucket CORS configuration.`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during direct storage upload. Check internet connection.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Storage upload timed out. Please retry.'));
      };

      xhr.send(compressed.blob);
    });
  } catch (putErr: any) {
    throw new Error(`Failed to stream image to storage: ${putErr.message || String(putErr)}`);
  }

  onProgress?.(88);

  // 4. Authoritative verification via complete-bill-upload Edge Function
  const completePayload: CompleteBillUploadRequest = {
    imageId,
    businessId,
    billId,
    setPrimary: true,
  };

  const { data: completeData, error: completeError } =
    await supabase.functions.invoke<CompleteBillUploadResponse>('complete-bill-upload', {
      body: completePayload,
    });

  if (completeError || !completeData || !completeData.success) {
    const errorMsg = await extractEdgeFunctionError(
      completeError,
      completeData?.message || 'Failed to verify uploaded receipt on storage'
    );
    throw new Error(errorMsg);
  }

  onProgress?.(100);

  return {
    imageId,
    previewUrl: compressed.previewUrl,
    record: (completeData.record || completeData.image)!,
  };
}

/**
 * Resolves a short-lived presigned GET URL for viewing private receipts.
 * Uses an in-memory cache to prevent excessive roundtrips for the same session.
 */
export async function getBillImageUrl(
  imageId: string,
  businessId: string
): Promise<string> {
  const cacheKey = `${businessId}:${imageId}`;
  const now = Date.now();

  const cached = urlCache.get(cacheKey);
  if (cached && cached.expiresAt > now + 60 * 1000) {
    return cached.signedUrl;
  }

  const { data, error } = await supabase.functions.invoke<GetBillImageUrlResponse>(
    'get-bill-image-url',
    {
      body: { imageId, businessId },
    }
  );

  if (error || !data || !data.signedUrl) {
    const errorMsg = await extractEdgeFunctionError(error, data?.message || 'Failed to resolve bill image URL');
    throw new Error(errorMsg);
  }

  // Cache URL (expiresIn is in seconds; buffer by 5 minutes)
  const ttlMs = Math.max((data.expiresIn - 300) * 1000, 60 * 1000);
  urlCache.set(cacheKey, {
    signedUrl: data.signedUrl,
    expiresAt: now + ttlMs,
  });

  return data.signedUrl;
}

/**
 * Deletes a receipt image from Cloudflare R2 and updates the database record.
 */
export async function deleteBillImage(
  imageId: string,
  businessId: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-bill-image', {
    body: { imageId, businessId },
  });

  if (error || !data?.success) {
    const errorMsg = await extractEdgeFunctionError(error, data?.message || 'Failed to delete receipt image');
    throw new Error(errorMsg);
  }

  // Remove from local cache
  const cacheKey = `${businessId}:${imageId}`;
  urlCache.delete(cacheKey);
}
