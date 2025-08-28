import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Header = ({ activeSection, onSectionChange }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "services", label: "Servicios" },
    { id: "inventory", label: "Inventario" },
    { id: "barbers", label: "Barberos" },
    { id: "weekly-stats", label: "Estadísticas" },
    { id: "data-manager", label: "Gestión" },
  ];

  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/b0818a9a-9429-4fe2-8d40-a42d4c92250e.png" 
              alt="Barbería Logo" 
              className="h-10 w-10 object-contain"
            />
            <h1 className="text-2xl font-bold">Lions Studio</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeSection === item.id
                    ? "bg-barbershop-silver text-primary"
                    : "hover:bg-barbershop-charcoal"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="mt-4 md:hidden">
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 rounded-lg transition-all ${
                    activeSection === item.id
                      ? "bg-barbershop-silver text-primary"
                      : "hover:bg-barbershop-charcoal"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
