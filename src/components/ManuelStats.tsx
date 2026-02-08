import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, DollarSign, FileSpreadsheet, FileText, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";
import WeekSelector from "./WeekSelector";
import { useExport } from "@/hooks/useExport";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ServiceRecord {
  id: string;
  service_type: string;
  barber_earning: number;
  payment_method: string | null;
  customer_name: string | null;
  concept: string | null;
  payment_photo_url: string | null;
  created_at: string;
  barber_name: string;
}

// Manuel's earning rates per service
const manuelEarnings: Record<string, number> = {
  "Corte": 3.4,
  "Barba Sencilla": 1,
  "Barba Premium": 2,
  "Cejas": 0.5,
  "Afeitado": 1,
  "Facial Primera Vez": 3,
  "Facial": 3,
  "Corte+Barba Premium": 5.6,
  "Corte+Barba Sencilla": 4.4,
  "Mascarilla Completa": 0.5,
  "Promo Pana": 4,
};

const ManuelStats = () => {
  const { toast } = useToast();
  const { exportToExcel, exportToPDF } = useExport();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [totalGanancias, setTotalGanancias] = useState(0);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchManuelStats();
  }, [selectedDate]);

  const fetchManuelStats = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      // Fetch all services with barber info
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select(`
          id, 
          service_type, 
          created_at, 
          payment_method,
          customer_name,
          concept,
          payment_photo_url,
          barbers(name)
        `)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      // Calculate Manuel's earnings for each service (but count Promo Pana only once)
      const seenPromoServices = new Set<string>();
      let total = 0;

      const formattedServices: ServiceRecord[] = (servicesData || []).map((s: any) => {
        let earning = manuelEarnings[s.service_type] || 0;
        
        // For Promo Pana, we need to count Manuel's earnings only once per promo
        // Since two services are created, we track by created_at timestamp
        if (s.service_type === "Promo Pana") {
          const promoKey = `${s.created_at}-${s.service_type}`;
          if (seenPromoServices.has(promoKey)) {
            earning = 0; // Don't count Manuel's earning twice
          } else {
            seenPromoServices.add(promoKey);
          }
        }

        total += earning;

        return {
          id: s.id,
          service_type: s.service_type,
          barber_earning: earning,
          payment_method: s.payment_method,
          customer_name: s.customer_name,
          concept: s.concept,
          payment_photo_url: s.payment_photo_url,
          created_at: s.created_at,
          barber_name: s.barbers?.name || "Sin barbero",
        };
      });

      setServices(formattedServices);
      setTotalGanancias(total);
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
    return `${amount.toFixed(2)}$`;
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy");
  };

  const formatTime = (dateStr: string) => {
    return format(parseISO(dateStr), "h:mm a");
  };

  const handleExportServices = (type: 'excel' | 'pdf') => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    
    const data = {
      title: `Estadísticas Manuel - Servicios - ${format(weekStart, 'dd/MM')} al ${format(weekEnd, 'dd/MM/yyyy')}`,
      headers: ['Fecha', 'Hora', 'Servicio', 'Método de Pago', 'Cliente', 'Concepto', 'Barbero', 'Total'],
      rows: services.map(s => [
        formatDate(s.created_at),
        formatTime(s.created_at),
        s.service_type,
        s.payment_method || 'efectivo',
        s.customer_name || '-',
        s.concept || '-',
        s.barber_name,
        formatCurrency(s.barber_earning),
      ]),
    };

    data.rows.push(['', '', '', '', '', '', 'Total:', formatCurrency(totalGanancias)]);

    const filename = `manuel-servicios-${format(weekStart, 'yyyy-MM-dd')}`;
    
    if (type === 'excel') {
      exportToExcel(data, filename);
    } else {
      exportToPDF(data, filename);
    }
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span>Ganancias por Servicios</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportServices('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportServices('pdf')}>
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <div className="flex items-center gap-2 text-lg font-bold text-yellow-600">
                  <DollarSign className="h-5 w-5" />
                  {formatCurrency(totalGanancias)}
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
                    <TableHead>Concepto</TableHead>
                    <TableHead>Barbero</TableHead>
                    <TableHead>Foto</TableHead>
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
                      <TableCell>{service.concept || "-"}</TableCell>
                      <TableCell>{service.barber_name}</TableCell>
                      <TableCell>
                        {service.payment_photo_url ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewImageUrl(service.payment_photo_url)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-yellow-600">
                        {formatCurrency(service.barber_earning)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-yellow-100/50 dark:bg-yellow-900/20 font-bold">
                    <TableCell colSpan={8}>Total</TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {formatCurrency(totalGanancias)}
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

      {/* Image Preview Dialog */}
      <Dialog open={!!viewImageUrl} onOpenChange={() => setViewImageUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
          </DialogHeader>
          {viewImageUrl && (
            <img 
              src={viewImageUrl} 
              alt="Comprobante de pago" 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManuelStats;
