import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, Scissors } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface DailyService {
  day: string;
  dayName: string;
  cortes: number;
  barbas: number;
  cejas: number;
}

const UserStats = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [dailyServices, setDailyServices] = useState<DailyService[]>([]);
  const [weekRange, setWeekRange] = useState({ start: "", end: "" });
  const [barberName, setBarberName] = useState<string | null>(null);
  const [noBarberLinked, setNoBarberLinked] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      
      setWeekRange({
        start: format(weekStart, "dd/MM/yyyy"),
        end: format(weekEnd, "dd/MM/yyyy"),
      });

      // Get the barber linked to this user
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("barber_id")
        .eq("user_id", user!.id)
        .single();

      if (profileError || !profileData?.barber_id) {
        setNoBarberLinked(true);
        return;
      }

      // Get barber name
      const { data: barberData } = await supabase
        .from("barbers")
        .select("name")
        .eq("id", profileData.barber_id)
        .single();

      if (barberData) {
        setBarberName(barberData.name);
      }

      // Fetch services for this barber this week
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("service_type, created_at")
        .eq("barber_id", profileData.barber_id)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (servicesError) throw servicesError;

      // Process daily stats (Mon-Sat)
      const stats: DailyService[] = [];
      for (let i = 0; i < 6; i++) {
        const day = addDays(weekStart, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayName = format(day, "EEEE", { locale: es });
        
        const dayServices = (services || []).filter((s) => {
          const serviceDate = format(parseISO(s.created_at), "yyyy-MM-dd");
          return serviceDate === dayStr;
        });

        stats.push({
          day: dayStr,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          cortes: dayServices.filter((s) => s.service_type.toLowerCase().includes("corte")).length,
          barbas: dayServices.filter((s) => s.service_type.toLowerCase().includes("barba")).length,
          cejas: dayServices.filter((s) => s.service_type.toLowerCase().includes("ceja")).length,
        });
      }

      setDailyServices(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar tus estadísticas",
        variant: "destructive",
      });
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Mis Estadísticas {barberName && `- ${barberName}`}</h2>
        <div className="flex items-center space-x-2 text-muted-foreground">
          <CalendarDays className="h-5 w-5" />
          <span>{weekRange.start} - {weekRange.end}</span>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5" />
            <span>Servicios de la Semana</span>
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
              {dailyServices.map((day) => (
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
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStats;
