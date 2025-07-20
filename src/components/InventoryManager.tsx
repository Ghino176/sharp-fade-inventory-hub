import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  minStock: number;
  price: number;
  lastUpdated: string;
}

interface Transaction {
  id: number;
  itemId: number;
  itemName: string;
  type: 'entrada' | 'salida';
  quantity: number;
  date: string;
  time: string;
  notes: string;
}

const InventoryManager = () => {
  const { toast } = useToast();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: 1, name: "Coca Cola", category: "Bebidas", quantity: 24, minStock: 10, price: 2.5, lastUpdated: "2024-01-20" },
    { id: 2, name: "Agua", category: "Bebidas", quantity: 15, minStock: 20, price: 1.5, lastUpdated: "2024-01-20" },
    { id: 3, name: "Chips", category: "Snacks", quantity: 30, minStock: 15, price: 1.8, lastUpdated: "2024-01-20" },
    { id: 4, name: "Galletas", category: "Snacks", quantity: 8, minStock: 12, price: 2.0, lastUpdated: "2024-01-20" },
    { id: 5, name: "Café", category: "Bebidas", quantity: 18, minStock: 10, price: 3.0, lastUpdated: "2024-01-20" },
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 1, itemId: 1, itemName: "Coca Cola", type: "salida", quantity: 3, date: "2024-01-20", time: "10:30", notes: "Venta cliente" },
    { id: 2, itemId: 3, itemName: "Chips", type: "entrada", quantity: 20, date: "2024-01-20", time: "09:15", notes: "Restock semanal" },
  ]);

  const [newTransaction, setNewTransaction] = useState({
    itemId: "",
    type: "entrada" as "entrada" | "salida",
    quantity: "",
    notes: "",
  });

  const categories = [...new Set(inventory.map(item => item.category))];
  const lowStockItems = inventory.filter(item => item.quantity <= item.minStock);

  const handleTransaction = () => {
    if (!newTransaction.itemId || !newTransaction.quantity) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    const item = inventory.find(i => i.id === parseInt(newTransaction.itemId));
    if (!item) return;

    const quantity = parseInt(newTransaction.quantity);
    const now = new Date();
    
    // Create transaction record
    const transaction: Transaction = {
      id: transactions.length + 1,
      itemId: item.id,
      itemName: item.name,
      type: newTransaction.type,
      quantity: quantity,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      notes: newTransaction.notes,
    };

    // Update inventory
    setInventory(prev => prev.map(invItem => {
      if (invItem.id === item.id) {
        const newQuantity = newTransaction.type === "entrada" 
          ? invItem.quantity + quantity 
          : invItem.quantity - quantity;
        
        if (newQuantity < 0) {
          toast({
            title: "Error",
            description: "No hay suficiente stock para esta salida",
            variant: "destructive",
          });
          return invItem;
        }
        
        return {
          ...invItem,
          quantity: newQuantity,
          lastUpdated: now.toISOString().split('T')[0],
        };
      }
      return invItem;
    }));

    setTransactions(prev => [transaction, ...prev]);
    setNewTransaction({
      itemId: "",
      type: "entrada",
      quantity: "",
      notes: "",
    });

    toast({
      title: "Transacción registrada",
      description: `${newTransaction.type === "entrada" ? "Entrada" : "Salida"} de ${quantity} ${item.name}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Inventario de Snacks</h2>
        {lowStockItems.length > 0 && (
          <div className="flex items-center space-x-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{lowStockItems.length} artículos con stock bajo</span>
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Alertas de Stock Bajo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.map((item) => (
                <div key={item.id} className="p-3 bg-white rounded-lg border border-orange-200">
                  <p className="font-semibold text-orange-800">{item.name}</p>
                  <p className="text-sm text-orange-600">
                    Stock: {item.quantity} (Mínimo: {item.minStock})
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Transaction */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Registrar Movimiento</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item">Artículo</Label>
              <Select value={newTransaction.itemId} onValueChange={(value) => setNewTransaction(prev => ({ ...prev, itemId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar artículo" />
                </SelectTrigger>
                <SelectContent>
                  {inventory.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.name} (Stock: {item.quantity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={newTransaction.type} onValueChange={(value: "entrada" | "salida") => setNewTransaction(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                value={newTransaction.quantity}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Cantidad"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={newTransaction.notes}
                onChange={(e) => setNewTransaction(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Motivo del movimiento"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <Button onClick={handleTransaction} className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Registrar Movimiento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Inventory */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Inventario Actual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border transition-colors ${
                  item.quantity <= item.minStock 
                    ? 'border-orange-200 bg-orange-50' 
                    : 'border-gray-200 bg-white hover:bg-barbershop-light-gray'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <span className="text-sm text-muted-foreground">{item.category}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Stock:</span>
                    <span className={`font-bold ${item.quantity <= item.minStock ? 'text-orange-600' : 'text-green-600'}`}>
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Precio:</span>
                    <span className="font-medium">${item.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Mín. Stock:</span>
                    <span className="text-sm text-muted-foreground">{item.minStock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Movimientos Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 rounded-lg bg-barbershop-light-gray"
              >
                <div className="flex items-center space-x-4">
                  {transaction.type === "entrada" ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold">{transaction.itemName}</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.date} - {transaction.time}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${transaction.type === "entrada" ? "text-green-600" : "text-red-600"}`}>
                    {transaction.type === "entrada" ? "+" : "-"}{transaction.quantity}
                  </p>
                  <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryManager;