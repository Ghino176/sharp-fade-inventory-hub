import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scissors, DollarSign, Calendar, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Barber {
  id: string;
  name: string;
}

interface Service {
  id: string;
  barber_id: string;
  service_type: string;
  price: number;
  created_at: string;
  barber?: Barber;
}

const ServicesManager = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newService, setNewService] = useState({
    barber_id: "",
    service_type: "",
    price: "",
  });

  const serviceTypes = [
    { name: "corte", label: "Corte", price: 6 },
    { name: "barba", label: "Barba", price: 3 },
    { name: "ceja", label: "Cejas", price: 1 },
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([fetchBarbers(), fetchServices()]);
    setLoading(false);
  };

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error fetching barbers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los barberos",
        variant: "destructive",
      });
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          barbers(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const servicesWithBarber = data?.map(service => ({
        ...service,
        barber: service.barbers ? {
          id: service.barbers.id,
          name: service.barbers.name
        } : undefined
      })) || [];
      
      setServices(servicesWithBarber);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los servicios",
        variant: "destructive",
      });
    }
  };

  const handleServiceTypeChange = (serviceType: string) => {
    const selectedService = serviceTypes.find(s => s.name === serviceType);
    setNewService(prev => ({
      ...prev,
      service_type: serviceType,
      price: selectedService ? selectedService.price.toString() : ""
    }));
  };

  const handleAddService = async () => {
    if (!newService.barber_id || !newService.service_type || !newService.price) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const serviceData = {
        barber_id: newService.barber_id,
        service_type: newService.service_type,
        price: parseFloat(newService.price),
      };

      const { data, error } = await supabase
        .from('services')
        .insert([serviceData])
        .select(`
          *,
          barbers(id, name)
        `)
        .single();

      if (error) throw error;

      // Update barber counts
      const countColumn = newService.service_type === 'corte' ? 'cuts_count' 
        : newService.service_type === 'barba' ? 'beards_count' 
        : 'eyebrows_count';

      // Update barber count manually
      const { data: currentBarber } = await supabase
        .from('barbers')
        .select('cuts_count, beards_count, eyebrows_count')
        .eq('id', newService.barber_id)
        .single();

      if (currentBarber) {
        const updateData: Record<string, number> = {};
        updateData[countColumn] = ((currentBarber as Record<string, number>)[countColumn] || 0) + 1;
        
        await supabase
          .from('barbers')
          .update(updateData)
          .eq('id', newService.barber_id);
      }

      const newServiceWithBarber = {
        ...data,
        barber: data.barbers ? {
          id: data.barbers.id,
          name: data.barbers.name
        } : undefined
      };

      setServices(prev => [newServiceWithBarber, ...prev]);
      setNewService({
        barber_id: "",
        service_type: "",
        price: "",
      });

      toast({
        title: "Servicio agregado",
        description: "Servicio registrado correctamente",
      });
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el servicio",
        variant: "destructive",
      });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar este servicio?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      setServices(prev => prev.filter(service => service.id !== serviceId));

      toast({
        title: "Servicio eliminado",
        description: "Servicio eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive",
      });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const totalToday = services
    .filter(s => s.created_at.startsWith(today))
    .reduce((sum, s) => sum + s.price, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Gestión de Servicios</h2>
        <div className="text-center py-8">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Gestión de Servicios</h2>
        <div className="flex items-center space-x-2 text-lg font-semibold">
          <DollarSign className="h-5 w-5" />
          <span>Total Hoy: ${totalToday.toFixed(2)}</span>
        </div>
      </div>

      {/* Add New Service */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Registrar Nuevo Servicio</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barber_id">Barbero</Label>
              <Select value={newService.barber_id} onValueChange={(value) => setNewService(prev => ({ ...prev, barber_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barbero" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_type">Servicio</Label>
              <Select value={newService.service_type} onValueChange={handleServiceTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.name} value={service.name}>
                      {service.label} - ${service.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={newService.price}
                onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Precio"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <Button onClick={handleAddService} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Servicio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5" />
            <span>Servicios Registrados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 rounded-lg bg-barbershop-light-gray hover:bg-secondary transition-colors"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-medium flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {service.barber?.name || 'Sin barbero'}
                    </p>
                    <p className="text-sm text-muted-foreground">Barbero</p>
                  </div>
                  <div>
                    <p className="font-medium capitalize">{service.service_type}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(service.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    <p className="font-bold text-lg text-green-600">${service.price.toFixed(2)}</p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {services.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay servicios registrados
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicesManager;
