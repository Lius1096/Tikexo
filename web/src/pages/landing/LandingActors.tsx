import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, UtensilsCrossed, LogIn, Check } from 'lucide-react';

const ASSETS = import.meta.env.VITE_ASSETS_URL || 'http://localhost:9000/tikexo-documents';

const ACTORS = [
  {
    img: `${ASSETS}/landing/actor-1.jpg`, imgAlt: 'Équipe RH en réunion',
    accentFrom: '#1A3C5E', accentTo: '#0EA5E9',
    Icon: Building2,
    name: 'Employeur', role: 'Direction RH / Finance', tag: 'Portail web',
    loginHref: '/entreprise/connexion', loginLabel: 'Accéder au portail RH',
    features: [
      'Rechargement wallet en 1 clic via Mobile Money',
      'Dotation automatique par niveau hiérarchique',
      'Dashboard temps réel : dépenses, soldes, historique',
    ],
  },
  {
    img: `${ASSETS}/landing/actor-2.jpg`, imgAlt: 'Salariés au déjeuner',
    accentFrom: '#065F46', accentTo: '#34d399',
    Icon: User,
    name: 'Salarié bénéficiaire', role: 'Application mobile & web', tag: 'App mobile',
    loginHref: '/login', loginLabel: 'Accéder à mon wallet',
    features: [
      'Wallet rechargé automatiquement chaque mois',
      'Paiement QR code en moins de 5 secondes',
      'Réseau de 142 restaurants partenaires à Cotonou',
    ],
  },
  {
    img: `${ASSETS}/landing/actor-3.jpg`, imgAlt: 'Commerçante partenaire TIKEXO',
    accentFrom: '#78350F', accentTo: '#F59E0B',
    Icon: UtensilsCrossed,
    name: 'Commerçant partenaire', role: 'Caisse numérique TIKEXO', tag: 'Caisse TIKEXO',
    loginHref: '/restaurant/connexion', loginLabel: 'Accéder à ma caisse',
    features: [
      'QR code : paiements validés instantanément',
      'Reversement Mobile Money hebdomadaire automatique',
      'Commission réduite vs Mobile Money classique',
    ],
  },
];

export default function LandingActors() {
  const navigate = useNavigate();
  return (
    <section className="bg-[#060E18] py-16 md:py-20 px-6 md:px-20">
      <div className="text-center mb-12">
        <div className="text-[11px] font-bold text-sky-500 tracking-[3px] uppercase mb-2.5">LA PLATEFORME</div>
        <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
          Une solution pour chacun{' '}
          <span className="inline-block w-2 h-2 rounded-full bg-sky-500 align-middle mx-2" />
          <br />
          <span className="text-sky-500">trois rôles, un seul écosystème.</span>
        </h2>
        <p className="text-base text-white/35 mt-3.5 mx-auto max-w-xl leading-relaxed">
          TIKEXO connecte employeurs, salariés et commerçants dans un système unifié où chaque partie y trouve son compte.
        </p>
      </div>

      <div
        className="no-scrollbar flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 pb-3 md:mx-0 md:px-0 md:pb-0 md:grid md:grid-cols-3 md:overflow-visible"
      >
        {ACTORS.map(a => (
          <div
            key={a.name}
            className="flex-none w-[82vw] snap-start md:w-full group relative overflow-hidden rounded-3xl flex flex-col"
            style={{ background: '#0D1F35' }}
          >
            {/* Accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ background: `linear-gradient(90deg, ${a.accentFrom}, ${a.accentTo})` }} />

            {/* Full-bleed image */}
            <div className="relative h-64 overflow-hidden flex-shrink-0">
              <img
                src={a.img}
                alt={a.imgAlt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
              {/* Gradient image → card bg */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 35%, #0D1F35 100%)' }}
              />
              {/* Tag badge */}
              <span
                className="absolute bottom-4 left-5 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full"
                style={{
                  background: `${a.accentTo}22`,
                  color: a.accentTo,
                  border: `1px solid ${a.accentTo}40`,
                }}
              >
                <a.Icon size={10} />
                {a.tag}
              </span>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 flex flex-col flex-1">
              <h3 className="text-xl font-black text-white mb-0.5">{a.name}</h3>
              <p className="text-xs text-white/30 mb-5 tracking-wide">{a.role}</p>

              <div className="space-y-3 mb-6 flex-1">
                {a.features.map(f => (
                  <div key={f} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${a.accentTo}22` }}
                    >
                      <Check size={10} color={a.accentTo} />
                    </div>
                    <span className="text-sm text-white/50 leading-snug">{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate(a.loginHref)}
                className="w-full py-3 rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 font-sans border"
                style={{
                  borderColor: `${a.accentTo}33`,
                  color: a.accentTo,
                  background: `${a.accentTo}12`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${a.accentTo}22`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${a.accentTo}12`; }}
              >
                <LogIn size={13} />
                {a.loginLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
