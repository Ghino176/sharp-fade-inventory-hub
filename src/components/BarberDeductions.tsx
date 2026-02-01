import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MinusCircle, DollarSign, Trash2 } from "lucide-react";
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
      const amount = parseFloat(newDeduction.amount);
      
      const { data, error } = await supabase
        .from("barber_deductions")
        .insert([{
          barber_id: newDeduction.barber_id,
          amount,
          concept: newDeduction.concept,
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
        title: "Descuento registrado",
        description: `Se descontó $${amount.toFixed(2)} a ${barberName}`,
      });
    } catch (error) {
      console.error("Error adding deduction:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el descuento",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDeduction = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este descuento?")) {
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
        title: "Descuento eliminado",
        description: "El descuento ha sido eliminado",
      });
    } catch (error) {
      console.error("Error deleting deduction:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el descuento",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)}$`;
  const formatDate = (dateStr: string) => format(parseISO(dateStr), "dd/MM/yyyy");
  const formatTime = (dateStr: string) => format(parseISO(dateStr), "h:mm a");

  // Group deductions by barber
  const deductionsByBarber = deductions.reduce((acc, d) => {
    if (!acc[d.barber_id]) {
      acc[d.barber_id] = {
        barberName: d.barber_name,
        total: 0,
        items: [],
      };
    }
    acc[d.barber_id].total += d.amount;
    acc[d.barber_id].items.push(d);
    return acc;
  }, {} as Record<string, { barberName: string; total: number; items: Deduction[] }>);

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <MinusCircle className="h-8 w-8 text-red-500" />
          Descuentos a Barberos
        </h2>
        <WeekSelector selectedDate={selectedDate} onWeekChange={setSelectedDate} />
      </div>

      {/* Add New Deduction */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MinusCircle className="h-5 w-5 text-red-500" />
            <span>Registrar Nuevo Descuento</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Barbero</Label>
              <Select
                value={newDeduction.barber_id}
                onValueChange={(value) => setNewDeduction(prev => ({ ...prev, barber_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar barbero" />
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
                placeholder="Razón del descuento"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleAddDeduction} className="w-full bg-red-600 hover:bg-red-700">
                <MinusCircle className="h-4 w-4 mr-2" />
                Registrar Descuento
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deductions Summary */}
      {loading ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Cargando descuentos...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {Object.entries(deductionsByBarber).map(([barberId, data]) => (
            <Card key={barberId} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <MinusCircle className="h-5 w-5 text-red-500" />
                    <span>{data.barberName}</span>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-lg font-bold text-red-600">
                    <DollarSign className="h-5 w-5" />
                    -{formatCurrency(data.total)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Hora</TableHead>
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
                        <TableCell>{deduction.concept}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          -{formatCurrency(deduction.amount)}
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
                    <TableRow className="bg-red-50 dark:bg-red-900/20 font-bold">
                      <TableCell colSpan={3}>Total Descuentos</TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(data.total)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}

          {deductions.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  No hay descuentos registrados esta semana
                </p>
              </CardContent>
            </Card>
          )}

          {deductions.length > 0 && (
            <Card className="border-0 shadow-lg bg-red-50 dark:bg-red-900/20">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">Total Descuentos de la Semana</span>
                  <span className="text-xl font-bold text-red-600">
                    -{formatCurrency(totalDeductions)}
                  </span>
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
