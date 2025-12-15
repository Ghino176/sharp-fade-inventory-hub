import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Scissors, Package, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BarberWeeklyStats {
  id: string;
  name: string;
  services_count: number;
  total_earnings: number;
  services: {
    service_type: string;
    count: number;
    total_price: number;
  }[];
}

interface JefeWeeklyStats {
  total_earnings: number;
  services: {
    service_type: string;
    count: number;
    total_price: number;
  }[];
}

const WeeklyStats = () => {
  const { toast } = useToast();
  const [barberWeeklyStats, setBarberWeeklyStats] = useState<BarberWeeklyStats[]>([]);
  const [jefeWeeklyStats, setJefeWeeklyStats] = useState<JefeWeeklyStats>({ total_earnings: 0, services: [] });
  const [inventoryStats, setInventoryStats] = useState<{ totalItems: number; lowStock: number }>({ totalItems: 0, lowStock: 0 });

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const getServicePrice = (serviceType: string): number => {
    const type = serviceType.toLowerCase();
    if (type.includes('corte')) return 3.5;
    if (type.includes('barba')) return 1.5;
    if (type.includes('ceja')) return 1.0;
    return 0;
  };

  const getJefeCommission = (serviceType: string): number => {
    const type = serviceType.toLowerCase();
    if (type.includes('corte')) return 2.5;
    if (type.includes('barba')) return 1.5;
    return 0;
  };

  const fetchWeeklyData = async () => {
    try {
      // Get date one week ago
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekStart = oneWeekAgo.toISOString();

      // Fetch barbers
      const { data: barbers, error: barbersError } = await supabase
        .from('barbers')
        .select('id, name');

      if (barbersError) throw barbersError;

      // Fetch services from last week (using created_at)
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('barber_id, service_type, price, created_at')
        .gte('created_at', weekStart);

      if (servicesError) throw servicesError;

      // Process barber stats
      const barberStats: BarberWeeklyStats[] = barbers?.map(barber => {
        const barberServices = services?.filter(s => s.barber_id === barber.id) || [];
        
        const servicesByType: { [key: string]: { count: number; total_price: number } } = {};
        barberServices.forEach(service => {
          if (!servicesByType[service.service_type]) {
            servicesByType[service.service_type] = { count: 0, total_price: 0 };
          }
          servicesByType[service.service_type].count++;
          servicesByType[service.service_type].total_price += getServicePrice(service.service_type);
        });

        const servicesList = Object.entries(servicesByType).map(([type, data]) => ({
          service_type: type,
          count: data.count,
          total_price: data.total_price
        }));

        return {
          id: barber.id,
          name: barber.name,
          services_count: barberServices.length,
          total_earnings: barberServices.reduce((sum, s) => sum + getServicePrice(s.service_type), 0),
          services: servicesList
        };
      }) || [];

      setBarberWeeklyStats(barberStats);

      // Process Jefe stats
      const allServicesByType: { [key: string]: { count: number; total_price: number } } = {};
      services?.forEach(service => {
        if (!allServicesByType[service.service_type]) {
          allServicesByType[service.service_type] = { count: 0, total_price: 0 };
        }
        allServicesByType[service.service_type].count++;
        allServicesByType[service.service_type].total_price += getJefeCommission(service.service_type);
      });

      const jefeServicesList = Object.entries(allServicesByType).map(([type, data]) => ({
        service_type: type,
        count: data.count,
        total_price: data.total_price
      }));

      const jefeTotalEarnings = services?.reduce((sum, s) => sum + getJefeCommission(s.service_type), 0) || 0;

      setJefeWeeklyStats({
        total_earnings: jefeTotalEarnings,
        services: jefeServicesList
      });

      // Fetch inventory stats
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('quantity, min_stock');

      if (inventoryError) throw inventoryError;

      const totalItems = inventoryData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const lowStock = inventoryData?.filter(item => item.quantity <= item.min_stock).length || 0;

      setInventoryStats({ totalItems, lowStock });

    } catch (error) {
      console.error('Error fetching weekly stats:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas semanales",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Estadísticas Semanales</h2>
        <div className="flex items-center space-x-2 text-muted-foreground">
          <CalendarDays className="h-5 w-5" />
          <span>Últimos 7 días</span>
        </div>
      </div>

      {/* Jefe Weekly Stats */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5 text-yellow-600" />
            <span>Comisiones del Jefe - Últimos 7 días</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border-2 border-yellow-200 rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-yellow-800">Total Comisiones</h3>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">${jefeWeeklyStats.total_earnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Ingresos por Comisión</p>
              </div>
            </div>
            
            {jefeWeeklyStats.services.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Desglose por Servicio:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {jefeWeeklyStats.services.map((service) => (
                    <div key={service.service_type} className="p-3 bg-yellow-50 rounded border border-yellow-200">
                      <p className="font-medium text-yellow-800 capitalize">{service.service_type}</p>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Cantidad: {service.count}</span>
                        <span>Comisión: ${service.total_price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {jefeWeeklyStats.services.length === 0 && (
              <p className="text-muted-foreground">No hay servicios esta semana</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Barber Weekly Stats */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Estadísticas por Barbero - Últimos 7 días</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {barberWeeklyStats.map((barber) => (
              <div key={barber.id} className="p-4 border rounded-lg bg-barbershop-light-gray">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{barber.name}</h3>
                  <div className="flex space-x-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{barber.services_count}</p>
                      <p className="text-sm text-muted-foreground">Servicios</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">${barber.total_earnings.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Ingresos</p>
                    </div>
                  </div>
                </div>
                
                {barber.services.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Servicios Realizados:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {barber.services.map((service) => (
                        <div key={service.service_type} className="p-3 bg-white rounded border">
                          <p className="font-medium capitalize">{service.service_type}</p>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Cantidad: {service.count}</span>
                            <span>Total: ${service.total_price.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {barber.services.length === 0 && (
                  <p className="text-muted-foreground">No realizó servicios esta semana</p>
                )}
              </div>
            ))}
            
            {barberWeeklyStats.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay barberos registrados</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Stats */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Resumen de Inventario</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-barbershop-light-gray rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-600">{inventoryStats.totalItems}</p>
              <p className="text-sm text-muted-foreground">Productos en Stock</p>
            </div>
            <div className="p-4 bg-barbershop-light-gray rounded-lg text-center">
              <p className={`text-3xl font-bold ${inventoryStats.lowStock > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {inventoryStats.lowStock}
              </p>
              <p className="text-sm text-muted-foreground">Productos con Stock Bajo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyStats;
