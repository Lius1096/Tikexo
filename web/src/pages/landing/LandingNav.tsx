import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Wallet, Building2, UtensilsCrossed } from 'lucide-react';

const PORTALS = [
  { label: 'Espace Salarié',    sub: 'Accéder à mon wallet',  Icon: Wallet,          href: '/login' },
  { label: 'Portail RH',        sub: 'Gérer mes équipes',      Icon: Building2,       href: '/entreprise/connexion' },
  { label: 'Espace Commerçant', sub: 'Accéder à ma caisse',    Icon: UtensilsCrossed, href: '/restaurant/connexion' },
];

export default function LandingNav() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between h-16 px-6 md:px-14 bg-[#060E18] backdrop-blur-xl border-b border-white/5" style={{ background: 'rgba(6,14,24,0.97)' }}>
      <div className="flex items-center gap-2.5">
        <span className="text-xl font-black text-white tracking-widest">TIKEXO</span>
        <span className="hidden sm:inline-flex text-[9px] font-bold text-white bg-gradient-to-r from-sky-500 to-sky-600 px-2.5 py-0.5 rounded-full tracking-widest">BÉNIN</span>
      </div>

      <div className="hidden md:flex gap-8">
        {[
          { label: 'Comment ça marche', id: 'comment-ca-marche' },
          { label: 'Tarifs', id: 'tarifs' },
          { label: 'Restaurants', id: 'restaurants' },
          { label: 'Contact', id: null },
        ].map(({ label, id }) => (
          <span
            key={label}
            className="text-sm text-white/40 hover:text-white cursor-pointer transition-colors"
            onClick={() => id && document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3">
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
    </nav>
  );
}
