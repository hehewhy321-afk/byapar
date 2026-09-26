/**
 * BYAPAR (व्यापार) - Mobile Image Compression & Optimization Engine
 * Powered by expo-image-manipulator and expo-file-system.
 * Resizes large camera photos, normalizes orientation, and compresses to WebP/JPEG.
 */

import { manipulateAsync, SaveFormat, ImageResult } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

export interface CompressedImageResult {
  uri: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  mimeType: string;
}

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
  preferWebP?: boolean;
}

const DEFAULT_MAX_DIMENSION = 1800; // 1800px maintains crisp thermal & dot-matrix receipt text
const DEFAULT_QUALITY = 0.82; // Optimal contrast with zero artifacting around numbers

export async function compressBillImage(
  sourceUri: string,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const maxDim = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_QUALITY;
  const preferWebP = options.preferWebP ?? true;

  try {
    // 1. First attempt: compress with preferred WebP format and resize
    const manipResult: ImageResult = await manipulateAsync(
      sourceUri,
      [
        {
          resize: {
            width: maxDim, // expo-image-manipulator preserves aspect ratio when passing single dimension
          },
        },
      ],
      {
        compress: quality,
        format: preferWebP ? SaveFormat.WEBP : SaveFormat.JPEG,
      }
    );

    // 2. Read authoritative file size from local filesystem
    const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
    const size = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

    return {
      uri: manipResult.uri,
      width: manipResult.width,
      height: manipResult.height,
      fileSizeBytes: size,
      mimeType: preferWebP ? 'image/webp' : 'image/jpeg',
    };
  } catch (webpErr) {
    console.warn('[ImageCompression] WebP compression failed, falling back to JPEG:', webpErr);

    // 3. Fallback attempt: Standard JPEG compression
    const fallbackResult = await manipulateAsync(
      sourceUri,
      [
        {
          resize: {
            width: maxDim,
          },
        },
      ],
      {
        compress: 0.85,
        format: SaveFormat.JPEG,
      }
    );

    const fileInfo = await FileSystem.getInfoAsync(fallbackResult.uri);
    const size = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

    return {
      uri: fallbackResult.uri,
      width: fallbackResult.width,
      height: fallbackResult.height,
      fileSizeBytes: size,
      mimeType: 'image/jpeg',
    };
  }
}

/**
 * Saves a compressed image to persistent document storage for offline reliability
 */
export async function persistBillImageLocally(
  sourceUri: string,
  imageId: string,
  mimeType: string,
  billId?: string
): Promise<string> {
  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'webp';
  const folder = billId ? `bills/${billId}/` : 'bills/';
  const billsDir = `${FileSystem.documentDirectory}${folder}`;

  const dirInfo = await FileSystem.getInfoAsync(billsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(billsDir, { intermediates: true });
  }

  const destinationUri = `${billsDir}${imageId}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
  return destinationUri;
}
