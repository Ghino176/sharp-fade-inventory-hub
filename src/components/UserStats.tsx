import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scissors, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";
import WeekSelector from "./WeekSelector";

interface ServiceRecord {
  id: string;
  service_type: string;
  barber_earning: number;
  payment_method: string | null;
  created_at: string;
}

const UserStats = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [barberName, setBarberName] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [noBarberLinked, setNoBarberLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    if (user) {
      fetchBarberInfo();
    }
  }, [user]);

  useEffect(() => {
    if (barberId) {
      fetchUserStats();
    }
  }, [barberId, selectedDate]);

  const fetchBarberInfo = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("barber_id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (profileError || !profileData?.barber_id) {
        setNoBarberLinked(true);
        setLoading(false);
        return;
      }

      const { data: barberData } = await supabase
        .from("barbers")
        .select("name")
        .eq("id", profileData.barber_id)
        .maybeSingle();

      if (barberData) {
        setBarberName(barberData.name);
      }

      setBarberId(profileData.barber_id);
    } catch (error) {
      console.error("Error fetching barber info:", error);
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    if (!barberId) return;

    setLoading(true);
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, service_type, created_at, barber_earning, payment_method")
        .eq("barber_id", barberId)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      const formattedServices: ServiceRecord[] = (servicesData || []).map((s) => ({
        id: s.id,
        service_type: s.service_type,
        barber_earning: Number(s.barber_earning || 0),
        payment_method: s.payment_method,
        created_at: s.created_at,
      }));

      const total = formattedServices.reduce((sum, s) => sum + s.barber_earning, 0);

      setServices(formattedServices);
      setTotalEarnings(total);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar tus estadísticas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)}$`;
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy");
  };

  const formatTime = (dateStr: string) => {
    return format(parseISO(dateStr), "h:mm a");
  };

  if (noBarberLinked) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Mis Estadísticas</h2>
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Tu cuenta no está vinculada a un barbero. Contacta al administrador para vincular tu cuenta.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold">Mis Estadísticas {barberName && `- ${barberName}`}</h2>
        <WeekSelector selectedDate={selectedDate} onWeekChange={setSelectedDate} />
      </div>

      {loading ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Cargando estadísticas...</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Scissors className="h-5 w-5" />
                <span>Servicios de la Semana</span>
              </CardTitle>
              <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                <DollarSign className="h-5 w-5" />
                {formatCurrency(totalEarnings)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {services.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>{formatDate(service.created_at)}</TableCell>
                      <TableCell>{formatTime(service.created_at)}</TableCell>
                      <TableCell>{service.service_type}</TableCell>
                      <TableCell>{service.payment_method || "efectivo"}</TableCell>
                      <TableCell>{barberName}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(service.barber_earning)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5}>Total</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(totalEarnings)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4 text-muted-foreground">
                No hay servicios registrados esta semana
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UserStats;
