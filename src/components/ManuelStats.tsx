import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, DollarSign, Package, ArrowUpCircle, ShoppingCart, FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  barber_name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

interface InventorySale {
  id: string;
  inventory_id: string | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
  sale_price: number;
  profit: number;
  customer_name: string | null;
  payment_method: string | null;
  created_at: string;
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
  "Corte+Barba Premium": 4,
  "Mascarilla Completa": 0.5,
};

const paymentMethods = [
  { value: "efectivo", label: "Efectivo" },
  { value: "pago movil", label: "Pago Móvil" },
  { value: "transferencia", label: "Transferencia" },
  { value: "zelle", label: "Zelle" },
];

const ManuelStats = () => {
  const { toast } = useToast();
  const { exportToExcel, exportToPDF } = useExport();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [totalGanancias, setTotalGanancias] = useState(0);

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventorySales, setInventorySales] = useState<InventorySale[]>([]);

  // Form for new sale
  const [newSale, setNewSale] = useState({
    inventory_id: "",
    quantity: "",
    sale_price: "",
    customer_name: "",
    payment_method: "efectivo",
  });

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
          barbers(name)
        `)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      // Fetch inventory items
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, name, unit_price, quantity")
        .order("name");

      if (inventoryError) throw inventoryError;

      // Fetch inventory sales from selected week
      const { data: salesData, error: salesError } = await supabase
        .from("inventory_sales")
        .select("*")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      // Calculate Manuel's earnings for each service
      const formattedServices: ServiceRecord[] = (servicesData || []).map((s: any) => ({
        id: s.id,
        service_type: s.service_type,
        barber_earning: manuelEarnings[s.service_type] || 0,
        payment_method: s.payment_method,
        customer_name: s.customer_name,
        created_at: s.created_at,
        barber_name: s.barbers?.name || "Sin barbero",
      }));

      const total = formattedServices.reduce((sum, s) => sum + s.barber_earning, 0);

      setServices(formattedServices);
      setTotalGanancias(total);
      setInventoryItems(inventoryData || []);
      setInventorySales(salesData || []);
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

  const handleAddSale = async () => {
    if (!newSale.inventory_id || !newSale.quantity || !newSale.sale_price) {
      toast({ title: "Error", description: "Completa todos los campos requeridos", variant: "destructive" });
      return;
    }

    const selectedItem = inventoryItems.find(i => i.id === newSale.inventory_id);
    if (!selectedItem) return;

    const quantity = parseInt(newSale.quantity);
    const salePrice = parseFloat(newSale.sale_price);
    const unitCost = selectedItem.unit_price;
    const profit = (salePrice - unitCost) * quantity;

    if (quantity > selectedItem.quantity) {
      toast({ title: "Error", description: "No hay suficiente stock", variant: "destructive" });
      return;
    }

    try {
      // Insert sale record
      const { data: saleData, error: saleError } = await supabase
        .from("inventory_sales")
        .insert([{
          inventory_id: newSale.inventory_id,
          product_name: selectedItem.name,
          quantity,
          unit_cost: unitCost,
          sale_price: salePrice,
          profit,
          customer_name: newSale.customer_name || null,
          payment_method: newSale.payment_method,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Update inventory quantity
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ quantity: selectedItem.quantity - quantity })
        .eq("id", newSale.inventory_id);

      if (updateError) throw updateError;

      // Update local state
      setInventorySales(prev => [saleData, ...prev]);
      setInventoryItems(prev => prev.map(item => 
        item.id === newSale.inventory_id 
          ? { ...item, quantity: item.quantity - quantity }
          : item
      ));

      setNewSale({ inventory_id: "", quantity: "", sale_price: "", customer_name: "", payment_method: "efectivo" });

      toast({ title: "Venta registrada", description: `${selectedItem.name} - Ganancia: ${formatCurrency(profit)}` });
    } catch (error) {
      console.error("Error adding sale:", error);
      toast({ title: "Error", description: "No se pudo registrar la venta", variant: "destructive" });
    }
  };

  const handleDeleteSale = async (sale: InventorySale) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta venta?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("inventory_sales")
        .delete()
        .eq("id", sale.id);

      if (deleteError) throw deleteError;

      // Restore inventory quantity
      if (sale.inventory_id) {
        const item = inventoryItems.find(i => i.id === sale.inventory_id);
        if (item) {
          await supabase
            .from("inventory")
            .update({ quantity: item.quantity + sale.quantity })
            .eq("id", sale.inventory_id);

          setInventoryItems(prev => prev.map(i => 
            i.id === sale.inventory_id 
              ? { ...i, quantity: i.quantity + sale.quantity }
              : i
          ));
        }
      }

      setInventorySales(prev => prev.filter(s => s.id !== sale.id));
      toast({ title: "Venta eliminada", description: "La venta ha sido eliminada" });
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast({ title: "Error", description: "No se pudo eliminar la venta", variant: "destructive" });
    }
  };

  const totalInventoryProfit = inventorySales.reduce((sum, s) => sum + Number(s.profit), 0);

  // Product sales summary
  const productSalesSummary = inventorySales.reduce((acc, sale) => {
    if (!acc[sale.product_name]) {
      acc[sale.product_name] = { quantity: 0, revenue: 0, profit: 0 };
    }
    acc[sale.product_name].quantity += sale.quantity;
    acc[sale.product_name].revenue += Number(sale.sale_price) * sale.quantity;
    acc[sale.product_name].profit += Number(sale.profit);
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number; profit: number }>);

  const productSalesArray = Object.entries(productSalesSummary).map(([name, data]) => ({
    name,
    ...data,
  }));

  const totalSalesQuantity = productSalesArray.reduce((sum, p) => sum + p.quantity, 0);
  const totalSalesRevenue = productSalesArray.reduce((sum, p) => sum + p.revenue, 0);
  const totalSalesProfit = productSalesArray.reduce((sum, p) => sum + p.profit, 0);

  const handleExportServices = (type: 'excel' | 'pdf') => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    
    const data = {
      title: `Estadísticas Manuel - Servicios - ${format(weekStart, 'dd/MM')} al ${format(weekEnd, 'dd/MM/yyyy')}`,
      headers: ['Fecha', 'Hora', 'Servicio', 'Método de Pago', 'Cliente', 'Barbero', 'Total'],
      rows: services.map(s => [
        formatDate(s.created_at),
        formatTime(s.created_at),
        s.service_type,
        s.payment_method || 'efectivo',
        s.customer_name || '-',
        s.barber_name,
        formatCurrency(s.barber_earning),
      ]),
    };

    data.rows.push(['', '', '', '', '', 'Total:', formatCurrency(totalGanancias)]);

    const filename = `manuel-servicios-${format(weekStart, 'yyyy-MM-dd')}`;
    
    if (type === 'excel') {
      exportToExcel(data, filename);
    } else {
      exportToPDF(data, filename);
    }
  };

  const handleExportSales = (type: 'excel' | 'pdf') => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    
    const data = {
      title: `Estadísticas Manuel - Ventas Inventario - ${format(weekStart, 'dd/MM')} al ${format(weekEnd, 'dd/MM/yyyy')}`,
      headers: ['Fecha', 'Hora', 'Producto', 'Cantidad', 'Cliente', 'Método Pago', 'Venta', 'Ganancia'],
      rows: inventorySales.map(s => [
        formatDate(s.created_at),
        formatTime(s.created_at),
        s.product_name,
        s.quantity.toString(),
        s.customer_name || '-',
        s.payment_method || 'efectivo',
        formatCurrency(Number(s.sale_price) * s.quantity),
        formatCurrency(Number(s.profit)),
      ]),
    };

    data.rows.push(['', '', '', '', '', '', 'Total:', formatCurrency(totalInventoryProfit)]);

    const filename = `manuel-ventas-${format(weekStart, 'yyyy-MM-dd')}`;
    
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
        <>
          {/* Services Stats Card */}
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
                      <TableHead>Barbero</TableHead>
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
                        <TableCell>{service.barber_name}</TableCell>
                        <TableCell className="text-right font-medium text-yellow-600">
                          {formatCurrency(service.barber_earning)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-yellow-100/50 dark:bg-yellow-900/20 font-bold">
                      <TableCell colSpan={6}>Total</TableCell>
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

          {/* Inventory Sales Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center space-x-2">
                  <ArrowUpCircle className="h-5 w-5 text-green-500" />
                  <span>Ventas de Inventario</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportSales('excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportSales('pdf')}>
                    <FileText className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>Producto</Label>
                  <Select
                    value={newSale.inventory_id}
                    onValueChange={(value) => setNewSale(prev => ({ ...prev, inventory_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.filter(i => i.quantity > 0).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (Stock: {item.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newSale.quantity}
                    onChange={(e) => setNewSale(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Precio Venta ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newSale.sale_price}
                    onChange={(e) => setNewSale(prev => ({ ...prev, sale_price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input
                    value={newSale.customer_name}
                    onChange={(e) => setNewSale(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Método de Pago</Label>
                  <Select
                    value={newSale.payment_method}
                    onValueChange={(value) => setNewSale(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddSale} className="bg-green-600 hover:bg-green-700 mb-4">
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Registrar Venta
              </Button>

              {inventorySales.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Método Pago</TableHead>
                      <TableHead className="text-right">Venta</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventorySales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{formatDate(sale.created_at)}</TableCell>
                        <TableCell>{formatTime(sale.created_at)}</TableCell>
                        <TableCell className="font-medium">{sale.product_name}</TableCell>
                        <TableCell className="text-center">{sale.quantity}</TableCell>
                        <TableCell>{sale.customer_name || "-"}</TableCell>
                        <TableCell className="capitalize">{sale.payment_method || "efectivo"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(sale.sale_price) * sale.quantity)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(Number(sale.profit))}
                        </TableCell>
                        <TableCell>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteSale(sale)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={7}>Total Ganancia Inventario</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(totalInventoryProfit)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">No hay ventas registradas</p>
              )}
            </CardContent>
          </Card>

          {/* Product Sales Summary Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-purple-500" />
                <span>Conteo de Productos Vendidos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {productSalesArray.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Unidades Vendidas</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right">Ganancia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSalesArray.map((product) => (
                      <TableRow key={product.name}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-center">{product.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(product.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{totalSalesQuantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalSalesRevenue)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(totalSalesProfit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">No hay productos vendidos</p>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-green-600" />
                <span>Resumen Total Manuel</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Ganancias Servicios</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalGanancias)}</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Ganancias Inventario</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInventoryProfit)}</p>
                </div>
                <div className="text-center p-4 bg-background rounded-lg">
                  <p className="text-sm text-muted-foreground">Total General</p>
                  <p className="text-2xl font-bold text-primary">
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
