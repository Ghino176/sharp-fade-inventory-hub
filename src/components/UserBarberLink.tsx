import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, UserCheck, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  barber_id: string | null;
}

interface Barber {
  id: string;
  name: string;
}

const UserBarberLink = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, barbersRes] = await Promise.all([
        supabase.from('profiles').select('id, user_id, full_name, barber_id'),
        supabase.from('barbers').select('id, name').order('name'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (barbersRes.error) throw barbersRes.error;

      setProfiles(profilesRes.data || []);
      setBarbers(barbersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkBarber = async (profileId: string, barberId: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ barber_id: barberId })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(prev => 
        prev.map(p => p.id === profileId ? { ...p, barber_id: barberId } : p)
      );

      const barberName = barberId 
        ? barbers.find(b => b.id === barberId)?.name 
        : null;

      toast({
        title: barberId ? "Usuario vinculado" : "Vínculo eliminado",
        description: barberId 
          ? `Usuario vinculado con ${barberName}`
          : "El usuario ya no está vinculado a ningún barbero",
      });
    } catch (error) {
      console.error('Error linking barber:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la vinculación",
        variant: "destructive",
      });
    }
  };

  const getBarberName = (barberId: string | null) => {
    if (!barberId) return null;
    return barbers.find(b => b.id === barberId)?.name || "Desconocido";
  };

  if (loading) {
    return <div className="text-center py-4">Cargando usuarios...</div>;
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Vincular Usuarios con Empleados
        </CardTitle>
      </CardHeader>
      <CardContent>
        {profiles.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No hay usuarios registrados
          </p>
        ) : (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div 
                key={profile.id} 
                className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{profile.full_name}</p>
                    {profile.barber_id && (
                      <p className="text-sm text-muted-foreground">
                        Vinculado a: {getBarberName(profile.barber_id)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    value={profile.barber_id || "none"}
                    onValueChange={(value) => 
                      handleLinkBarber(profile.id, value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleccionar barbero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin vincular</SelectItem>
                      {barbers.map((barber) => (
                        <SelectItem key={barber.id} value={barber.id}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {profile.barber_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLinkBarber(profile.id, null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserBarberLink;
