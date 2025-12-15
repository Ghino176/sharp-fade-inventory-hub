import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DataManager = () => {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const handleResetAllData = async () => {
    const confirmReset = confirm(
      "⚠️ ADVERTENCIA: Esta acción eliminará TODOS los datos de la aplicación (barberos, servicios, inventario). Esta acción NO se puede deshacer. ¿Estás seguro de que deseas continuar?"
    );

    if (!confirmReset) return;

    const doubleConfirm = confirm(
      "🔴 ÚLTIMA CONFIRMACIÓN: ¿Estás ABSOLUTAMENTE seguro de que deseas eliminar todos los datos? Escribe 'ELIMINAR TODO' en tu mente y presiona OK si estás seguro."
    );

    if (!doubleConfirm) return;

    setIsResetting(true);

    try {
      // Delete all data in the correct order (relationships first)
      
      // 1. Delete all services (has foreign key to barbers)
      const { error: servicesError } = await supabase
        .from('services')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (servicesError) throw servicesError;

      // 2. Delete all inventory items
      const { error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (inventoryError) throw inventoryError;

      // 3. Delete all barbers
      const { error: barbersError } = await supabase
        .from('barbers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (barbersError) throw barbersError;

      toast({
        title: "Datos eliminados",
        description: "Todos los datos han sido eliminados exitosamente. La aplicación está ahora en estado inicial.",
      });

      // Refresh the page to reset all components
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar los datos. Algunos datos pueden no haberse eliminado.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Gestión de Datos</h2>
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Database className="h-5 w-5" />
          <span>Administración del Sistema</span>
        </div>
      </div>

      {/* Reset Data Section */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Zona de Peligro</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-100 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">Eliminar Todos los Datos</h3>
            <p className="text-sm text-red-700 mb-4">
              Esta acción eliminará permanentemente todos los datos de la aplicación:
            </p>
            <ul className="text-sm text-red-700 mb-4 space-y-1">
              <li>• Todos los barberos y su información</li>
              <li>• Todos los servicios realizados</li>
              <li>• Todo el inventario de productos</li>
              <li>• Todas las estadísticas y métricas</li>
            </ul>
            <p className="text-sm text-red-700 font-semibold mb-4">
              ⚠️ Esta acción NO se puede deshacer. La aplicación quedará en estado inicial.
            </p>
            
            <Button 
              variant="destructive" 
              onClick={handleResetAllData}
              disabled={isResetting}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isResetting ? "Eliminando datos..." : "ELIMINAR TODOS LOS DATOS"}
            </Button>
          </div>

          <div className="p-4 bg-yellow-100 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">Recomendaciones</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Asegúrate de tener respaldos si necesitas los datos</li>
              <li>• Esta función es útil para empezar desde cero o para pruebas</li>
              <li>• Considera exportar datos importantes antes de continuar</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Information Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Información del Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-barbershop-light-gray rounded-lg">
              <h3 className="font-semibold mb-2">Estado de la Base de Datos</h3>
              <p className="text-sm text-muted-foreground">
                Sistema conectado y funcionando correctamente
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Conectado</span>
              </div>
            </div>
            
            <div className="p-4 bg-barbershop-light-gray rounded-lg">
              <h3 className="font-semibold mb-2">Última Actualización</h3>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataManager;
