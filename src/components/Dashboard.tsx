import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, Users, Package, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Service {
  id: string;
  barber_id: string;
  service_type: string;
  barber_earning: number;
  customer_name: string | null;
  created_at: string;
  barbers: { name: string } | null;
}

const Dashboard = () => {
  const [recentServices, setRecentServices] = useState<Service[]>([]);
  const [stats, setStats] = useState({
    todayServices: 0,
    totalBarbers: 0,
    inventoryItems: 0,
    todayEarnings: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's services
      const { data: todayServicesData } = await supabase
        .from('services')
        .select('barber_earning, created_at')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);
      
      // Fetch all barbers
      const { data: barbersData } = await supabase
        .from('barbers')
        .select('id');
      
      // Fetch inventory items
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('quantity');
      
      // Fetch recent services for the list
      const { data: services } = await supabase
        .from('services')
        .select(`
          id,
          barber_id,
          service_type,
          barber_earning,
          customer_name,
          created_at,
          barbers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Calculate stats
      const todayServices = todayServicesData?.length || 0;
      const totalBarbers = barbersData?.length || 0;
      const inventoryItems = inventoryData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      const todayEarnings = todayServicesData?.reduce((sum, service) => sum + (Number(service.barber_earning) || 0), 0) || 0;
      
      setStats({
        todayServices,
        totalBarbers,
        inventoryItems,
        todayEarnings
      });
      
      if (services) {
        setRecentServices(services as Service[]);
      }
    };

    fetchDashboardData();
  }, []);

  const statsData = [
    {
      title: "Servicios Hoy",
      value: stats.todayServices.toString(),
      icon: Scissors,
      change: "+12%",
      color: "text-green-600"
    },
    {
      title: "Barberos",
      value: stats.totalBarbers.toString(),
      icon: Users,
      change: "100%",
      color: "text-blue-600"
    },
    {
      title: "Inventario Total",
      value: stats.inventoryItems.toString(),
      icon: Package,
      change: "-5%",
      color: "text-orange-600"
    },
    {
      title: "Ganancias Hoy",
      value: `$${stats.todayEarnings.toFixed(2)}`,
      icon: DollarSign,
      change: "+8%",
      color: "text-green-600"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <div className="text-sm text-muted-foreground">
          Última actualización: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg bg-gradient-to-br from-card to-barbershop-light-gray">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-barbershop-silver" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.color}`}>
                {stat.change} desde ayer
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Services */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5" />
            <span>Servicios Recientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 rounded-lg bg-barbershop-light-gray hover:bg-secondary transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-semibold capitalize">{service.service_type}</p>
                      <p className="text-sm text-muted-foreground">
                        Barbero: {service.barbers?.name || 'No asignado'}
                      </p>
                      {service.customer_name && (
                        <p className="text-sm text-muted-foreground">
                          Cliente: {service.customer_name}
                        </p>
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">
                        {new Date(service.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-green-600">${Number(service.barber_earning).toFixed(2)}</p>
                </div>
              </div>
            ))}
            
            {recentServices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay servicios registrados
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
