import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, UtensilsCrossed, LogIn } from 'lucide-react';

const ASSETS = import.meta.env.VITE_ASSETS_URL || 'http://localhost:9000/tikexo-documents';

const ACTORS = [
  {
    img: `${ASSETS}/landing/actor-1.jpg`, imgAlt: 'Équipe RH en réunion',
    accentFrom: '#1A3C5E', accentTo: '#0EA5E9', dotColor: '#0EA5E9',
    Icon: Building2,
    name: 'Employeur', role: 'Direction RH / Finance', tag: 'Portail web',
    tagBg: 'rgba(14,165,233,0.08)', tagColor: '#0EA5E9',
    loginHref: '/entreprise/connexion', loginLabel: 'Accéder au portail RH',
    features: [
      'Rechargement wallet en 1 clic via Mobile Money',
      'Dotation automatique par niveau hiérarchique',
      'Dashboard temps réel : dépenses, soldes, historique',
      'Exports comptables et factures PDF mensuelles',
      'Gestion des membres RH avec permissions granulaires',
    ],
  },
  {
    img: `${ASSETS}/landing/actor-2.jpg`, imgAlt: 'Salariés au déjeuner',
    accentFrom: '#065F46', accentTo: '#34d399', dotColor: '#34d399',
    Icon: User,
    name: 'Salarié bénéficiaire', role: 'Application mobile & web', tag: 'App mobile',
    tagBg: 'rgba(52,211,153,0.10)', tagColor: '#059669',
    loginHref: '/login', loginLabel: 'Accéder à mon wallet',
    features: [
      'Wallet personnel rechargé automatiquement chaque mois',
      'Paiement QR code en moins de 5 secondes',
      'Solde et historique consultables à tout moment',
      'Réseau de 142 restaurants partenaires à Cotonou',
      'Aucune carte physique, aucun ticket papier',
    ],
  },
  {
    img: `${ASSETS}/landing/actor-3.jpg`, imgAlt: 'Commerçante partenaire TIKEXO',
    accentFrom: '#78350F', accentTo: '#F59E0B', dotColor: '#F59E0B',
    Icon: UtensilsCrossed,
    name: 'Commerçant partenaire', role: 'Caisse numérique TIKEXO', tag: 'Caisse TIKEXO',
    tagBg: 'rgba(245,158,11,0.10)', tagColor: '#B45309',
    loginHref: '/restaurant/connexion', loginLabel: 'Accéder à ma caisse',
    features: [
      'QR code statique ou montant prédéfini par transaction',
      'Paiements validés instantanément, sans lecteur de carte',
      'Reversement Mobile Money hebdomadaire automatique',
      'Historique des encaissements TIKEXO en temps réel',
      'Commission réduite vs transactions Mobile Money classiques',
    ],
  },
];

export default function LandingActors() {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-20 px-6 md:px-20">
      <div className="text-center mb-12">
        <div className="text-[11px] font-bold text-sky-500 tracking-[3px] uppercase mb-2.5">LA PLATEFORME</div>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
          Une solution pour chacun{' '}
          <span className="inline-block w-2 h-2 rounded-full bg-sky-500 align-middle mx-2" />
          <br />
          <span className="text-sky-500">trois rôles, un seul écosystème.</span>
        </h2>
        <p className="text-base text-slate-500 mt-3.5 mx-auto max-w-xl leading-relaxed">
          TIKEXO connecte employeurs, salariés et commerçants dans un système unifié où chaque partie y trouve son compte.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ACTORS.map(a => (
          <div
            key={a.name}
            className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col"
          >
            <div className="h-1 w-full flex-shrink-0" style={{ background: `linear-gradient(90deg, ${a.accentFrom}, ${a.accentTo})` }} />

            <div className="relative overflow-hidden h-56 flex-shrink-0">
              <img
                src={a.img}
                alt={a.imgAlt}
                className="w-full h-full object-cover transition-transform duration-500"
                loading="lazy"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(255,255,255,0.97) 100%)' }}
              />
              <span
                className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-3 py-1 rounded-full uppercase border border-white/40 backdrop-blur-sm"
                style={{ background: a.tagBg, color: a.tagColor }}
              >
                <a.Icon size={11} />
                {a.tag}
              </span>
            </div>

            <div className="px-5 pt-4">
              <div className="text-[17px] font-extrabold text-slate-900">{a.name}</div>
              <div className="text-xs text-slate-400 mt-0.5 tracking-wide">{a.role}</div>
            </div>

            <ul className="px-5 py-4 flex-1 m-0 list-none space-y-0">
              {a.features.map(f => (
                <li key={f} className="flex items-start gap-2.5 py-2 border-b border-slate-50 last:border-0">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: a.dotColor }} />
                  <span className="text-[13px] text-slate-500 leading-snug">{f}</span>
                </li>
              ))}
            </ul>

            <div className="px-5 pb-5">
              <button
                onClick={() => navigate(a.loginHref)}
                className="w-full py-3 rounded-xl bg-transparent text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all hover:bg-black/[0.04] hover:-translate-y-px font-sans border-[1.5px]"
                style={{ borderColor: a.accentTo, color: a.accentTo }}
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
