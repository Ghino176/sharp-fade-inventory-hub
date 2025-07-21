import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Scissors, DollarSign, Calendar, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Barber {
  id: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  start_date: string | null;
  specialties: string[];
  services_completed: number;
  total_earnings: number;
  status: string;
}

const BarbersManager = () => {
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingBarber, setIsAddingBarber] = useState(false);
  const [newBarber, setNewBarber] = useState({
    name: "",
    phone: "",
    email: "",
    specialties: "",
  });

  // Fetch barbers from Supabase
  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error fetching barbers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los barberos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBarber = async () => {
    if (!newBarber.name || !newBarber.phone) {
      toast({
        title: "Error",
        description: "Por favor completa los campos obligatorios (nombre y teléfono)",
        variant: "destructive",
      });
      return;
    }

    try {
      const barberData = {
        name: newBarber.name,
        phone: newBarber.phone || null,
        email: newBarber.email || null,
        specialties: newBarber.specialties.split(',').map(s => s.trim()).filter(s => s),
        services_completed: 0,
        total_earnings: 0,
        status: 'active',
      };

      const { data, error } = await supabase
        .from('barbers')
        .insert([barberData])
        .select()
        .single();

      if (error) throw error;

      setBarbers(prev => [data, ...prev]);
      setNewBarber({
        name: "",
        phone: "",
        email: "",
        specialties: "",
      });
      setIsAddingBarber(false);

      toast({
        title: "Barbero agregado",
        description: `${newBarber.name} ha sido agregado al equipo`,
      });
    } catch (error) {
      console.error('Error adding barber:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el barbero",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBarber = async (barberId: string, barberName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar a ${barberName} y todos sus datos asociados?`)) {
      return;
    }

    try {
      // Delete associated services first
      const { error: servicesError } = await supabase
        .from('services')
        .delete()
        .eq('barber_id', barberId);

      if (servicesError) throw servicesError;

      // Delete the barber
      const { error: barberError } = await supabase
        .from('barbers')
        .delete()
        .eq('id', barberId);

      if (barberError) throw barberError;

      setBarbers(prev => prev.filter(barber => barber.id !== barberId));

      toast({
        title: "Barbero eliminado",
        description: `${barberName} y todos sus datos han sido eliminados`,
      });
    } catch (error) {
      console.error('Error deleting barber:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el barbero",
        variant: "destructive",
      });
    }
  };

  const totalTodayServices = barbers.reduce((sum, barber) => sum + barber.services_completed, 0);
  const totalTodayEarnings = barbers.reduce((sum, barber) => sum + barber.total_earnings, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Gestión de Barberos</h2>
        <div className="text-center py-8">Cargando barberos...</div>
      </div>
    );
  }

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
                <p className="text-sm text-muted-foreground">Servicios Totales</p>
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
                <p className="text-sm text-muted-foreground">Ingresos Totales</p>
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
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  value={newBarber.name}
                  onChange={(e) => setNewBarber(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del barbero"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
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
                  <AvatarImage src={barber.avatar_url || ""} alt={barber.name} />
                  <AvatarFallback className="bg-barbershop-silver text-primary text-xl">
                    {barber.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{barber.name}</h3>
                  <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {barber.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Contacto:</p>
                  <p className="text-sm">{barber.phone || 'Sin teléfono'}</p>
                  {barber.email && <p className="text-sm">{barber.email}</p>}
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

                {/* Performance */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{barber.services_completed}</p>
                    <p className="text-xs text-muted-foreground">Servicios</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">${barber.total_earnings}</p>
                    <p className="text-xs text-muted-foreground">Ganancias</p>
                  </div>
                </div>

                {/* Start Date */}
                {barber.start_date && (
                  <div className="flex items-center justify-center text-sm text-muted-foreground pt-2 border-t">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Desde {new Date(barber.start_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {/* Delete Button */}
                <div className="pt-2 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDeleteBarber(barber.id, barber.name)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Barbero
                  </Button>
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