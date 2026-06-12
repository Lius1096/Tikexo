import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Building2, Utensils, Users, ArrowLeftRight,
  CreditCard, Banknote, ShieldAlert, FileText, BarChart2, Settings,
  Bell, ChevronDown, LogOut,
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
      { path: '/admin/configuration', label: 'Configuration', icon: Settings },
    ],
  },
];

export function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const initials = user
    ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() || 'SK'
    : 'SK';
  const displayName = user ? `${user.prenom} ${user.nom}`.trim() || user.telephone : '—';

  return (
    <div className="flex flex-col h-screen font-sans">
      {/* Topbar */}
      <header className="bg-tikexo-primary flex items-center justify-between px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-white tracking-[2px]">TIKEXO</span>
          <span className="text-[10px] bg-tikexo-accent/25 text-sky-300 px-2.5 py-0.5 rounded-[10px]">
            {user?.role?.replace('_', ' ') ?? 'Admin'}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Bell size={16} className="text-white/50 cursor-pointer" />
          <div className="w-7 h-7 rounded-full bg-tikexo-accent flex items-center justify-center text-[10px] font-medium text-white select-none">
            {initials}
          </div>
          <span className="text-xs text-white/70">{displayName}</span>
          <button onClick={logout} title="Déconnexion">
            <LogOut size={14} className="text-white/50 hover:text-white/80 cursor-pointer transition-colors" />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-[180px] min-w-[180px] bg-[#0f2a42] py-3 px-2 overflow-y-auto flex-shrink-0" aria-label="Navigation admin">
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
        </nav>

        <main className="flex-1 overflow-auto bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
