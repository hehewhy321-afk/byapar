/**
 * BYAPAR (व्यापार) - Bill Image Domain Models & Upload Contract
 * Defines canonical metadata interfaces for Cloudflare R2 + Supabase storage.
 */

export type BillImageStatus = 'pending' | 'uploaded' | 'failed' | 'deleted';

export interface BillImage {
  id: string;
  businessId: string;
  billId?: string | null;
  uploadedBy: string;
  objectKey: string;
  mimeType: string;
  fileSizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  checksumSha256?: string | null;
  status: BillImageStatus;
  createdAt: string;
  uploadedAt?: string | null;
  deletedAt?: string | null;
}

export interface CreateBillUploadRequest {
  businessId: string;
  billId?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
}

export interface CreateBillUploadResponse {
  success?: boolean;
  uploadUrl: string;
  imageId: string;
  objectKey: string;
  expiresIn: number;
  message?: string;
}

export interface CompleteBillUploadRequest {
  imageId: string;
  businessId: string;
  billId?: string;
  setPrimary?: boolean;
}

export interface CompleteBillUploadResponse {
  success: boolean;
  image?: BillImage;
  record?: BillImage;
  message?: string;
}

export interface GetBillImageUrlRequest {
  imageId: string;
  businessId: string;
}

export interface GetBillImageUrlResponse {
  success?: boolean;
  signedUrl: string;
  expiresIn: number;
  mimeType?: string;
  message?: string;
}

export interface DeleteBillImageRequest {
  imageId: string;
  businessId: string;
}

export interface DeleteBillImageResponse {
  success: boolean;
  deletedId: string;
}
