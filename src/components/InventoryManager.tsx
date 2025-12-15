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
  created_at: string;
  updated_at: string;
}

const InventoryManager = () => {
  const { toast } = useToast();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const [newTransaction, setNewTransaction] = useState({
    itemId: "",
    type: "entrada" as "entrada" | "salida",
    quantity: "",
  });

  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    quantity: "",
    min_stock: "",
    unit_price: "",
  });

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);
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
      const newQuantity = newTransaction.type === "entrada" 
        ? item.quantity + quantity 
        : item.quantity - quantity;

      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', item.id);

      if (inventoryError) throw inventoryError;

      setInventory(prev => prev.map(invItem => 
        invItem.id === item.id 
          ? { ...invItem, quantity: newQuantity }
          : invItem
      ));

      setNewTransaction({
        itemId: "",
        type: "entrada",
        quantity: "",
      });

      toast({
        title: "Movimiento registrado",
        description: `${newTransaction.type === "entrada" ? "Entrada" : "Salida"} de ${quantity} ${item.name}`,
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el movimiento",
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
        min_stock: parseInt(newItem.min_stock) || 5,
        unit_price: parseFloat(newItem.unit_price),
      };

      const { data, error } = await supabase
        .from('inventory')
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
      const { error: itemError } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId);

      if (itemError) throw itemError;

      setInventory(prev => prev.filter(item => item.id !== itemId));

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
        <h2 className="text-3xl font-bold">Inventario</h2>
        <div className="text-center py-8">Cargando inventario...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Inventario</h2>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <SelectItem value="entrada">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                      Entrada
                    </div>
                  </SelectItem>
                  <SelectItem value="salida">
                    <div className="flex items-center">
                      <TrendingDown className="h-4 w-4 mr-2 text-red-600" />
                      Salida
                    </div>
                  </SelectItem>
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
                  placeholder="5"
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
          <div className="space-y-3">
            {inventory.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  item.quantity <= item.min_stock 
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-barbershop-light-gray hover:bg-secondary'
                }`}
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.category}</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${item.quantity <= item.min_stock ? 'text-orange-600' : 'text-foreground'}`}>
                      {item.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">En stock</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm">{item.min_stock}</p>
                    <p className="text-xs text-muted-foreground">Stock mín.</p>
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    <div className="text-right">
                      <p className="font-bold text-green-600">${item.unit_price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Precio unit.</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id, item.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {inventory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay productos en el inventario
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryManager;
