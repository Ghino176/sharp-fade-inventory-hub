import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, TrendingUp, TrendingDown, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_stock: number;
  unit_price: number;
  updated_at: string;
  description?: string;
  supplier?: string;
}

interface Transaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  transaction_date: string;
  transaction_time: string;
  notes: string;
  created_at?: string;
  created_by?: string;
}

const InventoryManager = () => {
  const { toast } = useToast();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const [newTransaction, setNewTransaction] = useState({
    itemId: "",
    type: "entrada" as "entrada" | "salida",
    quantity: "",
    notes: "",
  });

  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    quantity: "",
    min_stock: "",
    unit_price: "",
    description: "",
    supplier: "",
  });

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('inventory_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);

    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del inventario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(inventory.map(item => item.category))];
  const lowStockItems = inventory.filter(item => item.quantity <= item.min_stock);

  const handleTransaction = async () => {
    if (!newTransaction.itemId || !newTransaction.quantity) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    const item = inventory.find(i => i.id === newTransaction.itemId);
    if (!item) return;

    const quantity = parseInt(newTransaction.quantity);
    
    if (newTransaction.type === "salida" && quantity > item.quantity) {
      toast({
        title: "Error",
        description: "No hay suficiente stock para esta salida",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create transaction record
      const { data: transactionData, error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert([{
          item_id: item.id,
          transaction_type: newTransaction.type,
          quantity: quantity,
          notes: newTransaction.notes || null,
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update inventory quantity
      const newQuantity = newTransaction.type === "entrada" 
        ? item.quantity + quantity 
        : item.quantity - quantity;

      const { error: inventoryError } = await supabase
        .from('inventory_items')
        .update({ quantity: newQuantity })
        .eq('id', item.id);

      if (inventoryError) throw inventoryError;

      // Update local state
      setInventory(prev => prev.map(invItem => 
        invItem.id === item.id 
          ? { ...invItem, quantity: newQuantity }
          : invItem
      ));

      setTransactions(prev => [transactionData, ...prev]);
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
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la transacción",
        variant: "destructive",
      });
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.quantity || !newItem.unit_price) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      const itemData = {
        name: newItem.name,
        category: newItem.category,
        quantity: parseInt(newItem.quantity),
        min_stock: parseInt(newItem.min_stock) || 0,
        unit_price: parseFloat(newItem.unit_price),
        description: newItem.description || null,
        supplier: newItem.supplier || null,
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert([itemData])
        .select()
        .single();

      if (error) throw error;

      setInventory(prev => [data, ...prev]);
      setNewItem({
        name: "",
        category: "",
        quantity: "",
        min_stock: "",
        unit_price: "",
        description: "",
        supplier: "",
      });
      setIsAddingItem(false);

      toast({
        title: "Producto agregado",
        description: `${newItem.name} ha sido agregado al inventario`,
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el producto",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar ${itemName} del inventario?`)) {
      return;
    }

    try {
      // Delete associated transactions first
      const { error: transactionsError } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('item_id', itemId);

      if (transactionsError) throw transactionsError;

      // Delete the item
      const { error: itemError } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (itemError) throw itemError;

      setInventory(prev => prev.filter(item => item.id !== itemId));
      setTransactions(prev => prev.filter(transaction => transaction.item_id !== itemId));

      toast({
        title: "Producto eliminado",
        description: `${itemName} ha sido eliminado del inventario`,
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Inventario de Snacks</h2>
        <div className="text-center py-8">Cargando inventario...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Inventario de Snacks</h2>
        <div className="flex items-center space-x-4">
          {lowStockItems.length > 0 && (
            <div className="flex items-center space-x-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{lowStockItems.length} artículos con stock bajo</span>
            </div>
          )}
          <Button onClick={() => setIsAddingItem(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Producto
          </Button>
        </div>
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
                    Stock: {item.quantity} (Mínimo: {item.min_stock})
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
                    <SelectItem key={item.id} value={item.id}>
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

      {/* Add New Item Form */}
      {isAddingItem && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Agregar Nuevo Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Nombre del Producto *</Label>
                <Input
                  id="itemName"
                  value={newItem.name}
                  onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del producto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemCategory">Categoría *</Label>
                <Input
                  id="itemCategory"
                  value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Bebidas, Snacks, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemQuantity">Cantidad Inicial *</Label>
                <Input
                  id="itemQuantity"
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Cantidad inicial"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemMinStock">Stock Mínimo</Label>
                <Input
                  id="itemMinStock"
                  type="number"
                  value={newItem.min_stock}
                  onChange={(e) => setNewItem(prev => ({ ...prev, min_stock: e.target.value }))}
                  placeholder="Stock mínimo"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemPrice">Precio Unitario *</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  step="0.01"
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemSupplier">Proveedor</Label>
                <Input
                  id="itemSupplier"
                  value={newItem.supplier}
                  onChange={(e) => setNewItem(prev => ({ ...prev, supplier: e.target.value }))}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="itemDescription">Descripción</Label>
                <Input
                  id="itemDescription"
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del producto"
                />
              </div>
            </div>

            <div className="flex space-x-2 mt-4">
              <Button onClick={handleAddItem}>
                Agregar Producto
              </Button>
              <Button variant="outline" onClick={() => setIsAddingItem(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                  item.quantity <= item.min_stock 
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
                    <span className={`font-bold ${item.quantity <= item.min_stock ? 'text-orange-600' : 'text-green-600'}`}>
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Precio:</span>
                    <span className="font-medium">${item.unit_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Mín. Stock:</span>
                    <span className="text-sm text-muted-foreground">{item.min_stock}</span>
                  </div>
                  {item.supplier && (
                    <div className="flex justify-between">
                      <span className="text-sm">Proveedor:</span>
                      <span className="text-sm text-muted-foreground">{item.supplier}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDeleteItem(item.id, item.name)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Producto
                  </Button>
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
            {transactions.map((transaction) => {
              const item = inventory.find(i => i.id === transaction.item_id);
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-barbershop-light-gray"
                >
                  <div className="flex items-center space-x-4">
                    {transaction.transaction_type === "entrada" ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-semibold">{item?.name || 'Producto eliminado'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.transaction_date).toLocaleDateString()} - {transaction.transaction_time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${transaction.transaction_type === "entrada" ? "text-green-600" : "text-red-600"}`}>
                      {transaction.transaction_type === "entrada" ? "+" : "-"}{transaction.quantity}
                    </p>
                    <p className="text-sm text-muted-foreground">{transaction.notes}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryManager;