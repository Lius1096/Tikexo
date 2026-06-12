import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { LayoutDashboard, ArrowLeftRight, QrCode, User, LogOut, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { path: '/commercant', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { path: '/commercant/caisse', label: 'Caisse', icon: ShoppingBag },
  { path: '/commercant/encaissements', label: 'Encaissements', icon: ArrowLeftRight },
  { path: '/commercant/qrcode', label: 'Mon QR Code', icon: QrCode },
  { path: '/commercant/profil', label: 'Mon profil', icon: User },
];

export function CommercantLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const initials = user
    ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';
  const displayName = user?.commercantNom || (user ? `${user.prenom} ${user.nom}`.trim() : '—');

  return (
    <div className="flex h-screen font-sans">
      <nav className="w-[200px] min-w-[200px] bg-tikexo-primary flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-white/[0.08]">
          <div className="text-[18px] font-medium text-white tracking-[2px]">TIKEXO</div>
          <div className="text-[10px] text-white/40 tracking-[1px] mt-0.5">ESPACE COMMERÇANT</div>
        </div>

        <div className="flex-1 px-2 py-3 overflow-y-auto">
          {NAV.map(({ path, label, icon: Icon, exact }) => {
            const isActive = exact
              ? location.pathname === path
              : location.pathname.startsWith(path);
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
            <button onClick={logout} title="Déconnexion">
              <LogOut size={14} className="text-white/40 hover:text-white/80 cursor-pointer transition-colors flex-shrink-0" />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-auto bg-slate-100">
        <Outlet />
      </main>
    </div>
  );
}
