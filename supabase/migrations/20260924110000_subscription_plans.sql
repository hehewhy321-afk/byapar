-- Migration: 20260924110000_subscription_plans.sql
-- Description: Creates dynamic subscription_plans table controllable from admin and synced across web and mobile

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id varchar PRIMARY KEY, -- 'free', 'starter_49', 'pro_99', 'enterprise_149'
    name varchar NOT NULL,
    description text,
    monthly_price numeric NOT NULL DEFAULT 0,
    annual_price numeric NOT NULL DEFAULT 0,
    currency varchar NOT NULL DEFAULT 'NPR',
    daily_bill_upload_limit integer NOT NULL DEFAULT 3, -- -1 for unlimited
    max_staff_accounts integer NOT NULL DEFAULT 1,      -- -1 for unlimited
    max_stores_allowed integer NOT NULL DEFAULT 1,      -- -1 for unlimited
    features jsonb NOT NULL DEFAULT '{}'::jsonb,
    badge_text varchar,
    is_popular boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active plans
DROP POLICY IF EXISTS "Public access subscription_plans" ON public.subscription_plans;
CREATE POLICY "Public access subscription_plans" ON public.subscription_plans
    FOR ALL USING (true) WITH CHECK (true);

-- Seed Default 4 Plans
INSERT INTO public.subscription_plans (
    id, name, description, monthly_price, annual_price, currency,
    daily_bill_upload_limit, max_staff_accounts, max_stores_allowed,
    features, badge_text, is_popular, is_active, sort_order
) VALUES
(
    'free',
    'Free Tier',
    'Perfect for small local dukans starting digital ledger and basic invoicing',
    0,
    0,
    'NPR',
    3,
    1,
    1,
    '{"unlimited_invoices": true, "thermal_printing": true, "khata_ledger": true, "whatsapp_reminders": false, "soundbox": false, "ird_vat_audit": false, "custom_branding": false, "multi_store": false, "webhooks": false, "ai_receipt_ocr": false, "cloud_backup": "weekly"}'::jsonb,
    'Free Forever',
    false,
    true,
    1
),
(
    'starter_49',
    'Starter Plan',
    'For growing grocery and kirana stores needing automated WhatsApp reminders and 2 staff seats',
    49,
    499,
    'NPR',
    15,
    2,
    1,
    '{"unlimited_invoices": true, "thermal_printing": true, "khata_ledger": true, "whatsapp_reminders": true, "soundbox": false, "ird_vat_audit": false, "custom_branding": false, "multi_store": false, "webhooks": false, "ai_receipt_ocr": false, "cloud_backup": "daily"}'::jsonb,
    'Basic Value',
    false,
    true,
    2
),
(
    'pro_99',
    'Pro Cloud',
    'Comprehensive kirana suite with Smart Voice Soundbox, IRD VAT audit, and 2-store support',
    99,
    999,
    'NPR',
    50,
    5,
    2,
    '{"unlimited_invoices": true, "thermal_printing": true, "khata_ledger": true, "whatsapp_reminders": true, "soundbox": true, "ird_vat_audit": true, "custom_branding": true, "multi_store": true, "webhooks": false, "ai_receipt_ocr": false, "cloud_backup": "realtime"}'::jsonb,
    'Most Popular',
    true,
    true,
    3
),
(
    'enterprise_149',
    'Enterprise Mart',
    'Chain mart power pack: Unlimited bills, AI Camera OCR scanning, up to 5 stores, and webhooks',
    149,
    1499,
    'NPR',
    -1,
    -1,
    5,
    '{"unlimited_invoices": true, "thermal_printing": true, "khata_ledger": true, "whatsapp_reminders": true, "soundbox": true, "ird_vat_audit": true, "custom_branding": true, "multi_store": true, "webhooks": true, "ai_receipt_ocr": true, "cloud_backup": "realtime", "priority_helpline": true}'::jsonb,
    'Enterprise Power',
    false,
    true,
    4
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    daily_bill_upload_limit = EXCLUDED.daily_bill_upload_limit,
    max_staff_accounts = EXCLUDED.max_staff_accounts,
    max_stores_allowed = EXCLUDED.max_stores_allowed,
    features = EXCLUDED.features,
    badge_text = EXCLUDED.badge_text,
    is_popular = EXCLUDED.is_popular,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- Ensure realtime publication includes subscription_plans
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'subscription_plans'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_plans;
    END IF;
END $$;
