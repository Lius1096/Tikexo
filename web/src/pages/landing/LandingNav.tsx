import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Wallet, Building2, UtensilsCrossed } from 'lucide-react';

const PORTALS = [
  { label: 'Espace Salarié',    sub: 'Accéder à mon wallet',  Icon: Wallet,         href: '/login' },
  { label: 'Portail RH',        sub: 'Gérer mes équipes',      Icon: Building2,      href: '/entreprise/connexion' },
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
    <nav className="nav">
      <div className="nav-brand">
        <span className="nav-logo">TIKEXO</span>
        <span className="nav-badge">BÉNIN</span>
      </div>

      <div className="nav-links">
        <span className="nav-link" onClick={() => document.getElementById('comment-ca-marche')?.scrollIntoView({ behavior: 'smooth' })}>Comment ça marche</span>
        <span className="nav-link" onClick={() => document.getElementById('tarifs')?.scrollIntoView({ behavior: 'smooth' })}>Tarifs</span>
        <span className="nav-link" onClick={() => document.getElementById('restaurants')?.scrollIntoView({ behavior: 'smooth' })}>Restaurants</span>
        <span className="nav-link">Contact</span>
      </div>

      <div className="nav-right">
        <div ref={ref} style={{ position: 'relative' }}>
          <span className="nav-login" onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            Se connecter
            <ChevronDown size={12} style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </span>

          {open && (
            <div className="nav-dropdown">
              {PORTALS.map((p) => (
                <button key={p.href} className="nav-dropdown-item" onClick={() => { setOpen(false); navigate(p.href); }}>
                  <div className="nav-dropdown-icon">
                    <p.Icon size={15} color="#0EA5E9" />
                  </div>
                  <div>
                    <div className="nav-dropdown-label">{p.label}</div>
                    <div className="nav-dropdown-sub">{p.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="nav-cta" onClick={() => navigate('/inscription')}>Démarrer gratuitement</button>
      </div>
    </nav>
  );
}
