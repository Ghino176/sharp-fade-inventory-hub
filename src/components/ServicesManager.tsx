import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scissors, DollarSign, Calendar, Clock, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Barber {
  id: string;
  name: string;
  status: string;
}

interface Service {
  id: string;
  client_name: string;
  barber_id: string;
  service_type: string;
  price: number;
  service_time: string;
  service_date: string;
  notes?: string;
  barber?: Barber;
}

const ServicesManager = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newService, setNewService] = useState({
    client_name: "",
    barber_id: "",
    service_type: "",
    price: "",
    service_time: "",
    notes: "",
  });

  const serviceTypes = [
    { name: "Corte", price: 15 },
    { name: "Barba", price: 12 },
    { name: "Cejas", price: 8 },
    { name: "Corte + Barba", price: 25 },
    { name: "Barba + Cejas", price: 20 },
    { name: "Servicio Completo", price: 35 },
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
        .select('id, name, status')
        .eq('status', 'active')
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
          barbers!inner(id, name, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const servicesWithBarber = data?.map(service => ({
        ...service,
        barber: {
          id: service.barbers.id,
          name: service.barbers.name,
          status: service.barbers.status
        }
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
    if (!newService.client_name || !newService.barber_id || !newService.service_type || !newService.price || !newService.service_time) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const serviceData = {
        client_name: newService.client_name,
        barber_id: newService.barber_id,
        service_type: newService.service_type,
        price: parseFloat(newService.price),
        service_time: newService.service_time,
        notes: newService.notes || null,
        service_date: new Date().toISOString().split('T')[0],
      };

      const { data, error } = await supabase
        .from('services')
        .insert([serviceData])
        .select(`
          *,
          barbers!inner(id, name, status)
        `)
        .single();

      if (error) throw error;

      // Update barber stats using the database function
      const { error: statsError } = await supabase.rpc('increment_barber_stats', {
        barber_id: newService.barber_id,
        service_price: parseFloat(newService.price)
      });

      if (statsError) {
        console.error('Error updating barber stats:', statsError);
      }

      const newServiceWithBarber = {
        ...data,
        barber: {
          id: data.barbers.id,
          name: data.barbers.name,
          status: data.barbers.status
        }
      };

      setServices(prev => [newServiceWithBarber, ...prev]);
      setNewService({
        client_name: "",
        barber_id: "",
        service_type: "",
        price: "",
        service_time: "",
        notes: "",
      });

      toast({
        title: "Servicio agregado",
        description: `Servicio para ${newService.client_name} registrado correctamente`,
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

  const handleDeleteService = async (serviceId: string, clientName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el servicio de ${clientName}?`)) {
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
        description: `Servicio de ${clientName} eliminado correctamente`,
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

  const totalToday = services
    .filter(s => s.service_date === new Date().toISOString().split('T')[0])
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Cliente</Label>
              <Input
                id="client_name"
                value={newService.client_name}
                onChange={(e) => setNewService(prev => ({ ...prev, client_name: e.target.value }))}
                placeholder="Nombre del cliente"
              />
            </div>
            
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
                      {service.name} - ${service.price}
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

            <div className="space-y-2">
              <Label htmlFor="service_time">Hora</Label>
              <Input
                id="service_time"
                type="time"
                value={newService.service_time}
                onChange={(e) => setNewService(prev => ({ ...prev, service_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                value={newService.notes}
                onChange={(e) => setNewService(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas adicionales"
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
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="font-semibold">{service.client_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(service.service_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {service.barber?.name || 'Sin barbero'}
                    </p>
                    <p className="text-sm text-muted-foreground">Barbero</p>
                  </div>
                  <div>
                    <p className="font-medium">{service.service_type}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {service.service_time || 'Sin hora'}
                    </p>
                  </div>
                  <div className="text-right flex items-center justify-end space-x-2">
                    <div>
                      <p className="font-bold text-lg text-green-600">${service.price.toFixed(2)}</p>
                      {service.notes && (
                        <p className="text-xs text-muted-foreground">{service.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteService(service.id, service.client_name)}
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