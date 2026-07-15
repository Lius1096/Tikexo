import React from 'react';
import { Check } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: '15 000',
    period: 'XOF / mois · 1 à 20 salariés',
    features: ['Portail RH + app salariés', 'Dotations automatiques', '2 % de commission par transaction', 'Support email'],
  },
  {
    name: 'Growth',
    price: '35 000',
    period: 'XOF / mois · 21 à 100 salariés',
    featured: true,
    badge: 'Le plus populaire',
    features: ['Tout Starter inclus', 'Gestion par niveaux hiérarchiques', 'Exports comptables + factures PDF', '1,8 % de commission par transaction'],
  },
  {
    name: 'Business',
    price: '75 000',
    period: 'XOF / mois · 101 à 300 salariés',
    features: ['Tout Growth inclus', 'Mutations inter-entreprises', 'KYC entreprise prioritaire', '1,5 % de commission + support dédié'],
    ctaLabel: "Contacter l'équipe",
  },
];

export default function LandingPricing() {
  return (
    <section className="py-16 md:py-20 px-6 md:px-20 bg-slate-50" id="tarifs">
      <div className="text-center mb-12">
        <div className="text-[11px] font-bold text-sky-500 tracking-[3px] uppercase mb-2.5">TARIFS</div>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
          Simple, transparent,<br />
          <span className="text-sky-500">rentable dès le 1er mois.</span>
        </h2>
        <p className="text-base text-slate-500 mt-3.5 mx-auto max-w-xl leading-relaxed">
          Aucun frais d'installation, aucun engagement annuel obligatoire. Résiliez à tout moment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center max-w-4xl mx-auto">
        {PLANS.map(p => (
          <div
            key={p.name}
            className={`rounded-2xl p-8 transition-all duration-200 ${
              p.featured
                ? 'shadow-2xl shadow-slate-900/30 scale-[1.04]'
                : 'bg-white border border-slate-200 hover:shadow-lg hover:-translate-y-1'
            }`}
            style={p.featured ? { background: 'linear-gradient(145deg, #060E18, #0B1A2B 50%, #1A3C5E)' } : {}}
          >
            {p.badge && (
              <div className="inline-block text-[10px] font-bold text-white bg-gradient-to-r from-sky-500 to-sky-600 px-3.5 py-1 rounded-full mb-3.5 tracking-wide">
                {p.badge}
              </div>
            )}
            <div className={`text-[11px] font-extrabold tracking-[2.5px] uppercase mb-3 ${p.featured ? 'text-white/35' : 'text-slate-400'}`}>
              {p.name}
            </div>
            <div className={`text-[42px] font-black leading-none mb-1 ${p.featured ? 'text-white' : 'text-slate-900'}`}>
              {p.price}
            </div>
            <div className={`text-xs mb-6 ${p.featured ? 'text-white/25' : 'text-slate-400'}`}>
              {p.period}
            </div>
            <div className={`h-px mb-5 ${p.featured ? 'bg-white/[0.07]' : 'bg-slate-100'}`} />

            {p.features.map(f => (
              <div key={f} className="flex items-start gap-2.5 mb-3">
                <Check size={13} color="#0EA5E9" className="flex-shrink-0 mt-0.5" />
                <span className={`text-sm leading-snug ${p.featured ? 'text-white/65' : 'text-slate-500'}`}>{f}</span>
              </div>
            ))}

            <button
              className={`w-full py-3.5 rounded-2xl text-sm font-bold mt-5 border-none cursor-pointer transition-all font-sans ${
                p.featured
                  ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-[0_8px_24px_rgba(14,165,233,0.35)]'
                  : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
              }`}
            >
              {p.ctaLabel ?? 'Commencer'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
