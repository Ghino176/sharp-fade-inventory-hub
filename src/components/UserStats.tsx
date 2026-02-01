import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scissors, DollarSign, FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";
import WeekSelector from "./WeekSelector";
import { useExport } from "@/hooks/useExport";

interface ServiceRecord {
  id: string;
  service_type: string;
  barber_earning: number;
  payment_method: string | null;
  customer_name: string | null;
  created_at: string;
}

interface Deduction {
  id: string;
  amount: number;
  concept: string;
  created_at: string;
}

const UserStats = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { exportToExcel, exportToPDF } = useExport();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [barberName, setBarberName] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [noBarberLinked, setNoBarberLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalDeductions, setTotalDeductions] = useState(0);

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

      const [servicesRes, deductionsRes] = await Promise.all([
        supabase
          .from("services")
          .select("id, service_type, created_at, barber_earning, payment_method, customer_name")
          .eq("barber_id", barberId)
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("barber_deductions")
          .select("id, amount, concept, created_at")
          .eq("barber_id", barberId)
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString())
          .order("created_at", { ascending: false }),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (deductionsRes.error) throw deductionsRes.error;

      const formattedServices: ServiceRecord[] = (servicesRes.data || []).map((s) => ({
        id: s.id,
        service_type: s.service_type,
        barber_earning: Number(s.barber_earning || 0),
        payment_method: s.payment_method,
        customer_name: s.customer_name,
        created_at: s.created_at,
      }));

      const formattedDeductions: Deduction[] = (deductionsRes.data || []).map((d) => ({
        id: d.id,
        amount: Number(d.amount),
        concept: d.concept,
        created_at: d.created_at,
      }));

      const earnings = formattedServices.reduce((sum, s) => sum + s.barber_earning, 0);
      const deducted = formattedDeductions.reduce((sum, d) => sum + d.amount, 0);

      setServices(formattedServices);
      setDeductions(formattedDeductions);
      setTotalEarnings(earnings);
      setTotalDeductions(deducted);
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

  const handleExport = (type: 'excel' | 'pdf') => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    
    const data = {
      title: `Mis Estadísticas ${barberName || ''} - ${format(weekStart, 'dd/MM')} al ${format(weekEnd, 'dd/MM/yyyy')}`,
      headers: ['Fecha', 'Hora', 'Servicio', 'Método de Pago', 'Cliente', 'Total'],
      rows: services.map(s => [
        formatDate(s.created_at),
        formatTime(s.created_at),
        s.service_type,
        s.payment_method || 'efectivo',
        s.customer_name || '-',
        formatCurrency(s.barber_earning),
      ]),
    };

    // Add deductions if any
    if (deductions.length > 0) {
      data.rows.push(['', '', '', '', '', '']);
      data.rows.push(['DESCUENTOS', '', '', '', '', '']);
      deductions.forEach(d => {
        data.rows.push([
          formatDate(d.created_at),
          formatTime(d.created_at),
          d.concept,
          '',
          '',
          `-${formatCurrency(d.amount)}`,
        ]);
      });
    }

    // Add totals
    data.rows.push(['', '', '', '', '', '']);
    data.rows.push(['', '', '', '', 'Total Servicios:', formatCurrency(totalEarnings)]);
    data.rows.push(['', '', '', '', 'Total Descuentos:', `-${formatCurrency(totalDeductions)}`]);
    data.rows.push(['', '', '', '', 'TOTAL NETO:', formatCurrency(totalEarnings - totalDeductions)]);

    const filename = `mis-estadisticas-${format(weekStart, 'yyyy-MM-dd')}`;
    
    if (type === 'excel') {
      exportToExcel(data, filename);
    } else {
      exportToPDF(data, filename);
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center space-x-2">
                <Scissors className="h-5 w-5" />
                <span>Servicios de la Semana</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('excel')}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                  <DollarSign className="h-5 w-5" />
                  {formatCurrency(totalEarnings - totalDeductions)}
                </div>
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
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell>{formatDate(service.created_at)}</TableCell>
                      <TableCell>{formatTime(service.created_at)}</TableCell>
                      <TableCell>{service.service_type}</TableCell>
                      <TableCell className="capitalize">{service.payment_method || "efectivo"}</TableCell>
                      <TableCell>{service.customer_name || "-"}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(service.barber_earning)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={5}>Total Servicios</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(totalEarnings)}
                    </TableCell>
                  </TableRow>
                  {deductions.length > 0 && (
                    <>
                      <TableRow className="bg-destructive/10">
                        <TableCell colSpan={6} className="font-bold text-destructive">
                          Descuentos
                        </TableCell>
                      </TableRow>
                      {deductions.map((d) => (
                        <TableRow key={d.id} className="bg-destructive/5">
                          <TableCell>{formatDate(d.created_at)}</TableCell>
                          <TableCell>{formatTime(d.created_at)}</TableCell>
                          <TableCell colSpan={3}>{d.concept}</TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            -{formatCurrency(d.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-destructive/10 font-bold">
                        <TableCell colSpan={5}>Total Descuentos</TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatCurrency(totalDeductions)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                  <TableRow className="bg-primary/10 font-bold text-lg">
                    <TableCell colSpan={5}>TOTAL NETO</TableCell>
                    <TableCell className="text-right text-primary">
                      {formatCurrency(totalEarnings - totalDeductions)}
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
