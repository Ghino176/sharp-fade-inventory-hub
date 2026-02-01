import { useState } from "react";
import { Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  userName?: string | null;
  userRole?: 'admin' | 'user' | null;
}

const Header = ({ activeSection, onSectionChange, userName, userRole }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { signOut } = useAuth();

  const baseNavItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "services", label: "Servicios" },
    { id: "inventory", label: "Inventario" },
    { id: "barbers", label: "Barberos" },
    { id: "deductions", label: "Descuentos" },
    { id: "weekly-stats", label: "Estadísticas" },
    { id: "data-manager", label: "Gestión" },
  ];

  // Add Manuel stats only for admins
  const navItems = userRole === 'admin' 
    ? [...baseNavItems, { id: "manuel-stats", label: "Manuel" }]
    : baseNavItems;

  const handleSignOut = async () => {
    await signOut();
  };

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

          {/* User Info & Logout (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span className="text-sm">{userName || 'Usuario'}</span>
              <Badge variant={userRole === 'admin' ? 'default' : 'secondary'} className="ml-1">
                {userRole === 'admin' ? 'Admin' : 'Usuario'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="hover:bg-barbershop-charcoal"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>

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
            {/* User Info (Mobile) */}
            <div className="flex items-center justify-between px-4 py-2 mb-2 border-b border-primary-foreground/20">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span className="text-sm">{userName || 'Usuario'}</span>
                <Badge variant={userRole === 'admin' ? 'default' : 'secondary'}>
                  {userRole === 'admin' ? 'Admin' : 'Usuario'}
                </Badge>
              </div>
            </div>
            
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
              
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 rounded-lg transition-all hover:bg-barbershop-charcoal text-red-300"
              >
                <LogOut className="h-4 w-4 inline mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
