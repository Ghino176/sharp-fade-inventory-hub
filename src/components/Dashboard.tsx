import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, Users, Package, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [recentServices, setRecentServices] = useState([]);
  const [stats, setStats] = useState({
    todayServices: 0,
    activeBarbers: 0,
    inventoryItems: 0,
    todayEarnings: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's services
      const { data: todayServicesData } = await supabase
        .from('services')
        .select('price')
        .eq('service_date', today);
      
      // Fetch active barbers
      const { data: barbersData } = await supabase
        .from('barbers')
        .select('id')
        .eq('status', 'active');
      
      // Fetch inventory items
      const { data: inventoryData } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('category', 'snacks');
      
      // Fetch recent services for the list
      const { data: services } = await supabase
        .from('services')
        .select(`
          *,
          barbers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Calculate stats
      const todayServices = todayServicesData?.length || 0;
      const activeBarbers = barbersData?.length || 0;
      const inventoryItems = inventoryData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      const todayEarnings = todayServicesData?.reduce((sum, service) => sum + (Number(service.price) || 0), 0) || 0;
      
      setStats({
        todayServices,
        activeBarbers,
        inventoryItems,
        todayEarnings
      });
      
      if (services) {
        setRecentServices(services);
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
      title: "Barberos Activos",
      value: stats.activeBarbers.toString(),
      icon: Users,
      change: "100%",
      color: "text-blue-600"
    },
    {
      title: "Inventario Snacks",
      value: stats.inventoryItems.toString(),
      icon: Package,
      change: "-5%",
      color: "text-orange-600"
    },
    {
      title: "Ingresos Hoy",
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
                      <p className="font-semibold">{service.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Barbero: {service.barbers?.name || 'No asignado'}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{service.service_type}</p>
                      <p className="text-muted-foreground">{service.service_time || 'No especificado'}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${service.price}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;