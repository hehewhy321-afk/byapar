-- Migration: 20260928000000_fix_rls_recursion_timeouts_and_demo_access.sql
-- Description:
-- 1. Redefines is_business_member and is_admin_user using PL/pgSQL, SECURITY DEFINER, and explicit search_path
--    to prevent query optimizer inlining and avoid infinite RLS recursion & 57014 statement timeouts.
-- 2. Sets fixed search_path on handle_new_user and seed_business_categories, and revokes anon RPC execution.
-- 3. Adds covering indexes on business_members (user_id) and (business_id, user_id) WHERE is_active = TRUE.
-- 4. Optimizes RLS policies across business_members, businesses, profiles, bill_images to use (SELECT auth.uid()).
-- 5. Enables demo store access for authenticated users across all _anon policies so demo data does not trigger 42501 / 403 errors.
-- 6. Adds tenant RLS policies on audit_logs.

-- 1. Helper functions
CREATE OR REPLACE FUNCTION public.is_business_member(b_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF b_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.business_members
    WHERE business_id = b_id
      AND user_id = auth.uid()
      AND is_active = TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_admin INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- 2. Security hardening on public functions
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.seed_business_categories(uuid, text) SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_business_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_business_members_user_id 
  ON public.business_members (user_id);

CREATE INDEX IF NOT EXISTS idx_business_members_biz_user_active 
  ON public.business_members (business_id, user_id) 
  WHERE is_active = TRUE;

-- 4. RLS Policies Optimization
DROP POLICY IF EXISTS "business_members_select" ON public.business_members;
CREATE POLICY "business_members_select" ON public.business_members
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_business_member(business_id)
  );

DROP POLICY IF EXISTS "business_members_insert" ON public.business_members;
CREATE POLICY "business_members_insert" ON public.business_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR is_business_member(business_id)
  );

DROP POLICY IF EXISTS "businesses_admin_all" ON public.businesses;
CREATE POLICY "businesses_admin_all" ON public.businesses
  FOR ALL TO authenticated
  USING (
    is_admin_user()
  );

DROP POLICY IF EXISTS "businesses_select" ON public.businesses;
CREATE POLICY "businesses_select" ON public.businesses
  FOR SELECT TO authenticated
  USING (
    is_business_member(id)
    OR (created_at > (now() - '00:01:00'::interval))
  );

DROP POLICY IF EXISTS "profiles_access" ON public.profiles;
CREATE POLICY "profiles_access" ON public.profiles
  FOR ALL TO authenticated
  USING (
    id = (SELECT auth.uid())
  )
  WITH CHECK (
    id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "bill_images_tenant_insert" ON public.bill_images;
CREATE POLICY "bill_images_tenant_insert" ON public.bill_images
  FOR INSERT TO authenticated
  WITH CHECK (
    is_business_member(business_id) 
    AND uploaded_by = (SELECT auth.uid()) 
    AND status = 'pending'
  );

-- 5. Audit logs policies
DROP POLICY IF EXISTS "audit_logs_tenant_select" ON public.audit_logs;
CREATE POLICY "audit_logs_tenant_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    is_admin_user()
    OR is_business_member(business_id)
  );

DROP POLICY IF EXISTS "audit_logs_tenant_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_tenant_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_user()
    OR is_business_member(business_id)
  );

-- 6. Demo store access: allow authenticated users to also access demo store
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    FOR pol IN 
      SELECT policyname 
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = tbl 
        AND policyname = tbl || '_anon'
    LOOP
      EXECUTE format('ALTER POLICY %I ON public.%I TO anon, authenticated', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;
