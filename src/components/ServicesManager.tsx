import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Scissors, DollarSign, Calendar, User, Trash2, Gift, Camera, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Barber {
  id: string;
  name: string;
}

interface Service {
  id: string;
  barber_id: string;
  service_type: string;
  price: number;
  barber_earning: number;
  created_at: string;
  customer_name?: string | null;
  payment_method?: string | null;
  payment_photo_url?: string | null;
  barber?: Barber;
}

const ServicesManager = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newService, setNewService] = useState({
    barber_id: "",
    service_type: "",
    barber_earning: "",
    tip: "",
    payment_method: "efectivo",
    customer_name: "",
    payment_photo: null as File | null,
  });

  const paymentMethods = [
    { value: "efectivo", label: "Efectivo" },
    { value: "pago movil", label: "Pago Móvil" },
    { value: "transferencia", label: "Transferencia" },
    { value: "zelle", label: "Zelle" },
  ];

  const serviceTypes = [
    { name: "Corte", label: "Corte", earning: 4.6 },
    { name: "Barba Sencilla", label: "Barba Sencilla", earning: 1 },
    { name: "Barba Premium", label: "Barba Premium", earning: 2 },
    { name: "Afeitado", label: "Afeitado", earning: 1 },
    { name: "Facial Primera Vez", label: "Facial Primera Vez", earning: 4 },
    { name: "Facial", label: "Facial", earning: 5 },
    { name: "Corte+Barba Premium", label: "Corte+Barba Premium", earning: 6.6 },
    { name: "Mascarilla Completa", label: "Mascarilla Completa", earning: 0.5 },
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([fetchBarbers(), fetchServices()]);
    setLoading(false);
  };

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Error fetching barbers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los barberos",
        variant: "destructive",
      });
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          barbers(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const servicesWithBarber = data?.map(service => ({
        ...service,
        barber: service.barbers ? {
          id: service.barbers.id,
          name: service.barbers.name
        } : undefined
      })) || [];
      
      setServices(servicesWithBarber);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los servicios",
        variant: "destructive",
      });
    }
  };

  const handleServiceTypeChange = (serviceType: string) => {
    const selectedService = serviceTypes.find(s => s.name === serviceType);
    setNewService(prev => ({
      ...prev,
      service_type: serviceType,
      barber_earning: selectedService ? selectedService.earning.toString() : ""
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewService(prev => ({ ...prev, payment_photo: file }));
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPaymentPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `payments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleAddService = async () => {
    if (!newService.barber_id || !newService.service_type) {
      toast({
        title: "Error",
        description: "Por favor selecciona barbero y servicio",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const baseEarning = parseFloat(newService.barber_earning || "0");
      const tip = parseFloat(newService.tip || "0");
      const totalEarning = baseEarning + tip;

      let paymentPhotoUrl: string | null = null;
      if (newService.payment_photo && newService.payment_method === "pago movil") {
        paymentPhotoUrl = await uploadPaymentPhoto(newService.payment_photo);
      }

      const serviceData = {
        barber_id: newService.barber_id,
        service_type: newService.service_type,
        price: 0,
        barber_earning: totalEarning,
        payment_method: newService.payment_method,
        customer_name: newService.customer_name || null,
        payment_photo_url: paymentPhotoUrl,
      };

      const { data, error } = await supabase
        .from('services')
        .insert([serviceData])
        .select(`
          *,
          barbers(id, name)
        `)
        .single();

      if (error) throw error;

      // Update barber counts
      const countColumn = newService.service_type.toLowerCase().includes('corte') ? 'cuts_count' 
        : newService.service_type.toLowerCase().includes('barba') ? 'beards_count' 
        : 'eyebrows_count';

      const { data: currentBarber } = await supabase
        .from('barbers')
        .select('cuts_count, beards_count, eyebrows_count')
        .eq('id', newService.barber_id)
        .single();

      if (currentBarber) {
        const updateData: Record<string, number> = {};
        updateData[countColumn] = ((currentBarber as Record<string, number>)[countColumn] || 0) + 1;
        
        await supabase
          .from('barbers')
          .update(updateData)
          .eq('id', newService.barber_id);
      }

      const newServiceWithBarber = {
        ...data,
        barber: data.barbers ? {
          id: data.barbers.id,
          name: data.barbers.name
        } : undefined
      };

      setServices(prev => [newServiceWithBarber, ...prev]);
      setNewService({
        barber_id: "",
        service_type: "",
        barber_earning: "",
        tip: "",
        payment_method: "efectivo",
        customer_name: "",
        payment_photo: null,
      });
      setPreviewImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Servicio agregado",
        description: tip > 0 ? `Servicio registrado con propina de $${tip.toFixed(2)}` : "Servicio registrado correctamente",
      });
    } catch (error) {
      console.error('Error adding service:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el servicio",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar este servicio?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      setServices(prev => prev.filter(service => service.id !== serviceId));

      toast({
        title: "Servicio eliminado",
        description: "Servicio eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el servicio",
        variant: "destructive",
      });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const totalToday = services
    .filter(s => s.created_at.startsWith(today))
    .reduce((sum, s) => sum + s.barber_earning, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Gestión de Servicios</h2>
        <div className="text-center py-8">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Gestión de Servicios</h2>
        <div className="flex items-center space-x-2 text-lg font-semibold">
          <DollarSign className="h-5 w-5" />
          <span>Ganancias Hoy: ${totalToday.toFixed(2)}</span>
        </div>
      </div>

      {/* Add New Service */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Registrar Nuevo Servicio</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barber_id">Barbero</Label>
              <Select value={newService.barber_id} onValueChange={(value) => setNewService(prev => ({ ...prev, barber_id: value }))}>
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
              <Label htmlFor="service_type">Servicio</Label>
              <Select value={newService.service_type} onValueChange={handleServiceTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar servicio" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((service) => (
                    <SelectItem key={service.name} value={service.name}>
                      {service.label} (${service.earning})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Nombre del Cliente</Label>
              <Input
                id="customer_name"
                value={newService.customer_name}
                onChange={(e) => setNewService(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Nombre del cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Método de Pago</Label>
              <Select 
                value={newService.payment_method} 
                onValueChange={(value) => setNewService(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar método" />
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

            <div className="space-y-2">
              <Label htmlFor="tip" className="flex items-center gap-1">
                <Gift className="h-4 w-4" />
                Propina
              </Label>
              <Input
                id="tip"
                type="number"
                step="0.01"
                min="0"
                value={newService.tip}
                onChange={(e) => setNewService(prev => ({ ...prev, tip: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            {/* Payment Photo for Pago Móvil */}
            {newService.payment_method === "pago movil" && (
              <div className="space-y-2">
                <Label htmlFor="payment_photo" className="flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  Foto del Pago
                </Label>
                <Input
                  id="payment_photo"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  className="cursor-pointer"
                />
                {previewImage && (
                  <div className="mt-2">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          {newService.service_type && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Ganancia base: <span className="font-semibold">${parseFloat(newService.barber_earning || "0").toFixed(2)}</span>
                {newService.tip && parseFloat(newService.tip) > 0 && (
                  <>
                    {" + Propina: "}
                    <span className="font-semibold text-green-600">${parseFloat(newService.tip).toFixed(2)}</span>
                    {" = Total: "}
                    <span className="font-bold text-green-600">
                      ${(parseFloat(newService.barber_earning || "0") + parseFloat(newService.tip || "0")).toFixed(2)}
                    </span>
                  </>
                )}
              </p>
            </div>
          )}
          
          <div className="mt-4">
            <Button onClick={handleAddService} className="w-full md:w-auto" disabled={uploading}>
              <Plus className="h-4 w-4 mr-2" />
              {uploading ? "Subiendo..." : "Agregar Servicio"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Scissors className="h-5 w-5" />
            <span>Servicios Registrados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted hover:bg-secondary transition-colors"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="font-medium flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {service.customer_name || 'Sin nombre'}
                    </p>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                  </div>
                  <div>
                    <p className="font-medium capitalize">{service.service_type}</p>
                    <p className="text-sm text-muted-foreground">
                      Barbero: {service.barber?.name || 'Sin barbero'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(service.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {service.payment_method || 'efectivo'}
                    </p>
                  </div>
                  <div className="flex items-center justify-end space-x-2">
                    {service.payment_photo_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewImageUrl(service.payment_photo_url!)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <p className="font-bold text-lg text-green-600">${service.barber_earning.toFixed(2)}</p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteService(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {services.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay servicios registrados
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image Preview Dialog */}
      <Dialog open={!!viewImageUrl} onOpenChange={() => setViewImageUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comprobante de Pago</DialogTitle>
          </DialogHeader>
          {viewImageUrl && (
            <img 
              src={viewImageUrl} 
              alt="Comprobante de pago" 
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServicesManager;
