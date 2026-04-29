import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, FileText, Calculator, Menu, X, Folder } from "lucide-react";
import { useState } from "react";
import { hasStoredSubmissions } from "@/lib/mySubmissions";
import { useCurrency, SELECTABLE_CURRENCIES } from "@/contexts/CurrencyContext";

const Header = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showMySubmissions = hasStoredSubmissions();
  const { displayCurrency, setDisplayCurrency } = useCurrency();

  const navItems = [
    { path: "/", label: "Home", icon: null },
    { path: "/about", label: "Mission", icon: null },
    { path: "/submit", label: "Submit Project", icon: FileText },
    { path: "/database", label: "Database", icon: Database },
    { path: "/estimate", label: "Get Estimate", icon: Calculator },
    ...(showMySubmissions
      ? [{ path: "/my-submissions", label: "My Submissions", icon: Folder }]
      : []),
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
              <span className="text-lg leading-none">🪜</span>
            </div>
            <span className="font-mono font-semibold text-lg tracking-tight">
              Val<span className="text-primary">You</span>Ladder
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Button>
              </Link>
            ))}
            <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
              <SelectTrigger className="w-[72px] h-8 text-xs font-mono ml-2 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SELECTABLE_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c} className="font-mono text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={location.pathname === item.path ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
