import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, DollarSign, Package, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, format, addDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import WeekSelector from "./WeekSelector";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// All service types offered
const allServiceTypes = [
  "Corte",
  "Barba Sencilla",
  "Barba Premium",
  "Cejas",
  "Afeitado",
  "Facial Primera Vez",
  "Facial",
  "Corte+Barba Premium",
  "Mascarilla Completa",
];

interface DailyServiceCounts {
  [key: string]: number;
}

interface DailyService {
  day: string;
  dayName: string;
  serviceCounts: DailyServiceCounts;
  ganancias: number;
}

interface InventoryEntry {
  id: string;
  name: string;
  quantity: number;
  cost: number;
  date: string;
}

interface InventoryOutput {
  id: string;
  name: string;
  quantity: number;
  salePrice: number;
  cost: number;
  profit: number;
  date: string;
}

// Manuel's earning rates per service
const manuelEarnings: Record<string, number> = {
  "Corte": 3,
  "Barba Sencilla": 1,
  "Barba Premium": 2,
  "Cejas": 0.5,
  "Afeitado": 1,
  "Facial Primera Vez": 3,
  "Facial": 3,
  "Corte+Barba Premium": 4,
  "Mascarilla Completa": 0.5,
};

const ManuelStats = () => {
  const { toast } = useToast();
  const [dailyServices, setDailyServices] = useState<DailyService[]>([]);
  const [weeklyServiceCounts, setWeeklyServiceCounts] = useState<DailyServiceCounts>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [totalGanancias, setTotalGanancias] = useState(0);
  const [totalServices, setTotalServices] = useState(0);
  
  // Inventory state (local for now)
  const [inventoryEntries, setInventoryEntries] = useState<InventoryEntry[]>([]);
  const [inventoryOutputs, setInventoryOutputs] = useState<InventoryOutput[]>([]);
  
  // Forms for new entries
  const [newEntry, setNewEntry] = useState({ name: "", quantity: "", cost: "" });
  const [newOutput, setNewOutput] = useState({ name: "", quantity: "", salePrice: "", cost: "" });

  useEffect(() => {
    fetchManuelStats();
  }, [selectedDate]);

  const fetchManuelStats = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      // Fetch all services from selected week
      const { data: services, error: servicesError } = await supabase
        .from("services")
        .select("service_type, created_at")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      if (servicesError) throw servicesError;

      // Process daily stats (Mon-Sat)
      const stats: DailyService[] = [];
      let weekTotal = 0;
      let weekServices = 0;
      const weekCounts: DailyServiceCounts = {};
      
      // Initialize weekly counts
      allServiceTypes.forEach(type => {
        weekCounts[type] = 0;
      });

      for (let i = 0; i < 6; i++) {
        const day = addDays(weekStart, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayName = format(day, "EEEE", { locale: es });

        const dayServices = (services || []).filter((s) => {
          const serviceDate = format(parseISO(s.created_at), "yyyy-MM-dd");
          return serviceDate === dayStr;
        });

        // Calculate Manuel's earnings based on his rates
        let dayGanancias = 0;
        const serviceCounts: DailyServiceCounts = {};

        allServiceTypes.forEach(type => {
          const count = dayServices.filter((s) => s.service_type === type).length;
          serviceCounts[type] = count;
          weekCounts[type] += count;
          dayGanancias += count * (manuelEarnings[type] || 0);
        });

        weekTotal += dayGanancias;
        weekServices += dayServices.length;

        stats.push({
          day: dayStr,
          dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          serviceCounts,
          ganancias: dayGanancias,
        });
      }

      setDailyServices(stats);
      setWeeklyServiceCounts(weekCounts);
      setTotalGanancias(weekTotal);
      setTotalServices(weekServices);
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
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleAddEntry = () => {
    if (!newEntry.name || !newEntry.quantity || !newEntry.cost) {
      toast({ title: "Error", description: "Completa todos los campos", variant: "destructive" });
      return;
    }
    
    const entry: InventoryEntry = {
      id: Date.now().toString(),
      name: newEntry.name,
      quantity: parseInt(newEntry.quantity),
      cost: parseFloat(newEntry.cost),
      date: new Date().toISOString(),
    };
    
    setInventoryEntries(prev => [entry, ...prev]);
    setNewEntry({ name: "", quantity: "", cost: "" });
    toast({ title: "Entrada registrada", description: `${entry.name} agregado al inventario` });
  };

  const handleAddOutput = () => {
    if (!newOutput.name || !newOutput.quantity || !newOutput.salePrice || !newOutput.cost) {
      toast({ title: "Error", description: "Completa todos los campos", variant: "destructive" });
      return;
    }
    
    const quantity = parseInt(newOutput.quantity);
    const salePrice = parseFloat(newOutput.salePrice);
    const cost = parseFloat(newOutput.cost);
    const profit = (salePrice - cost) * quantity;
    
    const output: InventoryOutput = {
      id: Date.now().toString(),
      name: newOutput.name,
      quantity,
      salePrice,
      cost,
      profit,
      date: new Date().toISOString(),
    };
    
    setInventoryOutputs(prev => [output, ...prev]);
    setNewOutput({ name: "", quantity: "", salePrice: "", cost: "" });
    toast({ title: "Salida registrada", description: `${output.name} - Ganancia: ${formatCurrency(profit)}` });
  };

  const totalInventoryProfit = inventoryOutputs.reduce((sum, o) => sum + o.profit, 0);
  const totalInventoryCost = inventoryEntries.reduce((sum, e) => sum + (e.cost * e.quantity), 0);

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
        <>
          {/* Services Stats Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <span>Ganancias por Servicios</span>
                </CardTitle>
                <div className="flex items-center gap-2 text-lg font-bold text-yellow-600">
                  <DollarSign className="h-5 w-5" />
                  {formatCurrency(totalGanancias)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Día</TableHead>
                    {allServiceTypes.map((type) => (
                      <TableHead key={type} className="text-center min-w-[70px] text-xs">
                        {type}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-right">Ganancias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyServices.map((day) => {
                    const dayTotal = Object.values(day.serviceCounts).reduce((a, b) => a + b, 0);
                    return (
                      <TableRow key={day.day}>
                        <TableCell className="font-medium">{day.dayName}</TableCell>
                        {allServiceTypes.map((type) => (
                          <TableCell key={type} className="text-center">
                            {day.serviceCounts[type] || 0}
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-bold">{dayTotal}</TableCell>
                        <TableCell className="text-right text-yellow-600 font-medium">
                          {formatCurrency(day.ganancias)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-yellow-100/50 dark:bg-yellow-900/20 font-bold">
                    <TableCell>Total Semana</TableCell>
                    {allServiceTypes.map((type) => (
                      <TableCell key={type} className="text-center">
                        {weeklyServiceCounts[type] || 0}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">{totalServices}</TableCell>
                    <TableCell className="text-right text-yellow-600">
                      {formatCurrency(totalGanancias)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Inventory Entry Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowDownCircle className="h-5 w-5 text-blue-500" />
                <span>Entrada de Productos (Compras)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <Input
                    value={newEntry.name}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre del producto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={newEntry.quantity}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo Unitario ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newEntry.cost}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddEntry} className="w-full">
                    <ArrowDownCircle className="h-4 w-4 mr-2" />
                    Agregar Entrada
                  </Button>
                </div>
              </div>
              
              {inventoryEntries.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Costo Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(parseISO(entry.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell className="text-center">{entry.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.cost)}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {formatCurrency(entry.cost * entry.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4}>Total Invertido</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(totalInventoryCost)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              
              {inventoryEntries.length === 0 && (
                <p className="text-center py-4 text-muted-foreground">No hay entradas registradas</p>
              )}
            </CardContent>
          </Card>

          {/* Inventory Output Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowUpCircle className="h-5 w-5 text-green-500" />
                <span>Salida de Productos (Ventas)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <Input
                    value={newOutput.name}
                    onChange={(e) => setNewOutput(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre del producto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={newOutput.quantity}
                    onChange={(e) => setNewOutput(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Costo Unitario ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newOutput.cost}
                    onChange={(e) => setNewOutput(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio Venta ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newOutput.salePrice}
                    onChange={(e) => setNewOutput(prev => ({ ...prev, salePrice: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddOutput} className="w-full bg-green-600 hover:bg-green-700">
                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                    Agregar Venta
                  </Button>
                </div>
              </div>
              
              {inventoryOutputs.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryOutputs.map((output) => (
                      <TableRow key={output.id}>
                        <TableCell>{format(parseISO(output.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{output.name}</TableCell>
                        <TableCell className="text-center">{output.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(output.cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(output.salePrice)}</TableCell>
                        <TableCell className="text-right text-green-600 font-bold">
                          {formatCurrency(output.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-green-100/50 dark:bg-green-900/20 font-bold">
                      <TableCell colSpan={5}>Total Ganancias Inventario</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(totalInventoryProfit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
              
              {inventoryOutputs.length === 0 && (
                <p className="text-center py-4 text-muted-foreground">No hay ventas registradas</p>
              )}
            </CardContent>
          </Card>

          {/* Product Sales Count Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-purple-500" />
                <span>Conteo de Productos Vendidos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inventoryOutputs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Unidades Vendidas</TableHead>
                      <TableHead className="text-right">Ingresos Totales</TableHead>
                      <TableHead className="text-right">Ganancia Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Group outputs by product name
                      const productSummary: Record<string, { quantity: number; revenue: number; profit: number }> = {};
                      
                      inventoryOutputs.forEach((output) => {
                        if (!productSummary[output.name]) {
                          productSummary[output.name] = { quantity: 0, revenue: 0, profit: 0 };
                        }
                        productSummary[output.name].quantity += output.quantity;
                        productSummary[output.name].revenue += output.salePrice * output.quantity;
                        productSummary[output.name].profit += output.profit;
                      });

                      const sortedProducts = Object.entries(productSummary).sort((a, b) => b[1].quantity - a[1].quantity);

                      return (
                        <>
                          {sortedProducts.map(([name, data]) => (
                            <TableRow key={name}>
                              <TableCell className="font-medium">{name}</TableCell>
                              <TableCell className="text-center font-bold">{data.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(data.revenue)}</TableCell>
                              <TableCell className="text-right text-green-600 font-bold">
                                {formatCurrency(data.profit)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-purple-100/50 dark:bg-purple-900/20 font-bold">
                            <TableCell>Total</TableCell>
                            <TableCell className="text-center">
                              {inventoryOutputs.reduce((sum, o) => sum + o.quantity, 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(inventoryOutputs.reduce((sum, o) => sum + o.salePrice * o.quantity, 0))}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(totalInventoryProfit)}
                            </TableCell>
                          </TableRow>
                        </>
                      );
                    })()}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">No hay productos vendidos aún</p>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-500" />
                <span>Resumen Total</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Ganancias Servicios</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalGanancias)}</p>
                </div>
                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Ganancias Inventario</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInventoryProfit)}</p>
                </div>
                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">Total General</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(totalGanancias + totalInventoryProfit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ManuelStats;
