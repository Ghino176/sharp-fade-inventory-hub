import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import WeekSelector from "./WeekSelector";

interface BarberDailyStats {
  barberId: string;
  barberName: string;
  dailyServices: {
    day: string;
    dayName: string;
    cortes: number;
    barbas: number;
    cejas: number;
  }[];
}

const AdminStats = () => {
  const { toast } = useToast();
  const [barberStats, setBarberStats] = useState<BarberDailyStats[]>([]);
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
        .select("barber_id, service_type, created_at")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (servicesError) throw servicesError;

      // Process data per barber
      const stats: BarberDailyStats[] = (barbers || []).map((barber) => {
        const barberServices = services?.filter((s) => s.barber_id === barber.id) || [];
        
        // Generate days Mon-Sat
        const dailyServices = [];
        for (let i = 0; i < 6; i++) {
          const day = addDays(weekStart, i);
          const dayStr = format(day, "yyyy-MM-dd");
          const dayName = format(day, "EEEE", { locale: es });
          
          const dayServices = barberServices.filter((s) => {
            const serviceDate = format(parseISO(s.created_at), "yyyy-MM-dd");
            return serviceDate === dayStr;
          });

          dailyServices.push({
            day: dayStr,
            dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
            cortes: dayServices.filter((s) => s.service_type.toLowerCase().includes("corte")).length,
            barbas: dayServices.filter((s) => s.service_type.toLowerCase().includes("barba")).length,
            cejas: dayServices.filter((s) => s.service_type.toLowerCase().includes("ceja")).length,
          });
        }

        return {
          barberId: barber.id,
          barberName: barber.name,
          dailyServices,
        };
      });

      setBarberStats(stats);
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
          {barberStats.map((barber) => (
            <Card key={barber.barberId} className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>{barber.barberName}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Día</TableHead>
                      <TableHead className="text-center">Cortes</TableHead>
                      <TableHead className="text-center">Barbas</TableHead>
                      <TableHead className="text-center">Cejas</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barber.dailyServices.map((day) => (
                      <TableRow key={day.day}>
                        <TableCell className="font-medium">{day.dayName}</TableCell>
                        <TableCell className="text-center">{day.cortes}</TableCell>
                        <TableCell className="text-center">{day.barbas}</TableCell>
                        <TableCell className="text-center">{day.cejas}</TableCell>
                        <TableCell className="text-center font-bold">
                          {day.cortes + day.barbas + day.cejas}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total Semana</TableCell>
                      <TableCell className="text-center">
                        {barber.dailyServices.reduce((sum, d) => sum + d.cortes, 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {barber.dailyServices.reduce((sum, d) => sum + d.barbas, 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {barber.dailyServices.reduce((sum, d) => sum + d.cejas, 0)}
                      </TableCell>
                      <TableCell className="text-center">
                        {barber.dailyServices.reduce((sum, d) => sum + d.cortes + d.barbas + d.cejas, 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {barberStats.length === 0 && (
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
