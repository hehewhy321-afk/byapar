-- Migration: 20260924100000_admin_phase2_phase3_advanced.sql
-- Description: Phase 2 and Phase 3 Industrial-Grade Admin capabilities:
-- Feature flags, Promo & coupon engine, Support ticket desk, Scheduled broadcasts,
-- Merchant onboarding tracker, RBAC roles, System health monitoring, Webhooks,
-- Merchant white-label branding, and Compliance data exports.

-- 1. Feature Flags Platform & Overrides
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key varchar UNIQUE NOT NULL,
    name varchar NOT NULL,
    description text,
    category varchar NOT NULL DEFAULT 'core',
    default_enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_feature_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    feature_key varchar REFERENCES public.feature_flags(key) ON DELETE CASCADE,
    enabled boolean NOT NULL,
    updated_at timestamptz DEFAULT now(),
    UNIQUE(business_id, feature_key)
);

-- 2. Coupons & Promo Engine
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar UNIQUE NOT NULL,
    description text,
    discount_type varchar NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed_amount'
    discount_value numeric NOT NULL DEFAULT 10,
    applies_to_tier varchar DEFAULT 'all', -- 'all', 'pro', 'enterprise'
    max_redemptions integer DEFAULT 100,
    current_redemptions integer DEFAULT 0,
    min_amount numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    discount_applied numeric NOT NULL,
    redeemed_at timestamptz DEFAULT now()
);

-- 3. Support Ticket Desk
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number varchar UNIQUE NOT NULL,
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    subject varchar NOT NULL,
    category varchar DEFAULT 'general', -- 'billing', 'bug', 'feature_request', 'hardware_soundbox', 'fonepay_qr', 'general'
    priority varchar DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status varchar DEFAULT 'open', -- 'open', 'in_progress', 'waiting_on_merchant', 'resolved', 'closed'
    assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_type varchar NOT NULL DEFAULT 'merchant', -- 'merchant', 'admin', 'system'
    sender_name varchar,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- 4. Scheduled Broadcasts Engine
CREATE TABLE IF NOT EXISTS public.scheduled_broadcasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar NOT NULL,
    message text NOT NULL,
    category varchar DEFAULT 'announcement',
    target_audience varchar DEFAULT 'all', -- 'all', 'free', 'pro', 'inactive_7d', 'kathmandu'
    scheduled_for timestamptz NOT NULL,
    status varchar DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'cancelled'
    sent_at timestamptz,
    recipient_count integer DEFAULT 0,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- 5. Merchant Onboarding Wizard Tracking
CREATE TABLE IF NOT EXISTS public.merchant_onboarding (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    profile_completed boolean DEFAULT false,
    first_item_added boolean DEFAULT false,
    first_invoice_created boolean DEFAULT false,
    fonepay_qr_linked boolean DEFAULT false,
    staff_invited boolean DEFAULT false,
    mobile_app_paired boolean DEFAULT false,
    backup_configured boolean DEFAULT false,
    completion_percentage integer DEFAULT 0,
    last_milestone_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. Multi-Admin RBAC Team Roles
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role varchar NOT NULL DEFAULT 'support_agent', -- 'super_admin', 'support_agent', 'finance_billing', 'operations_manager'
    permissions jsonb DEFAULT '[]'::jsonb,
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 7. System & API Health Telemetry
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service varchar NOT NULL,
    status varchar NOT NULL DEFAULT 'operational', -- 'operational', 'degraded', 'outage'
    latency_ms integer DEFAULT 25,
    uptime_pct numeric DEFAULT 99.98,
    error_rate numeric DEFAULT 0.01,
    recorded_at timestamptz DEFAULT now()
);

-- 8. Webhooks & Event Deliveries
CREATE TABLE IF NOT EXISTS public.webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    name varchar NOT NULL,
    url text NOT NULL,
    secret text NOT NULL,
    events jsonb DEFAULT '["invoice.created"]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id uuid REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event varchar NOT NULL,
    payload jsonb NOT NULL,
    response_status integer,
    response_body text,
    delivered_at timestamptz DEFAULT now(),
    success boolean DEFAULT true
);

