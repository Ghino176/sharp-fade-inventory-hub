-- Fix linter warnings: set immutable search_path on functions

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user (keep SECURITY DEFINER and set search_path)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', new.email));
  RETURN new;
END;
$$;

-- increment_barber_stats
CREATE OR REPLACE FUNCTION public.increment_barber_stats(barber_id uuid, service_price numeric)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.barbers 
  SET 
    services_completed = services_completed + 1,
    total_earnings = total_earnings + service_price,
    updated_at = now()
  WHERE id = barber_id;
END;
$$;