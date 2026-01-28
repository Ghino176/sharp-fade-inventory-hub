import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scissors, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import WeekSelector from "./WeekSelector";

// All service types offered
const allServiceTypes = [
  "Corte",
  "Barba Sencilla",
  "Barba Premium",
  "Cejas",
  "Afeitado",
  "Facial Primera Vez",
  "Facial",
  "Corte+Barba Premium",
  "Mascarilla Completa",
];

interface DailyServiceCounts {
  [key: string]: number;
}

interface DailyService {
  day: string;
  dayName: string;
  serviceCounts: DailyServiceCounts;
  ganancias: number;
}

const UserStats = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dailyServices, setDailyServices] = useState<DailyService[]>([]);
  const [weeklyServiceCounts, setWeeklyServiceCounts] = useState<DailyServiceCounts>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [barberName, setBarberName] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [noBarberLinked, setNoBarberLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalGanancias, setTotalGanancias] = useState(0);

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
      // Get the barber linked to this user
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

      // Get barber name
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

      // Fetch services for this barber in selected week with barber_earning
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("service_type, created_at, barber_earning")
        .eq("barber_id", barberId)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (servicesError) throw servicesError;

      // Process daily stats (Mon-Sat)
      const stats: DailyService[] = [];
      let weekTotal = 0;
      const weekCounts: DailyServiceCounts = {};
      
      // Initialize weekly counts
      allServiceTypes.forEach(type => {
        weekCounts[type] = 0;
      });
      
      for (let i = 0; i < 6; i++) {
        const day = addDays(weekStart, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayName = format(day, "EEEE", { locale: es });
        
        const dayServices = (services || []).filter((s) => {
          const serviceDate = format(parseISO(s.created_at), "yyyy-MM-dd");
          return serviceDate === dayStr;
        });

        const dayGanancias = dayServices.reduce((sum, s) => sum + Number(s.barber_earning || 0), 0);
        weekTotal += dayGanancias;

        // Count each service type
        const serviceCounts: DailyServiceCounts = {};
        allServiceTypes.forEach(type => {
          const count = dayServices.filter((s) => s.service_type === type).length;
          serviceCounts[type] = count;
          weekCounts[type] += count;
        });

        stats.push({
          day: dayStr,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          serviceCounts,
          ganancias: dayGanancias,
        });
      }

      setDailyServices(stats);
      setWeeklyServiceCounts(weekCounts);
      setTotalGanancias(weekTotal);
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
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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
                {formatCurrency(totalGanancias)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Día</TableHead>
                  {allServiceTypes.map((type) => (
                    <TableHead key={type} className="text-center min-w-[80px] text-xs">
                      {type}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">Ganancias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyServices.map((day) => {
                  const dayTotal = Object.values(day.serviceCounts).reduce((a, b) => a + b, 0);
                  return (
                    <TableRow key={day.day}>
                      <TableCell className="font-medium">{day.dayName}</TableCell>
                      {allServiceTypes.map((type) => (
                        <TableCell key={type} className="text-center">
                          {day.serviceCounts[type] || 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-bold">{dayTotal}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(day.ganancias)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total Semana</TableCell>
                  {allServiceTypes.map((type) => (
                    <TableCell key={type} className="text-center">
                      {weeklyServiceCounts[type] || 0}
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    {Object.values(weeklyServiceCounts).reduce((a, b) => a + b, 0)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
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

export default UserStats;
