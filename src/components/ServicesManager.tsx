import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scissors, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: number;
  client: string;
  barber: string;
  service: string;
  price: number;
  time: string;
  date: string;
}

const ServicesManager = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([
    { id: 1, client: "Juan Pérez", barber: "Carlos", service: "Corte + Barba", price: 25, time: "10:30", date: "2024-01-20" },
    { id: 2, client: "María García", barber: "Luis", service: "Corte", price: 15, time: "11:15", date: "2024-01-20" },
    { id: 3, client: "Pedro López", barber: "Antonio", service: "Barba + Cejas", price: 20, time: "12:00", date: "2024-01-20" },
  ]);

  const [newService, setNewService] = useState({
    client: "",
    barber: "",
    service: "",
    price: "",
    time: "",
  });

  const barbers = ["Carlos", "Luis", "Antonio"];
  const serviceTypes = [
    { name: "Corte", price: 15 },
    { name: "Barba", price: 12 },
    { name: "Cejas", price: 8 },
    { name: "Corte + Barba", price: 25 },
    { name: "Barba + Cejas", price: 20 },
    { name: "Servicio Completo", price: 35 },
  ];

  const handleServiceTypeChange = (serviceType: string) => {
    const selectedService = serviceTypes.find(s => s.name === serviceType);
    setNewService(prev => ({
      ...prev,
      service: serviceType,
      price: selectedService ? selectedService.price.toString() : ""
    }));
  };

  const handleAddService = () => {
    if (!newService.client || !newService.barber || !newService.service || !newService.price || !newService.time) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    const service: Service = {
      id: services.length + 1,
      client: newService.client,
      barber: newService.barber,
      service: newService.service,
      price: parseFloat(newService.price),
      time: newService.time,
      date: new Date().toISOString().split('T')[0],
    };

    setServices(prev => [service, ...prev]);
    setNewService({
      client: "",
      barber: "",
      service: "",
      price: "",
      time: "",
    });

    toast({
      title: "Servicio agregado",
      description: `Servicio para ${service.client} registrado correctamente`,
    });
  };

  const totalToday = services
    .filter(s => s.date === new Date().toISOString().split('T')[0])
    .reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Gestión de Servicios</h2>
        <div className="flex items-center space-x-2 text-lg font-semibold">
          <DollarSign className="h-5 w-5" />
          <span>Total Hoy: ${totalToday}</span>
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
              <Label htmlFor="client">Cliente</Label>
              <Input
                id="client"
                value={newService.client}
                onChange={(e) => setNewService(prev => ({ ...prev, client: e.target.value }))}
                placeholder="Nombre del cliente"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barber">Barbero</Label>
              <Select value={newService.barber} onValueChange={(value) => setNewService(prev => ({ ...prev, barber: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barbero" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber} value={barber}>
                      {barber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Servicio</Label>
              <Select value={newService.service} onValueChange={handleServiceTypeChange}>
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
                value={newService.price}
                onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                placeholder="Precio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={newService.time}
                onChange={(e) => setNewService(prev => ({ ...prev, time: e.target.value }))}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleAddService} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Servicio
              </Button>
            </div>
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
                    <p className="font-semibold">{service.client}</p>
                    <p className="text-sm text-muted-foreground">{service.date}</p>
                  </div>
                  <div>
                    <p className="font-medium">{service.barber}</p>
                    <p className="text-sm text-muted-foreground">Barbero</p>
                  </div>
                  <div>
                    <p className="font-medium">{service.service}</p>
                    <p className="text-sm text-muted-foreground">{service.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-green-600">${service.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicesManager;