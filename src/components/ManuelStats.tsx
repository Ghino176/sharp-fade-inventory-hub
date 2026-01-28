import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import WeekSelector from "./WeekSelector";

interface DailyService {
  day: string;
  dayName: string;
  serviceCounts: Record<string, number>;
  ganancias: number;
}

// Manuel's earning rates per service
const manuelEarnings: Record<string, number> = {
  "Corte": 3.5,
  "Barba Sencilla": 1,
  "Barba Premium": 2,
  "Cejas": 0.5,
  "Afeitado": 1,
  "Facial Primera Vez": 3,
  "Facial": 3,
  "Corte+Barba Premium": 4,
  "Mascarilla Completa": 0.5,
};

const ManuelStats = () => {
  const { toast } = useToast();
  const [dailyServices, setDailyServices] = useState<DailyService[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [totalGanancias, setTotalGanancias] = useState(0);
  const [totalServices, setTotalServices] = useState(0);

  useEffect(() => {
    fetchManuelStats();
  }, [selectedDate]);

  const fetchManuelStats = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      // Fetch all services from selected week
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("service_type, created_at")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (servicesError) throw servicesError;

      // Process daily stats (Mon-Sat)
      const stats: DailyService[] = [];
      let weekTotal = 0;
      let weekServices = 0;

      for (let i = 0; i < 6; i++) {
        const day = addDays(weekStart, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayName = format(day, "EEEE", { locale: es });

        const dayServices = (services || []).filter((s) => {
          const serviceDate = format(parseISO(s.created_at), "yyyy-MM-dd");
          return serviceDate === dayStr;
        });

        // Calculate Manuel's earnings based on his rates
        let dayGanancias = 0;
        const serviceCounts: Record<string, number> = {};

        dayServices.forEach((s) => {
          const earning = manuelEarnings[s.service_type] || 0;
          dayGanancias += earning;
          serviceCounts[s.service_type] = (serviceCounts[s.service_type] || 0) + 1;
        });

        weekTotal += dayGanancias;
        weekServices += dayServices.length;

        stats.push({
          day: dayStr,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          serviceCounts,
          ganancias: dayGanancias,
        });
      }

      setDailyServices(stats);
      setTotalGanancias(weekTotal);
      setTotalServices(weekServices);
    } catch (error) {
      console.error("Error fetching Manuel stats:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas de Manuel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Crown className="h-8 w-8 text-yellow-500" />
          Estadísticas Manuel
        </h2>
        <WeekSelector selectedDate={selectedDate} onWeekChange={setSelectedDate} />
      </div>

      {loading ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Cargando estadísticas...</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span>Ganancias de la Semana</span>
              </CardTitle>
              <div className="flex items-center gap-2 text-lg font-bold text-yellow-600">
                <DollarSign className="h-5 w-5" />
                {formatCurrency(totalGanancias)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead className="text-center">Servicios</TableHead>
                  <TableHead className="text-right">Ganancias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyServices.map((day) => {
                  const dayTotal = Object.values(day.serviceCounts).reduce((a, b) => a + b, 0);
                  return (
                    <TableRow key={day.day}>
                      <TableCell className="font-medium">{day.dayName}</TableCell>
                      <TableCell className="text-center">{dayTotal}</TableCell>
                      <TableCell className="text-right text-yellow-600 font-medium">
                        {formatCurrency(day.ganancias)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-yellow-100/50 dark:bg-yellow-900/20 font-bold">
                  <TableCell>Total Semana</TableCell>
                  <TableCell className="text-center">{totalServices}</TableCell>
                  <TableCell className="text-right text-yellow-600">
                    {formatCurrency(totalGanancias)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManuelStats;
