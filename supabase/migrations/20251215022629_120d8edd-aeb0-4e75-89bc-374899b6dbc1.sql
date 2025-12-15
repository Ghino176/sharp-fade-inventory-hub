-- Create barbers table
CREATE TABLE public.barbers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    cuts_count INTEGER NOT NULL DEFAULT 0,
    beards_count INTEGER NOT NULL DEFAULT 0,
    eyebrows_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    barber_id UUID REFERENCES public.barbers(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('corte', 'barba', 'ceja')),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 5,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create public read/write policies (since this is a management app without auth for now)
CREATE POLICY "Allow public read on barbers" ON public.barbers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on barbers" ON public.barbers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on barbers" ON public.barbers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on barbers" ON public.barbers FOR DELETE USING (true);

CREATE POLICY "Allow public read on services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Allow public insert on services" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on services" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on services" ON public.services FOR DELETE USING (true);

CREATE POLICY "Allow public read on inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert on inventory" ON public.inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on inventory" ON public.inventory FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on inventory" ON public.inventory FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_barbers_updated_at
    BEFORE UPDATE ON public.barbers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON public.inventory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for services table
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;