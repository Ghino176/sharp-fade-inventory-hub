import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, DollarSign, FileSpreadsheet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";
import WeekSelector from "./WeekSelector";
import { useExport } from "@/hooks/useExport";

interface ServiceRecord {
  id: string;
  barber_id: string;
  barber_name: string;
  customer_name: string | null;
  service_type: string;
  barber_earning: number;
  payment_method: string | null;
  created_at: string;
}

interface Deduction {
  id: string;
  barber_id: string;
  amount: number;
  concept: string;
  created_at: string;
}

interface BarberGroup {
  barberId: string;
  barberName: string;
  services: ServiceRecord[];
  deductions: Deduction[];
  totalEarnings: number;
  totalDeductions: number;
  netEarnings: number;
}

const AdminStats = () => {
  const { toast } = useToast();
  const { exportToExcel, exportToPDF } = useExport();
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
        .select("id, barber_id, service_type, created_at, barber_earning, payment_method, customer_name")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      // Fetch deductions from selected week
      const { data: deductions, error: deductionsError } = await supabase
        .from("barber_deductions")
        .select("id, barber_id, amount, concept, created_at")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (deductionsError) throw deductionsError;

      // Group services by barber
      const groups: BarberGroup[] = (barbers || []).map((barber) => {
        const barberServices = (services || [])
          .filter((s) => s.barber_id === barber.id)
          .map((s) => ({
            id: s.id,
            barber_id: s.barber_id,
            barber_name: barber.name,
            customer_name: s.customer_name,
            service_type: s.service_type,
            barber_earning: Number(s.barber_earning || 0),
            payment_method: s.payment_method,
            created_at: s.created_at,
          }));

        const barberDeductions = (deductions || [])
          .filter((d) => d.barber_id === barber.id)
          .map((d) => ({
            id: d.id,
            barber_id: d.barber_id,
            amount: Number(d.amount),
            concept: d.concept,
            created_at: d.created_at,
          }));

        const totalEarnings = barberServices.reduce((sum, s) => sum + s.barber_earning, 0);
        const totalDeductions = barberDeductions.reduce((sum, d) => sum + d.amount, 0);

        return {
          barberId: barber.id,
          barberName: barber.name,
          services: barberServices,
          deductions: barberDeductions,
          totalEarnings,
          totalDeductions,
          netEarnings: totalEarnings - totalDeductions,
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

  const handleExportBarber = (barber: BarberGroup, type: 'excel' | 'pdf') => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    
    const data = {
      title: `Estadísticas ${barber.barberName} - ${format(weekStart, 'dd/MM')} al ${format(weekEnd, 'dd/MM/yyyy')}`,
      headers: ['Fecha', 'Hora', 'Servicio', 'Método de Pago', 'Cliente', 'Total'],
      rows: barber.services.map(s => [
        formatDate(s.created_at),
        formatTime(s.created_at),
        s.service_type,
        s.payment_method || 'efectivo',
        s.customer_name || '-',
        formatCurrency(s.barber_earning),
      ]),
    };

    // Add deductions if any
    if (barber.deductions.length > 0) {
      data.rows.push(['', '', '', '', '', '']);
      data.rows.push(['DESCUENTOS', '', '', '', '', '']);
      barber.deductions.forEach(d => {
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
    data.rows.push(['', '', '', '', 'Total Servicios:', formatCurrency(barber.totalEarnings)]);
    data.rows.push(['', '', '', '', 'Total Descuentos:', `-${formatCurrency(barber.totalDeductions)}`]);
    data.rows.push(['', '', '', '', 'TOTAL NETO:', formatCurrency(barber.netEarnings)]);

    const filename = `estadisticas-${barber.barberName.toLowerCase().replace(/\s+/g, '-')}-${format(weekStart, 'yyyy-MM-dd')}`;
    
    if (type === 'excel') {
      exportToExcel(data, filename);
    } else {
      exportToPDF(data, filename);
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
          {barberGroups.map((barber) => (
            <Card key={barber.barberId} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>{barber.barberName}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportBarber(barber, 'excel')}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-1" />
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportBarber(barber, 'pdf')}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                      <DollarSign className="h-5 w-5" />
                      {formatCurrency(barber.netEarnings)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {barber.services.length > 0 ? (
                  <>
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
                        {barber.services.map((service) => (
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
                            {formatCurrency(barber.totalEarnings)}
                          </TableCell>
                        </TableRow>
                        {barber.deductions.length > 0 && (
                          <>
                            <TableRow className="bg-destructive/10">
                              <TableCell colSpan={6} className="font-bold text-destructive">
                                Descuentos
                              </TableCell>
                            </TableRow>
                            {barber.deductions.map((d) => (
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
                                -{formatCurrency(barber.totalDeductions)}
                              </TableCell>
                            </TableRow>
                          </>
                        )}
                        <TableRow className="bg-primary/10 font-bold text-lg">
                          <TableCell colSpan={5}>TOTAL NETO</TableCell>
                          <TableCell className="text-right text-primary">
                            {formatCurrency(barber.netEarnings)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </>
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