-- 9. White-Label & Receipt Customization
CREATE TABLE IF NOT EXISTS public.merchant_branding (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    receipt_template varchar DEFAULT 'classic_nepali',
    accent_color varchar DEFAULT '#FF4500',
    custom_subdomain varchar UNIQUE,
    qr_header_text text DEFAULT 'Scan & Pay with FonePay / eSewa',
    receipt_footer_text text DEFAULT 'धन्यवाद! फेरी भेटौला। (Thank You, Visit Again)',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 10. Compliance & Data Exports
CREATE TABLE IF NOT EXISTS public.compliance_data_exports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    export_type varchar NOT NULL DEFAULT 'full_archive',
    status varchar DEFAULT 'completed',
    file_url text,
    file_size_bytes bigint DEFAULT 0,
    expires_at timestamptz DEFAULT (now() + interval '7 days'),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_data_exports ENABLE ROW LEVEL SECURITY;

-- Permissive dev policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access feature_flags" ON public.feature_flags;
    CREATE POLICY "Public access feature_flags" ON public.feature_flags FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access business_feature_overrides" ON public.business_feature_overrides;
    CREATE POLICY "Public access business_feature_overrides" ON public.business_feature_overrides FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access promo_codes" ON public.promo_codes;
    CREATE POLICY "Public access promo_codes" ON public.promo_codes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access promo_redemptions" ON public.promo_redemptions;
    CREATE POLICY "Public access promo_redemptions" ON public.promo_redemptions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access support_tickets" ON public.support_tickets;
    CREATE POLICY "Public access support_tickets" ON public.support_tickets FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access support_ticket_messages" ON public.support_ticket_messages;
    CREATE POLICY "Public access support_ticket_messages" ON public.support_ticket_messages FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access scheduled_broadcasts" ON public.scheduled_broadcasts;
    CREATE POLICY "Public access scheduled_broadcasts" ON public.scheduled_broadcasts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access merchant_onboarding" ON public.merchant_onboarding;
    CREATE POLICY "Public access merchant_onboarding" ON public.merchant_onboarding FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access admin_roles" ON public.admin_roles;
    CREATE POLICY "Public access admin_roles" ON public.admin_roles FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access system_health_metrics" ON public.system_health_metrics;
    CREATE POLICY "Public access system_health_metrics" ON public.system_health_metrics FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access webhooks" ON public.webhooks;
    CREATE POLICY "Public access webhooks" ON public.webhooks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access webhook_deliveries" ON public.webhook_deliveries;
    CREATE POLICY "Public access webhook_deliveries" ON public.webhook_deliveries FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access merchant_branding" ON public.merchant_branding;
    CREATE POLICY "Public access merchant_branding" ON public.merchant_branding FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access compliance_data_exports" ON public.compliance_data_exports;
    CREATE POLICY "Public access compliance_data_exports" ON public.compliance_data_exports FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Populate default feature flags
INSERT INTO public.feature_flags (key, name, description, category, default_enabled) VALUES
('ai_smart_invoicing', 'AI Smart Receipt Scanner', 'Nepali receipt image and bill parsing with automatic item extraction', 'ai', true),
('fonepay_dynamic_qr', 'FonePay Dynamic QR Checkout', 'Real-time invoice QR generation with automatic payment confirmation callback', 'payments', true),
('advanced_khata_aging', 'Khata Overdue Aging & Automated SMS', 'Automated customer credit alerts and 30/60/90 days debt risk tracking', 'credit', true),
('soundbox_speaker', 'Voice Soundbox Announcement', 'Instant Nepali audio announcement of incoming QR payments on speaker', 'hardware', false),
('ecommerce_storefront', 'Merchant Online Catalog Link', 'Public web catalog where local customers can place WhatsApp delivery orders', 'online', false),
('multi_branch_sync', 'Multi-Warehouse & Multi-Branch Sync', 'Stock transfers and centralized inventory across multiple kirana locations', 'inventory', false),
('ird_vat_compliance', 'Inland Revenue Dept (IRD) Auditing Mode', 'Cryptographically signed sales book for IRD compliance reporting', 'compliance', true),
('custom_thermal_receipts', 'Custom Thermal Printing Layouts', 'Customizable 58mm and 80mm ESC/POS thermal receipt formatting', 'hardware', true)
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Populate default promo codes
INSERT INTO public.promo_codes (code, description, discount_type, discount_value, applies_to_tier, max_redemptions, current_redemptions, is_active, expires_at) VALUES
('DASHAIN2026', 'Dashain Festival Merchant Special - 50% Off Annual Plan', 'percentage', 50, 'all', 200, 14, true, now() + interval '90 days'),
('KIRANASTART', 'First month free on Pro subscription for new Kirana stores', 'percentage', 100, 'pro', 500, 48, true, now() + interval '180 days'),
('SOUNDBOXFREE', 'NPR 1,000 off Soundbox bundle subscription', 'fixed_amount', 1000, 'enterprise', 50, 6, true, now() + interval '60 days')
ON CONFLICT (code) DO NOTHING;

-- Populate system health metrics baseline
INSERT INTO public.system_health_metrics (service, status, latency_ms, uptime_pct, error_rate) VALUES
('PostgreSQL Database Engine', 'operational', 18, 99.99, 0.00),
('Supabase Auth & Session Guard', 'operational', 24, 100.0, 0.00),
('Realtime WebSocket Bus', 'operational', 32, 99.97, 0.02),
('Storage & Bill Gallery CDN', 'operational', 45, 99.95, 0.01),
('FonePay Payment Gateway API', 'operational', 110, 99.85, 0.05),
('Firebase Cloud Messaging (FCM)', 'operational', 85, 99.90, 0.03);
