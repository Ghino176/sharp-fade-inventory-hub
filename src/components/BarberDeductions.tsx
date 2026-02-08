import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MinusCircle, PlusCircle, DollarSign, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import WeekSelector from "./WeekSelector";

interface Barber {
  id: string;
  name: string;
}

interface Deduction {
  id: string;
  barber_id: string;
  barber_name: string;
  amount: number;
  concept: string;
  created_at: string;
}

const BarberDeductions = () => {
  const { toast } = useToast();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [transactionType, setTransactionType] = useState<"deduction" | "addition">("deduction");

  const [newDeduction, setNewDeduction] = useState({
    barber_id: "",
    amount: "",
    concept: "",
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

      const [barbersRes, deductionsRes] = await Promise.all([
        supabase.from("barbers").select("id, name").order("name"),
        supabase
          .from("barber_deductions")
          .select(`
            id,
            barber_id,
            amount,
            concept,
            created_at,
            barbers(name)
          `)
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString())
          .order("created_at", { ascending: false }),
      ]);

      if (barbersRes.error) throw barbersRes.error;
      if (deductionsRes.error) throw deductionsRes.error;

      setBarbers(barbersRes.data || []);
      
      const formattedDeductions: Deduction[] = (deductionsRes.data || []).map((d: any) => ({
        id: d.id,
        barber_id: d.barber_id,
        barber_name: d.barbers?.name || "Sin barbero",
        amount: Number(d.amount),
        concept: d.concept,
        created_at: d.created_at,
      }));
      
      setDeductions(formattedDeductions);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeduction = async () => {
    if (!newDeduction.barber_id || !newDeduction.amount || !newDeduction.concept) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }

    try {
      // For additions, we store negative amounts (which will be subtracted from deductions total, effectively adding to earnings)
      const amount = transactionType === "addition" 
        ? -Math.abs(parseFloat(newDeduction.amount))
        : Math.abs(parseFloat(newDeduction.amount));
      
      const { data, error } = await supabase
        .from("barber_deductions")
        .insert([{
          barber_id: newDeduction.barber_id,
          amount,
          concept: `${transactionType === "addition" ? "[BONO] " : ""}${newDeduction.concept}`,
        }])
        .select(`
          id,
          barber_id,
          amount,
          concept,
          created_at,
          barbers(name)
        `)
        .single();

      if (error) throw error;

      const barberName = barbers.find(b => b.id === newDeduction.barber_id)?.name || "Sin barbero";

      const newDed: Deduction = {
        id: data.id,
        barber_id: data.barber_id,
        barber_name: barberName,
        amount: Number(data.amount),
        concept: data.concept,
        created_at: data.created_at,
      };

      setDeductions(prev => [newDed, ...prev]);
      setNewDeduction({ barber_id: "", amount: "", concept: "" });

      toast({
        title: transactionType === "addition" ? "Bono registrado" : "Descuento registrado",
        description: `Se ${transactionType === "addition" ? "agregó" : "descontó"} $${Math.abs(amount).toFixed(2)} a ${barberName}`,
      });
    } catch (error) {
      console.error("Error adding deduction:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la transacción",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDeduction = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta transacción?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("barber_deductions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setDeductions(prev => prev.filter(d => d.id !== id));

      toast({
        title: "Transacción eliminada",
        description: "La transacción ha sido eliminada",
      });
    } catch (error) {
      console.error("Error deleting deduction:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => `${Math.abs(amount).toFixed(2)}$`;
  const formatDate = (dateStr: string) => format(parseISO(dateStr), "dd/MM/yyyy");
  const formatTime = (dateStr: string) => format(parseISO(dateStr), "h:mm a");

  // Group deductions by barber
  const deductionsByBarber = deductions.reduce((acc, d) => {
    if (!acc[d.barber_id]) {
      acc[d.barber_id] = {
        barberName: d.barber_name,
        totalDeductions: 0,
        totalAdditions: 0,
        items: [],
      };
    }
    if (d.amount >= 0) {
      acc[d.barber_id].totalDeductions += d.amount;
    } else {
      acc[d.barber_id].totalAdditions += Math.abs(d.amount);
    }
    acc[d.barber_id].items.push(d);
    return acc;
  }, {} as Record<string, { barberName: string; totalDeductions: number; totalAdditions: number; items: Deduction[] }>);

  const totalDeductions = deductions.filter(d => d.amount >= 0).reduce((sum, d) => sum + d.amount, 0);
  const totalAdditions = deductions.filter(d => d.amount < 0).reduce((sum, d) => sum + Math.abs(d.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <MinusCircle className="h-8 w-8 text-red-500" />
          Descuentos y Bonos
        </h2>
        <WeekSelector selectedDate={selectedDate} onWeekChange={setSelectedDate} />
      </div>

      {/* Add New Transaction */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {transactionType === "deduction" ? (
              <MinusCircle className="h-5 w-5 text-red-500" />
            ) : (
              <PlusCircle className="h-5 w-5 text-green-500" />
            )}
            <span>Registrar {transactionType === "deduction" ? "Descuento" : "Bono"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={transactionType}
                onValueChange={(value: "deduction" | "addition") => setTransactionType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deduction">
                    <div className="flex items-center">
                      <MinusCircle className="h-4 w-4 mr-2 text-red-500" />
                      Descuento
                    </div>
                  </SelectItem>
                  <SelectItem value="addition">
                    <div className="flex items-center">
                      <PlusCircle className="h-4 w-4 mr-2 text-green-500" />
                      Bono
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Barbero / Usuario</Label>
              <Select
                value={newDeduction.barber_id}
                onValueChange={(value) => setNewDeduction(prev => ({ ...prev, barber_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newDeduction.amount}
                onChange={(e) => setNewDeduction(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input
                value={newDeduction.concept}
                onChange={(e) => setNewDeduction(prev => ({ ...prev, concept: e.target.value }))}
                placeholder={transactionType === "deduction" ? "Razón del descuento" : "Razón del bono"}
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleAddDeduction} 
                className={`w-full ${transactionType === "deduction" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                {transactionType === "deduction" ? (
                  <MinusCircle className="h-4 w-4 mr-2" />
                ) : (
                  <PlusCircle className="h-4 w-4 mr-2" />
                )}
                Registrar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Summary */}
      {loading ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Cargando transacciones...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {Object.entries(deductionsByBarber).map(([barberId, data]) => (
            <Card key={barberId} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center space-x-2">
                    <span>{data.barberName}</span>
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    {data.totalAdditions > 0 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <PlusCircle className="h-4 w-4" />
                        +{formatCurrency(data.totalAdditions)}
                      </div>
                    )}
                    {data.totalDeductions > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <MinusCircle className="h-4 w-4" />
                        -{formatCurrency(data.totalDeductions)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <DollarSign className="h-5 w-5" />
                      <span className={data.totalAdditions - data.totalDeductions >= 0 ? "text-green-600" : "text-red-600"}>
                        {data.totalAdditions - data.totalDeductions >= 0 ? "+" : "-"}
                        {formatCurrency(Math.abs(data.totalAdditions - data.totalDeductions))}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((deduction) => (
                      <TableRow key={deduction.id}>
                        <TableCell>{formatDate(deduction.created_at)}</TableCell>
                        <TableCell>{formatTime(deduction.created_at)}</TableCell>
                        <TableCell>
                          {deduction.amount >= 0 ? (
                            <span className="text-red-600 flex items-center gap-1">
                              <MinusCircle className="h-3 w-3" />
                              Descuento
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1">
                              <PlusCircle className="h-3 w-3" />
                              Bono
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{deduction.concept}</TableCell>
                        <TableCell className={`text-right font-medium ${deduction.amount >= 0 ? "text-red-600" : "text-green-600"}`}>
                          {deduction.amount >= 0 ? "-" : "+"}
                          {formatCurrency(deduction.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteDeduction(deduction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {deductions.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No hay transacciones registradas esta semana
                </p>
              </CardContent>
            </Card>
          )}

          {deductions.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-lg font-bold">Totales de la Semana</span>
                  <div className="flex items-center gap-4">
                    <span className="text-green-600 font-semibold">
                      Bonos: +{formatCurrency(totalAdditions)}
                    </span>
                    <span className="text-red-600 font-semibold">
                      Descuentos: -{formatCurrency(totalDeductions)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default BarberDeductions;