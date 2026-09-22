-- Migration: Add owner_name to public.businesses table
-- Date: 2026-09-19

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);
