import { useState } from "react";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import ServicesManager from "@/components/ServicesManager";
import InventoryManager from "@/components/InventoryManager";
import BarbersManager from "@/components/BarbersManager";
import WeeklyStats from "@/components/WeeklyStats";
import DataManager from "@/components/DataManager";

const Index = () => {
  const [activeSection, setActiveSection] = useState("dashboard");

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
      case "weekly-stats":
        return <WeeklyStats />;
      case "data-manager":
        return <DataManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
