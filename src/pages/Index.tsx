import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import ServicesManager from "@/components/ServicesManager";
import InventoryManager from "@/components/InventoryManager";
import BarbersManager from "@/components/BarbersManager";
import AdminStats from "@/components/AdminStats";
import UserStats from "@/components/UserStats";
import ManuelStats from "@/components/ManuelStats";
import DataManager from "@/components/DataManager";
import BarberDeductions from "@/components/BarberDeductions";

const Index = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  const { user, loading, fullName, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard />;
      case "services":
        return <ServicesManager />;
      case "inventory":
        return <InventoryManager />;
      case "barbers":
        return <BarbersManager />;
      case "deductions":
        return <BarberDeductions />;
      case "weekly-stats":
        return userRole === 'admin' ? <AdminStats /> : <UserStats />;
      case "manuel-stats":
        return userRole === 'admin' ? <ManuelStats /> : <Dashboard />;
      case "data-manager":
        return <DataManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        userName={fullName}
        userRole={userRole}
      />
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
