-- Fix Supabase Security Linter: 0010_security_definer_view
-- View public.merchant_subscriptions must enforce Postgres permissions and RLS of the querying user (security_invoker)
-- rather than the view creator (security_definer).

ALTER VIEW public.merchant_subscriptions SET (security_invoker = true);
