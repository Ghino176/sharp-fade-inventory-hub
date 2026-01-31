import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";
import WeekSelector from "./WeekSelector";

interface ServiceRecord {
  id: string;
  barber_id: string;
  barber_name: string;
  service_type: string;
  barber_earning: number;
  payment_method: string | null;
  created_at: string;
}

interface BarberGroup {
  barberId: string;
  barberName: string;
  services: ServiceRecord[];
  totalEarnings: number;
}

const AdminStats = () => {
  const { toast } = useToast();
  const [barberGroups, setBarberGroups] = useState<BarberGroup[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, [selectedDate]);

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      // Fetch barbers
      const { data: barbers, error: barbersError } = await supabase
        .from("barbers")
        .select("id, name");

      if (barbersError) throw barbersError;

      // Fetch services from selected week
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("id, barber_id, service_type, created_at, barber_earning, payment_method")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      // Group services by barber
      const groups: BarberGroup[] = (barbers || []).map((barber) => {
        const barberServices = (services || [])
          .filter((s) => s.barber_id === barber.id)
          .map((s) => ({
            id: s.id,
            barber_id: s.barber_id,
            barber_name: barber.name,
            service_type: s.service_type,
            barber_earning: Number(s.barber_earning || 0),
            payment_method: s.payment_method,
            created_at: s.created_at,
          }));

        const totalEarnings = barberServices.reduce((sum, s) => sum + s.barber_earning, 0);

        return {
          barberId: barber.id,
          barberName: barber.name,
          services: barberServices,
          totalEarnings,
        };
      });

      setBarberGroups(groups);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold">Estadísticas Semanales (Admin)</h2>
        <WeekSelector selectedDate={selectedDate} onWeekChange={setSelectedDate} />
      </div>

      {loading ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Cargando estadísticas...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {barberGroups.map((barber) => (
            <Card key={barber.barberId} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>{barber.barberName}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                    <DollarSign className="h-5 w-5" />
                    {formatCurrency(barber.totalEarnings)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {barber.services.length > 0 ? (
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
                      {barber.services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell>{formatDate(service.created_at)}</TableCell>
                          <TableCell>{formatTime(service.created_at)}</TableCell>
                          <TableCell>{service.service_type}</TableCell>
                          <TableCell>{service.payment_method || "efectivo"}</TableCell>
                          <TableCell>{service.barber_name}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(service.barber_earning)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={5}>Total</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(barber.totalEarnings)}
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
          ))}

          {barberGroups.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No hay barberos registrados</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default AdminStats;
