-- Add barber_earning column to services table
ALTER TABLE public.services ADD COLUMN barber_earning numeric NOT NULL DEFAULT 0;

-- Add comment explaining the columns
COMMENT ON COLUMN public.services.price IS 'Customer price for the service';
COMMENT ON COLUMN public.services.barber_earning IS 'Amount the barber earns for this service';