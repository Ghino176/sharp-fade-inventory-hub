-- Add barber_id to profiles to link users with barbers
ALTER TABLE public.profiles 
ADD COLUMN barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_barber_id ON public.profiles(barber_id);