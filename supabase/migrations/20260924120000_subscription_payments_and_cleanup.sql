-- Migration: 20260924120000_subscription_payments_and_cleanup.sql
-- Description: Creates subscription_transactions table, adds Fonepay QR columns to businesses, removes Soundbox and AI OCR features

-- 1. Remove Soundbox and AI features from feature_flags
DELETE FROM public.business_feature_overrides WHERE feature_key IN ('soundbox_speaker', 'ai_smart_invoicing');
DELETE FROM public.feature_flags WHERE key IN ('soundbox_speaker', 'ai_smart_invoicing');

-- 2. Update subscription_plans to remove soundbox and ai_receipt_ocr from features
UPDATE public.subscription_plans
SET 
    features = (features - 'soundbox' - 'ai_receipt_ocr'),
    description = CASE 
        WHEN id = 'pro_99' THEN 'Comprehensive kirana suite with IRD VAT audit, 2-store support, and advanced analytics'
        WHEN id = 'enterprise_149' THEN 'Chain mart power pack: Unlimited bills, up to 5 stores, webhooks, and priority helpline'
        ELSE description
    END;

-- 3. Create subscription_transactions table
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    business_name text,
    plan_tier varchar NOT NULL,
    billing_cycle varchar NOT NULL DEFAULT 'monthly',
    gateway varchar NOT NULL, -- 'esewa', 'revenuecat_playstore', 'manual_admin'
    amount numeric NOT NULL,
    currency varchar NOT NULL DEFAULT 'NPR',
    transaction_code varchar,
    transaction_uuid varchar UNIQUE NOT NULL,
    promo_code varchar,
    discount_amount numeric DEFAULT 0,
    status varchar NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    gateway_response jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all subscription_transactions" ON public.subscription_transactions;
CREATE POLICY "Allow all subscription_transactions" ON public.subscription_transactions
    FOR ALL USING (true) WITH CHECK (true);

-- Realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'subscription_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_transactions;
    END IF;
END $$;

-- 4. Add Fonepay QR columns to businesses table if they don't exist
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS fonepay_qr_image text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS fonepay_merchant_id text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS fonepay_merchant_name text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS fonepay_qr_payload text;
