-- ==============================================================================
-- Migration: 20260927010000_expense_income_receipt_images.sql
-- Description: Allow Cloudflare R2 bill_images to be linked to expenses & income
-- ==============================================================================

-- 1. Make bill_id in bill_images optional so images can be attached to expenses/incomes
ALTER TABLE public.bill_images 
  ALTER COLUMN bill_id DROP NOT NULL;

-- 2. Add primary_image_id to expenses table
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS primary_image_id UUID REFERENCES public.bill_images(id) ON DELETE SET NULL;

-- 3. Add primary_image_id to incomes table
ALTER TABLE public.incomes 
  ADD COLUMN IF NOT EXISTS primary_image_id UUID REFERENCES public.bill_images(id) ON DELETE SET NULL;

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_expenses_primary_image_id ON public.expenses(primary_image_id);
CREATE INDEX IF NOT EXISTS idx_incomes_primary_image_id ON public.incomes(primary_image_id);
