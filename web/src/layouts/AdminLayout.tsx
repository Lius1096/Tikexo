import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Building2, Utensils, Users, ArrowLeftRight,
  CreditCard, Banknote, ShieldAlert, FileText, BarChart2, Settings,
  Bell, LogOut, Globe, Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    section: 'SUPERVISION',
    items: [
      { path: '/admin', label: 'Vue globale', icon: LayoutDashboard, exact: true },
      { path: '/admin/entreprises', label: 'Entreprises', icon: Building2 },
      { path: '/admin/commercants', label: 'Commerçants', icon: Utensils },
      { path: '/admin/beneficiaires', label: 'Bénéficiaires', icon: Users },
    ],
  },
  {
    section: 'OPÉRATIONS',
    items: [
      { path: '/admin/mutations', label: 'Mutations', icon: ArrowLeftRight },
      { path: '/admin/cartes', label: 'Cartes', icon: CreditCard },
      { path: '/admin/fedapay', label: 'FedaPay', icon: Banknote },
    ],
  },
  {
    section: 'SÉCURITÉ',
    items: [
      { path: '/admin/antifraude', label: 'Anti-fraude', icon: ShieldAlert, dot: true },
      { path: '/admin/audit', label: 'Audit log', icon: FileText },
    ],
  },
  {
    section: 'PLATEFORME',
    items: [
      { path: '/admin/statistiques', label: 'Statistiques', icon: BarChart2 },
      { path: '/admin/landing-crm', label: 'Landing CRM', icon: Globe },
      { path: '/admin/configuration', label: 'Configuration', icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/admin/connexion'); };

  const initials = user
    ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() || 'SK'
    : 'SK';
  const displayName = user ? `${user.prenom} ${user.nom}`.trim() || user.telephone : '—';

  const SidebarContent = () => (
    <>
      {NAV.map(({ section, items }) => (
        <div key={section}>
          <div className="text-[9px] text-white/25 tracking-[1.5px] px-2 pt-2.5 pb-1.5">{section}</div>
          {items.map(({ path, label, icon: Icon, exact, dot }) => {
            const isActive = exact
              ? location.pathname === path
              : location.pathname === path || location.pathname.startsWith(path + '/');
            return (
              <Link
                key={path}
                to={path}
                className={clsx(
                  'flex items-center gap-2 px-2.5 py-2 rounded-md text-xs mb-px transition-colors',
                  isActive
                    ? 'bg-tikexo-accent text-white'
                    : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                )}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {dot && !isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <div className="flex flex-col h-screen font-sans">
      {/* Topbar */}
      <header className="bg-tikexo-primary flex items-center justify-between px-4 md:px-5 py-3 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-white/60 hover:text-white p-1 -ml-1"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-medium text-white tracking-[2px]">TIKEXO</span>
          <span className="text-[10px] bg-tikexo-accent/25 text-sky-300 px-2.5 py-0.5 rounded-[10px] hidden sm:inline">
            {user?.role?.replace('_', ' ') ?? 'Admin'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Bell size={16} className="text-white/50 cursor-pointer" />
          <div className="w-7 h-7 rounded-full bg-tikexo-accent flex items-center justify-center text-[10px] font-medium text-white select-none">
            {initials}
          </div>
          <span className="text-xs text-white/70 hidden sm:inline">{displayName}</span>
          <button onClick={handleLogout} title="Déconnexion">
            <LogOut size={14} className="text-white/50 hover:text-white/80 cursor-pointer transition-colors" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Backdrop mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <nav
          className={clsx(
            'fixed top-0 left-0 h-full z-40 w-[200px] bg-[#0f2a42] py-3 px-2 overflow-y-auto flex-shrink-0 transition-transform duration-300 ease-in-out',
            'md:relative md:w-[180px] md:translate-x-0 md:z-auto',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          aria-label="Navigation admin"
        >
          {/* Close button mobile */}
          <div className="flex items-center justify-between px-2 pb-3 md:hidden">
            <span className="text-xs font-medium text-white/60 tracking-[2px]">TIKEXO</span>
            <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <SidebarContent />
        </nav>

        <main className="flex-1 overflow-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
