-- Drop the old constraint that limits service types
ALTER TABLE public.services DROP CONSTRAINT services_service_type_check;