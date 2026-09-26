-- ==============================================================================
-- Migration: 20260927000000_bill_images_storage.sql
-- Description: Authoritative bill images metadata table and hardened RLS
-- ==============================================================================

-- 1. Create bill_images table
CREATE TABLE IF NOT EXISTS public.bill_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  object_key TEXT NOT NULL UNIQUE,
  mime_type VARCHAR(50) NOT NULL DEFAULT 'image/webp',
  file_size_bytes BIGINT,
  width INTEGER,
  height INTEGER,
  checksum_sha256 TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'failed', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 2. Add primary_image_id to bills table
ALTER TABLE public.bills 
  ADD COLUMN IF NOT EXISTS primary_image_id UUID REFERENCES public.bill_images(id) ON DELETE SET NULL;

-- 3. Create high-performance indexes
CREATE INDEX IF NOT EXISTS idx_bill_images_business_id ON public.bill_images(business_id);
CREATE INDEX IF NOT EXISTS idx_bill_images_bill_id ON public.bill_images(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_images_status ON public.bill_images(status);
CREATE INDEX IF NOT EXISTS idx_bill_images_created_at ON public.bill_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_primary_image_id ON public.bills(primary_image_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.bill_images ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Policy 1: SELECT (Active members of the business can read non-deleted bill images)
CREATE POLICY "bill_images_tenant_select" ON public.bill_images
  FOR SELECT TO authenticated
  USING (
    is_business_member(business_id) 
    AND deleted_at IS NULL
  );

-- Policy 2: INSERT (Authenticated users can create pending image records for their business)
CREATE POLICY "bill_images_tenant_insert" ON public.bill_images
  FOR INSERT TO authenticated
  WITH CHECK (
    is_business_member(business_id)
    AND uploaded_by = auth.uid()
    AND status = 'pending'
  );

-- Policy 3: UPDATE (Locked from client; Edge Functions update status via service-role key)
-- Deliberately NO permissive client UPDATE policy to prevent tampering with object_key or status.

-- Policy 4: DELETE (Active business members can delete bill images)
CREATE POLICY "bill_images_tenant_delete" ON public.bill_images
  FOR DELETE TO authenticated
  USING (is_business_member(business_id));
