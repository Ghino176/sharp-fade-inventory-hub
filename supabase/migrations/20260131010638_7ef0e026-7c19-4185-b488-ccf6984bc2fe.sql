-- Add payment_method column to services table
ALTER TABLE public.services 
ADD COLUMN payment_method text DEFAULT 'efectivo';