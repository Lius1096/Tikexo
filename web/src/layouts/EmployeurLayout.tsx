import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Wallet, Users, CalendarCheck, CreditCard,
  BarChart2, FileSpreadsheet, Settings, LogOut, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const NAV = [
  {
    section: 'PRINCIPAL',
    items: [
      { path: '/employeur', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
      { path: '/employeur/wallet', label: 'Wallet', icon: Wallet },
      { path: '/employeur/beneficiaires', label: 'Bénéficiaires', icon: Users },
    ],
  },
  {
    section: 'GESTION',
    items: [
      { path: '/employeur/dotations', label: 'Dotations', icon: CalendarCheck },
      { path: '/employeur/cartes', label: 'Cartes', icon: CreditCard },
    ],
  },
  {
    section: 'RAPPORTS',
    items: [
      { path: '/employeur/rapports', label: 'Statistiques', icon: BarChart2 },
      { path: '/employeur/facturation', label: 'Facturation', icon: FileSpreadsheet },
      { path: '/employeur/parametres', label: 'Paramètres', icon: Settings },
    ],
  },
  {
    section: 'COMPTE',
    items: [
      { path: '/employeur/kyb', label: 'Vérification KYB', icon: ShieldCheck },
    ],
  },
];

export function EmployeurLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const { data: kybData } = useQuery({
    queryKey: ['kyb-dossier', user?.entrepriseId],
    queryFn: () => api.get('/kyb/dossier').then((r) => r.data.data),
    enabled: !!user?.entrepriseId,
    staleTime: 60_000,
  });

  const kybNonValide = kybData && kybData.statut !== 'VALIDE';
  const joursRestants: number = kybData?.jours_restants ?? 7;
  const isOnKybPage = location.pathname === '/employeur/kyb';

  const initials = user
    ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';
  const displayName = user ? `${user.prenom} ${user.nom}`.trim() || user.telephone : '—';

  return (
    <div className="flex h-screen font-sans">
      <nav className="w-[200px] min-w-[200px] bg-tikexo-primary flex flex-col flex-shrink-0" aria-label="Navigation TIKEXO">
        <div className="px-4 py-5 border-b border-white/[0.08]">
          <div className="text-[18px] font-medium text-white tracking-[2px]">TIKEXO</div>
          <div className="text-[10px] text-white/40 tracking-[1px] mt-0.5">PORTAIL EMPLOYEUR</div>
        </div>

        <div className="flex-1 px-2 py-3 overflow-y-auto">
          {NAV.map(({ section, items }) => (
            <div key={section}>
              <div className="text-[10px] text-white/30 tracking-[1.5px] px-2 py-3 pb-1.5">{section}</div>
              {items.map(({ path, label, icon: Icon, exact }) => {
                const isActive = exact
                  ? location.pathname === path
                  : location.pathname === path || location.pathname.startsWith(path + '/');
                return (
                  <Link
                    key={path}
                    to={path}
                    className={clsx(
                      'flex items-center gap-2.5 px-2.5 py-[9px] rounded-md text-[13px] mb-0.5 transition-colors',
                      isActive
                        ? 'bg-tikexo-accent text-white'
                        : 'text-white/55 hover:bg-white/[0.08] hover:text-white/90'
                    )}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-2 py-3 border-t border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md">
            <div className="w-[30px] h-[30px] rounded-full bg-tikexo-accent flex items-center justify-center text-[11px] font-medium text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/80 truncate">{displayName}</div>
              <div className="text-[10px] text-white/35">{user?.role?.replace('_', ' ')}</div>
            </div>
            <button onClick={logout} title="Déconnexion">
              <LogOut size={14} className="text-white/40 hover:text-white/80 cursor-pointer transition-colors flex-shrink-0" />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-auto bg-slate-100 flex flex-col">
        {kybNonValide && !isOnKybPage && (
          <Link
            to="/employeur/kyb"
            className="flex items-center gap-2.5 px-4 py-2.5 text-[11px] font-medium transition-colors flex-shrink-0"
            style={{
              background: joursRestants <= 2 ? '#FCEBEB' : '#FAEEDA',
              color: joursRestants <= 2 ? '#A32D2D' : '#854F0B',
              borderBottom: `0.5px solid ${joursRestants <= 2 ? '#F4BBBB' : '#FAC775'}`,
            }}
          >
            <ShieldCheck size={14} className="flex-shrink-0" />
            <span>
              {joursRestants === 0
                ? '⚠️ KYB expiré — rechargements suspendus. Complétez votre dossier.'
                : joursRestants <= 2
                ? `⚠️ Urgent — ${joursRestants} jour${joursRestants > 1 ? 's' : ''} restant${joursRestants > 1 ? 's' : ''} pour valider votre KYB`
                : `Complétez votre vérification KYB — ${joursRestants} jours restants`}
            </span>
            <span className="ml-auto text-[10px] opacity-70">Compléter →</span>
          </Link>
        )}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
