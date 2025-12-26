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

interface DailyService {
  day: string;
  dayName: string;
  cortes: number;
  barbas: number;
  cejas: number;
  ganancias: number;
}

const UserStats = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dailyServices, setDailyServices] = useState<DailyService[]>([]);
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

        stats.push({
          day: dayStr,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          cortes: dayServices.filter((s) => s.service_type.toLowerCase().includes("corte")).length,
          barbas: dayServices.filter((s) => s.service_type.toLowerCase().includes("barba")).length,
          cejas: dayServices.filter((s) => s.service_type.toLowerCase().includes("ceja")).length,
          ganancias: dayGanancias,
        });
      }

      setDailyServices(stats);
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
      currency: "MXN",
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead className="text-center">Cortes</TableHead>
                  <TableHead className="text-center">Barbas</TableHead>
                  <TableHead className="text-center">Cejas</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">Ganancias</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyServices.map((day) => (
                  <TableRow key={day.day}>
                    <TableCell className="font-medium">{day.dayName}</TableCell>
                    <TableCell className="text-center">{day.cortes}</TableCell>
                    <TableCell className="text-center">{day.barbas}</TableCell>
                    <TableCell className="text-center">{day.cejas}</TableCell>
                    <TableCell className="text-center font-bold">
                      {day.cortes + day.barbas + day.cejas}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatCurrency(day.ganancias)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total Semana</TableCell>
                  <TableCell className="text-center">
                    {dailyServices.reduce((sum, d) => sum + d.cortes, 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {dailyServices.reduce((sum, d) => sum + d.barbas, 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {dailyServices.reduce((sum, d) => sum + d.cejas, 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {dailyServices.reduce((sum, d) => sum + d.cortes + d.barbas + d.cejas, 0)}
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
