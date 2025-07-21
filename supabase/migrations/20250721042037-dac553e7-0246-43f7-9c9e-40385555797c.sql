-- Create function to increment barber stats when a service is added
CREATE OR REPLACE FUNCTION increment_barber_stats(
  barber_id UUID,
  service_price DECIMAL
)
RETURNS void AS $$
BEGIN
  UPDATE public.barbers 
  SET 
    services_completed = services_completed + 1,
    total_earnings = total_earnings + service_price,
    updated_at = now()
  WHERE id = barber_id;
END;
$$ LANGUAGE plpgsql;