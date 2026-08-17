import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Wallet, Building2, UtensilsCrossed, Menu, X } from 'lucide-react';

const PORTALS = [
  { label: 'Espace Salarié',    sub: 'Accéder à mon wallet',  Icon: Wallet,          href: '/login' },
  { label: 'Portail RH',        sub: 'Gérer mes équipes',      Icon: Building2,       href: '/entreprise/connexion' },
  { label: 'Espace Commerçant', sub: 'Accéder à ma caisse',    Icon: UtensilsCrossed, href: '/restaurant/connexion' },
];

const LIENS = [
  { label: 'Comment ça marche', id: 'comment-ca-marche' },
  { label: 'Tarifs', id: 'tarifs' },
  { label: 'Restaurants', id: 'restaurants' },
  { label: 'Contact', id: null as string | null },
];

export default function LandingNav() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (navRef.current && !navRef.current.contains(e.target as Node)) setMobileOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function scrollVers(id: string | null) {
    setMobileOpen(false);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <nav ref={navRef} className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-14 bg-[#060E18] backdrop-blur-xl border-b border-white/5" style={{ background: 'rgba(6,14,24,0.97)' }}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-lg sm:text-xl font-black text-white tracking-widest">TIKEXO</span>
        <span className="hidden sm:inline-flex text-[9px] font-bold text-white bg-gradient-to-r from-sky-500 to-sky-600 px-2.5 py-0.5 rounded-full tracking-widest">BÉNIN</span>
      </div>

      {/* ── Navigation desktop (>= lg) ── */}
      <div className="hidden lg:flex gap-8">
        {LIENS.map(({ label, id }) => (
          <span
            key={label}
            className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors"
            onClick={() => scrollVers(id)}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-3">
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 text-sm text-white/40 hover:text-white transition-colors bg-transparent border-none font-sans cursor-pointer"
          >
            Se connecter
            <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl p-2 min-w-[230px] z-50 animate-slide-down">
              {PORTALS.map((p) => (
                <button
                  key={p.href}
                  onClick={() => { setOpen(false); navigate(p.href); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left font-sans border-none bg-transparent cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                    <p.Icon size={15} color="#0EA5E9" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{p.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{p.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/inscription')}
          className="text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 px-5 py-2.5 rounded-full border-none cursor-pointer font-sans transition-all hover:-translate-y-px shadow-[0_4px_14px_rgba(14,165,233,0.3)]"
        >
          Démarrer gratuitement
        </button>
      </div>

      {/* ── Bouton menu (< lg, mobile + tablette) ── */}
      <button
        onClick={() => setMobileOpen(o => !o)}
        className="lg:hidden flex items-center justify-center w-10 h-10 -mr-2 text-white bg-transparent border-none cursor-pointer flex-shrink-0"
        aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* ── Menu déroulant mobile/tablette — sous la barre, pas de plein écran ── */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[#0A1826] border-b border-white/5 shadow-2xl animate-slide-down">
          <div className="px-5 py-4 flex flex-col gap-0.5">
            {LIENS.map(({ label, id }) => (
              <button
                key={label}
                onClick={() => scrollVers(id)}
                className="text-left text-sm font-medium text-white/70 hover:text-white py-2.5 bg-transparent border-none cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-5 pb-4 pt-1 border-t border-white/5">
            <div className="text-[10px] text-white/30 tracking-[1.5px] mt-3 mb-2">SE CONNECTER</div>
            <div className="flex flex-col gap-1.5">
              {PORTALS.map((p) => (
                <button
                  key={p.href}
                  onClick={() => { setMobileOpen(false); navigate(p.href); }}
                  className="flex items-center gap-3 w-full px-2.5 py-2 rounded-xl hover:bg-white/[0.06] transition-colors text-left border-none bg-transparent cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <p.Icon size={14} color="#0EA5E9" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{p.label}</div>
                    <div className="text-xs text-white/40">{p.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-5 pt-1">
            <button
              onClick={() => { setMobileOpen(false); navigate('/inscription'); }}
              className="text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 px-5 py-2.5 rounded-full border-none cursor-pointer font-sans transition-all shadow-[0_4px_14px_rgba(14,165,233,0.3)]"
            >
              Démarrer gratuitement
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
