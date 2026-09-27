/**
 * BYAPAR (व्यापार) - Mobile Bill Image Upload & Delivery Service
 * Coordinates presigned PUT uploads to Cloudflare R2, authoritative verification,
 * and signed GET URL resolution for private receipt images.
 */

import * as FileSystem from 'expo-file-system';
import { supabase } from '../config/supabase';
import {
  CreateBillUploadRequest,
  CreateBillUploadResponse,
  CompleteBillUploadRequest,
  CompleteBillUploadResponse,
  GetBillImageUrlResponse,
  BillImage,
} from '@byapar/core';
import { compressBillImage, persistBillImageLocally } from './imageCompressionService';

// In-memory cache for presigned GET URLs with TTL
interface CachedUrl {
  signedUrl: string;
  expiresAt: number;
}
const urlCache: Map<string, CachedUrl> = new Map();

async function extractEdgeFunctionError(err: any, fallbackMessage: string): Promise<string> {
  if (!err) return fallbackMessage;

  if (err.context && typeof err.context.json === 'function') {
    try {
      const data = await err.context.json();
      if (data?.error) return data.error;
      if (data?.message) return data.message;
    } catch {
      // Body may have already been consumed
    }
  }

  if (err.details) return err.details;
  if (err.message && err.message !== 'Edge Function returned a non-2xx status code') {
    return err.message;
  }

  return fallbackMessage;
}

export interface UploadBillImageParams {
  rawImageUri: string;
  billId?: string;
  businessId: string;
  onProgress?: (progressFraction: number) => void;
}

export interface UploadBillImageResult {
  imageId: string;
  objectKey: string;
  localPersistentUri: string;
  imageRecord?: BillImage;
}

/**
 * Executes full client compression, presigned PUT, and authoritative verification
 */
export async function uploadBillImage(
  params: UploadBillImageParams
): Promise<UploadBillImageResult> {
  const { rawImageUri, billId, businessId, onProgress } = params;

  // 1. Client-Side Image Compression & Downscaling
  onProgress?.(0.1);
  const compressed = await compressBillImage(rawImageUri, {
    maxDimension: 1800,
    quality: 0.82,
  });

  // 2. Obtain current session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('User not authenticated. Please log in again.');
  }

  // 3. Request Presigned PUT URL from Supabase Edge Function
  onProgress?.(0.25);
  const createPayload: CreateBillUploadRequest = {
    billId,
    businessId,
    mimeType: compressed.mimeType,
    fileSizeBytes: compressed.fileSizeBytes,
    width: compressed.width,
    height: compressed.height,
  };

  const { data: createRes, error: createErr } = await supabase.functions.invoke<CreateBillUploadResponse>(
    'create-bill-upload',
    {
      body: createPayload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (createErr || !createRes?.uploadUrl) {
    const errorMsg = await extractEdgeFunctionError(createErr, (createRes as any)?.error || 'Failed to initiate bill upload');
    throw new Error(errorMsg);
  }

  const { uploadUrl, imageId, objectKey } = createRes;

  // 4. Save compressed binary locally for offline resilience
  const localPersistentUri = await persistBillImageLocally(
    compressed.uri,
    imageId,
    compressed.mimeType,
    billId
  );

  // 5. Direct Binary HTTP PUT to Cloudflare R2
  onProgress?.(0.4);
  const uploadTask = FileSystem.createUploadTask(
    uploadUrl,
    compressed.uri,
    {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Content-Type': compressed.mimeType,
      },
    },
    (progress: { totalBytesSent: number; totalBytesExpectedToSend: number }) => {
      if (progress.totalBytesExpectedToSend > 0) {
        const fraction = 0.4 + (progress.totalBytesSent / progress.totalBytesExpectedToSend) * 0.45;
        onProgress?.(Math.min(0.85, fraction));
      }
    }
  );

  const uploadResult = await uploadTask.uploadAsync();

  if (!uploadResult || uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`Direct R2 upload failed with HTTP status ${uploadResult?.status || 'Unknown'}`);
  }

  // 6. Complete Upload: Authoritative Server Verification via HeadObject
  onProgress?.(0.9);
  const completePayload: CompleteBillUploadRequest = {
    imageId,
    businessId,
    setPrimary: true,
  };

  const { data: completeRes, error: completeErr } = await supabase.functions.invoke<CompleteBillUploadResponse>(
    'complete-bill-upload',
    {
      body: completePayload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (completeErr || !completeRes?.success) {
    const errorMsg = await extractEdgeFunctionError(completeErr, (completeRes as any)?.error || 'Upload completion verification failed');
    throw new Error(errorMsg);
  }

  onProgress?.(1.0);

  return {
    imageId,
    objectKey,
    localPersistentUri,
    imageRecord: completeRes.image,
  };
}

/**
 * Resolves a private, short-lived signed GET URL for an image (with in-memory caching)
 */
export async function getBillImageUrl(
  imageId: string,
  businessId: string
): Promise<string> {
  const cached = urlCache.get(imageId);
  const now = Date.now();
  // If cache is valid for more than 5 minutes, reuse it
  if (cached && cached.expiresAt - now > 5 * 60 * 1000) {
    return cached.signedUrl;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.functions.invoke<GetBillImageUrlResponse>(
    'get-bill-image-url',
    {
      body: { imageId, businessId },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (error || !data?.signedUrl) {
    const errorMsg = await extractEdgeFunctionError(error, (data as any)?.message || 'Failed to resolve private bill image URL');
    throw new Error(errorMsg);
  }

  // Cache URL until 5 minutes before actual expiry
  const expiresAt = now + (data.expiresIn - 300) * 1000;
  urlCache.set(imageId, { signedUrl: data.signedUrl, expiresAt });

  return data.signedUrl;
}

/**
 * Deletes a bill image from Cloudflare R2 and Supabase
 */
export async function deleteBillImage(
  imageId: string,
  businessId: string
): Promise<void> {
  urlCache.delete(imageId);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return;

  await supabase.functions.invoke('delete-bill-image', {
    body: { imageId, businessId },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
}
