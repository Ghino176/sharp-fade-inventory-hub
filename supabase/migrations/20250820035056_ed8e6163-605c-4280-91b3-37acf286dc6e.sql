-- Relax RLS to allow anonymous writes (since the app has no auth UI yet)
-- This enables INSERT/UPDATE/DELETE for both 'anon' and 'authenticated' roles on key tables

-- Barbers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'barbers' AND policyname = 'Anonymous can manage barbers'
  ) THEN
    CREATE POLICY "Anonymous can manage barbers"
    ON public.barbers
    FOR ALL
    USING (auth.role() IN ('anon','authenticated'))
    WITH CHECK (auth.role() IN ('anon','authenticated'));
  END IF;
END $$;

-- Services
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'services' AND policyname = 'Anonymous can manage services'
  ) THEN
    CREATE POLICY "Anonymous can manage services"
    ON public.services
    FOR ALL
    USING (auth.role() IN ('anon','authenticated'))
    WITH CHECK (auth.role() IN ('anon','authenticated'));
  END IF;
END $$;

-- Inventory Items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'inventory_items' AND policyname = 'Anonymous can manage inventory items'
  ) THEN
    CREATE POLICY "Anonymous can manage inventory items"
    ON public.inventory_items
    FOR ALL
    USING (auth.role() IN ('anon','authenticated'))
    WITH CHECK (auth.role() IN ('anon','authenticated'));
  END IF;
END $$;

-- Inventory Transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'inventory_transactions' AND policyname = 'Anonymous can manage inventory transactions'
  ) THEN
    CREATE POLICY "Anonymous can manage inventory transactions"
    ON public.inventory_transactions
    FOR ALL
    USING (auth.role() IN ('anon','authenticated'))
    WITH CHECK (auth.role() IN ('anon','authenticated'));
  END IF;
END $$;