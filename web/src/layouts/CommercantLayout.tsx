import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { LayoutDashboard, ArrowLeftRight, QrCode, User, LogOut, ShoppingBag, Menu, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const MESSAGES_STATUT: Record<string, string> = {
  SOUMIS: "Votre dossier est en cours d'examen par l'équipe TIKEXO — vous serez notifié dès qu'il sera validé.",
  VALIDE: "Votre dossier est validé — l'activation de votre compte (encaissement, QR code) est en cours par l'équipe TIKEXO.",
  SUSPENDU: 'Compte suspendu — encaissement et reversement désactivés. Contactez le support TIKEXO pour en savoir plus.',
  ARCHIVE: 'Ce compte a été archivé.',
};

const NAV = [
  { path: '/commercant',              label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { path: '/commercant/caisse',       label: 'Caisse',          icon: ShoppingBag },
  { path: '/commercant/encaissements', label: 'Encaissements',  icon: ArrowLeftRight },
  { path: '/commercant/qrcode',       label: 'QR Vitrine',      icon: QrCode },
  { path: '/commercant/profil',       label: 'Mon profil',      icon: User },
];

const BOTTOM_NAV = [
  { path: '/commercant',              label: 'Accueil',   icon: LayoutDashboard, exact: true },
  { path: '/commercant/caisse',       label: 'Caisse',    icon: ShoppingBag },
  { path: '/commercant/encaissements', label: 'Encaiss.', icon: ArrowLeftRight },
  { path: '/commercant/qrcode',       label: 'Vitrine',   icon: QrCode },
  { path: '/commercant/profil',       label: 'Profil',    icon: User },
];

export function CommercantLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: fiche } = useQuery({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
    enabled: !!user,
    staleTime: 60_000,
  });
  const messageStatut = fiche && fiche.statut !== 'ACTIF' ? MESSAGES_STATUT[fiche.statut] : null;

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/restaurant/connexion'); };

  const initials = user
    ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';
  const displayName = user?.commercantNom || (user ? `${user.prenom} ${user.nom}`.trim() : '—');

  return (
    <div className="flex h-screen font-sans">
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
          'fixed top-0 left-0 h-full z-40 w-[200px] bg-tikexo-primary flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out',
          'md:relative md:translate-x-0 md:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="px-4 py-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[18px] font-medium text-white tracking-[2px]">TIKEXO</div>
            <div className="text-[10px] text-white/40 tracking-[1px] mt-0.5">ESPACE COMMERÇANT</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white md:hidden">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-2 py-3 overflow-y-auto">
          {NAV.map(({ path, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={clsx(
                  'flex items-center gap-2.5 px-2.5 py-[9px] rounded-md text-[13px] mb-0.5 transition-colors',
                  isActive
                    ? 'bg-tikexo-gold text-white'
                    : 'text-white/55 hover:bg-white/[0.08] hover:text-white/90'
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="px-2 py-3 border-t border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md">
            <div className="w-[30px] h-[30px] rounded-full bg-tikexo-gold flex items-center justify-center text-[11px] font-medium text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/80 truncate">{displayName}</div>
              <div className="text-[10px] text-white/35">COMMERÇANT</div>
            </div>
            <button onClick={handleLogout} title="Déconnexion">
              <LogOut size={14} className="text-white/40 hover:text-white/80 cursor-pointer transition-colors flex-shrink-0" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-tikexo-primary md:hidden flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="text-white/70 hover:text-white">
              <Menu size={20} />
            </button>
            <span className="text-sm font-medium text-white tracking-[2px]">TIKEXO</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-tikexo-gold flex items-center justify-center text-[10px] font-medium text-white">
            {initials}
          </div>
        </div>

        {/* Bannière statut — visible sur tout l'espace commerçant tant que le
            compte n'est pas ACTIF, pour ne pas laisser un marchand suspendu
            croire que la Caisse/le QR code fonctionnent normalement. */}
        {messageStatut && (
          <div className={clsx(
            'flex items-center gap-2 px-4 py-2.5 text-xs flex-shrink-0',
            fiche.statut === 'SUSPENDU' || fiche.statut === 'ARCHIVE'
              ? 'bg-red-50 text-red-700 border-b border-red-100'
              : 'bg-amber-50 text-amber-700 border-b border-amber-100'
          )}>
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>{messageStatut}</span>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-auto bg-slate-100 pb-[64px] md:pb-0">
          <Outlet />
        </main>

        {/* Bottom navigation — mobile only */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center md:hidden z-20">
          {BOTTOM_NAV.map(({ path, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
              >
                <Icon
                  size={20}
                  className={clsx('transition-colors', isActive ? 'text-tikexo-gold' : 'text-slate-400')}
                />
                <span className={clsx('text-[10px] font-medium', isActive ? 'text-tikexo-gold' : 'text-slate-400')}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
