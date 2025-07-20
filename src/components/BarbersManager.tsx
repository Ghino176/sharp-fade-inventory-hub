import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Scissors, DollarSign, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Barber {
  id: number;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  startDate: string;
  specialties: string[];
  todayServices: number;
  todayEarnings: number;
  totalServices: number;
  rating: number;
}

const BarbersManager = () => {
  const { toast } = useToast();
  
  const [barbers, setBarbers] = useState<Barber[]>([
    {
      id: 1,
      name: "Alejandro Ariza",
      avatar: "",
      phone: "0412-7851168",
      email: "",
      startDate: "23/02/2023",
      specialties: ["Corte clásico", "Barba", "Fade"],
      todayServices: 0,
      todayEarnings: 0,
      totalServices: 0,
      rating: 4.8
    },
    {
      id: 2,
      name: "David Velázquez",
      avatar: "",
      phone: "04146494083",
      email: "",
      startDate: "28/03/2023",
      specialties: ["Corte moderno", "Cejas", "Degradado"],
      todayServices: 0,
      todayEarnings: 0,
      totalServices: 0,
      rating: 4.9
    },
    {
      id: 3,
      name: "Antonio Silva",
      avatar: "",
      phone: "04146100630",
      email: "",
      startDate: "",
      specialties: ["Barba", "Bigote", "Corte tradicional"],
      todayServices: 0,
      todayEarnings: 0,
      totalServices: 0,
      rating: 4.7
    }
  ]);

  const [isAddingBarber, setIsAddingBarber] = useState(false);
  const [newBarber, setNewBarber] = useState({
    name: "",
    phone: "",
    email: "",
    specialties: "",
  });

  const handleAddBarber = () => {
    if (!newBarber.name || !newBarber.phone || !newBarber.email) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    const barber: Barber = {
      id: barbers.length + 1,
      name: newBarber.name,
      avatar: "",
      phone: newBarber.phone,
      email: newBarber.email,
      startDate: new Date().toISOString().split('T')[0],
      specialties: newBarber.specialties.split(',').map(s => s.trim()).filter(s => s),
      todayServices: 0,
      todayEarnings: 0,
      totalServices: 0,
      rating: 5.0
    };

    setBarbers(prev => [...prev, barber]);
    setNewBarber({
      name: "",
      phone: "",
      email: "",
      specialties: "",
    });
    setIsAddingBarber(false);

    toast({
      title: "Barbero agregado",
      description: `${barber.name} ha sido agregado al equipo`,
    });
  };

  const totalTodayServices = barbers.reduce((sum, barber) => sum + barber.todayServices, 0);
  const totalTodayEarnings = barbers.reduce((sum, barber) => sum + barber.todayEarnings, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Gestión de Barberos</h2>
        <Button onClick={() => setIsAddingBarber(true)} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Barbero
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-barbershop-silver" />
              <div>
                <p className="text-2xl font-bold">{barbers.length}</p>
                <p className="text-sm text-muted-foreground">Barberos Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Scissors className="h-8 w-8 text-barbershop-silver" />
              <div>
                <p className="text-2xl font-bold">{totalTodayServices}</p>
                <p className="text-sm text-muted-foreground">Servicios Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-barbershop-silver" />
              <div>
                <p className="text-2xl font-bold">${totalTodayEarnings}</p>
                <p className="text-sm text-muted-foreground">Ingresos Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Barber Form */}
      {isAddingBarber && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Agregar Nuevo Barbero</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  value={newBarber.name}
                  onChange={(e) => setNewBarber(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del barbero"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newBarber.phone}
                  onChange={(e) => setNewBarber(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newBarber.email}
                  onChange={(e) => setNewBarber(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialties">Especialidades (separadas por coma)</Label>
                <Input
                  id="specialties"
                  value={newBarber.specialties}
                  onChange={(e) => setNewBarber(prev => ({ ...prev, specialties: e.target.value }))}
                  placeholder="Corte, Barba, Fade"
                />
              </div>
            </div>

            <div className="flex space-x-2 mt-4">
              <Button onClick={handleAddBarber}>
                Agregar Barbero
              </Button>
              <Button variant="outline" onClick={() => setIsAddingBarber(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barbers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {barbers.map((barber) => (
          <Card key={barber.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={barber.avatar} alt={barber.name} />
                  <AvatarFallback className="bg-barbershop-silver text-primary text-xl">
                    {barber.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{barber.name}</h3>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm font-medium">{barber.rating}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Contacto:</p>
                  <p className="text-sm">{barber.phone}</p>
                  <p className="text-sm">{barber.email}</p>
                </div>

                {/* Specialties */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Especialidades:</p>
                  <div className="flex flex-wrap gap-1">
                    {barber.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-barbershop-light-gray text-xs rounded-md"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Today's Performance */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{barber.todayServices}</p>
                    <p className="text-xs text-muted-foreground">Servicios Hoy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">${barber.todayEarnings}</p>
                    <p className="text-xs text-muted-foreground">Ingresos Hoy</p>
                  </div>
                </div>

                {/* Total Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Desde {new Date(barber.startDate).toLocaleDateString()}</span>
                  </div>
                  <span>{barber.totalServices} servicios</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BarbersManager;
