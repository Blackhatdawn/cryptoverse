import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, TrendingUp, Wallet, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/markets', label: 'Markets', icon: TrendingUp },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="bg-card/60 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="font-heading text-xl font-bold text-primary tracking-tight">
                CryptoNexus
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:block text-sm text-muted-foreground">
                {user?.full_name}
              </div>
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
              
              {/* Mobile menu button */}
              <button
                data-testid="mobile-menu-button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-border/50">
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  {user?.full_name}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-foreground hover:bg-white/5 transition-colors"
                >
                  <LogOut size={20} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;