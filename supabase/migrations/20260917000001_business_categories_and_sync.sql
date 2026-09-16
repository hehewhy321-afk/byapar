-- Migration: Business Categories Seeding & handle_new_user Trigger Enhancement
-- Date: 2026-09-17

-- 1. Create helper function to seed industry-specific categories for any business
CREATE OR REPLACE FUNCTION public.seed_business_categories(p_biz_id UUID, p_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CASE LOWER(COALESCE(p_type, 'general'))
        WHEN 'clothing' THEN
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Men''s Wear', '#3B82F6'),
                (p_biz_id, 'Women''s Wear', '#EC4899'),
                (p_biz_id, 'Kids & Baby', '#F59E0B'),
                (p_biz_id, 'Fabrics & Sarees', '#8B5CF6'),
                (p_biz_id, 'Footwear', '#10B981'),
                (p_biz_id, 'Winter Wear', '#06B6D4'),
                (p_biz_id, 'Formal & Suits', '#64748B'),
                (p_biz_id, 'Traditional & Kurtha', '#F43F5E'),
                (p_biz_id, 'Accessories & Belts', '#D97706')
            ON CONFLICT DO NOTHING;

        WHEN 'bakery' THEN
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Cakes & Pastries', '#EC4899'),
                (p_biz_id, 'Breads & Buns', '#F59E0B'),
                (p_biz_id, 'Cookies & Biscuits', '#D97706'),
                (p_biz_id, 'Puffs & Savouries', '#EF4444'),
                (p_biz_id, 'Chocolates & Desserts', '#8B5CF6'),
                (p_biz_id, 'Beverages & Coffee', '#10B981'),
                (p_biz_id, 'Baking Ingredients', '#64748B')
            ON CONFLICT DO NOTHING;

        WHEN 'electronics' THEN
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Smartphones & Tablets', '#3B82F6'),
                (p_biz_id, 'Cables & Chargers', '#10B981'),
                (p_biz_id, 'Audio & Earphones', '#8B5CF6'),
                (p_biz_id, 'Phone Cases & Glass', '#F59E0B'),
                (p_biz_id, 'Home Appliances', '#06B6D4'),
                (p_biz_id, 'Computers & Laptops', '#64748B'),
                (p_biz_id, 'Power Banks & Batteries', '#EF4444'),
                (p_biz_id, 'Smartwatches & Fitness', '#14B8A6')
            ON CONFLICT DO NOTHING;

        WHEN 'foods' THEN
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Hot Beverages & Tea', '#D97706'),
                (p_biz_id, 'Cold Drinks & Juices', '#06B6D4'),
                (p_biz_id, 'Fast Food & MoMo', '#EF4444'),
                (p_biz_id, 'Breakfast & Bakery', '#F59E0B'),
                (p_biz_id, 'Main Course (Thali)', '#10B981'),
                (p_biz_id, 'Snacks & Starters', '#8B5CF6'),
                (p_biz_id, 'Desserts & Ice Cream', '#EC4899')
            ON CONFLICT DO NOTHING;

        WHEN 'hotel' THEN
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Room Tariff', '#3B82F6'),
                (p_biz_id, 'Food & Dining', '#10B981'),
                (p_biz_id, 'Beverages & Mini-Bar', '#06B6D4'),
                (p_biz_id, 'Laundry Services', '#8B5CF6'),
                (p_biz_id, 'Spa & Wellness', '#EC4899'),
                (p_biz_id, 'Banquet & Events', '#F59E0B'),
                (p_biz_id, 'Tour & Transport', '#64748B')
            ON CONFLICT DO NOTHING;

        WHEN 'pharmacy' THEN
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Antibiotics & Prescription', '#EF4444'),
                (p_biz_id, 'Pain Relief & Fever', '#F59E0B'),
                (p_biz_id, 'Cold, Cough & Allergy', '#06B6D4'),
                (p_biz_id, 'Vitamins & Supplements', '#10B981'),
                (p_biz_id, 'Digestive & Gastro', '#8B5CF6'),
                (p_biz_id, 'First Aid & Bandages', '#EC4899'),
                (p_biz_id, 'Baby & Mother Care', '#3B82F6'),
                (p_biz_id, 'Surgical & Diagnostic', '#64748B')
            ON CONFLICT DO NOTHING;

        WHEN 'hardware' THEN
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Hand & Power Tools', '#3B82F6'),
                (p_biz_id, 'Paints & Primers', '#EC4899'),
                (p_biz_id, 'Plumbing & Pipes', '#06B6D4'),
                (p_biz_id, 'Electrical & Wiring', '#F59E0B'),
                (p_biz_id, 'Fasteners & Screws', '#64748B'),
                (p_biz_id, 'Sanitaryware & Taps', '#10B981'),
                (p_biz_id, 'Adhesives & Sealants', '#8B5CF6')
            ON CONFLICT DO NOTHING;

        WHEN 'cosmetics' THEN
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Skincare & Lotions', '#EC4899'),
                (p_biz_id, 'Haircare & Shampoo', '#8B5CF6'),
                (p_biz_id, 'Makeup & Cosmetics', '#F43F5E'),
                (p_biz_id, 'Perfumes & Deodorants', '#3B82F6'),
                (p_biz_id, 'Bath & Body Care', '#10B981'),
                (p_biz_id, 'Men''s Grooming', '#64748B'),
                (p_biz_id, 'Sun Protection', '#F59E0B')
            ON CONFLICT DO NOTHING;

        ELSE -- 'general' / 'grocery' / 'kirana' / default
            INSERT INTO public.categories (business_id, name, color_code) VALUES
                (p_biz_id, 'Dal & Pulses', '#F59E0B'),
                (p_biz_id, 'Rice & Grains', '#D97706'),
                (p_biz_id, 'Oil & Ghee', '#EAB308'),
                (p_biz_id, 'Spices & Masala', '#EF4444'),
                (p_biz_id, 'Biscuits & Snacks', '#EC4899'),
                (p_biz_id, 'Beverages & Cold Drinks', '#06B6D4'),
                (p_biz_id, 'Dairy Products', '#10B981'),
                (p_biz_id, 'Personal Care', '#8B5CF6'),
                (p_biz_id, 'Cleaning & Household', '#3B82F6'),
                (p_biz_id, 'Instant Noodles', '#F97316')
            ON CONFLICT DO NOTHING;
    END CASE;
END;
$$;

-- 2. Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_biz_id UUID;
    user_name TEXT;
    biz_name TEXT;
    biz_type TEXT;
    user_phone TEXT;
BEGIN
    user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Owner');
    biz_name := COALESCE(NEW.raw_user_meta_data->>'business_name', NEW.raw_user_meta_data->>'store_name', user_name || ' Store');
    biz_type := COALESCE(NEW.raw_user_meta_data->>'business_type', 'general');
    user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone);

    -- Create or update profile
    INSERT INTO public.profiles (id, full_name, phone_number, preferred_language, calendar_mode)
    VALUES (NEW.id, user_name, user_phone, 'ne', 'BS')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number);

    -- Create default business for new user
    INSERT INTO public.businesses (name, business_type, phone)
    VALUES (biz_name, biz_type, user_phone)
    RETURNING id INTO new_biz_id;

    -- Assign user as owner of business
    INSERT INTO public.business_members (business_id, user_id, role)
    VALUES (new_biz_id, NEW.id, 'owner')
    ON CONFLICT (business_id, user_id) DO NOTHING;

    -- Seed standard product categories for this business based on business_type
    PERFORM public.seed_business_categories(new_biz_id, biz_type);

    RETURN NEW;
END;
$$;
