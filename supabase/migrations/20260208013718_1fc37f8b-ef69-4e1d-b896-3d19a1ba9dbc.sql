-- Add concept column to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS concept text;