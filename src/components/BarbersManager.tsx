import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Scissors, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserBarberLink from "./UserBarberLink";

interface Barber {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  cuts_count: number;
  beards_count: number;
  eyebrows_count: number;
  created_at: string;
  updated_at: string;
}

const BarbersManager = () => {
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingBarber, setIsAddingBarber] = useState(false);
  const [newBarber, setNewBarber] = useState({
    name: "",
    phone: "",
  });

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
    if (!newBarber.name) {
      toast({
        title: "Error",
        description: "Por favor ingresa el nombre del barbero",
        variant: "destructive",
      });
      return;
    }

    try {
      const barberData = {
        name: newBarber.name,
        phone: newBarber.phone || null,
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

  const totalServices = barbers.reduce((sum, barber) => 
    sum + barber.cuts_count + barber.beards_count + barber.eyebrows_count, 0);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-barbershop-silver" />
              <div>
                <p className="text-2xl font-bold">{barbers.length}</p>
                <p className="text-sm text-muted-foreground">Barberos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Scissors className="h-8 w-8 text-barbershop-silver" />
              <div>
                <p className="text-2xl font-bold">{totalServices}</p>
                <p className="text-sm text-muted-foreground">Servicios Totales</p>
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
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newBarber.phone}
                  onChange={(e) => setNewBarber(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1234567890"
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
                  <AvatarImage src={barber.photo_url || ""} alt={barber.name} />
                  <AvatarFallback className="bg-barbershop-silver text-primary text-xl">
                    {barber.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{barber.name}</h3>
                  <p className="text-sm text-muted-foreground">{barber.phone || 'Sin teléfono'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Performance */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{barber.cuts_count}</p>
                    <p className="text-xs text-muted-foreground">Cortes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{barber.beards_count}</p>
                    <p className="text-xs text-muted-foreground">Barbas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-600">{barber.eyebrows_count}</p>
                    <p className="text-xs text-muted-foreground">Cejas</p>
                  </div>
                </div>

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

        {barbers.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No hay barberos registrados
          </div>
        )}
      </div>

      {/* User-Barber Linking Section */}
      <UserBarberLink />
    </div>
  );
};

export default BarbersManager;
