-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create barbers table
CREATE TABLE public.barbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  start_date DATE,
  specialties TEXT[],
  services_completed INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  service_time TEXT,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  unit_price DECIMAL(10,2) DEFAULT 0,
  supplier TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory transactions table
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('entrada', 'salida')),
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a business app)
-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Barbers policies (public access for business operations)
CREATE POLICY "Barbers are viewable by everyone" 
ON public.barbers FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage barbers" 
ON public.barbers FOR ALL USING (auth.role() = 'authenticated');

-- Services policies (public access for business operations)
CREATE POLICY "Services are viewable by everyone" 
ON public.services FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage services" 
ON public.services FOR ALL USING (auth.role() = 'authenticated');

-- Inventory policies (public access for business operations)
CREATE POLICY "Inventory items are viewable by everyone" 
ON public.inventory_items FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage inventory" 
ON public.inventory_items FOR ALL USING (auth.role() = 'authenticated');

-- Inventory transactions policies
CREATE POLICY "Inventory transactions are viewable by everyone" 
ON public.inventory_transactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage transactions" 
ON public.inventory_transactions FOR ALL USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data for barbers
INSERT INTO public.barbers (name, phone, email, start_date, specialties, services_completed, total_earnings) VALUES
('Víctor Hugo', '0414-6494083', '', '2023-03-28', ARRAY['Corte clásico', 'Afeitado', 'Arreglo de barba'], 156, 2340.00),
('David Velázquez', '0414-6494083', '', '2023-03-28', ARRAY['Corte moderno', 'Cejas', 'Degradado'], 89, 1335.00),
('Ricardo Vargas', '0414-6100630', '', '2023-01-15', ARRAY['Barba', 'Bigote', 'Corte tradicional'], 203, 3045.00);

-- Insert sample data for inventory items
INSERT INTO public.inventory_items (name, category, quantity, min_stock, unit_price, supplier) VALUES
('Champú Profesional', 'Cuidado Capilar', 15, 5, 12.50, 'Distribuidora Beauty'),
('Cera para Cabello', 'Productos de Peinado', 8, 3, 8.75, 'Distribuidora Beauty'),
('Máquina de Cortar', 'Herramientas', 3, 1, 85.00, 'Equipos Profesionales'),
('Navaja de Afeitar', 'Herramientas', 12, 5, 15.20, 'Equipos Profesionales'),
('Toallas', 'Accesorios', 25, 10, 3.50, 'Textiles del Sur'),
('Gel de Afeitar', 'Productos de Afeitado', 6, 4, 6.80, 'Distribuidora Beauty');