import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, Users, Package, DollarSign } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Servicios Hoy",
      value: "24",
      icon: Scissors,
      change: "+12%",
      color: "text-green-600"
    },
    {
      title: "Barberos Activos",
      value: "3",
      icon: Users,
      change: "100%",
      color: "text-blue-600"
    },
    {
      title: "Inventario Snacks",
      value: "89",
      icon: Package,
      change: "-5%",
      color: "text-orange-600"
    },
    {
      title: "Ingresos Hoy",
      value: "$650",
      icon: DollarSign,
      change: "+8%",
      color: "text-green-600"
    }
  ];

  const recentServices = [
    { id: 1, client: "Juan Pérez", barber: "Carlos", service: "Corte + Barba", time: "10:30 AM", amount: "$25" },
    { id: 2, client: "María García", barber: "Luis", service: "Corte", time: "11:15 AM", amount: "$15" },
    { id: 3, client: "Pedro López", barber: "Antonio", service: "Barba + Cejas", time: "12:00 PM", amount: "$20" },
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
        {stats.map((stat, index) => (
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
                      <p className="font-semibold">{service.client}</p>
                      <p className="text-sm text-muted-foreground">
                        Barbero: {service.barber}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{service.service}</p>
                      <p className="text-muted-foreground">{service.time}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{service.amount}</p>
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