-- Migration: 20260924000000_notifications_and_admin_system.sql
-- Description: Adds notifications, enhanced reminders, subscriptions, admin broadcasts, and user device tokens

-- 1. Add is_admin to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Enhance reminders table
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS reminder_type varchar DEFAULT 'customer_due';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS frequency varchar DEFAULT 'once';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS notify_web boolean DEFAULT true;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS notify_mobile boolean DEFAULT true;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    title varchar NOT NULL,
    message text NOT NULL,
    type varchar NOT NULL DEFAULT 'general',
    priority varchar NOT NULL DEFAULT 'normal',
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    read_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_tier varchar NOT NULL DEFAULT 'free',
    billing_cycle varchar NOT NULL DEFAULT 'monthly',
    status varchar NOT NULL DEFAULT 'active',
    starts_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
    price numeric DEFAULT 0,
    currency varchar DEFAULT 'NPR',
    features jsonb DEFAULT '{"multi_device": true, "soundbox": false, "unlimited_invoices": true}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. Create admin_broadcasts table
CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar NOT NULL,
    message text NOT NULL,
    category varchar DEFAULT 'announcement',
    target_audience varchar DEFAULT 'all',
    target_business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
    action_url text,
    sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    recipient_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 6. Create user_devices table for device push tokens (Firebase FCM / Web Push)
CREATE TABLE IF NOT EXISTS public.user_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    player_id text NOT NULL,
    platform varchar NOT NULL,
    device_info jsonb DEFAULT '{}'::jsonb,
    last_active_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, player_id)
);

-- 7. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- 8. Add policies (permissive for anon/authenticated in this dev phase, aligned with project's existing policies)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access notifications" ON public.notifications;
    CREATE POLICY "Public access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access subscriptions" ON public.subscriptions;
    CREATE POLICY "Public access subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access admin_broadcasts" ON public.admin_broadcasts;
    CREATE POLICY "Public access admin_broadcasts" ON public.admin_broadcasts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access user_devices" ON public.user_devices;
    CREATE POLICY "Public access user_devices" ON public.user_devices FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 9. Ensure notifications and reminders are in realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reminders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
    END IF;
END $$;
