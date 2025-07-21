import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Scissors, Package, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const WeeklyStats = () => {
  const { toast } = useToast();
  const [weeklyServices, setWeeklyServices] = useState({
    total: 0,
    earnings: 0,
    count: 0
  });
  
  const [weeklyInventory, setWeeklyInventory] = useState({
    transactions: 0,
    entries: 0,
    exits: 0
  });

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      // Get date one week ago
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekStart = oneWeekAgo.toISOString().split('T')[0];

      // Fetch services from last week
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('price, service_date')
        .gte('service_date', weekStart);

      if (servicesError) throw servicesError;

      const servicesStats = services?.reduce(
        (acc, service) => ({
          total: acc.total + (service.price || 0),
          earnings: acc.earnings + (service.price || 0),
          count: acc.count + 1
        }),
        { total: 0, earnings: 0, count: 0 }
      ) || { total: 0, earnings: 0, count: 0 };

      setWeeklyServices(servicesStats);

      // Fetch inventory transactions from last week
      const { data: transactions, error: transactionsError } = await supabase
        .from('inventory_transactions')
        .select('transaction_type, quantity, transaction_date')
        .gte('transaction_date', weekStart);

      if (transactionsError) throw transactionsError;

      const inventoryStats = transactions?.reduce(
        (acc, transaction) => ({
          transactions: acc.transactions + 1,
          entries: transaction.transaction_type === 'entrada' 
            ? acc.entries + transaction.quantity 
            : acc.entries,
          exits: transaction.transaction_type === 'salida' 
            ? acc.exits + transaction.quantity 
            : acc.exits
        }),
        { transactions: 0, entries: 0, exits: 0 }
      ) || { transactions: 0, entries: 0, exits: 0 };

      setWeeklyInventory(inventoryStats);

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

      {/* Services Stats */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5" />
            <span>Servicios - Semana Actual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-barbershop-light-gray">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {weeklyServices.count}
              </div>
              <p className="text-sm text-muted-foreground">Servicios Realizados</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-barbershop-light-gray">
              <div className="text-3xl font-bold text-green-600 mb-2">
                ${weeklyServices.earnings.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Ingresos Totales</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-barbershop-light-gray">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                ${weeklyServices.count > 0 ? (weeklyServices.earnings / weeklyServices.count).toFixed(2) : '0.00'}
              </div>
              <p className="text-sm text-muted-foreground">Promedio por Servicio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Stats */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Inventario - Semana Actual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-barbershop-light-gray">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {weeklyInventory.transactions}
              </div>
              <p className="text-sm text-muted-foreground">Transacciones Totales</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-barbershop-light-gray">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <div className="text-3xl font-bold text-green-600">
                  {weeklyInventory.entries}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Entradas de Productos</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-barbershop-light-gray">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <TrendingDown className="h-6 w-6 text-red-600" />
                <div className="text-3xl font-bold text-red-600">
                  {weeklyInventory.exits}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Salidas de Productos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyStats;